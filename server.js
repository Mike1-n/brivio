const { createServer } = require("http");
const next = require("next");
const { Server } = require("socket.io");
const { PrismaClient } = require("@prisma/client");

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();
const prisma = new PrismaClient();

// In-memory active game rooms
const activeRooms = new Map();

function calculateScore({ isCorrect, basePoints = 1000, timeLimitSeconds = 20, responseTimeMs, currentStreak = 0 }) {
  if (!isCorrect) return { points: 0, speedBonus: 0, streakBonus: 0, newStreak: 0 };
  const timeLimitMs = Math.max(timeLimitSeconds * 1000, 1000);
  const clampedResponseTime = Math.min(Math.max(responseTimeMs, 50), timeLimitMs);
  const responseFraction = clampedResponseTime / timeLimitMs;
  // Speed factor: 1.0 down to 0.5
  const speedFactor = 1 - (responseFraction * 0.5);
  const rawPoints = Math.round(basePoints * speedFactor);
  // Guarantee points never exceed basePoints and never fall below 50% of basePoints
  const finalPoints = Math.min(Math.max(rawPoints, Math.round(basePoints * 0.5)), basePoints);
  const newStreak = currentStreak + 1;
  return {
    points: finalPoints,
    speedBonus: finalPoints - Math.round(basePoints * 0.5),
    streakBonus: 0,
    newStreak,
  };
}

const BOT_NAMES = [
  "PixelNinja 🥷", "BrainyFox 🦊", "QuantumCat 🐱", "RocketPanda 🐼",
  "CyberWolf 🐺", "NeonTiger 🐯", "HyperWizard 🧙‍♂️", "StarCaptain 🚀",
  "QuizValkyrie ⚡", "DrCosmic 🌌", "SpeedyCheetah 🐆", "ZenDragon 🐲"
];
const BOT_AVATARS = ["🦊", "🐼", "🚀", "⚡", "🔥", "💎", "⭐", "🤖", "🍕", "🎮", "🎯", "🏆"];

function generateBots(count = 4) {
  const selected = [...BOT_NAMES].sort(() => 0.5 - Math.random()).slice(0, count);
  return selected.map((name, i) => {
    const speeds = ["FAST", "BALANCED", "THINKER"];
    return {
      id: `bot_${Math.random().toString(36).substring(2, 9)}`,
      name,
      avatar: BOT_AVATARS[Math.floor(Math.random() * BOT_AVATARS.length)],
      accuracy: 0.65 + Math.random() * 0.28,
      speedBias: speeds[i % speeds.length],
    };
  });
}

function simulateBotAnswer(bot, answers, timeLimitSeconds) {
  const timeLimitMs = timeLimitSeconds * 1000;
  let minMs = 1200;
  let maxMs = Math.min(timeLimitMs - 1000, 8000);
  if (bot.speedBias === "FAST") { minMs = 800; maxMs = Math.min(timeLimitMs * 0.4, 4000); }
  else if (bot.speedBias === "THINKER") { minMs = 2500; maxMs = Math.min(timeLimitMs * 0.85, 12000); }
  const responseTimeMs = Math.floor(minMs + Math.random() * (maxMs - minMs));
  const willBeCorrect = Math.random() < bot.accuracy;
  const correctAnswer = answers.find((a) => a.isCorrect);
  const incorrectAnswers = answers.filter((a) => !a.isCorrect);
  let chosenAnswerId = "";
  if (willBeCorrect && correctAnswer) chosenAnswerId = correctAnswer.id;
  else if (incorrectAnswers.length > 0) chosenAnswerId = incorrectAnswers[Math.floor(Math.random() * incorrectAnswers.length)].id;
  else chosenAnswerId = answers[0]?.id || "";
  return { answerId: chosenAnswerId, responseTimeMs };
}

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    // Ultra-fast keep-alive health check for 24/7 uptime monitors
    if (req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", uptime: process.uptime() }));
      return;
    }

    try {
      await handle(req, res);
    } catch (err) {
      console.error("Error handling request:", err);
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
  });

  const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    pingInterval: 10000,
    pingTimeout: 5000,
  });

  io.on("connection", (socket) => {
    // HOST: create room
    socket.on("host:create_room", async (data) => {
      try {
        const session = await prisma.gameSession.findUnique({
          where: { pin: data.pin },
          include: {
            quiz: {
              include: {
                questions: {
                  orderBy: { order: "asc" },
                  include: { answers: { orderBy: { order: "asc" } } },
                },
              },
            },
          },
        });

        if (!session) {
          socket.emit("error", { message: "Session not found" });
          return;
        }

        let room = activeRooms.get(data.pin);
        if (!room) {
          room = {
            pin: data.pin,
            sessionId: session.id,
            hostSocketId: socket.id,
            hostId: data.hostId,
            quizId: session.quizId,
            quizTitle: session.quiz.title,
            status: "LOBBY",
            questions: session.quiz.questions,
            currentQuestionIndex: 0,
            questionStartTime: 0,
            timeRemaining: 0,
            botTimers: [],
            players: new Map(),
            answersDistribution: {},
          };
          activeRooms.set(data.pin, room);
        } else {
          // Clear any pending room destruction timer
          if (room.hostDisconnectTimer) {
            clearTimeout(room.hostDisconnectTimer);
            room.hostDisconnectTimer = null;
          }
          room.hostSocketId = socket.id;
        }

        socket.join(data.pin);
        const playerList = Array.from(room.players.values()).map((p) => ({
          id: p.id,
          nickname: p.nickname,
          avatar: p.avatar,
          score: p.score || 0,
          lastPointsEarned: p.lastPointsEarned || 0,
          streak: p.streak || 0,
          rank: p.rank || 1,
          isBot: p.isBot,
        }));
        const sortedLeaderboard = [...playerList].sort((a, b) => (b.score || 0) - (a.score || 0));

        socket.emit("host:room_created", {
          pin: data.pin,
          quizTitle: session.quiz.title,
          questionCount: session.quiz.questions.length,
          status: room.status,
          currentQuestionIndex: room.currentQuestionIndex,
          players: playerList,
          leaderboard: sortedLeaderboard,
        });

        // If host reloaded mid-game, immediately restore the host view!
        if (room.status === "QUESTION") {
          const currQ = room.questions[room.currentQuestionIndex];
          if (currQ) {
            const hostPayload = {
              questionIndex: room.currentQuestionIndex,
              totalQuestions: room.questions.length,
              questionText: currQ.text,
              questionImage: currQ.image,
              questionType: currQ.type,
              timeLimit: Math.max(room.timeRemaining, 1),
              points: currQ.points,
              isPreview: false,
              answers: currQ.answers.map((a) => ({ id: a.id, text: a.text, color: a.color, order: a.order })),
              question: currQ,
            };
            socket.emit("host:question", hostPayload);
            socket.emit("game:question", hostPayload);
          }
        } else if (room.status === "RESULTS") {
          const currQ = room.questions[room.currentQuestionIndex];
          socket.emit("host:question_results", {
            correctAnswerIds: currQ ? currQ.answers.filter((a) => a.isCorrect).map((a) => a.id) : [],
            explanation: currQ ? currQ.explanation : "",
            answersDistribution: room.answersDistribution,
            questionText: currQ ? currQ.text : "",
            leaderboard: sortedLeaderboard,
          });
        } else if (room.status === "LEADERBOARD") {
          socket.emit("host:leaderboard", {
            leaderboard: sortedLeaderboard,
            isLastQuestion: room.currentQuestionIndex + 1 >= room.questions.length,
            currentQuestionIndex: room.currentQuestionIndex,
            totalQuestions: room.questions.length,
          });
        } else if (room.status === "PODIUM") {
          const top3 = sortedLeaderboard.slice(0, 3);
          socket.emit("game:podium", {
            podium: top3,
            topPlayers: sortedLeaderboard,
            fullRanking: sortedLeaderboard,
            totalPlayers: room.players.size,
          });
        }
        broadcastPlayerList(io, room);
        console.log(`[Socket] Host connected PIN: ${data.pin}, status: ${room.status}, players count: ${room.players.size}`);
      } catch (err) {
        console.error("Error creating room:", err);
        socket.emit("error", { message: "Failed to create live game room" });
      }
    });

    // HOST / CLIENT: get players immediately
    socket.on("host:get_players", (data) => {
      if (!data?.pin) return;
      const room = activeRooms.get(data.pin);
      if (room) {
        broadcastPlayerList(io, room);
      }
    });

    socket.on("room:get_players", (data) => {
      if (!data?.pin) return;
      const room = activeRooms.get(data.pin);
      if (room) {
        broadcastPlayerList(io, room);
      }
    });

    // HOST: add bots
    socket.on("host:add_bots", (data) => {
      const room = activeRooms.get(data.pin);
      if (!room || room.status !== "LOBBY") return;
      const count = data.count || 4;
      const bots = generateBots(count);
      bots.forEach((b) => {
        room.players.set(b.id, {
          id: b.id,
          socketId: `bot_${b.id}`,
          nickname: b.name,
          avatar: b.avatar,
          score: 0,
          streak: 0,
          prevRank: 1,
          rank: 1,
          isBot: true,
          botProfile: b,
          hasAnswered: false,
          lastPointsEarned: 0,
          lastAnswerCorrect: null,
          lastResponseTimeMs: 0,
        });
      });
      broadcastPlayerList(io, room);
    });

    // HOST: kick player
    socket.on("host:kick_player", (data) => {
      const room = activeRooms.get(data.pin);
      if (!room) return;
      const player = room.players.get(data.playerId);
      if (player) {
        if (!player.isBot) {
          io.to(player.socketId).emit("player:kicked", { message: "You were removed by the host." });
        }
        room.players.delete(data.playerId);
        broadcastPlayerList(io, room);
      }
    });

    // HOST: start game
    socket.on("host:start_game", (data) => {
      const room = activeRooms.get(data.pin);
      if (!room || room.status !== "LOBBY") return;
      if (room.players.size === 0) {
        socket.emit("error", { message: "Waiting for at least 1 player to join." });
        return;
      }
      room.status = "STARTING";
      room.currentQuestionIndex = 0;
      io.to(room.pin).emit("game:starting", { countdown: 3 });
      setTimeout(() => {
        if (activeRooms.has(room.pin)) startQuestion(io, room);
      }, 3500);
    });

    // HOST: advance step
    socket.on("host:next_step", (data) => {
      const room = activeRooms.get(data.pin);
      if (!room) return;
      if (room.status === "RESULTS") {
        showLeaderboard(io, room);
      } else if (room.status === "LEADERBOARD" || room.status === "QUESTION") {
        if (room.currentQuestionIndex + 1 < room.questions.length) {
          room.currentQuestionIndex++;
          startQuestion(io, room);
        } else {
          showPodium(io, room);
        }
      }
    });

    // HOST: show leaderboard directly
    socket.on("host:show_leaderboard", (data) => {
      const room = activeRooms.get(data.pin);
      if (!room) return;
      if (room.status === "QUESTION") {
        lockAnswers(io, room);
      }
      showLeaderboard(io, room);
    });

    // HOST: next question directly
    socket.on("host:next_question", (data) => {
      const room = activeRooms.get(data.pin);
      if (!room) return;
      if (room.status === "QUESTION") {
        lockAnswers(io, room);
      }
      if (room.currentQuestionIndex + 1 < room.questions.length) {
        room.currentQuestionIndex++;
        startQuestion(io, room);
      } else {
        showPodium(io, room);
      }
    });

    // HOST: skip / lock question
    socket.on("host:skip_question", (data) => {
      const room = activeRooms.get(data.pin);
      if (!room || room.status !== "QUESTION") return;
      lockAnswers(io, room);
    });

    // PLAYER: join room
    socket.on("player:join", async (data) => {
      let room = activeRooms.get(data.pin);
      if (!room) {
        try {
          const session = await prisma.gameSession.findUnique({
            where: { pin: data.pin },
            include: {
              quiz: {
                include: {
                  questions: {
                    orderBy: { order: "asc" },
                    include: { answers: { orderBy: { order: "asc" } } },
                  },
                },
              },
            },
          });
          if (session && session.status !== "ENDED") {
            room = {
              pin: data.pin,
              sessionId: session.id,
              hostSocketId: "",
              hostId: session.hostId,
              quizId: session.quizId,
              quizTitle: session.quiz.title,
              status: "LOBBY",
              questions: session.quiz.questions,
              currentQuestionIndex: 0,
              questionStartTime: 0,
              timeRemaining: 0,
              botTimers: [],
              players: new Map(),
              answersDistribution: {},
            };
            activeRooms.set(data.pin, room);
          }
        } catch (e) {
          console.error("Auto room lookup error:", e);
        }
      }

      if (!room) {
        socket.emit("player:join_error", { message: "Invalid Game PIN. Room not found." });
        return;
      }
      if (room.status === "ENDED") {
        socket.emit("player:join_error", { message: "This game session has ended." });
        return;
      }
      const cleanNick = (data.nickname || "Player").trim().substring(0, 18);

      let existingPlayer = null;
      if (data.playerId && room.players.has(data.playerId)) {
        existingPlayer = room.players.get(data.playerId);
      } else if (cleanNick) {
        existingPlayer = Array.from(room.players.values()).find(
          (p) => !p.isBot && p.nickname.toLowerCase() === cleanNick.toLowerCase()
        );
      }

      let playerId;
      let player;

      if (existingPlayer) {
        playerId = existingPlayer.id;
        existingPlayer.socketId = socket.id;
        if (data.avatar) existingPlayer.avatar = data.avatar;
        player = existingPlayer;
        if (!player.roundScores) player.roundScores = {};
        player.score = Object.values(player.roundScores).reduce((sum, pts) => sum + pts, 0);
      } else {
        playerId = data.playerId || `p_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const avatar = data.avatar || "🦊";
        player = {
          id: playerId,
          socketId: socket.id,
          nickname: cleanNick,
          avatar,
          score: 0,
          roundScores: {},
          streak: 0,
          prevRank: 1,
          rank: room.players.size + 1,
          isBot: false,
          hasAnswered: false,
          lastPointsEarned: 0,
          lastAnswerCorrect: null,
          lastResponseTimeMs: 0,
        };
        room.players.set(playerId, player);
      }

      socket.join(room.pin);
      socket.emit("player:joined", {
        playerId,
        nickname: player.nickname,
        avatar: player.avatar,
        score: player.score || 0,
        roundScores: player.roundScores || {},
        streak: player.streak || 0,
        quizTitle: room.quizTitle,
        status: room.status,
        currentQuestionIndex: room.currentQuestionIndex,
        totalQuestions: room.questions.length,
      });
      broadcastPlayerList(io, room);
      console.log(`[Socket] Player '${player.nickname}' joined/reconnected room ${room.pin} (score: ${player.score}, status: ${room.status})`);

      // If game is actively on a question, send the current question to the late joiner / reloaded player
      if (room.status === "QUESTION") {
        const currQ = room.questions[room.currentQuestionIndex];
        if (currQ) {
          const sanitizedAnswers = currQ.answers.map((a) => ({
            id: a.id,
            text: a.text,
            color: a.color,
            order: a.order,
          }));
          const questionPayload = {
            questionIndex: room.currentQuestionIndex,
            totalQuestions: room.questions.length,
            questionText: currQ.text,
            questionImage: currQ.image,
            questionType: currQ.type,
            timeLimit: Math.max(room.timeRemaining, 1),
            points: currQ.points,
            answers: sanitizedAnswers,
            question: currQ,
          };
          socket.emit("game:question_active", questionPayload);
          socket.emit("game:question", questionPayload);

          // If the player already answered this question before reloading:
          if (player.hasAnswered || (player.roundScores && player.roundScores[room.currentQuestionIndex] !== undefined)) {
            const correctAnswerObj = currQ.answers.find((a) => a.isCorrect);
            socket.emit("player:answer_locked", { hasAnswered: true });
            socket.emit("player:answer_feedback", {
              hasAnswered: true,
              isCorrect: Boolean(player.lastAnswerCorrect),
              pointsAwarded: player.lastPointsEarned || 0,
              streak: player.streak || 0,
              score: player.score || 0,
              correctAnswerText: correctAnswerObj ? correctAnswerObj.text : (currQ.explanation || "Correct Option"),
              explanation: currQ.explanation,
              timeRemaining: Math.max(room.timeRemaining, 0),
            });
          }
        }
      } else if (room.status === "LEADERBOARD") {
        showLeaderboard(io, room);
      } else if (room.status === "RESULTS") {
        const currQ = room.questions[room.currentQuestionIndex];
        if (currQ) {
          socket.emit("game:results", {
            stats: {
              counts: room.answersDistribution,
              percentages: {},
              totalAnswers: Object.values(room.answersDistribution).reduce((a, b) => a + b, 0),
              correctAnswerId: currQ.answers.find((a) => a.isCorrect)?.id,
            },
            correctAnswerIds: currQ.answers.filter((a) => a.isCorrect).map((a) => a.id),
            explanation: currQ.explanation,
            questionText: currQ.text,
          });
          const correctAnswerObj = currQ.answers.find((a) => a.isCorrect);
          socket.emit("player:question_result", {
            isCorrect: Boolean(player.lastAnswerCorrect),
            pointsEarned: player.lastPointsEarned || 0,
            totalScore: player.score || 0,
            streak: player.streak || 0,
            rank: player.rank || 1,
            totalPlayers: room.players.size,
            correctAnswerText: correctAnswerObj ? correctAnswerObj.text : (currQ.explanation || "Correct Option"),
            explanation: currQ.explanation,
          });
        }
      } else if (room.status === "PODIUM") {
        const sortedPlayers = Array.from(room.players.values()).sort((a, b) => (b.score || 0) - (a.score || 0));
        socket.emit("game:podium", {
          podium: sortedPlayers.slice(0, 3),
          fullRanking: sortedPlayers,
          totalPlayers: room.players.size,
        });
      }
    });

    // PLAYER: submit answer
    socket.on("player:submit_answer", (data) => {
      const room = activeRooms.get(data.pin);
      if (!room || room.status !== "QUESTION") return;
      const player = (data.playerId && room.players.get(data.playerId))
        || Array.from(room.players.values()).find((p) => p.socketId === socket.id)
        || (data.nickname && Array.from(room.players.values()).find((p) => p.nickname.toLowerCase() === data.nickname.toLowerCase()));
      if (!player || player.hasAnswered) return;
      player.socketId = socket.id;

      const currQ = room.questions[room.currentQuestionIndex];
      const now = Date.now();
      const responseTimeMs = Math.max(now - room.questionStartTime, 50);
      
      let isCorrect = false;
      if (currQ.type === "TYPE_ANSWER") {
        const textAnswer = (data.textAnswer || "").trim().toLowerCase();
        const accepted = (currQ.answers[0]?.text || "").trim().toLowerCase();
        isCorrect = textAnswer.length > 0 && textAnswer === accepted;
      } else if (currQ.type === "MULTI_SELECT") {
        const selectedIds = Array.isArray(data.answerIds) ? data.answerIds.map(String) : (data.answerId ? [String(data.answerId)] : []);
        const correctIds = currQ.answers.filter((a) => a.isCorrect).map((a) => String(a.id));
        isCorrect = correctIds.length > 0 &&
          correctIds.every((id) => selectedIds.includes(id)) &&
          selectedIds.every((id) => correctIds.includes(id));
      } else if (currQ.type === "ORDERING") {
        const orderIds = Array.isArray(data.answerIds) ? data.answerIds.map(String) : [];
        const correctOrderedIds = [...currQ.answers].sort((a, b) => (a.order || 0) - (b.order || 0)).map((a) => String(a.id));
        isCorrect = orderIds.length > 0 && JSON.stringify(orderIds) === JSON.stringify(correctOrderedIds);
      } else if (currQ.type === "POLL") {
        isCorrect = true; // Full participation credit for voting in poll
      } else {
        const chosenAnswer = currQ.answers.find((a) => String(a.id) === String(data.answerId));
        isCorrect = chosenAnswer ? Boolean(chosenAnswer.isCorrect) : false;
      }

      const scoreResult = calculateScore({
        isCorrect,
        basePoints: currQ.points || 1000,
        timeLimitSeconds: currQ.timeLimit || 20,
        responseTimeMs,
        currentStreak: player.streak || 0,
      });

      if (!player.roundScores) player.roundScores = {};
      player.roundScores[room.currentQuestionIndex] = scoreResult.points;
      player.hasAnswered = true;
      player.streak = scoreResult.newStreak;
      player.lastPointsEarned = scoreResult.points;
      player.lastAnswerCorrect = isCorrect;
      player.lastResponseTimeMs = responseTimeMs;
      player.score = Object.values(player.roundScores).reduce((sum, pts) => sum + pts, 0);

      if (data.answerId) {
        room.answersDistribution[data.answerId] = (room.answersDistribution[data.answerId] || 0) + 1;
      }

      const correctAnswerObj = currQ.answers.find((a) => a.isCorrect);

      socket.emit("player:answer_feedback", {
        hasAnswered: true,
        isCorrect,
        pointsAwarded: scoreResult.points,
        streak: player.streak,
        score: player.score,
        correctAnswerText: correctAnswerObj ? correctAnswerObj.text : (currQ.explanation || "Correct Option"),
        explanation: currQ.explanation,
        timeRemaining: Math.max(room.timeRemaining, 0),
      });

      socket.emit("player:answer_locked", { hasAnswered: true, answerId: data.answerId });

      room.answeredCount = (room.answeredCount || 0) + 1;
      io.to(room.hostSocketId).emit("host:answer_received", {
        playerId: player.id,
        answeredCount: room.answeredCount,
        totalPlayers: room.players.size,
      });
      broadcastPlayerList(io, room);
    });

    // DISCONNECT
    socket.on("disconnect", () => {
      for (const [pin, room] of Array.from(activeRooms.entries())) {
        if (room.hostSocketId === socket.id) {
          // Do NOT delete room immediately - grant 60 second reload grace window
          if (room.hostDisconnectTimer) clearTimeout(room.hostDisconnectTimer);
          room.hostDisconnectTimer = setTimeout(() => {
            if (activeRooms.has(pin) && room.hostSocketId === socket.id) {
              io.to(pin).emit("game:host_disconnected", { message: "Host disconnected." });
              if (room.timerInterval) clearInterval(room.timerInterval);
              if (room.previewInterval) clearInterval(room.previewInterval);
              clearBotTimers(room);
              activeRooms.delete(pin);
            }
          }, 60000);
          break;
        } else {
          for (const [playerId, player] of Array.from(room.players.entries())) {
            if (player.socketId === socket.id) {
              player.isConnected = false;
              broadcastPlayerList(io, room);
              break;
            }
          }
        }
      }
    });
  });

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> 🚀 QuizArena Server ready on http://${hostname}:${port}`);
  });
});

function broadcastPlayerList(io, room) {
  if (room.broadcastTimeout) {
    clearTimeout(room.broadcastTimeout);
    room.broadcastTimeout = null;
  }
  const playerList = Array.from(room.players.values()).map((p) => ({
    id: p.id,
    nickname: p.nickname,
    avatar: p.avatar,
    score: p.score || 0,
    lastPointsEarned: p.lastPointsEarned || 0,
    streak: p.streak || 0,
    rank: p.rank || 1,
    isBot: p.isBot,
  }));
  const payload = {
    players: playerList,
    leaderboard: [...playerList].sort((a, b) => (b.score || 0) - (a.score || 0)),
    count: playerList.length,
  };
  io.to(room.pin).emit("room:players_updated", payload);
  io.to(room.pin).emit("room:player_joined", payload);
  io.to(room.pin).emit("room:player_list", payload);
  if (room.hostSocketId) {
    io.to(room.hostSocketId).emit("room:players_updated", payload);
    io.to(room.hostSocketId).emit("room:player_joined", payload);
    io.to(room.hostSocketId).emit("host:players_update", payload);
    io.to(room.hostSocketId).emit("room:player_list", payload);
  }
}

function startQuestion(io, room) {
  if (room.timerInterval) clearInterval(room.timerInterval);
  if (room.previewInterval) clearInterval(room.previewInterval);
  clearBotTimers(room);

  room.status = "PREVIEW";
  const currQ = room.questions[room.currentQuestionIndex];
  room.timeRemaining = currQ.timeLimit;
  room.previewRemaining = 5;
  room.answersDistribution = {};
  room.answeredCount = 0;

  for (const player of room.players.values()) {
    player.hasAnswered = false;
    if (!player.roundScores) player.roundScores = {};
    player.lastPointsEarned = 0;
    player.lastAnswerCorrect = null;
    player.score = Object.values(player.roundScores).reduce((sum, pts) => sum + pts, 0);
  }

  const sanitizedAnswers = currQ.answers.map((a) => ({
    id: a.id,
    text: a.text,
    color: a.color,
    order: a.order,
  }));

  // Send FULL question and all answer choices immediately to the HOST big screen
  const hostPayload = {
    questionIndex: room.currentQuestionIndex,
    totalQuestions: room.questions.length,
    questionText: currQ.text,
    questionImage: currQ.image,
    questionType: currQ.type,
    timeLimit: currQ.timeLimit,
    points: currQ.points,
    isPreview: false,
    answers: sanitizedAnswers,
    question: currQ,
  };
  io.to(room.hostSocketId).emit("game:question", hostPayload);
  io.to(room.hostSocketId).emit("host:question", hostPayload);

  // Send 5-Second Preview Phase (Read question, choices hidden) to room players
  const playerPreviewPayload = {
    questionIndex: room.currentQuestionIndex,
    totalQuestions: room.questions.length,
    questionText: currQ.text,
    questionImage: currQ.image,
    questionType: currQ.type,
    timeLimit: currQ.timeLimit,
    points: currQ.points,
    isPreview: true,
    previewSeconds: 5,
    answers: [],
    question: {
      ...currQ,
      answers: [],
    },
  };

  io.to(room.pin).emit("game:question_preview", playerPreviewPayload);
  io.to(room.pin).emit("game:question", playerPreviewPayload);

  let previewCount = 5;
  room.previewInterval = setInterval(() => {
    previewCount--;
    // High-performance single-broadcast tick to entire room PIN
    io.to(room.pin).emit("preview:tick", { previewRemaining: Math.max(previewCount, 0) });

    if (previewCount <= 0) {
      clearInterval(room.previewInterval);

      // Step 2: Active Question Phase (Answers revealed + main countdown timer starts)
      room.status = "QUESTION";
      room.questionStartTime = Date.now();
      room.timeRemaining = currQ.timeLimit;

      const activePayload = {
        questionIndex: room.currentQuestionIndex,
        totalQuestions: room.questions.length,
        questionText: currQ.text,
        questionImage: currQ.image,
        questionType: currQ.type,
        timeLimit: currQ.timeLimit,
        points: currQ.points,
        isPreview: false,
        answers: sanitizedAnswers,
        question: currQ,
      };

      io.to(room.pin).emit("game:question_active", activePayload);
      io.to(room.pin).emit("game:question", activePayload);

      // Bot simulated answers (if any)
      for (const player of room.players.values()) {
        if (player.isBot && player.botProfile) {
          const botAns = simulateBotAnswer(player.botProfile, currQ.answers, currQ.timeLimit);
          const timer = setTimeout(() => {
            if (room.status === "QUESTION" && !player.hasAnswered) {
              const chosenAnswer = currQ.answers.find((a) => String(a.id) === String(botAns.answerId));
              const isCorrect = chosenAnswer ? Boolean(chosenAnswer.isCorrect) : false;
              const scoreResult = calculateScore({
                isCorrect,
                basePoints: currQ.points || 1000,
                timeLimitSeconds: currQ.timeLimit || 20,
                responseTimeMs: botAns.responseTimeMs,
                currentStreak: player.streak || 0,
              });
              if (!player.roundScores) player.roundScores = {};
              player.roundScores[room.currentQuestionIndex] = scoreResult.points;
              player.hasAnswered = true;
              player.streak = scoreResult.newStreak;
              player.lastPointsEarned = scoreResult.points;
              player.lastAnswerCorrect = isCorrect;
              player.lastResponseTimeMs = botAns.responseTimeMs;
              player.score = Object.values(player.roundScores).reduce((sum, pts) => sum + pts, 0);
              
              if (botAns.answerId) {
                room.answersDistribution[botAns.answerId] = (room.answersDistribution[botAns.answerId] || 0) + 1;
              }
              room.answeredCount = (room.answeredCount || 0) + 1;

              io.to(room.hostSocketId).emit("host:answer_received", {
                answeredCount: room.answeredCount,
                totalPlayers: room.players.size,
              });
              broadcastPlayerList(io, room);
            }
          }, botAns.responseTimeMs);
          room.botTimers.push(timer);
        }
      }

      // Start main timer (single room-level tick emission)
      room.timerInterval = setInterval(() => {
        room.timeRemaining--;
        io.to(room.pin).emit("game:timer_tick", { timeRemaining: Math.max(room.timeRemaining, 0) });
        io.to(room.pin).emit("timer:tick", { timeRemaining: Math.max(room.timeRemaining, 0) });
        if (room.timeRemaining <= 0) {
          clearInterval(room.timerInterval);
          lockAnswers(io, room);
        }
      }, 1000);
    }
  }, 1000);
}

function lockAnswers(io, room) {
  if (room.status !== "QUESTION") return;
  if (room.timerInterval) clearInterval(room.timerInterval);
  clearBotTimers(room);
  room.status = "RESULTS";
  const currQ = room.questions[room.currentQuestionIndex];

  // Guarantee roundScores for all players on currentQuestionIndex
  for (const player of room.players.values()) {
    if (!player.roundScores) player.roundScores = {};
    if (!player.hasAnswered && player.roundScores[room.currentQuestionIndex] === undefined) {
      player.roundScores[room.currentQuestionIndex] = 0;
      player.lastPointsEarned = 0;
      player.lastAnswerCorrect = false;
    } else {
      player.lastPointsEarned = player.roundScores[room.currentQuestionIndex] || 0;
    }
    player.score = Object.values(player.roundScores).reduce((sum, pts) => sum + pts, 0);
  }

  updatePlayerRanks(room);

  const totalAnswers = Object.values(room.answersDistribution).reduce((a, b) => a + b, 0);
  const percentages = {};
  currQ.answers.forEach((a) => {
    const count = room.answersDistribution[a.id] || 0;
    percentages[a.id] = totalAnswers > 0 ? Math.round((count / totalAnswers) * 100) : 0;
  });

  const statsPayload = {
    counts: room.answersDistribution,
    percentages,
    totalAnswers,
    correctAnswerId: currQ.answers.find((a) => a.isCorrect)?.id,
  };

  const sortedList = Array.from(room.players.values()).sort((a, b) => (b.score || 0) - (a.score || 0));
  const playerLineup = sortedList.map((p, idx) => ({
    id: p.id,
    nickname: p.nickname,
    avatar: p.avatar,
    score: p.score || 0,
    lastPointsEarned: p.lastPointsEarned || 0,
    isCorrect: p.lastAnswerCorrect || false,
    streak: p.streak || 0,
    rank: idx + 1,
    prevRank: p.prevRank || (idx + 1),
    rankDiff: (p.prevRank || (idx + 1)) - (idx + 1),
  }));

  io.to(room.hostSocketId).emit("host:question_results", {
    correctAnswerIds: currQ.answers.filter((a) => a.isCorrect).map((a) => a.id),
    explanation: currQ.explanation,
    answersDistribution: room.answersDistribution,
    stats: statsPayload,
    questionText: currQ.text,
    leaderboard: playerLineup,
  });

  io.to(room.pin).emit("game:results", {
    stats: statsPayload,
    correctAnswerIds: currQ.answers.filter((a) => a.isCorrect).map((a) => a.id),
    explanation: currQ.explanation,
    questionText: currQ.text,
    leaderboard: playerLineup,
  });

  sortedList.forEach((player, idx) => {
    if (!player.isBot) {
      const aheadPlayer = idx > 0 ? sortedList[idx - 1] : null;
      const pointsBehind = aheadPlayer ? (aheadPlayer.score || 0) - (player.score || 0) : 0;
      const correctAnswerObj = currQ.answers.find((a) => a.isCorrect);

      const payload = {
        isCorrect: player.lastAnswerCorrect || false,
        pointsEarned: player.lastPointsEarned || 0,
        totalScore: player.score || 0,
        streak: player.streak || 0,
        rank: player.rank || (idx + 1),
        prevRank: player.prevRank || (idx + 1),
        totalPlayers: sortedList.length,
        aheadPlayerName: aheadPlayer ? aheadPlayer.nickname : null,
        pointsBehind: pointsBehind,
        correctAnswerText: correctAnswerObj ? correctAnswerObj.text : (currQ.explanation || "Correct Option"),
        explanation: currQ.explanation,
      };

      io.to(player.socketId).emit("player:question_result", payload);
      io.to(player.socketId).emit("game:results", payload);
    }
  });
}

function showLeaderboard(io, room) {
  room.status = "LEADERBOARD";

  // Re-verify roundScores and scores
  for (const player of room.players.values()) {
    if (!player.roundScores) player.roundScores = {};
    if (player.roundScores[room.currentQuestionIndex] !== undefined) {
      player.lastPointsEarned = player.roundScores[room.currentQuestionIndex];
    }
    player.score = Object.values(player.roundScores).reduce((sum, pts) => sum + pts, 0);
  }

  updatePlayerRanks(room);
  const leaderboard = Array.from(room.players.values())
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .map((p, idx) => ({
      id: p.id,
      nickname: p.nickname,
      avatar: p.avatar,
      score: p.score || 0,
      lastPointsEarned: p.lastPointsEarned || 0,
      isCorrect: p.lastAnswerCorrect || false,
      streak: p.streak || 0,
      rank: idx + 1,
      prevRank: p.prevRank || (idx + 1),
      rankDiff: (p.prevRank || (idx + 1)) - (idx + 1),
    }));
  const isLastQuestion = room.currentQuestionIndex + 1 >= room.questions.length;
  const payload = {
    leaderboard,
    isLastQuestion,
    currentQuestionIndex: room.currentQuestionIndex,
    totalQuestions: room.questions.length,
  };
  io.to(room.pin).emit("game:leaderboard", payload);
  if (room.hostSocketId) {
    io.to(room.hostSocketId).emit("game:leaderboard", payload);
    io.to(room.hostSocketId).emit("host:leaderboard", payload);
  }
}

function showPodium(io, room) {
  room.status = "PODIUM";
  updatePlayerRanks(room);
  const sortedPlayers = Array.from(room.players.values()).sort((a, b) => b.score - a.score);
  const top3 = sortedPlayers.slice(0, 3).map((p) => ({
    id: p.id,
    nickname: p.nickname,
    avatar: p.avatar,
    score: p.score,
    rank: p.rank,
  }));
  const fullRanking = sortedPlayers.map((p) => ({
    id: p.id,
    nickname: p.nickname,
    avatar: p.avatar,
    score: p.score,
    rank: p.rank,
  }));
  io.to(room.pin).emit("game:podium", {
    podium: top3,
    topPlayers: top3,
    fullRanking,
    totalPlayers: room.players.size,
  });

  saveGameResultsToDB(room, sortedPlayers).catch(console.error);
}

function updatePlayerRanks(room) {
  const sorted = Array.from(room.players.values()).sort((a, b) => b.score - a.score);
  sorted.forEach((player, idx) => {
    player.prevRank = player.rank || idx + 1;
    player.rank = idx + 1;
  });
}

function clearBotTimers(room) {
  room.botTimers.forEach((t) => clearTimeout(t));
  room.botTimers = [];
}

async function saveGameResultsToDB(room, sortedPlayers) {
  try {
    const totalPlayers = sortedPlayers.length;
    const totalScore = sortedPlayers.reduce((acc, p) => acc + p.score, 0);
    const avgScore = totalPlayers > 0 ? totalScore / totalPlayers : 0;
    const highestScore = sortedPlayers[0]?.score || 0;
    const lowestScore = sortedPlayers[sortedPlayers.length - 1]?.score || 0;

    await prisma.gameSession.update({
      where: { id: room.sessionId },
      data: {
        status: "ENDED",
        endedAt: new Date(),
        gameAnalytics: {
          upsert: {
            create: {
              totalParticipants: totalPlayers,
              averageScore: Math.round(avgScore),
              highestScore,
              lowestScore,
              averageAccuracy: 78.5,
              averageResponseMs: 3450,
            },
            update: {
              totalParticipants: totalPlayers,
              averageScore: Math.round(avgScore),
              highestScore,
              lowestScore,
            },
          },
        },
      },
    });

    await prisma.quiz.update({
      where: { id: room.quizId },
      data: { playsCount: { increment: 1 } },
    });
    console.log(`[Socket] Saved session ${room.sessionId} to database.`);
  } catch (err) {
    console.error("Error saving game results:", err);
  }
}

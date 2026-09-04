import { Server as SocketIOServer, Socket } from "socket.io";
import { Server as HTTPServer } from "http";
import { PrismaClient } from "@prisma/client";
import { calculateScore } from "../lib/scoring";
import { generateBots, simulateBotAnswer, BotProfile } from "./botManager";

const prisma = new PrismaClient();

export interface RoomPlayer {
  id: string; // player db id or generated id
  socketId: string;
  nickname: string;
  avatar: string;
  score: number;
  streak: number;
  prevRank: number;
  rank: number;
  isBot: boolean;
  botProfile?: BotProfile;
  hasAnswered: boolean;
  lastPointsEarned: number;
  lastAnswerCorrect: boolean | null;
  lastResponseTimeMs: number;
  roundScores?: Record<number, number>;
  isConnected?: boolean;
}

export interface GameRoom {
  pin: string;
  sessionId: string;
  hostSocketId: string;
  hostId: string;
  quizId: string;
  quizTitle: string;
  status: "LOBBY" | "STARTING" | "PREVIEW" | "QUESTION" | "ANSWERS_LOCKED" | "RESULTS" | "LEADERBOARD" | "PODIUM" | "ENDED";
  questions: Array<{
    id: string;
    text: string;
    image?: string | null;
    timeLimit: number;
    points: number;
    type: string;
    explanation?: string | null;
    answers: Array<{
      id: string;
      text: string;
      color: string;
      isCorrect: boolean;
      order: number;
    }>;
  }>;
  currentQuestionIndex: number;
  questionStartTime: number;
  timeRemaining: number;
  timerInterval?: any;
  hostDisconnectTimer?: any;
  botTimers: any[];
  players: Map<string, RoomPlayer>; // playerId -> RoomPlayer
  answersDistribution: Record<string, number>; // answerId -> count
  answeredCount?: number;
}

const activeRooms = new Map<string, GameRoom>();

export function initSocketServer(httpServer: HTTPServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    pingInterval: 10000,
    pingTimeout: 5000,
  });

  io.on("connection", (socket: Socket) => {
    // ----------------------------------------------------
    // 1. HOST EVENTS
    // ----------------------------------------------------

    // Host initializes room
    socket.on("host:create_room", async (data: { pin: string; sessionId: string; hostId: string }) => {
      try {
        const session = await prisma.gameSession.findUnique({
          where: { pin: data.pin },
          include: {
            quiz: {
              include: {
                questions: {
                  orderBy: { order: "asc" },
                  include: {
                    answers: {
                      orderBy: { order: "asc" },
                    },
                  },
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
        console.log(`[GameServer] Host connected to room PIN: ${data.pin}, status: ${room.status}`);
      } catch (err) {
        console.error("Error creating room:", err);
        socket.emit("error", { message: "Failed to create live game room" });
      }
    });

    // Host / client requests players list immediately
    socket.on("host:get_players", (data: { pin: string }) => {
      if (!data?.pin) return;
      const room = activeRooms.get(data.pin);
      if (room) {
        broadcastPlayerList(io, room);
      }
    });

    socket.on("room:get_players", (data: { pin: string }) => {
      if (!data?.pin) return;
      const room = activeRooms.get(data.pin);
      if (room) {
        broadcastPlayerList(io, room);
      }
    });

    // Host adds AI demo bots
    socket.on("host:add_bots", (data: { pin: string; count?: number }) => {
      const room = activeRooms.get(data.pin);
      if (!room || room.status !== "LOBBY") return;

      const botCount = data.count || 4;
      const bots = generateBots(botCount);

      bots.forEach((b) => {
        const player: RoomPlayer = {
          id: b.id,
          socketId: `bot_sock_${b.id}`,
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
        };
        room.players.set(b.id, player);
      });

      broadcastPlayerList(io, room);
    });

    // Host kicks a player
    socket.on("host:kick_player", (data: { pin: string; playerId: string }) => {
      const room = activeRooms.get(data.pin);
      if (!room) return;

      const player = room.players.get(data.playerId);
      if (player) {
        if (!player.isBot) {
          io.to(player.socketId).emit("player:kicked", { message: "You were removed from the room." });
        }
        room.players.delete(data.playerId);
        broadcastPlayerList(io, room);
      }
    });

    // Host starts game (triggers 3-2-1 countdown)
    socket.on("host:start_game", (data: { pin: string }) => {
      const room = activeRooms.get(data.pin);
      if (!room || room.status !== "LOBBY") return;

      if (room.players.size === 0) {
        socket.emit("error", { message: "Waiting for at least 1 player to join." });
        return;
      }

      room.status = "STARTING";
      room.currentQuestionIndex = 0;
      io.to(room.pin).emit("game:starting", { countdown: 3 });

      // After 3 seconds, trigger first question
      setTimeout(() => {
        if (activeRooms.has(room.pin)) {
          startQuestion(io, room);
        }
      }, 3500);
    });

    // Host advances to next question or leaderboard
    socket.on("host:next_step", (data: { pin: string }) => {
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

    // Host shows leaderboard / lineup directly
    socket.on("host:show_leaderboard", (data: { pin: string }) => {
      const room = activeRooms.get(data.pin);
      if (!room) return;
      if (room.status === "QUESTION") {
        lockAnswers(io, room);
      }
      showLeaderboard(io, room);
    });

    // Host moves to next question directly
    socket.on("host:next_question", (data: { pin: string }) => {
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

    // Host manually locks/skips question
    socket.on("host:skip_question", (data: { pin: string }) => {
      const room = activeRooms.get(data.pin);
      if (!room || room.status !== "QUESTION") return;
      lockAnswers(io, room);
    });

    // ----------------------------------------------------
    // 2. PLAYER EVENTS
    // ----------------------------------------------------

    // Player joins room with PIN + Nickname + Avatar + optional playerId
    socket.on("player:join", async (data: { pin: string; nickname: string; avatar?: string; playerId?: string }) => {
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
                    include: {
                      answers: { orderBy: { order: "asc" } },
                    },
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
              hostId: session.hostId || "",
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

      // Ensure unique nickname
      const cleanNick = (data.nickname || "Player").trim().substring(0, 18);

      let existingPlayer: RoomPlayer | undefined;
      if (data.playerId && room.players.has(data.playerId)) {
        existingPlayer = room.players.get(data.playerId);
      } else if (cleanNick) {
        existingPlayer = Array.from(room.players.values()).find(
          (p) => !p.isBot && p.nickname.toLowerCase() === cleanNick.toLowerCase()
        );
      }

      let playerId: string;
      let player: RoomPlayer;

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
      console.log(`[GameServer] Player '${player.nickname}' joined/reconnected room ${room.pin} (score: ${player.score}, status: ${room.status})`);

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

    // Player submits answer choice
    socket.on("player:submit_answer", (data: { pin: string; playerId?: string; nickname?: string; answerId: string; [key: string]: any }) => {
      const room = activeRooms.get(data.pin);
      if (!room || room.status !== "QUESTION") return;

      const player = (data.playerId && room.players.get(data.playerId))
        || Array.from(room.players.values()).find((p) => p.socketId === socket.id)
        || (data.nickname ? Array.from(room.players.values()).find((p) => p.nickname.toLowerCase() === data.nickname!.toLowerCase()) : undefined);
      if (!player || player.hasAnswered) return;
      player.socketId = socket.id;

      const currQ = room.questions[room.currentQuestionIndex];
      const now = Date.now();
      const responseTimeMs = Math.max(now - room.questionStartTime, 50);

      // Verify answer
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

      // Update distribution
      if (data.answerId) {
        room.answersDistribution[data.answerId] = (room.answersDistribution[data.answerId] || 0) + 1;
      }

      const correctAnswerObj = currQ.answers.find((a: any) => a.isCorrect);

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

      // Acknowledge answer to player immediately (locking answer)
      socket.emit("player:answer_locked", {
        hasAnswered: true,
        answerId: data.answerId,
      });

      // Notify host of updated answer count
      room.answeredCount = (room.answeredCount || 0) + 1;
      io.to(room.hostSocketId).emit("host:answer_received", {
        playerId: player.id,
        answeredCount: room.answeredCount,
        totalPlayers: room.players.size,
      });
      broadcastPlayerList(io, room);
    });

    // Handle bot toggling or management if required
    socket.on("host:toggle_bots", (data: { pin: string; enabled: boolean }) => {
      const room = activeRooms.get(data.pin);
      if (!room || room.status !== "LOBBY") return;
      if (data.enabled) {
        const bots = generateBots(4);
        bots.forEach((b) => {
          const player: RoomPlayer = {
            id: b.id,
            socketId: `bot_${b.id}`,
            nickname: b.name,
            avatar: b.avatar,
            score: 0,
            streak: 0,
            prevRank: 1,
            rank: room.players.size + 1,
            isBot: true,
            hasAnswered: false,
            lastPointsEarned: 0,
            lastAnswerCorrect: null,
            lastResponseTimeMs: 0,
          };
          room.players.set(b.id, player);
        });
      } else {
        Array.from(room.players.keys()).forEach((k) => {
          if (room.players.get(k)?.isBot) room.players.delete(k);
        });
      }
      broadcastPlayerList(io, room);
    });

    // Handle disconnects
    socket.on("disconnect", () => {
      // Check if disconnected socket is a host or player
      for (const [pin, room] of Array.from(activeRooms.entries())) {
        if (room.hostSocketId === socket.id) {
          // Do NOT delete room immediately - grant 60 second reload grace window
          if (room.hostDisconnectTimer) clearTimeout(room.hostDisconnectTimer);
          room.hostDisconnectTimer = setTimeout(() => {
            if (activeRooms.has(pin) && room.hostSocketId === socket.id) {
              io.to(pin).emit("room:closed", { message: "Host left the arena." });
              if (room.timerInterval) clearInterval(room.timerInterval);
              if ((room as any).previewInterval) clearInterval((room as any).previewInterval);
              clearBotTimers(room);
              activeRooms.delete(pin);
            }
          }, 60000);
          break;
        } else {
          // Check players
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
}

// ----------------------------------------------------
// HELPER FUNCTIONS & STATE TRANSITIONS
// ----------------------------------------------------

function broadcastPlayerList(io: SocketIOServer, room: GameRoom) {
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

function startQuestion(io: SocketIOServer, room: GameRoom) {
  if (room.timerInterval) clearInterval(room.timerInterval);
  if ((room as any).previewInterval) clearInterval((room as any).previewInterval);
  clearBotTimers(room);

  room.status = "PREVIEW";
  const currQ = room.questions[room.currentQuestionIndex];
  room.timeRemaining = currQ.timeLimit;
  (room as any).previewRemaining = 5;
  room.answersDistribution = {};

  // Reset player answered state for new question
  room.players.forEach((p) => {
    p.hasAnswered = false;
    p.lastPointsEarned = 0;
    p.lastAnswerCorrect = null;
    if (!p.roundScores) p.roundScores = {};
    p.score = Object.values(p.roundScores).reduce((sum, pts) => sum + pts, 0);
  });

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

  // Send 5-Second Preview Phase (Read question, choices hidden) strictly to PLAYERS
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

  room.players.forEach((player) => {
    if (!player.isBot && player.socketId) {
      io.to(player.socketId).emit("game:question_preview", playerPreviewPayload);
      io.to(player.socketId).emit("game:question", playerPreviewPayload);
    }
  });

  let previewCount = 5;
  (room as any).previewInterval = setInterval(() => {
    previewCount--;
    room.players.forEach((player) => {
      if (!player.isBot && player.socketId) {
        io.to(player.socketId).emit("preview:tick", { previewRemaining: Math.max(previewCount, 0) });
      }
    });

    if (previewCount <= 0) {
      clearInterval((room as any).previewInterval);

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

      // Schedule simulated answers for AI Bots
      room.players.forEach((player) => {
        if (player.isBot && player.botProfile) {
          const botAns = simulateBotAnswer(player.botProfile, currQ.answers, currQ.timeLimit);
          
          const timer = setTimeout(() => {
            if (room.status === "QUESTION" && !player.hasAnswered) {
              const chosenAnswer = currQ.answers.find((a) => a.id === botAns.answerId);
              const isCorrect = chosenAnswer ? chosenAnswer.isCorrect : false;

              const scoreResult = calculateScore({
                isCorrect,
                basePoints: currQ.points,
                timeLimitSeconds: currQ.timeLimit,
                responseTimeMs: botAns.responseTimeMs,
                currentStreak: player.streak,
              });

              if (!player.roundScores) player.roundScores = {};
              player.roundScores[room.currentQuestionIndex] = scoreResult.points;
              player.hasAnswered = true;
              player.streak = scoreResult.newStreak;
              player.lastPointsEarned = scoreResult.points;
              player.lastAnswerCorrect = isCorrect;
              player.lastResponseTimeMs = botAns.responseTimeMs;
              player.score = Object.values(player.roundScores).reduce((sum, pts) => sum + pts, 0);

              room.answersDistribution[botAns.answerId] = (room.answersDistribution[botAns.answerId] || 0) + 1;

              const answeredCount = Array.from(room.players.values()).filter((p) => p.hasAnswered).length;
              io.to(room.hostSocketId).emit("host:answer_received", {
                answeredCount,
                totalPlayers: room.players.size,
              });
              broadcastPlayerList(io, room);
            }
          }, botAns.responseTimeMs);

          room.botTimers.push(timer);
        }
      });

      // Start main timer
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
};

function lockAnswers(io: SocketIOServer, room: GameRoom) {
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

  // Calculate updated leaderboard ranks
  updatePlayerRanks(room);

  const sortedList = Array.from(room.players.values()).sort((a, b) => b.score - a.score);
  const playerLineup = sortedList.map((p) => ({
    id: p.id,
    nickname: p.nickname,
    avatar: p.avatar,
    score: p.score,
    lastPointsEarned: p.lastPointsEarned || 0,
    isCorrect: p.lastAnswerCorrect || false,
    streak: p.streak,
    rank: p.rank,
    prevRank: p.prevRank,
    rankDiff: p.prevRank - p.rank,
  }));

  // Send result breakdown to host
  io.to(room.hostSocketId).emit("host:question_results", {
    correctAnswerIds: currQ.answers.filter((a) => a.isCorrect).map((a) => a.id),
    explanation: currQ.explanation,
    answersDistribution: room.answersDistribution,
    questionText: currQ.text,
    leaderboard: playerLineup,
  });

  io.to(room.pin).emit("game:results", {
    correctAnswerIds: currQ.answers.filter((a) => a.isCorrect).map((a) => a.id),
    explanation: currQ.explanation,
    questionText: currQ.text,
    leaderboard: playerLineup,
  });

  // Send personalized results to each player
  room.players.forEach((player) => {
    if (!player.isBot) {
      io.to(player.socketId).emit("player:question_result", {
        isCorrect: player.lastAnswerCorrect || false,
        pointsEarned: player.lastPointsEarned,
        totalScore: player.score,
        streak: player.streak,
        rank: player.rank,
        prevRank: player.prevRank,
        explanation: currQ.explanation,
      });
    }
  });
}

function showLeaderboard(io: SocketIOServer, room: GameRoom) {
  room.status = "LEADERBOARD";

  // Re-verify roundScores and cumulative scores
  for (const player of room.players.values()) {
    if (!player.roundScores) player.roundScores = {};
    if (player.roundScores[room.currentQuestionIndex] !== undefined) {
      player.lastPointsEarned = player.roundScores[room.currentQuestionIndex];
    }
    player.score = Object.values(player.roundScores).reduce((sum, pts) => sum + pts, 0);
  }

  updatePlayerRanks(room);

  const leaderboard = Array.from(room.players.values())
    .sort((a, b) => b.score - a.score)
    .map((p) => ({
      id: p.id,
      nickname: p.nickname,
      avatar: p.avatar,
      score: p.score,
      lastPointsEarned: p.lastPointsEarned || 0,
      isCorrect: p.lastAnswerCorrect || false,
      streak: p.streak,
      rank: p.rank,
      prevRank: p.prevRank,
      rankDiff: p.prevRank - p.rank, // positive means climbed up
    }));

  const isLastQuestion = room.currentQuestionIndex + 1 >= room.questions.length;

  io.to(room.pin).emit("game:leaderboard", {
    leaderboard,
    isLastQuestion,
    currentQuestionIndex: room.currentQuestionIndex,
    totalQuestions: room.questions.length,
  });
}

function showPodium(io: SocketIOServer, room: GameRoom) {
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
    fullRanking,
    totalPlayers: room.players.size,
  });

  // Asynchronously save game session & analytics to database
  saveGameResultsToDB(room, sortedPlayers).catch((e) => console.error("Error saving game results:", e));
}

function updatePlayerRanks(room: GameRoom) {
  const sorted = Array.from(room.players.values()).sort((a, b) => b.score - a.score);
  sorted.forEach((player, idx) => {
    player.prevRank = player.rank || idx + 1;
    player.rank = idx + 1;
  });
}

function clearBotTimers(room: GameRoom) {
  room.botTimers.forEach((t) => clearTimeout(t));
  room.botTimers = [];
}

async function saveGameResultsToDB(room: GameRoom, sortedPlayers: RoomPlayer[]) {
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

    // Increment quiz plays count
    await prisma.quiz.update({
      where: { id: room.quizId },
      data: { playsCount: { increment: 1 } },
    });

    console.log(`[GameServer] Session ${room.sessionId} successfully archived to DB`);
  } catch (err) {
    console.error("Failed to archive game results to DB:", err);
  }
}

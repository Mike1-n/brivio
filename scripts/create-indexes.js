const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.jlqposygzokcrxmzyseq:0713695022grace@aws-1-eu-west-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

const indexQueries = [
  // User Indexes
  `CREATE INDEX IF NOT EXISTS "idx_user_role" ON "User"("role");`,
  `CREATE INDEX IF NOT EXISTS "idx_user_created_at" ON "User"("createdAt");`,

  // Quiz Indexes (Drastically accelerates Explore Quizzes, Search, and My Quizzes)
  `CREATE INDEX IF NOT EXISTS "idx_quiz_author_id" ON "Quiz"("authorId");`,
  `CREATE INDEX IF NOT EXISTS "idx_quiz_author_created" ON "Quiz"("authorId", "createdAt" DESC);`,
  `CREATE INDEX IF NOT EXISTS "idx_quiz_category_id" ON "Quiz"("categoryId");`,
  `CREATE INDEX IF NOT EXISTS "idx_quiz_public_created" ON "Quiz"("isPublic", "createdAt" DESC);`,
  `CREATE INDEX IF NOT EXISTS "idx_quiz_difficulty" ON "Quiz"("difficulty");`,
  `CREATE INDEX IF NOT EXISTS "idx_quiz_plays" ON "Quiz"("playsCount" DESC);`,

  // Question Indexes (Instant quiz questions loading)
  `CREATE INDEX IF NOT EXISTS "idx_question_quiz_id" ON "Question"("quizId");`,
  `CREATE INDEX IF NOT EXISTS "idx_question_quiz_order" ON "Question"("quizId", "order" ASC);`,

  // Answer Indexes (Instant answers lookup)
  `CREATE INDEX IF NOT EXISTS "idx_answer_question_id" ON "Answer"("questionId");`,
  `CREATE INDEX IF NOT EXISTS "idx_answer_question_order" ON "Answer"("questionId", "order" ASC);`,

  // GameSession Indexes (Instant PIN and Session Lookups)
  `CREATE INDEX IF NOT EXISTS "idx_gamesession_pin" ON "GameSession"("pin");`,
  `CREATE INDEX IF NOT EXISTS "idx_gamesession_host_id" ON "GameSession"("hostId");`,
  `CREATE INDEX IF NOT EXISTS "idx_gamesession_quiz_id" ON "GameSession"("quizId");`,
  `CREATE INDEX IF NOT EXISTS "idx_gamesession_status" ON "GameSession"("status");`,
  `CREATE INDEX IF NOT EXISTS "idx_gamesession_host_created" ON "GameSession"("hostId", "createdAt" DESC);`,

  // GamePlayer Indexes (High concurrency live player joins and score queries)
  `CREATE INDEX IF NOT EXISTS "idx_gameplayer_session_id" ON "GamePlayer"("sessionId");`,
  `CREATE INDEX IF NOT EXISTS "idx_gameplayer_session_score" ON "GamePlayer"("sessionId", "score" DESC);`,
  `CREATE INDEX IF NOT EXISTS "idx_gameplayer_session_bot" ON "GamePlayer"("sessionId", "isBot");`,
  `CREATE INDEX IF NOT EXISTS "idx_gameplayer_socket_id" ON "GamePlayer"("socketId");`,

  // PlayerAnswer Indexes (Instant accuracy, scoring, and analytics lookups)
  `CREATE INDEX IF NOT EXISTS "idx_playeranswer_player_id" ON "PlayerAnswer"("playerId");`,
  `CREATE INDEX IF NOT EXISTS "idx_playeranswer_question_id" ON "PlayerAnswer"("questionId");`,
  `CREATE INDEX IF NOT EXISTS "idx_playeranswer_answer_id" ON "PlayerAnswer"("answerId");`,
  `CREATE INDEX IF NOT EXISTS "idx_playeranswer_player_question" ON "PlayerAnswer"("playerId", "questionId");`,
  `CREATE INDEX IF NOT EXISTS "idx_playeranswer_created_at" ON "PlayerAnswer"("createdAt");`,

  // QuizChallenge & Attempt Indexes
  `CREATE INDEX IF NOT EXISTS "idx_challenge_quiz_id" ON "QuizChallenge"("quizId");`,
  `CREATE INDEX IF NOT EXISTS "idx_challenge_active" ON "QuizChallenge"("isActive");`,
  `CREATE INDEX IF NOT EXISTS "idx_challenge_created_at" ON "QuizChallenge"("createdAt" DESC);`,
  `CREATE INDEX IF NOT EXISTS "idx_attempt_challenge_id" ON "ChallengeAttempt"("challengeId");`,
  `CREATE INDEX IF NOT EXISTS "idx_attempt_challenge_score" ON "ChallengeAttempt"("challengeId", "score" DESC);`,
  `CREATE INDEX IF NOT EXISTS "idx_attempt_completed_at" ON "ChallengeAttempt"("completedAt");`
];

async function main() {
  console.log("🚀 Applying high-performance database indexes to PostgreSQL / Supabase...");
  await client.connect();
  
  let applied = 0;
  for (const query of indexQueries) {
    try {
      await client.query(query);
      applied++;
    } catch (e) {
      console.warn("Notice for query:", query, e.message);
    }
  }

  console.log(`✅ Successfully applied ${applied}/${indexQueries.length} performance indexes!`);
  await client.end();
}

main().catch(err => {
  console.error("Index creation failed:", err);
  process.exit(1);
});

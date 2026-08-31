const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.jlqposygzokcrxmzyseq:0713695022grace@aws-1-eu-west-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

const ddl = `
CREATE TABLE IF NOT EXISTS "QuizChallenge" (
  "id" TEXT PRIMARY KEY,
  "quizId" TEXT NOT NULL REFERENCES "Quiz"("id") ON DELETE CASCADE,
  "title" TEXT,
  "deadline" TIMESTAMP(3),
  "timeLimitMins" INTEGER,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ChallengeAttempt" (
  "id" TEXT PRIMARY KEY,
  "challengeId" TEXT NOT NULL REFERENCES "QuizChallenge"("id") ON DELETE CASCADE,
  "nickname" TEXT NOT NULL,
  "avatar" TEXT NOT NULL DEFAULT '🦊',
  "score" INTEGER NOT NULL DEFAULT 0,
  "accuracy" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalCorrect" INTEGER NOT NULL DEFAULT 0,
  "totalQuestions" INTEGER NOT NULL DEFAULT 0,
  "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`;

async function main() {
  console.log("🚀 Creating QuizChallenge and ChallengeAttempt tables in Supabase...");
  await client.connect();
  await client.query(ddl);
  console.log("✅ QuizChallenge and ChallengeAttempt tables ready!");
  await client.end();
}

main().catch(err => {
  console.error("Schema sync failed:", err);
  process.exit(1);
});

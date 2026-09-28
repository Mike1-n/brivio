const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const HARDCODED_TITLES = [
  "Cinema & Pop Culture Frenzy",
  "Global Geography & World Capitals",
  "Mental Math & Logic Puzzles",
  "Bible Trivia & Spiritual Wisdom",
  "World History & Epic Civilizations",
  "Web Dev & Modern Computer Science",
  "Ultimate Science & Astronomy Master",
  "My Awesome Quiz"
];

async function run() {
  console.log("Fetching all quizzes before cleanup...");
  const allQuizzes = await prisma.quiz.findMany({
    select: { id: true, title: true, _count: { select: { questions: true } } }
  });
  console.log("Found quizzes:", allQuizzes);

  console.log("\nDeleting hardcoded quizzes...");
  const deleteResult = await prisma.quiz.deleteMany({
    where: {
      title: {
        in: HARDCODED_TITLES
      }
    }
  });

  console.log(`Deleted ${deleteResult.count} hardcoded quizzes.`);

  console.log("\nRemaining quizzes in database:");
  const remaining = await prisma.quiz.findMany({
    select: { id: true, title: true, _count: { select: { questions: true } } }
  });
  console.log(remaining);
}

run()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });

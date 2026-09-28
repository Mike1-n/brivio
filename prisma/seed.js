const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seeding...");

  // 1. Create Default Users
  const passwordHash = bcrypt.hashSync("password123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@quizarena.com" },
    update: {},
    create: {
      email: "admin@quizarena.com",
      name: "Super Admin",
      passwordHash,
      role: "ADMIN",
      avatar: "👑",
    },
  });

  const teacher = await prisma.user.upsert({
    where: { email: "teacher@quizarena.com" },
    update: {},
    create: {
      email: "teacher@quizarena.com",
      name: "Professor Alex",
      passwordHash,
      role: "TEACHER",
      avatar: "🎓",
    },
  });

  const demoTeacher = await prisma.user.upsert({
    where: { email: "demo@quizarena.com" },
    update: {},
    create: {
      email: "demo@quizarena.com",
      name: "Demo Host",
      passwordHash,
      role: "TEACHER",
      avatar: "🚀",
    },
  });

  console.log("✅ Users created: Admin, Teacher, Demo Host");

  // 2. Create Categories
  const categoriesData = [
    { name: "Science & Nature", slug: "science", icon: "Atom", description: "Physics, Chemistry, Biology, Astronomy, and Earth Sciences" },
    { name: "Technology & Coding", slug: "tech", icon: "Cpu", description: "Software development, AI, Web, Hardware, and Algorithms" },
    { name: "General Knowledge", slug: "general", icon: "Globe", description: "Trivia, Geography, Current Events, and World Culture" },
    { name: "Mathematics & Logic", slug: "math", icon: "Calculator", description: "Arithmetic, Algebra, Geometry, and Brain Teasers" },
    { name: "World History", slug: "history", icon: "History", description: "Ancient civilizations, modern revolutions, and global milestones" },
    { name: "Bible & Faith", slug: "bible", icon: "BookOpen", description: "Old & New Testament, Prophets, and Biblical History" },
    { name: "Pop Culture & Media", slug: "culture", icon: "Sparkles", description: "Movies, Music, Gaming, and Modern Entertainment" },
  ];

  const categories = {};
  for (const cat of categoriesData) {
    const created = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: cat,
      create: cat,
    });
    categories[cat.slug] = created;
  }
  console.log("✅ Categories created");

  // 3. Quizzes (No hardcoded quizzes seeded)
  const quizzesData = [];

  for (const qData of quizzesData) {
    const category = categories[qData.categorySlug];
    const quiz = await prisma.quiz.create({
      data: {
        title: qData.title,
        description: qData.description,
        difficulty: qData.difficulty,
        coverImage: qData.coverImage,
        isPublic: true,
        playsCount: Math.floor(Math.random() * 85) + 15,
        authorId: teacher.id,
        categoryId: category ? category.id : null,
        questions: {
          create: qData.questions.map((q, idx) => ({
            text: q.text,
            type: q.type,
            timeLimit: q.timeLimit,
            points: q.points,
            order: idx,
            explanation: q.explanation,
            answers: {
              create: q.answers.map((a, aIdx) => ({
                text: a.text,
                isCorrect: a.isCorrect,
                order: aIdx,
                color: a.color,
              })),
            },
          })),
        },
      },
    });
    console.log(`✅ Seeded quiz: "${quiz.title}" with ${qData.questions.length} questions`);
  }

  console.log("🎉 Database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

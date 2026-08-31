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

  // 3. Quizzes with 10+ questions each
  const quizzesData = [
    {
      title: "Ultimate Science & Astronomy Master",
      description: "Test your knowledge of the cosmos, particle physics, cellular biology, and elements!",
      categorySlug: "science",
      difficulty: "MEDIUM",
      coverImage: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=60",
      questions: [
        {
          text: "What is the closest star to Earth other than our Sun?",
          type: "MULTIPLE_CHOICE",
          timeLimit: 20,
          points: 1000,
          explanation: "Proxima Centauri is part of the Alpha Centauri star system, approximately 4.24 light-years from Earth.",
          answers: [
            { text: "Proxima Centauri", isCorrect: true, color: "red" },
            { text: "Sirius A", isCorrect: false, color: "blue" },
            { text: "Betelgeuse", isCorrect: false, color: "yellow" },
            { text: "Alpha Centauri A", isCorrect: false, color: "green" },
          ],
        },
        {
          text: "What is the powerhouse organelle of the eukaryotic cell?",
          type: "MULTIPLE_CHOICE",
          timeLimit: 15,
          points: 1000,
          explanation: "Mitochondria generate most of the chemical energy needed to power the cell's biochemical reactions through ATP.",
          answers: [
            { text: "Nucleus", isCorrect: false, color: "red" },
            { text: "Mitochondria", isCorrect: true, color: "blue" },
            { text: "Ribosome", isCorrect: false, color: "yellow" },
            { text: "Endoplasmic Reticulum", isCorrect: false, color: "green" },
          ],
        },
        {
          text: "Sound travels faster in water than in air.",
          type: "TRUE_FALSE",
          timeLimit: 15,
          points: 1000,
          explanation: "True! Sound travels about 4.3 times faster in water (approx 1,480 m/s) than in air (approx 343 m/s) because water is denser.",
          answers: [
            { text: "True", isCorrect: true, color: "blue" },
            { text: "False", isCorrect: false, color: "red" },
          ],
        },
        {
          text: "What is the chemical symbol for Gold?",
          type: "MULTIPLE_CHOICE",
          timeLimit: 10,
          points: 1000,
          explanation: "Au comes from the Latin word for gold, 'Aurum'.",
          answers: [
            { text: "Ag", isCorrect: false, color: "red" },
            { text: "Go", isCorrect: false, color: "blue" },
            { text: "Au", isCorrect: true, color: "yellow" },
            { text: "Gd", isCorrect: false, color: "green" },
          ],
        },
        {
          text: "Which planet in our solar system has the most moons?",
          type: "MULTIPLE_CHOICE",
          timeLimit: 20,
          points: 1000,
          explanation: "Saturn has 146 officially recognized moons as confirmed by the IAU.",
          answers: [
            { text: "Jupiter", isCorrect: false, color: "red" },
            { text: "Saturn", isCorrect: true, color: "blue" },
            { text: "Uranus", isCorrect: false, color: "yellow" },
            { text: "Neptune", isCorrect: false, color: "green" },
          ],
        },
        {
          text: "What subatomic particle carries a negative electrical charge?",
          type: "MULTIPLE_CHOICE",
          timeLimit: 15,
          points: 1000,
          explanation: "Electrons have a negative charge, protons have a positive charge, and neutrons are neutral.",
          answers: [
            { text: "Proton", isCorrect: false, color: "red" },
            { text: "Neutron", isCorrect: false, color: "blue" },
            { text: "Electron", isCorrect: true, color: "yellow" },
            { text: "Positron", isCorrect: false, color: "green" },
          ],
        },
        {
          text: "What is the hardest natural substance on Earth?",
          type: "MULTIPLE_CHOICE",
          timeLimit: 15,
          points: 1000,
          explanation: "Diamond scores 10 on the Mohs hardness scale.",
          answers: [
            { text: "Titanium", isCorrect: false, color: "red" },
            { text: "Diamond", isCorrect: true, color: "blue" },
            { text: "Graphene", isCorrect: false, color: "yellow" },
            { text: "Quartz", isCorrect: false, color: "green" },
          ],
        },
        {
          text: "Light from the Sun takes approximately how long to reach Earth?",
          type: "MULTIPLE_CHOICE",
          timeLimit: 20,
          points: 1000,
          explanation: "At the speed of light (300,000 km/s), it takes about 8 minutes and 20 seconds for sunlight to reach Earth.",
          answers: [
            { text: "8 seconds", isCorrect: false, color: "red" },
            { text: "8 minutes 20 seconds", isCorrect: true, color: "blue" },
            { text: "1 hour", isCorrect: false, color: "yellow" },
            { text: "Instantaneous", isCorrect: false, color: "green" },
          ],
        },
        {
          text: "What gas makes up approximately 78% of Earth's atmosphere?",
          type: "MULTIPLE_CHOICE",
          timeLimit: 15,
          points: 1000,
          explanation: "Nitrogen makes up ~78%, Oxygen ~21%, and Argon ~0.9%.",
          answers: [
            { text: "Oxygen", isCorrect: false, color: "red" },
            { text: "Carbon Dioxide", isCorrect: false, color: "blue" },
            { text: "Nitrogen", isCorrect: true, color: "yellow" },
            { text: "Hydrogen", isCorrect: false, color: "green" },
          ],
        },
        {
          text: "Water expands when it freezes into ice.",
          type: "TRUE_FALSE",
          timeLimit: 10,
          points: 1000,
          explanation: "True! Due to hydrogen bonding forming an open crystalline structure, ice is less dense than liquid water.",
          answers: [
            { text: "True", isCorrect: true, color: "blue" },
            { text: "False", isCorrect: false, color: "red" },
          ],
        },
      ],
    },
    {
      title: "Web Dev & Modern Computer Science",
      description: "Frontend, backend, data structures, algorithms, and JavaScript superpowers!",
      categorySlug: "tech",
      difficulty: "HARD",
      coverImage: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=60",
      questions: [
        {
          text: "In JavaScript, what does `typeof null` evaluate to?",
          type: "MULTIPLE_CHOICE",
          timeLimit: 20,
          points: 1000,
          explanation: "`typeof null === 'object'` is a famous legacy bug in JavaScript from its first implementation in 1995.",
          answers: [
            { text: "'null'", isCorrect: false, color: "red" },
            { text: "'object'", isCorrect: true, color: "blue" },
            { text: "'undefined'", isCorrect: false, color: "yellow" },
            { text: "'boolean'", isCorrect: false, color: "green" },
          ],
        },
        {
          text: "What is the average time complexity of looking up a key in a Hash Map?",
          type: "MULTIPLE_CHOICE",
          timeLimit: 15,
          points: 1000,
          explanation: "Hash map lookups operate in O(1) constant time on average assuming a good hash function.",
          answers: [
            { text: "O(1)", isCorrect: true, color: "red" },
            { text: "O(log n)", isCorrect: false, color: "blue" },
            { text: "O(n)", isCorrect: false, color: "yellow" },
            { text: "O(n log n)", isCorrect: false, color: "green" },
          ],
        },
        {
          text: "HTTP status code 418 is officially titled 'I'm a teapot'.",
          type: "TRUE_FALSE",
          timeLimit: 15,
          points: 1000,
          explanation: "True! RFC 2324 specified 418 I'm a teapot as an April Fools' joke that became an official standard.",
          answers: [
            { text: "True", isCorrect: true, color: "blue" },
            { text: "False", isCorrect: false, color: "red" },
          ],
        },
        {
          text: "Which CSS property is used to create a 3D perspective effect?",
          type: "MULTIPLE_CHOICE",
          timeLimit: 20,
          points: 1000,
          explanation: "`perspective` determines the distance between the z=0 plane and the user to give depth to 3D elements.",
          answers: [
            { text: "transform: 3d", isCorrect: false, color: "red" },
            { text: "perspective", isCorrect: true, color: "blue" },
            { text: "view-distance", isCorrect: false, color: "yellow" },
            { text: "depth", isCorrect: false, color: "green" },
          ],
        },
        {
          text: "Which protocol operates on top of TCP to provide full-duplex real-time communication?",
          type: "MULTIPLE_CHOICE",
          timeLimit: 15,
          points: 1000,
          explanation: "WebSockets provide persistent, bi-directional, full-duplex communication over a single TCP connection.",
          answers: [
            { text: "GraphQL", isCorrect: false, color: "red" },
            { text: "REST", isCorrect: false, color: "blue" },
            { text: "WebSocket", isCorrect: true, color: "yellow" },
            { text: "gRPC over UDP", isCorrect: false, color: "green" },
          ],
        },
        {
          text: "What does SQL stand for?",
          type: "MULTIPLE_CHOICE",
          timeLimit: 15,
          points: 1000,
          explanation: "SQL stands for Structured Query Language.",
          answers: [
            { text: "Structured Query Language", isCorrect: true, color: "red" },
            { text: "Simple Quantitative Language", isCorrect: false, color: "blue" },
            { text: "System Query Logic", isCorrect: false, color: "yellow" },
            { text: "Standard Quick Language", isCorrect: false, color: "green" },
          ],
        },
        {
          text: "React components re-render whenever their parent re-renders by default.",
          type: "TRUE_FALSE",
          timeLimit: 15,
          points: 1000,
          explanation: "True! Unless wrapped in React.memo(), a child re-renders when the parent re-renders.",
          answers: [
            { text: "True", isCorrect: true, color: "blue" },
            { text: "False", isCorrect: false, color: "red" },
          ],
        },
        {
          text: "Who created Git and the Linux Operating System kernel?",
          type: "MULTIPLE_CHOICE",
          timeLimit: 15,
          points: 1000,
          explanation: "Linus Torvalds created the Linux kernel in 1991 and Git in 2005.",
          answers: [
            { text: "Bill Gates", isCorrect: false, color: "red" },
            { text: "Linus Torvalds", isCorrect: true, color: "blue" },
            { text: "Tim Berners-Lee", isCorrect: false, color: "yellow" },
            { text: "Steve Wozniak", isCorrect: false, color: "green" },
          ],
        },
        {
          text: "In Git, which command safely incorporates changes from a remote branch without merging directly?",
          type: "MULTIPLE_CHOICE",
          timeLimit: 20,
          points: 1000,
          explanation: "`git fetch` downloads objects and refs from another repository without altering working files.",
          answers: [
            { text: "git pull", isCorrect: false, color: "red" },
            { text: "git fetch", isCorrect: true, color: "blue" },
            { text: "git commit", isCorrect: false, color: "yellow" },
            { text: "git push", isCorrect: false, color: "green" },
          ],
        },
        {
          text: "What is the standard port for HTTPS connections?",
          type: "MULTIPLE_CHOICE",
          timeLimit: 10,
          points: 1000,
          explanation: "HTTPS defaults to port 443, while unencrypted HTTP defaults to port 80.",
          answers: [
            { text: "80", isCorrect: false, color: "red" },
            { text: "8080", isCorrect: false, color: "blue" },
            { text: "443", isCorrect: true, color: "yellow" },
            { text: "3000", isCorrect: false, color: "green" },
          ],
        },
      ],
    },
    {
      title: "World History & Epic Civilizations",
      description: "From ancient pyramids and Roman gladiators to modern world turning points!",
      categorySlug: "history",
      difficulty: "MEDIUM",
      coverImage: "https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=800&auto=format&fit=crop&q=60",
      questions: [
        {
          text: "In which ancient city was the famous Library of Alexandria located?",
          type: "MULTIPLE_CHOICE",
          timeLimit: 20,
          points: 1000,
          explanation: "The Great Library was established in Alexandria, Egypt during the Hellenistic period.",
          answers: [
            { text: "Rome", isCorrect: false, color: "red" },
            { text: "Alexandria, Egypt", isCorrect: true, color: "blue" },
            { text: "Athens", isCorrect: false, color: "yellow" },
            { text: "Babylon", isCorrect: false, color: "green" },
          ],
        },
        {
          text: "Who was the first Emperor of the unified Roman Empire?",
          type: "MULTIPLE_CHOICE",
          timeLimit: 20,
          points: 1000,
          explanation: "Augustus (formerly Octavian) became the first Roman emperor in 27 BC.",
          answers: [
            { text: "Julius Caesar", isCorrect: false, color: "red" },
            { text: "Augustus", isCorrect: true, color: "blue" },
            { text: "Nero", isCorrect: false, color: "yellow" },
            { text: "Marcus Aurelius", isCorrect: false, color: "green" },
          ],
        },
        {
          text: "The Great Wall of China is visible from the Moon with the naked human eye.",
          type: "TRUE_FALSE",
          timeLimit: 15,
          points: 1000,
          explanation: "False! This is a popular myth debunked by astronauts and NASA. It is too narrow without optical aid.",
          answers: [
            { text: "True", isCorrect: false, color: "blue" },
            { text: "False", isCorrect: true, color: "red" },
          ],
        },
        {
          text: "In what year did the Titanic sink in the North Atlantic Ocean?",
          type: "MULTIPLE_CHOICE",
          timeLimit: 15,
          points: 1000,
          explanation: "RMS Titanic struck an iceberg on the night of April 14, 1912 and sank in the early morning of April 15.",
          answers: [
            { text: "1905", isCorrect: false, color: "red" },
            { text: "1912", isCorrect: true, color: "blue" },
            { text: "1918", isCorrect: false, color: "yellow" },
            { text: "1923", isCorrect: false, color: "green" },
          ],
        },
        {
          text: "Which civilization constructed Machu Picchu in Peru?",
          type: "MULTIPLE_CHOICE",
          timeLimit: 15,
          points: 1000,
          explanation: "Machu Picchu was built by the Inca Empire under Emperor Pachacuti around 1450 AD.",
          answers: [
            { text: "Maya", isCorrect: false, color: "red" },
            { text: "Aztec", isCorrect: false, color: "blue" },
            { text: "Inca", isCorrect: true, color: "yellow" },
            { text: "Olmec", isCorrect: false, color: "green" },
          ],
        },
        {
          text: "Who wrote the ancient Babylonian legal code 'An eye for an eye'?",
          type: "MULTIPLE_CHOICE",
          timeLimit: 20,
          points: 1000,
          explanation: "King Hammurabi of Babylon enacted the Code of Hammurabi around 1754 BC.",
          answers: [
            { text: "Hammurabi", isCorrect: true, color: "red" },
            { text: "Nebuchadnezzar", isCorrect: false, color: "blue" },
            { text: "Cyrus the Great", isCorrect: false, color: "yellow" },
            { text: "Gilgamesh", isCorrect: false, color: "green" },
          ],
        },
        {
          text: "Which Renaissance genius painted the ceiling of the Sistine Chapel?",
          type: "MULTIPLE_CHOICE",
          timeLimit: 15,
          points: 1000,
          explanation: "Michelangelo painted the Sistine Chapel ceiling between 1508 and 1512.",
          answers: [
            { text: "Leonardo da Vinci", isCorrect: false, color: "red" },
            { text: "Michelangelo", isCorrect: true, color: "blue" },
            { text: "Raphael", isCorrect: false, color: "yellow" },
            { text: "Donatello", isCorrect: false, color: "green" },
          ],
        },
        {
          text: "What French military leader was defeated at the Battle of Waterloo in 1815?",
          type: "MULTIPLE_CHOICE",
          timeLimit: 15,
          points: 1000,
          explanation: "Napoleon Bonaparte was decisively defeated by Anglo-allied forces under Wellington and Prussian forces.",
          answers: [
            { text: "Napoleon Bonaparte", isCorrect: true, color: "red" },
            { text: "Louis XIV", isCorrect: false, color: "blue" },
            { text: "Charles de Gaulle", isCorrect: false, color: "yellow" },
            { text: "Robespierre", isCorrect: false, color: "green" },
          ],
        },
        {
          text: "The Magna Carta was signed in England in the year 1215.",
          type: "TRUE_FALSE",
          timeLimit: 15,
          points: 1000,
          explanation: "True! King John of England granted the Magna Carta at Runnymede in June 1215.",
          answers: [
            { text: "True", isCorrect: true, color: "blue" },
            { text: "False", isCorrect: false, color: "red" },
          ],
        },
        {
          text: "Which invention by Johannes Gutenberg revolutionized the spread of knowledge in Europe?",
          type: "MULTIPLE_CHOICE",
          timeLimit: 15,
          points: 1000,
          explanation: "Gutenberg introduced the movable type printing press around 1440.",
          answers: [
            { text: "Telescope", isCorrect: false, color: "red" },
            { text: "Movable Type Printing Press", isCorrect: true, color: "blue" },
            { text: "Steam Engine", isCorrect: false, color: "yellow" },
            { text: "Compass", isCorrect: false, color: "green" },
          ],
        },
      ],
    },
    {
      title: "Bible Trivia & Spiritual Wisdom",
      description: "Characters, stories, parables, and historical journeys of the Scriptures.",
      categorySlug: "bible",
      difficulty: "EASY",
      coverImage: "https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=800&auto=format&fit=crop&q=60",
      questions: [
        {
          text: "How many days and nights did it rain during Noah's flood?",
          type: "MULTIPLE_CHOICE",
          timeLimit: 15,
          points: 1000,
          explanation: "Genesis 7:12 states the rain fell on the earth for 40 days and 40 nights.",
          answers: [
            { text: "7 days & nights", isCorrect: false, color: "red" },
            { text: "40 days & nights", isCorrect: true, color: "blue" },
            { text: "100 days & nights", isCorrect: false, color: "yellow" },
            { text: "12 days & nights", isCorrect: false, color: "green" },
          ],
        },
        {
          text: "Who led the Israelites out of slavery in Egypt and parted the Red Sea?",
          type: "MULTIPLE_CHOICE",
          timeLimit: 15,
          points: 1000,
          explanation: "Moses led the Exodus and parted the Red Sea with his staff under God's command.",
          answers: [
            { text: "Abraham", isCorrect: false, color: "red" },
            { text: "Moses", isCorrect: true, color: "blue" },
            { text: "Joshua", isCorrect: false, color: "yellow" },
            { text: "David", isCorrect: false, color: "green" },
          ],
        },
        {
          text: "What is the shortest verse in the English Bible?",
          type: "MULTIPLE_CHOICE",
          timeLimit: 15,
          points: 1000,
          explanation: "John 11:35 consists of just two words: 'Jesus wept.'",
          answers: [
            { text: "'Jesus wept.' (John 11:35)", isCorrect: true, color: "red" },
            { text: "'Rejoice always.'", isCorrect: false, color: "blue" },
            { text: "'Pray without ceasing.'", isCorrect: false, color: "yellow" },
            { text: "'God is love.'", isCorrect: false, color: "green" },
          ],
        },
        {
          text: "David defeated the giant Goliath using a sword and iron shield.",
          type: "TRUE_FALSE",
          timeLimit: 15,
          points: 1000,
          explanation: "False! David defeated Goliath with a sling and a smooth stone from the brook.",
          answers: [
            { text: "True", isCorrect: false, color: "blue" },
            { text: "False", isCorrect: true, color: "red" },
          ],
        },
        {
          text: "In what town was Jesus born?",
          type: "MULTIPLE_CHOICE",
          timeLimit: 15,
          points: 1000,
          explanation: "Jesus was born in Bethlehem in Judea.",
          answers: [
            { text: "Nazareth", isCorrect: false, color: "red" },
            { text: "Jerusalem", isCorrect: false, color: "blue" },
            { text: "Bethlehem", isCorrect: true, color: "yellow" },
            { text: "Capernaum", isCorrect: false, color: "green" },
          ],
        },
        {
          text: "How many disciples did Jesus choose as his primary apostles?",
          type: "MULTIPLE_CHOICE",
          timeLimit: 10,
          points: 1000,
          explanation: "Jesus called 12 disciples.",
          answers: [
            { text: "7", isCorrect: false, color: "red" },
            { text: "10", isCorrect: false, color: "blue" },
            { text: "12", isCorrect: true, color: "yellow" },
            { text: "14", isCorrect: false, color: "green" },
          ],
        },
        {
          text: "Which book is the very first book of the Bible?",
          type: "MULTIPLE_CHOICE",
          timeLimit: 10,
          points: 1000,
          explanation: "Genesis is the opening book of the Bible, recounting Creation.",
          answers: [
            { text: "Genesis", isCorrect: true, color: "red" },
            { text: "Exodus", isCorrect: false, color: "blue" },
            { text: "Matthew", isCorrect: false, color: "yellow" },
            { text: "Psalms", isCorrect: false, color: "green" },
          ],
        },
        {
          text: "Who was swallowed by a great fish after trying to flee to Tarshish?",
          type: "MULTIPLE_CHOICE",
          timeLimit: 15,
          points: 1000,
          explanation: "Jonah attempted to run from God's mission to Nineveh and spent three days inside a great fish.",
          answers: [
            { text: "Elijah", isCorrect: false, color: "red" },
            { text: "Jonah", isCorrect: true, color: "blue" },
            { text: "Daniel", isCorrect: false, color: "yellow" },
            { text: "Job", isCorrect: false, color: "green" },
          ],
        },
        {
          text: "What did Solomon ask God for when offered anything he desired?",
          type: "MULTIPLE_CHOICE",
          timeLimit: 15,
          points: 1000,
          explanation: "Solomon asked for wisdom and an understanding heart to judge God's people wisely.",
          answers: [
            { text: "Great Wealth & Gold", isCorrect: false, color: "red" },
            { text: "Wisdom & Understanding", isCorrect: true, color: "blue" },
            { text: "Long Life", isCorrect: false, color: "yellow" },
            { text: "Military Conquest", isCorrect: false, color: "green" },
          ],
        },
        {
          text: "The fruit of the Spirit listed in Galatians 5 begins with Love, Joy, and Peace.",
          type: "TRUE_FALSE",
          timeLimit: 10,
          points: 1000,
          explanation: "True! 'The fruit of the Spirit is love, joy, peace, forbearance, kindness, goodness, faithfulness, gentleness and self-control.'",
          answers: [
            { text: "True", isCorrect: true, color: "blue" },
            { text: "False", isCorrect: false, color: "red" },
          ],
        },
      ],
    },
    {
      title: "Mental Math & Logic Puzzles",
      description: "Quick calculations, sequences, geometric tricks, and sharp problem solving!",
      categorySlug: "math",
      difficulty: "MEDIUM",
      coverImage: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&auto=format&fit=crop&q=60",
      questions: [
        {
          text: "What is the square root of 144?",
          type: "MULTIPLE_CHOICE",
          timeLimit: 15,
          points: 1000,
          explanation: "12 * 12 = 144.",
          answers: [
            { text: "11", isCorrect: false, color: "red" },
            { text: "12", isCorrect: true, color: "blue" },
            { text: "14", isCorrect: false, color: "yellow" },
            { text: "16", isCorrect: false, color: "green" },
          ],
        },
        {
          text: "What comes next in the Fibonacci sequence: 1, 1, 2, 3, 5, 8, 13, ...?",
          type: "MULTIPLE_CHOICE",
          timeLimit: 15,
          points: 1000,
          explanation: "Each number is the sum of the two preceding ones: 8 + 13 = 21.",
          answers: [
            { text: "19", isCorrect: false, color: "red" },
            { text: "21", isCorrect: true, color: "blue" },
            { text: "23", isCorrect: false, color: "yellow" },
            { text: "25", isCorrect: false, color: "green" },
          ],
        },
        {
          text: "Every prime number greater than 2 is an odd number.",
          type: "TRUE_FALSE",
          timeLimit: 15,
          points: 1000,
          explanation: "True! 2 is the only even prime number because all other even numbers are divisible by 2.",
          answers: [
            { text: "True", isCorrect: true, color: "blue" },
            { text: "False", isCorrect: false, color: "red" },
          ],
        },
        {
          text: "If a shirt costs $20 after a 20% discount, what was its original price?",
          type: "MULTIPLE_CHOICE",
          timeLimit: 25,
          points: 1000,
          explanation: "Original * 0.80 = $20 => Original = 20 / 0.80 = $25.",
          answers: [
            { text: "$24", isCorrect: false, color: "red" },
            { text: "$25", isCorrect: true, color: "blue" },
            { text: "$26", isCorrect: false, color: "yellow" },
            { text: "$30", isCorrect: false, color: "green" },
          ],
        },
        {
          text: "What is the sum of all internal angles in a triangle?",
          type: "MULTIPLE_CHOICE",
          timeLimit: 15,
          points: 1000,
          explanation: "In Euclidean geometry, the sum of internal angles of any triangle is always 180 degrees.",
          answers: [
            { text: "90°", isCorrect: false, color: "red" },
            { text: "180°", isCorrect: true, color: "blue" },
            { text: "270°", isCorrect: false, color: "yellow" },
            { text: "360°", isCorrect: false, color: "green" },
          ],
        },
        {
          text: "What is 15% of 80?",
          type: "MULTIPLE_CHOICE",
          timeLimit: 15,
          points: 1000,
          explanation: "10% of 80 = 8. 5% of 80 = 4. 8 + 4 = 12.",
          answers: [
            { text: "10", isCorrect: false, color: "red" },
            { text: "12", isCorrect: true, color: "blue" },
            { text: "14", isCorrect: false, color: "yellow" },
            { text: "16", isCorrect: false, color: "green" },
          ],
        },
        {
          text: "A circle's circumference formula is C = 2 * π * r.",
          type: "TRUE_FALSE",
          timeLimit: 10,
          points: 1000,
          explanation: "True! Circumference is 2 * pi * radius (or pi * diameter).",
          answers: [
            { text: "True", isCorrect: true, color: "blue" },
            { text: "False", isCorrect: false, color: "red" },
          ],
        },
        {
          text: "What is 2 to the power of 8 (2^8)?",
          type: "MULTIPLE_CHOICE",
          timeLimit: 15,
          points: 1000,
          explanation: "2^8 = 256 (the number of values in an 8-bit byte).",
          answers: [
            { text: "128", isCorrect: false, color: "red" },
            { text: "256", isCorrect: true, color: "blue" },
            { text: "512", isCorrect: false, color: "yellow" },
            { text: "1024", isCorrect: false, color: "green" },
          ],
        },
        {
          text: "If you roll two standard 6-sided dice, what is the most likely sum?",
          type: "MULTIPLE_CHOICE",
          timeLimit: 20,
          points: 1000,
          explanation: "7 has 6 possible combinations out of 36 (1+6, 2+5, 3+4, 4+3, 5+2, 6+1), giving it a 1/6 probability.",
          answers: [
            { text: "6", isCorrect: false, color: "red" },
            { text: "7", isCorrect: true, color: "blue" },
            { text: "8", isCorrect: false, color: "yellow" },
            { text: "10", isCorrect: false, color: "green" },
          ],
        },
        {
          text: "What is the Roman numeral for 50?",
          type: "MULTIPLE_CHOICE",
          timeLimit: 15,
          points: 1000,
          explanation: "L = 50, C = 100, D = 500, M = 1000.",
          answers: [
            { text: "X", isCorrect: false, color: "red" },
            { text: "L", isCorrect: true, color: "blue" },
            { text: "C", isCorrect: false, color: "yellow" },
            { text: "D", isCorrect: false, color: "green" },
          ],
        },
      ],
    },
    {
      title: "Global Geography & World Capitals",
      description: "Flags, mountains, rivers, world wonders, and vibrant cultures across the 7 continents.",
      categorySlug: "general",
      difficulty: "EASY",
      coverImage: "https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=800&auto=format&fit=crop&q=60",
      questions: [
        {
          text: "What is the capital city of Australia?",
          type: "MULTIPLE_CHOICE",
          timeLimit: 20,
          points: 1000,
          explanation: "Canberra is the federal capital of Australia, chosen as a compromise between Sydney and Melbourne in 1908.",
          answers: [
            { text: "Sydney", isCorrect: false, color: "red" },
            { text: "Canberra", isCorrect: true, color: "blue" },
            { text: "Melbourne", isCorrect: false, color: "yellow" },
            { text: "Brisbane", isCorrect: false, color: "green" },
          ],
        },
        {
          text: "Which is the longest river in the world?",
          type: "MULTIPLE_CHOICE",
          timeLimit: 15,
          points: 1000,
          explanation: "The Nile River in Africa stretches approximately 6,650 kilometers (4,132 miles).",
          answers: [
            { text: "Amazon River", isCorrect: false, color: "red" },
            { text: "Nile River", isCorrect: true, color: "blue" },
            { text: "Yangtze River", isCorrect: false, color: "yellow" },
            { text: "Mississippi River", isCorrect: false, color: "green" },
          ],
        },
        {
          text: "Canada has the longest coastline of any country in the world.",
          type: "TRUE_FALSE",
          timeLimit: 15,
          points: 1000,
          explanation: "True! Canada's coastline spans over 243,042 kilometers.",
          answers: [
            { text: "True", isCorrect: true, color: "blue" },
            { text: "False", isCorrect: false, color: "red" },
          ],
        },
        {
          text: "In which country is Mount Fuji located?",
          type: "MULTIPLE_CHOICE",
          timeLimit: 10,
          points: 1000,
          explanation: "Mount Fuji is an active stratovolcano and Japan's highest peak at 3,776 meters.",
          answers: [
            { text: "China", isCorrect: false, color: "red" },
            { text: "Japan", isCorrect: true, color: "blue" },
            { text: "South Korea", isCorrect: false, color: "yellow" },
            { text: "Nepal", isCorrect: false, color: "green" },
          ],
        },
        {
          text: "What is the smallest independent country in the world by area?",
          type: "MULTIPLE_CHOICE",
          timeLimit: 15,
          points: 1000,
          explanation: "Vatican City covers an area of just 0.49 square kilometers (about 121 acres).",
          answers: [
            { text: "Monaco", isCorrect: false, color: "red" },
            { text: "Vatican City", isCorrect: true, color: "blue" },
            { text: "San Marino", isCorrect: false, color: "yellow" },
            { text: "Liechtenstein", isCorrect: false, color: "green" },
          ],
        },
        {
          text: "Which desert is the largest hot desert on Earth?",
          type: "MULTIPLE_CHOICE",
          timeLimit: 15,
          points: 1000,
          explanation: "The Sahara Desert in Northern Africa covers roughly 9.2 million square kilometers.",
          answers: [
            { text: "Gobi Desert", isCorrect: false, color: "red" },
            { text: "Sahara Desert", isCorrect: true, color: "blue" },
            { text: "Kalahari Desert", isCorrect: false, color: "yellow" },
            { text: "Arabian Desert", isCorrect: false, color: "green" },
          ],
        },
        {
          text: "The equator passes through Europe.",
          type: "TRUE_FALSE",
          timeLimit: 10,
          points: 1000,
          explanation: "False! The equator passes through South America, Africa, and Asia (Indonesia).",
          answers: [
            { text: "True", isCorrect: false, color: "blue" },
            { text: "False", isCorrect: true, color: "red" },
          ],
        },
        {
          text: "What is the capital of Canada?",
          type: "MULTIPLE_CHOICE",
          timeLimit: 15,
          points: 1000,
          explanation: "Ottawa is Canada's capital city.",
          answers: [
            { text: "Toronto", isCorrect: false, color: "red" },
            { text: "Ottawa", isCorrect: true, color: "blue" },
            { text: "Vancouver", isCorrect: false, color: "yellow" },
            { text: "Montreal", isCorrect: false, color: "green" },
          ],
        },
        {
          text: "How many countries are in the United Kingdom?",
          type: "MULTIPLE_CHOICE",
          timeLimit: 15,
          points: 1000,
          explanation: "The UK is made up of 4 countries: England, Scotland, Wales, and Northern Ireland.",
          answers: [
            { text: "3", isCorrect: false, color: "red" },
            { text: "4", isCorrect: true, color: "blue" },
            { text: "5", isCorrect: false, color: "yellow" },
            { text: "6", isCorrect: false, color: "green" },
          ],
        },
        {
          text: "Which African country is known as the 'Cradle of Humankind'?",
          type: "MULTIPLE_CHOICE",
          timeLimit: 15,
          points: 1000,
          explanation: "South Africa contains the UNESCO World Heritage paleoanthropological site known as the Cradle of Humankind.",
          answers: [
            { text: "Egypt", isCorrect: false, color: "red" },
            { text: "South Africa", isCorrect: true, color: "blue" },
            { text: "Kenya", isCorrect: false, color: "yellow" },
            { text: "Nigeria", isCorrect: false, color: "green" },
          ],
        },
      ],
    },
    {
      title: "Cinema & Pop Culture Frenzy",
      description: "Blockbuster films, iconic soundtracks, superhero lore, and gaming legends!",
      categorySlug: "culture",
      difficulty: "EASY",
      coverImage: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800&auto=format&fit=crop&q=60",
      questions: [
        {
          text: "What fictional metal is Captain America's shield primarily composed of?",
          type: "MULTIPLE_CHOICE",
          timeLimit: 15,
          points: 1000,
          explanation: "Captain America's shield is made of Vibranium from Wakanda.",
          answers: [
            { text: "Adamantium", isCorrect: false, color: "red" },
            { text: "Vibranium", isCorrect: true, color: "blue" },
            { text: "Kryptonite", isCorrect: false, color: "yellow" },
            { text: "Beskar", isCorrect: false, color: "green" },
          ],
        },
        {
          text: "Which movie won the first Academy Award for Best Animated Feature in 2002?",
          type: "MULTIPLE_CHOICE",
          timeLimit: 20,
          points: 1000,
          explanation: "DreamWorks' Shrek won the inaugural Best Animated Feature Oscar over Monsters, Inc. and Jimmy Neutron.",
          answers: [
            { text: "Toy Story", isCorrect: false, color: "red" },
            { text: "Shrek", isCorrect: true, color: "blue" },
            { text: "Monsters, Inc.", isCorrect: false, color: "yellow" },
            { text: "Finding Nemo", isCorrect: false, color: "green" },
          ],
        },
        {
          text: "Mario's original character name in the 1981 Donkey Kong arcade game was 'Jumpman'.",
          type: "TRUE_FALSE",
          timeLimit: 15,
          points: 1000,
          explanation: "True! Shigeru Miyamoto originally named him Jumpman before he was renamed Mario.",
          answers: [
            { text: "True", isCorrect: true, color: "blue" },
            { text: "False", isCorrect: false, color: "red" },
          ],
        },
        {
          text: "What is the highest-grossing film of all time (unadjusted for inflation)?",
          type: "MULTIPLE_CHOICE",
          timeLimit: 15,
          points: 1000,
          explanation: "James Cameron's Avatar (2009) remains #1 with over $2.92 billion worldwide gross.",
          answers: [
            { text: "Avengers: Endgame", isCorrect: false, color: "red" },
            { text: "Avatar", isCorrect: true, color: "blue" },
            { text: "Titanic", isCorrect: false, color: "yellow" },
            { text: "Star Wars: The Force Awakens", isCorrect: false, color: "green" },
          ],
        },
        {
          text: "In Harry Potter, what position does Harry play on the Gryffindor Quidditch team?",
          type: "MULTIPLE_CHOICE",
          timeLimit: 15,
          points: 1000,
          explanation: "Harry plays as the Seeker whose objective is to catch the Golden Snitch.",
          answers: [
            { text: "Chaser", isCorrect: false, color: "red" },
            { text: "Seeker", isCorrect: true, color: "blue" },
            { text: "Keeper", isCorrect: false, color: "yellow" },
            { text: "Beater", isCorrect: false, color: "green" },
          ],
        },
        {
          text: "Which band sang 'Bohemian Rhapsody'?",
          type: "MULTIPLE_CHOICE",
          timeLimit: 10,
          points: 1000,
          explanation: "Queen released Bohemian Rhapsody in 1975, written by Freddie Mercury.",
          answers: [
            { text: "The Beatles", isCorrect: false, color: "red" },
            { text: "Queen", isCorrect: true, color: "blue" },
            { text: "Led Zeppelin", isCorrect: false, color: "yellow" },
            { text: "Pink Floyd", isCorrect: false, color: "green" },
          ],
        },
        {
          text: "In 'The Matrix', Neo takes the blue pill to see the truth about reality.",
          type: "TRUE_FALSE",
          timeLimit: 15,
          points: 1000,
          explanation: "False! Neo takes the RED pill to see the truth; the blue pill returns him to the simulated illusion.",
          answers: [
            { text: "True", isCorrect: false, color: "blue" },
            { text: "False", isCorrect: true, color: "red" },
          ],
        },
        {
          text: "What is the name of Han Solo's iconic starship in Star Wars?",
          type: "MULTIPLE_CHOICE",
          timeLimit: 15,
          points: 1000,
          explanation: "The Millennium Falcon made the Kessel Run in less than twelve parsecs!",
          answers: [
            { text: "X-Wing", isCorrect: false, color: "red" },
            { text: "Millennium Falcon", isCorrect: true, color: "blue" },
            { text: "Star Destroyer", isCorrect: false, color: "yellow" },
            { text: "Razor Crest", isCorrect: false, color: "green" },
          ],
        },
        {
          text: "Which video game franchise features the Master Chief as the main protagonist?",
          type: "MULTIPLE_CHOICE",
          timeLimit: 10,
          points: 1000,
          explanation: "Master Chief Petty Officer John-117 is the star of Bungie / 343 Industries' Halo series.",
          answers: [
            { text: "Gears of War", isCorrect: false, color: "red" },
            { text: "Halo", isCorrect: true, color: "blue" },
            { text: "Call of Duty", isCorrect: false, color: "yellow" },
            { text: "Mass Effect", isCorrect: false, color: "green" },
          ],
        },
        {
          text: "What is the name of the fictional kingdom ruled by Queen Elsa in Disney's Frozen?",
          type: "MULTIPLE_CHOICE",
          timeLimit: 15,
          points: 1000,
          explanation: "Elsa and Anna rule the kingdom of Arendelle.",
          answers: [
            { text: "Genovia", isCorrect: false, color: "red" },
            { text: "Arendelle", isCorrect: true, color: "blue" },
            { text: "Duloc", isCorrect: false, color: "yellow" },
            { text: "Corona", isCorrect: false, color: "green" },
          ],
        },
      ],
    },
  ];

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

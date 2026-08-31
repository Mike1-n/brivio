# QuizArena — Play. Learn. Compete. 🚀⚡

**QuizArena** is a complete, production-ready, interactive multiplayer quiz platform designed for teachers, schools, churches, organizations, and events. Inspired by the high-energy live quiz experience of Kahoot, QuizArena features its own original visual identity, electric color palette, authoritative real-time state machine, smart AI bot simulator, procedural Web Audio sound synthesizer, and detailed analytics.

---

## 🌟 Key Features

### 1. ⚡ Authoritative Real-Time Multiplayer Engine
- **Sub-50ms Synchronized Rooms**: Powered by Node.js and Socket.IO.
- **Strict State Machine**: `LOBBY` ➔ `STARTING (3-2-1 Countdown)` ➔ `QUESTION` ➔ `ANSWERS_LOCKED / RESULTS` ➔ `LEADERBOARD` ➔ `FINAL_PODIUM`.
- **Anti-Cheat Validation**: Server-authoritative clocks, timestamp-verified answer locks, and rejection of client-side manipulations.
- **Speed & Streak Scoring**:
  $$\text{Points} = \text{round}\left(\text{BasePoints} \times \left(1 - \frac{\text{ResponseTimeMs}}{2 \times \text{TimeLimitMs}}\right)\right) \times \text{StreakMultiplier}$$

### 2. 📺 Dual Screen Experiences
- **Host / Projector Display**:
  - High-contrast, large-scale UI formatted for TV screens and classroom projectors.
  - Prominently displays 6-digit Game PIN and joining players with animated avatars.
  - Live answer distribution bar charts, correct answer reveal, and educational explanation takeaways.
  - Animated top-5 Leaderboards with rank delta indicators ($+2$, $-1$) and flame streak badges.
  - 3D Olympic Victory Podium with victory fanfare and celebratory confetti explosion.
- **Player Mobile Controller**:
  - Ultra-fast thumb-friendly controller with 4 distinctive geometrical shape buttons:
    - ▲ Red Triangle
    - ◆ Blue Diamond
    - ● Yellow Circle
    - ■ Green Square
  - Instant answer locking with haptic feedback & sound effects.
  - Real-time personal score popup and standing rank update.

### 3. 🤖 Solo Test Drive & AI Bot Simulator
- Spawns smart AI bot players with randomized response times ($0.8\text{s} - 10\text{s}$) and accuracy profiles so developers and teachers can test the full multiplayer frenzy with 1 click without needing multiple devices.

### 4. 🎨 Procedural Web Audio Sound Synthesizer
- Zero-latency audio synthesized directly in the browser via Web Audio API:
  - Energetic rhythmic lobby groove
  - 3-2-1 countdown beeps
  - Urgent final-5-seconds warning ticks
  - Correct triumph fanfare chord arpeggios
  - Low buzzer feedback for incorrect answers
  - Grand Olympic fanfare for the victory podium

### 5. 🛠️ Rich Interactive Quiz Builder
- Drag-and-drop / up-down question reordering.
- Support for Multiple Choice (4 answers) and True/False questions.
- Configurable question time limits ($5\text{s}, 10\text{s}, 15\text{s}, 20\text{s}, 30\text{s}, 60\text{s}, 90\text{s}, 120\text{s}$).
- Configurable points ($1000\text{ standard}, 2000\text{ double}, 0\text{ practice}$).
- Optional cover and question media images.
- Educational explanation takeaways.

### 6. 🌐 Public Quiz Discovery Library & 1-Click Duplicate
- Browse, search, and filter quizzes by Category chips and Difficulty levels (Easy, Medium, Hard).
- 1-click **"Host Live"** or **"Duplicate to My Quizzes"**.

### 7. 📊 Reports & Platform Analytics
- Recharts visualizations of participant engagement, average response times, question difficulty distribution, and full game histories.

---

## 🔑 Demo Accounts & Quick-Login

The database is pre-seeded with 7 complete quizzes (70+ questions) and ready-to-use accounts:

| Role | Email | Password | Access |
|---|---|---|---|
| **Super Admin** | `admin@quizarena.com` | `password123` | Platform Admin Dashboard, User Management, Global Quiz Moderation |
| **Teacher / Host** | `teacher@quizarena.com` | `password123` | Quiz Studio, Quiz Builder, Live Game Hosting, Analytics |
| **Demo Host** | `demo@quizarena.com` | `password123` | Instant Quick Launch Host |
| **Player** | *No account needed* | *N/A* | Enter 6-digit PIN & nickname on `/play` |

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 18+ or 20+
- npm 9+

### 2. Installation
```bash
# Install dependencies
npm install

# Push Prisma database schema & seed 7 full quizzes
npx prisma db push
node prisma/seed.js
```

### 3. Running the Live Application
```bash
# Start the unified Next.js + Socket.IO server
node server.js
```
Open **`http://localhost:3000`** in your browser.

---

## 🏗️ Project Architecture

```
quiz-arena/
├── prisma/
│   ├── schema.prisma           # Prisma models (User, Quiz, Question, Answer, GameSession, GamePlayer, etc.)
│   └── seed.js                 # 70+ pre-seeded questions across 7 categories
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Global layout, themes, navigation
│   │   ├── page.tsx            # High-conversion landing page with PIN join
│   │   ├── (auth)/             # Login & Register with 1-click demo logins
│   │   ├── play/               # Mobile player join & controller
│   │   ├── host/[pin]/         # Projector big-screen host view
│   │   ├── explore/            # Public quiz discovery library
│   │   ├── dashboard/          # Teacher Studio (My Quizzes, Quiz Builder, Reports)
│   │   ├── admin/              # Super Admin dashboard
│   │   └── api/                # REST API routes (Auth, Quizzes, Sessions, Analytics)
│   ├── components/
│   │   ├── game/               # AnswerButton, TimerCircle, LeaderboardView, PodiumView
│   │   ├── ui/                 # Button, Input, Card, Badge
│   │   └── layout/             # Navbar
│   ├── lib/
│   │   ├── db.ts               # Prisma client singleton
│   │   ├── auth.ts             # JWT authentication & session helpers
│   │   ├── scoring.ts          # Speed bonus & streak multiplier formulas
│   │   ├── soundEffects.ts     # Procedural Web Audio API sound synthesizer
│   │   └── socket.ts           # Socket.IO client manager
│   └── server/
│       ├── socketServer.ts     # Authoritative Socket.IO game engine & room manager
│       └── botManager.ts       # AI simulated bot profiles & response generator
├── server.js                   # Unified Next.js + Socket.IO server entrypoint
└── package.json
```

---

## 🎮 How to Test a Live Multiplayer Game

1. Open **`http://localhost:3000`** in your browser.
2. Click **"Quick Launch Demo Host"** or go to **Explore** and click **"Host Live"**.
3. On the Host Lobby screen, note the **6-digit Game PIN**.
4. Click **"+ Add 4 AI Demo Bots"** (or open another browser window/mobile view at `/play` and enter the PIN).
5. Click **"START ARENA GAME"**.
6. Enjoy the 3-2-1 countdown, watch bots answer in real time, see the animated scoreboard, and celebrate on the Victory Podium with confetti!

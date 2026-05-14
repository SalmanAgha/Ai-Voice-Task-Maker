# Vortex AI | Institutional Voice Task Manager

Vortex AI is a high-performance, voice-first task management ecosystem designed for the UrbanGround software engineering assessment. Unlike traditional "chatbot" interfaces, Vortex AI functions as a proactive voice agent that manages complex task lifecycles through natural, real-time conversation.

![Vortex AI Dashboard](https://images.unsplash.com/photo-1589254065878-42c9da997008?auto=format&fit=crop&q=80&w=2000)

## 🎙️ The "Voice-First" Philosophy
The core objective of this project was to eliminate manual CRUD interactions. Vortex AI relies on **Semantic Intent Recognition** to resolve user commands, meaning you don't need to remember exact task names. You speak, it understands, and the interface reacts in real-time.

---

## 🚀 Key Features

- **Professional Voice Engine**: Uses OpenAI's high-fidelity TTS (Alloy) to provide a premium, human-like assistant experience.
- **Continuous Speech Recognition**: Implements a "Manual Pro-Mode" recording system that captures long, complex instructions without cutting the user off during pauses.
- **Deep Context Awareness**: Persists conversation history in PostgreSQL, allowing the AI to understand relative references like *"Change the time for the previous one"* or *"Remind me about that meeting I made earlier."*
- **Real-Time Synchronicity**: A heartbeat sync engine ensures that voice commands and manual UI fallbacks stay perfectly aligned every 3 seconds.
*   **Dual-View Interface**: A split-screen dashboard featuring a reactive audio waveform visualizer and a persistent conversational transcript window.
- **Proactive Reminders**: The system monitors your agenda and proactively speaks aloud when a task is due.

---

## 🛠️ Technical Architecture

- **Frontend**: Next.js 15 (App Router) with Tailwind CSS v4.
- **Backend**: Next.js Serverless Functions + Prisma ORM.
- **AI Core**: OpenAI GPT-4o-mini (Context & Tool Calling).
- **Audio Logic**: Web Audio API (Visualization) + OpenAI TTS (Output) + Web Speech API (Input).
- **Database**: PostgreSQL (Fully persistent Task and Message models).

---

## 📦 Setup & Installation

### 1. Prerequisites
- Node.js 18+
- A running PostgreSQL instance (or use Neon/Supabase for cloud).
- An OpenAI API Key.

### 2. Installation
```bash
git clone https://github.com/your-username/voice-task-manager.git
cd voice-task-manager
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/voice_task_manager"
OPENAI_API_KEY="your_openai_api_key_here"
```

### 4. Database Setup
```bash
npx prisma db push
```

### 5. Run Locally
```bash
npm run dev
```

---

## 🔒 Security Note
This project is configured with a strict `.gitignore`. **NEVER** commit your `.env` file to a public repository. When deploying to Vercel, ensure you add your keys under the **Environment Variables** settings.

---

## 👨‍💻 Author
**Salman Agha**
*Software Engineer Candidate*

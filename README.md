# Talk Coding

[中文文档](./README.zh-CN.md)

A voice-driven AI coding bridge for non-programmers. Speak your idea, the system calls AI coding assistants (Claude Code / Codex / Gemini CLI) to generate a web page, and shows you the result instantly.

## How It Works

```
User (voice)  -->  Whisper STT  -->  CLI Tool (claude/codex/gemini)
                                                     |
                                                     v
User (browser)  <--  TTS audio  <--  Generated page (index.html)
```

1. Press and hold the mic button, describe what you want
2. Audio is sent to the backend, transcribed via OpenAI Whisper
3. Backend invokes a CLI coding tool with your request
4. The CLI generates a web page in real-time, output is streamed back
5. AI response is spoken back via OpenAI TTS
6. A "View Your Page" link appears when the page is ready

## Prerequisites

- **Node.js** >= 18
- **OpenAI API Key** (for Whisper STT + TTS)
- At least one of these CLI tools installed globally:
  - [Claude Code](https://docs.anthropic.com/en/docs/claude-code) (`claude`)
  - [OpenAI Codex CLI](https://github.com/openai/codex) (`codex`)
  - [Gemini CLI](https://github.com/google-gemini/gemini-cli) (`gemini`)

## Quick Start

```bash
# Clone the repo
git clone https://github.com/liu-xiaoran/talk-coding.git
cd talk-coding

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env and set your OPENAI_API_KEY

# Start development server
npm run dev
```

Open `http://localhost:5173` in your browser (Chrome recommended).

## Configuration

Create a `.env` file from the template:

```env
# Required: OpenAI API key for speech recognition and synthesis
OPENAI_API_KEY=sk-xxx

# Optional: Default CLI tool (claude | codex | gemini), defaults to "claude"
DEFAULT_TOOL=claude

# Optional: Server port, defaults to 3000
PORT=3000
```

## Usage

### Voice Input
- **Press and hold** the mic button to record
- **Release** to send
- Your speech is transcribed and sent to the AI

### Text Input
- Type in the text box and press **Enter** to send

### Switch AI Tool
- Use the dropdown in the top-right corner to switch between Claude Code, Codex, and Gemini

### View Generated Page
- When the AI finishes building, a green **"View Your Page"** button appears
- Click it to open the generated page in a new tab

## Architecture

```
talk-coding/
├── shared/
│   └── types.ts                  # Shared WebSocket message types
├── server/
│   ├── index.ts                  # Express + WebSocket entry point
│   ├── config.ts                 # Environment configuration
│   ├── ws/
│   │   └── handler.ts            # WebSocket message handler
│   └── services/
│       ├── cli-runner.ts         # CLI tool orchestration + stream parsing
│       ├── speech.ts             # Whisper STT + OpenAI TTS
│       ├── session-manager.ts    # Session state management
│       └── project-manager.ts    # Project directory & file management
├── frontend/
│   ├── index.html                # Single-page app
│   ├── main.ts                   # Entry point
│   ├── ws-client.ts              # WebSocket client with reconnect
│   ├── voice-input.ts            # MediaRecorder audio capture
│   ├── voice-output.ts           # TTS audio playback
│   └── ui.ts                     # DOM rendering
└── projects/                     # Generated pages (gitignored)
    └── {session-id}/
        └── index.html
```

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Backend | Node.js + TypeScript + Express | Unified language with frontend; native `child_process.spawn` for CLI |
| Frontend | Vanilla HTML + TypeScript (Vite) | Minimal UI (mic button + chat area), no framework needed |
| Voice Input | OpenAI Whisper API | Best accuracy, server-side processing |
| Voice Output | OpenAI TTS API | Natural voices, same API key |
| Real-time | WebSocket (`ws`) | Bidirectional: audio upload + streamed text/status |
| CLI Orchestration | `child_process.spawn` + stream JSON parsing | All three CLIs support streaming JSON output |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both Vite dev server and backend concurrently |
| `npm run dev:server` | Start backend only (with hot reload) |
| `npm run dev:client` | Start Vite frontend dev server only |
| `npm run build` | Build frontend + compile backend TypeScript |
| `npm start` | Run production build |

## License

[Apache License 2.0](./LICENSE)

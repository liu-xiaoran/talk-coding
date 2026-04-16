# Talk Coding

[English](./README.md)

一个面向非程序员的语音驱动 AI 编程桥接平台。用语音描述你的想法，系统调用 AI 编程助手（Claude Code / Codex / Gemini CLI）生成网页，并即时展示结果。

## 工作原理

```
用户（语音）  -->  Whisper 语音识别  -->  CLI 工具 (claude/codex/gemini)
                                                       |
                                                       v
用户（浏览器）  <--  TTS 语音合成  <--  生成的页面 (index.html)
```

1. 按住麦克风按钮，说出你想要什么
2. 音频发送到后端，通过 OpenAI Whisper 转为文字
3. 后端调用 CLI 编程工具处理你的请求
4. CLI 实时生成网页，输出流式返回
5. AI 回复通过 OpenAI TTS 语音播报
6. 页面生成完成后出现"查看你的页面"链接

## 前置要求

- **Node.js** >= 18
- **OpenAI API Key**（用于 Whisper 语音识别和 TTS 语音合成）
- 至少安装以下 CLI 工具之一：
  - [Claude Code](https://docs.anthropic.com/en/docs/claude-code) (`claude`)
  - [OpenAI Codex CLI](https://github.com/openai/codex) (`codex`)
  - [Gemini CLI](https://github.com/google-gemini/gemini-cli) (`gemini`)

## 快速开始

```bash
# 克隆仓库
git clone https://github.com/liu-xiaoran/talk-coding.git
cd talk-coding

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入你的 OPENAI_API_KEY

# 启动开发服务器
npm run dev
```

在浏览器中打开 `http://localhost:5173`（推荐使用 Chrome）。

## 配置

从模板创建 `.env` 文件：

```env
# 必填：OpenAI API Key，用于语音识别和语音合成
OPENAI_API_KEY=sk-xxx

# 可选：默认 CLI 工具（claude | codex | gemini），默认为 "claude"
DEFAULT_TOOL=claude

# 可选：服务器端口，默认为 3000
PORT=3000
```

## 使用方法

### 语音输入
- **按住**麦克风按钮开始录音
- **松开**发送
- 语音会被转录并发送给 AI

### 文字输入
- 在文本框中输入消息，按 **Enter** 发送

### 切换 AI 工具
- 使用右上角的下拉菜单在 Claude Code、Codex 和 Gemini 之间切换

### 查看生成的页面
- AI 构建完成后，会出现一个绿色的 **"查看你的页面"** 按钮
- 点击即可在新标签页中打开生成的页面

## 项目架构

```
talk-coding/
├── shared/
│   └── types.ts                  # 前后端共享的 WebSocket 消息类型
├── server/
│   ├── index.ts                  # Express + WebSocket 入口
│   ├── config.ts                 # 环境配置
│   ├── ws/
│   │   └── handler.ts            # WebSocket 消息处理
│   └── services/
│       ├── cli-runner.ts         # CLI 工具调用 + 流式输出解析
│       ├── speech.ts             # Whisper 语音识别 + TTS 语音合成
│       ├── session-manager.ts    # 会话状态管理
│       └── project-manager.ts    # 项目目录与文件管理
├── frontend/
│   ├── index.html                # 单页应用
│   ├── main.ts                   # 入口文件
│   ├── ws-client.ts              # WebSocket 客户端（自动重连）
│   ├── voice-input.ts            # MediaRecorder 录音
│   ├── voice-output.ts           # TTS 音频播放
│   └── ui.ts                     # DOM 渲染
└── projects/                     # 生成的页面（已 gitignore）
    └── {session-id}/
        └── index.html
```

## 技术栈

| 层 | 技术 | 原因 |
|---|---|---|
| 后端 | Node.js + TypeScript + Express | 与前端统一语言；原生 `child_process.spawn` 调用 CLI |
| 前端 | 原生 HTML + TypeScript（Vite 构建） | UI 极简（麦克风按钮 + 对话区），无需框架 |
| 语音输入 | OpenAI Whisper API | 最高准确率，服务端处理 |
| 语音输出 | OpenAI TTS API | 自然语音，统一 API Key |
| 实时通信 | WebSocket（`ws`） | 双向通信：音频上传 + 流式文本/状态推送 |
| CLI 编排 | `child_process.spawn` + 流式 JSON 解析 | 三个 CLI 均支持流式 JSON 输出 |

## 脚本命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 同时启动 Vite 开发服务器和后端 |
| `npm run dev:server` | 仅启动后端（支持热重载） |
| `npm run dev:client` | 仅启动 Vite 前端开发服务器 |
| `npm run build` | 构建前端 + 编译后端 TypeScript |
| `npm start` | 运行生产构建 |

## 许可证

[Apache License 2.0](./LICENSE)

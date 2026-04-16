import type { WebSocket } from 'ws';
import type { ClientMessage, ServerMessage } from '../../shared/types.js';
import type { Session } from '../services/session-manager.js';
import {
  createSession,
  addMessage,
  setProcess,
  setTool,
  markContinuation,
  removeSession,
} from '../services/session-manager.js';
import { runCli } from '../services/cli-runner.js';
import { transcribe, synthesize } from '../services/speech.js';
import { createProjectDir, hasIndexHtml, getPageUrl } from '../services/project-manager.js';

export function handleConnection(ws: WebSocket): void {
  const session = createSession(ws);
  send(ws, { type: 'connected', sessionId: session.sessionId });

  ws.on('message', async (raw: Buffer, isBinary: boolean) => {
    try {
      if (isBinary) {
        // 二进制帧 = 音频数据
        await handleAudio(ws, session, raw);
      } else {
        let msg: ClientMessage;
        try {
          msg = JSON.parse(raw.toString()) as ClientMessage;
        } catch (parseErr) {
          send(ws, { type: 'error', message: 'Invalid message format' });
          return;
        }

        // 验证消息类型
        if (!msg || !msg.type) {
          send(ws, { type: 'error', message: 'Invalid message: missing type' });
          return;
        }

        switch (msg.type) {
          case 'text':
            await handleText(ws, session, msg.content);
            break;
          case 'audio':
            // 音频通过二进制帧发送，这里的 audio 消息不应该到达
            break;
          case 'select_tool':
            setTool(session, msg.tool);
            break;
          case 'interrupt':
            handleInterrupt(session);
            break;
          default:
            send(ws, { type: 'error', message: `Unknown message type: ${(msg as any).type}` });
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      send(ws, { type: 'error', message });
    }
  });

  ws.on('close', () => {
    // 中断当前进程
    handleInterrupt(session);
    removeSession(session.sessionId);
  });
}

async function handleAudio(ws: WebSocket, session: Session, audioData: Buffer): Promise<void> {
  send(ws, { type: 'cli_status', status: 'thinking', tool: session.selectedTool });

  const text = await transcribe(audioData);
  send(ws, { type: 'transcript', text });

  await handleText(ws, session, text);
}

async function handleText(ws: WebSocket, session: Session, text: string): Promise<void> {
  if (!text.trim()) return;

  // 防止竞态条件：如果已有正在运行的进程，先中断它
  if (session.currentProcess) {
    try {
      session.currentProcess.kill('SIGTERM');
      setProcess(session, null);
    } catch (err) {
      console.error('Failed to interrupt previous process:', err);
    }
  }

  addMessage(session, 'user', text);

  await createProjectDir(session.sessionId);

  send(ws, { type: 'cli_status', status: 'thinking', tool: session.selectedTool });

  const { process: proc, events } = runCli({
    tool: session.selectedTool,
    prompt: text,
    workDir: session.projectDir,
    continuation: session.isContinuation,
  });

  setProcess(session, proc);
  markContinuation(session);

  let fullText = '';
  let processing = true;

  events.on('event', (cliEvent) => {
    // 确保 WebSocket 仍然打开
    if (ws.readyState !== ws.OPEN) return;

    switch (cliEvent.event) {
      case 'text_delta':
        if (processing) {
          fullText += cliEvent.content;
          send(ws, { type: 'ai_text_delta', text: cliEvent.content });
        }
        break;
      case 'tool_call':
        if (processing) {
          send(ws, { type: 'cli_status', status: 'writing', tool: session.selectedTool });
        }
        break;
      case 'complete':
        if (processing) {
          processing = false;
          handleComplete(ws, session, fullText).catch((e: Error) => {
            send(ws, { type: 'error', message: e.message });
          });
        }
        break;
      case 'error':
        if (processing) {
          processing = false;
          send(ws, { type: 'error', message: cliEvent.content });
        }
        break;
    }
  });

  // 当 WebSocket 关闭时，停止处理事件
  ws.once('close', () => {
    processing = false;
  });
}

async function handleComplete(ws: WebSocket, session: Session, fullText: string): Promise<void> {
  setProcess(session, null);
  addMessage(session, 'assistant', fullText);

  send(ws, { type: 'ai_text_done', fullText });

  // 检查是否生成了页面
  const hasPage = await hasIndexHtml(session.projectDir);
  if (hasPage) {
    send(ws, {
      type: 'page_ready',
      url: getPageUrl(session.sessionId),
      sessionId: session.sessionId,
    });
  }

  // TTS 语音回复
  if (fullText.trim()) {
    try {
      const audioBuffer = await synthesize(fullText);
      ws.send(audioBuffer);
    } catch {
      // TTS 失败不影响主流程
    }
  }
}

function handleInterrupt(session: Session): void {
  if (session.currentProcess) {
    try {
      session.currentProcess.kill('SIGTERM');
    } catch (err) {
      console.error('Failed to kill process:', err);
    } finally {
      setProcess(session, null);
    }
  }
}

function send(ws: WebSocket, msg: ServerMessage): void {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

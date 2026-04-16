import { spawn, type ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import path from 'path';
import type { CliTool, CliEvent } from '../../shared/types.js';

// ========== 流式输出适配器 ==========

interface StreamAdapter {
  parseLine(line: string): CliEvent | null;
}

function createClaudeAdapter(): StreamAdapter {
  return {
    parseLine(line: string): CliEvent | null {
      try {
        const obj = JSON.parse(line);
        if (obj.type === 'assistant' && obj.message?.content) {
          const blocks = obj.message.content;
          for (const block of blocks) {
            if (block.type === 'text') {
              return { event: 'text_delta', content: block.text };
            }
            if (block.type === 'tool_use') {
              return { event: 'tool_call', content: block.name };
            }
          }
        }
        if (obj.type === 'result') {
          return { event: 'complete', content: obj.result || '', exitCode: 0 };
        }
      } catch {
        // 非 JSON 行忽略
      }
      return null;
    },
  };
}

function createCodexAdapter(): StreamAdapter {
  return {
    parseLine(line: string): CliEvent | null {
      try {
        const obj = JSON.parse(line);
        if (obj.type === 'message' && obj.content) {
          return { event: 'text_delta', content: obj.content };
        }
        if (obj.type === 'action') {
          return { event: 'tool_call', content: obj.action || '' };
        }
        if (obj.type === 'done' || obj.type === 'complete') {
          return { event: 'complete', content: '', exitCode: 0 };
        }
      } catch {
        // 非 JSON 行忽略
      }
      return null;
    },
  };
}

function createGeminiAdapter(): StreamAdapter {
  return {
    parseLine(line: string): CliEvent | null {
      try {
        const obj = JSON.parse(line);
        if (obj.type === 'text' || obj.type === 'content') {
          return { event: 'text_delta', content: obj.text || obj.content || '' };
        }
        if (obj.type === 'tool_use' || obj.type === 'function_call') {
          return { event: 'tool_call', content: obj.name || '' };
        }
        if (obj.type === 'done' || obj.type === 'result') {
          return { event: 'complete', content: '', exitCode: 0 };
        }
      } catch {
        // 非 JSON 行忽略
      }
      return null;
    },
  };
}

function getAdapter(tool: CliTool): StreamAdapter {
  switch (tool) {
    case 'claude': return createClaudeAdapter();
    case 'codex': return createCodexAdapter();
    case 'gemini': return createGeminiAdapter();
  }
}

// ========== CLI 调用 ==========

export interface RunCliOptions {
  tool: CliTool;
  prompt: string;
  workDir: string;
  /** 是否是继续对话（使用 --continue 或类似选项） */
  continuation: boolean;
  /** 超时时间（毫秒），默认 5 分钟 */
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000; // 5 分钟

/**
 * 调用 CLI 工具，返回 EventEmitter 流式输出标准化事件。
 */
export function runCli(options: RunCliOptions): { process: ChildProcess; events: EventEmitter } {
  const { tool, prompt, workDir, continuation, timeoutMs = DEFAULT_TIMEOUT_MS } = options;
  const adapter = getAdapter(tool);
  const events = new EventEmitter();
  const args = buildArgs(tool, prompt, continuation);

  // 验证 tool 是有效的 CliTool
  if (!['claude', 'codex', 'gemini'].includes(tool)) {
    throw new Error(`Invalid tool: ${tool}`);
  }

  const proc = spawn(tool, args, {
    cwd: path.resolve(workDir),
    env: { ...process.env },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  let buffer = '';
  let timer: NodeJS.Timeout | null = null;

  // 设置超时
  timer = setTimeout(() => {
    proc.kill('SIGTERM');
    events.emit('event', { event: 'error', content: `Command timed out after ${timeoutMs}ms` });
  }, timeoutMs);

  proc.stdout!.on('data', (chunk: Buffer) => {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const cliEvent = adapter.parseLine(trimmed);
      if (cliEvent) {
        events.emit('event', cliEvent);
      }
    }
  });

  proc.stderr!.on('data', (chunk: Buffer) => {
    const text = chunk.toString().trim();
    if (text) {
      events.emit('event', { event: 'error', content: text });
    }
  });

  const cleanup = (): void => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    // 移除所有监听器防止内存泄漏
    proc.stdout!.removeAllListeners('data');
    proc.stderr!.removeAllListeners('data');
    proc.removeAllListeners('close');
    proc.removeAllListeners('error');
  };

  proc.on('close', (code) => {
    // 处理 buffer 中剩余内容
    if (buffer.trim()) {
      const cliEvent = adapter.parseLine(buffer.trim());
      if (cliEvent) events.emit('event', cliEvent);
    }
    events.emit('event', { event: 'complete', content: '', exitCode: code ?? 0 });
    cleanup();
    events.emit('close');
  });

  proc.on('error', (err) => {
    events.emit('event', { event: 'error', content: err.message });
    cleanup();
    events.emit('close');
  });

  return { process: proc, events };
}

function buildArgs(tool: CliTool, prompt: string, continuation: boolean): string[] {
  switch (tool) {
    case 'claude': {
      const args = ['-p', prompt, '--output-format', 'stream-json', '--dangerously-skip-permissions'];
      if (continuation) args.push('--continue');
      return args;
    }
    case 'codex': {
      const args = ['exec', prompt, '--full-auto'];
      if (continuation) args.push('--continue');
      return args;
    }
    case 'gemini': {
      const args = ['-p', prompt, '--output-format', 'stream-json', '--yolo', '--sandbox', 'false'];
      return args;
    }
  }
}

// ========== 客户端 → 服务端 ==========

export type ClientMessage =
  | { type: 'audio'; format: string }
  | { type: 'text'; content: string }
  | { type: 'select_tool'; tool: CliTool }
  | { type: 'interrupt' };

// ========== 服务端 → 客户端 ==========

export type ServerMessage =
  | { type: 'transcript'; text: string }
  | { type: 'ai_text_delta'; text: string }
  | { type: 'ai_text_done'; fullText: string }
  | { type: 'ai_audio'; format: string }
  | { type: 'cli_status'; status: CliStatus; tool: CliTool }
  | { type: 'page_ready'; url: string; sessionId: string }
  | { type: 'error'; message: string }
  | { type: 'connected'; sessionId: string };

// ========== CLI 相关 ==========

export type CliTool = 'claude' | 'codex' | 'gemini';

export type CliStatus = 'idle' | 'thinking' | 'writing' | 'done' | 'cancelled' | 'error';

export interface CliEvent {
  event: 'text_delta' | 'tool_call' | 'complete' | 'error';
  content: string;
  exitCode?: number;
}

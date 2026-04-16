import { randomUUID } from 'crypto';
import path from 'path';
import type { CliTool } from '../../shared/types.js';
import type { WebSocket } from 'ws';
import type { ChildProcess } from 'child_process';
import { config } from '../config.js';

export interface Session {
  sessionId: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  currentProcess: ChildProcess | null;
  projectDir: string;
  selectedTool: CliTool;
  isContinuation: boolean;
}

const sessions = new Map<string, Session>();
const MAX_SESSIONS = 100;

export function createSession(ws: WebSocket): Session {
  if (sessions.size >= MAX_SESSIONS) {
    throw new Error('Maximum sessions reached. Please try again later.');
  }

  const sessionId = randomUUID().slice(0, 8);
  const session: Session = {
    sessionId,
    messages: [],
    currentProcess: null,
    projectDir: path.resolve(config.projectsDir, sessionId),
    selectedTool: config.defaultTool,
    isContinuation: false,
  };
  sessions.set(sessionId, session);
  return session;
}

export function getSession(id: string): Session | undefined {
  return sessions.get(id);
}

export function addMessage(session: Session, role: 'user' | 'assistant', content: string): void {
  session.messages.push({ role, content });
}

export function setProcess(session: Session, proc: ChildProcess | null): void {
  session.currentProcess = proc;
}

export function setTool(session: Session, tool: CliTool): void {
  session.selectedTool = tool;
}

export function markContinuation(session: Session): void {
  session.isContinuation = true;
}

export function removeSession(id: string): void {
  const session = sessions.get(id);
  if (session?.currentProcess) {
    session.currentProcess.kill('SIGTERM');
  }
  sessions.delete(id);
}

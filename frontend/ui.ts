const chatEl = document.getElementById('chat')!;
const statusEl = document.getElementById('status')!;
let currentAiMsgEl: HTMLElement | null = null;
let currentAiText = '';

export function addUserMessage(text: string): void {
  currentAiMsgEl = null;
  currentAiText = '';
  appendMsg('user', text);
}

export function addSystemMessage(text: string): void {
  currentAiMsgEl = null;
  const el = appendMsg('system', text);
  return;
}

export function appendAiText(text: string): void {
  currentAiText += text;
  if (!currentAiMsgEl) {
    currentAiMsgEl = appendMsg('ai', '');
  }
  currentAiMsgEl.textContent = currentAiText;
  scrollToBottom();
}

export function finishAiText(): void {
  currentAiMsgEl = null;
  currentAiText = '';
}

export function showPageLink(url: string): void {
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.className = 'page-link';
  link.textContent = '查看你的页面';
  chatEl.appendChild(link);
  scrollToBottom();
}

export function setStatus(text: string): void {
  statusEl.textContent = text;
}

function appendMsg(type: 'user' | 'ai' | 'system', text: string): HTMLElement {
  const el = document.createElement('div');
  el.className = `msg ${type}`;
  el.textContent = text;
  chatEl.appendChild(el);
  scrollToBottom();
  return el;
}

function scrollToBottom(): void {
  chatEl.scrollTop = chatEl.scrollHeight;
}

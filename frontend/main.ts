import type { ServerMessage } from '../shared/types.js';
import { WsClient } from './ws-client.js';
import { VoiceInput } from './voice-input.js';
import { VoiceOutput } from './voice-output.js';
import { addUserMessage, addSystemMessage, appendAiText, finishAiText, showPageLink, setStatus } from './ui.js';

// ========== HMR 清理 ==========

let cleanupHMR: (() => void) | null = null;

if (import.meta.hot) {
  import.meta.hot.accept(() => {
    // 模块热替换时清理旧状态
    cleanupHMR?.();
  });
}

// ========== 初始化 ==========

let voiceOutput: VoiceOutput;
let wsClient: WsClient;
let voiceInput: VoiceInput;

function initialize() {
  voiceOutput = new VoiceOutput();
  wsClient = new WsClient(handleServerMessage);

  // 音频回调：收到 TTS 音频后播放
  wsClient.onAudio = (data: ArrayBuffer) => voiceOutput.play(data);

  voiceInput = new VoiceInput(async (blob) => {
    micBtn.classList.remove('recording');
    setStatus('处理中...');
    wsClient.sendBinary(await blob.arrayBuffer());
  });
}

initialize();

function cleanup() {
  wsClient?.disconnect();
  voiceOutput?.stop();
  voiceInput?.stop();
}

cleanupHMR = cleanup;

// ========== UI 元素 ==========

const micBtn = document.getElementById('mic-btn') as HTMLButtonElement;
const textInput = document.getElementById('text-input') as HTMLTextAreaElement;
const toolSelect = document.getElementById('tool-select') as HTMLSelectElement;

// ========== 麦克风按钮：按住录音 ==========

micBtn.addEventListener('mousedown', async () => {
  try {
    await voiceInput.start();
    micBtn.classList.add('recording');
    setStatus('录音中...');
  } catch {
    setStatus('无法访问麦克风');
  }
});

micBtn.addEventListener('mouseup', () => {
  voiceInput.stop();
});

micBtn.addEventListener('mouseleave', () => {
  if (voiceInput.isRecording()) voiceInput.stop();
});

// 触摸支持
micBtn.addEventListener('touchstart', async (e) => {
  e.preventDefault();
  try {
    await voiceInput.start();
    micBtn.classList.add('recording');
    setStatus('录音中...');
  } catch {
    setStatus('无法访问麦克风');
  }
});

micBtn.addEventListener('touchend', () => {
  voiceInput.stop();
});

// ========== 文字输入 ==========

textInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    const text = textInput.value.trim();
    if (!text) return;
    textInput.value = '';
    addUserMessage(text);
    wsClient.sendJson({ type: 'text', content: text });
  }
});

// ========== 工具选择 ==========

toolSelect.addEventListener('change', () => {
  wsClient.sendJson({ type: 'select_tool', tool: toolSelect.value });
});

// ========== 服务端消息处理 ==========

function handleServerMessage(msg: ServerMessage): void {
  switch (msg.type) {
    case 'connected':
      addSystemMessage(`已连接 (会话: ${msg.sessionId})`);
      setStatus('');
      break;

    case 'transcript':
      addUserMessage(msg.text);
      break;

    case 'ai_text_delta':
      appendAiText(msg.text);
      break;

    case 'ai_text_done':
      finishAiText();
      setStatus('');
      break;

    case 'ai_audio':
      // 音频数据通过 wsClient.onAudio 处理
      break;

    case 'cli_status':
      const statusMap: Record<string, string> = {
        thinking: '思考中...',
        writing: '编写代码中...',
        done: '完成',
        error: '出错了',
        cancelled: '已取消',
      };
      setStatus(statusMap[msg.status] || msg.status);
      break;

    case 'page_ready':
      showPageLink(msg.url);
      setStatus('页面已生成!');
      break;

    case 'error':
      addSystemMessage(`错误: ${msg.message}`);
      setStatus('');
      break;
  }
}

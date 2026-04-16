import OpenAI from 'openai';
import { config } from '../config.js';

let openai: OpenAI | null = null;

function getClient(): OpenAI {
  if (!config.openaiApiKey) {
    throw new Error('OPENAI_API_KEY is not configured. Check your .env file.');
  }
  if (!openai) {
    openai = new OpenAI({ apiKey: config.openaiApiKey });
  }
  return openai;
}

/**
 * 语音转文字：调用 Whisper API
 */
export async function transcribe(audioBuffer: Buffer, format: string = 'webm'): Promise<string> {
  const client = getClient();
  const file = new File([new Uint8Array(audioBuffer)], `audio.${format}`, { type: `audio/${format}` });

  const response = await client.audio.transcriptions.create({
    model: 'whisper-1',
    file,
    language: 'zh',
  });

  return response.text;
}

/**
 * 文字转语音：调用 OpenAI TTS API
 */
export async function synthesize(text: string): Promise<Buffer> {
  const client = getClient();

  const response = await client.audio.speech.create({
    model: 'tts-1',
    voice: 'alloy',
    input: text.slice(0, 4096),
    response_format: 'mp3',
  });

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

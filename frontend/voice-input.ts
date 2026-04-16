export class VoiceInput {
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private recording = false;
  private onAudioReady: (blob: Blob) => void;

  constructor(onAudioReady: (blob: Blob) => void) {
    this.onAudioReady = onAudioReady;
  }

  async start(): Promise<void> {
    if (this.recording) return;

    // 先停止之前的流，防止资源泄漏
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }

    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.chunks = [];
    this.mediaRecorder = new MediaRecorder(this.stream, { mimeType: 'audio/webm' });

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };

    this.mediaRecorder.onstop = () => {
      const blob = new Blob(this.chunks, { type: 'audio/webm' });
      this.onAudioReady(blob);
      // 停止所有音轨
      this.stream?.getTracks().forEach((t) => t.stop());
      this.stream = null;
      this.recording = false;
    };

    this.mediaRecorder.start();
    this.recording = true;
  }

  stop(): void {
    if (this.recording && this.mediaRecorder?.state === 'recording') {
      this.mediaRecorder.stop();
    }
  }

  cleanup(): void {
    this.stop();
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    this.mediaRecorder = null;
  }

  isRecording(): boolean {
    return this.recording;
  }
}

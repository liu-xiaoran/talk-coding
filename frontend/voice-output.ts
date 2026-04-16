export class VoiceOutput {
  private audioContext: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;

  async play(audioData: ArrayBuffer): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }

    // 检查 AudioContext 状态，必要时恢复
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    // 停止当前播放
    this.stop();

    try {
      const audioBuffer = await this.audioContext.decodeAudioData(audioData);
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      source.start(0);
      this.currentSource = source;
    } catch (err) {
      console.error('Failed to play audio:', err);
    }
  }

  stop(): void {
    if (this.currentSource) {
      try { this.currentSource.stop(); } catch {}
      this.currentSource = null;
    }
  }
}

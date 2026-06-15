import { Injectable, OnDestroy, signal } from '@angular/core';
import * as faceapi from '@vladmandic/face-api';

const MODELS_PATH = '/models';
const DETECTION_INTERVAL_MS = 1000;

@Injectable({ providedIn: 'root' })
export class FaceEmotionService implements OnDestroy {
  readonly suggestedEmoji = signal<string>('');

  private stream: MediaStream | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private modelsLoaded = false;

  async startDetection(video: HTMLVideoElement): Promise<void> {
    await this.loadModels();
    this.stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    video.srcObject = this.stream;
    await video.play();
    this.intervalId = setInterval(() => this.detect(video), DETECTION_INTERVAL_MS);
  }

  stopDetection(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = null;
  }

  private async loadModels(): Promise<void> {
    if (this.modelsLoaded) return;
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(`${MODELS_PATH}/ssd_mobilenetv1`),
      faceapi.nets.faceLandmark68Net.loadFromUri(`${MODELS_PATH}/face_landmark_68`),
      faceapi.nets.faceExpressionNet.loadFromUri(`${MODELS_PATH}/face_expression`),
    ]);
    this.modelsLoaded = true;
  }

  private async detect(video: HTMLVideoElement): Promise<void> {
    if (video.readyState < 2) return;

    const result = await faceapi
      .detectSingleFace(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
      .withFaceLandmarks()
      .withFaceExpressions();

    if (!result) {
      this.suggestedEmoji.set('');
      return;
    }

    const expressions = result.expressions as unknown as Record<string, number>;
    let emotion = '', confidence = 0;
    for (const key in expressions) {
      if (expressions[key] > confidence) { confidence = expressions[key]; emotion = key; }
    }

    console.log('Detected Emotion:', emotion, confidence);
    this.suggestedEmoji.set(this.toEmoji(emotion, confidence));
  }

  private toEmoji(emotion: string, score: number): string {
    const hi = score > 0.75;
    switch (emotion) {
      case 'happy':     return hi ? '😁' : '😊';
      case 'surprised': return hi ? '😲' : '😮';
      case 'sad':       return hi ? '😢' : '😔';
      case 'angry':     return hi ? '😡' : '😠';
      default:          return '';
    }
  }

  ngOnDestroy(): void {
    this.stopDetection();
  }
}

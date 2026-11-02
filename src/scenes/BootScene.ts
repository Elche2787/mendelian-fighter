import Phaser from 'phaser';
import { AUDIO_MANIFEST, asset } from '../config';

/** Memeriksa font & manifest audio (opsional), lalu lanjut ke PreloadScene. */
export class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }
  create(): void { void this.setup(); }

  private async setup(): Promise<void> {
    let manifest: Record<string, string> = {};
    try {
      const res = await fetch(asset(AUDIO_MANIFEST));
      const json: unknown = res.ok ? await res.json() : {};
      if (json && typeof json === 'object') {
        for (const [k, v] of Object.entries(json as Record<string, unknown>)) {
          if (typeof v === 'string' && /^[\w./-]+\.(mp3|ogg|wav|m4a)$/i.test(v)) manifest[k] = v;
        }
      }
    } catch { manifest = {}; }
    this.registry.set('audioManifest', manifest);
    try {
      await Promise.race([document.fonts.load('700 24px Cinzel'), new Promise((r) => window.setTimeout(r, 1500))]);
    } catch { /* font fallback dipakai */ }
    this.scene.start('PreloadScene');
  }
}

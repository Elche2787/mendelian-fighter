import Phaser from 'phaser';
import { AUDIO_PREF_KEY } from '../config';

/** Audio opsional: hanya kunci yang terdaftar di assets/audio/manifest.json yang dimuat. */
class AudioManager {
  private game?: Phaser.Game;
  private available = new Set<string>();
  private bgm?: Phaser.Sound.BaseSound;
  private bgmKey = '';
  muted = false;
  volume = 0.7;

  attach(game: Phaser.Game): void {
    this.game = game;
    try {
      const p = JSON.parse(localStorage.getItem(AUDIO_PREF_KEY) ?? '{}') as { muted?: unknown; volume?: unknown };
      if (typeof p.muted === 'boolean') this.muted = p.muted;
      if (typeof p.volume === 'number' && p.volume >= 0 && p.volume <= 1) this.volume = p.volume;
    } catch { /* abaikan */ }
    this.apply();
  }
  setAvailable(keys: string[]): void { this.available = new Set(keys); }
  has(key: string): boolean { return this.available.has(key); }

  music(key: string): void {
    if (!this.game || !this.has(key) || this.bgmKey === key) return;
    this.bgm?.destroy();
    this.bgmKey = key;
    this.bgm = this.game.sound.add(key, { loop: true, volume: 0.5 });
    this.bgm.play(); // jika browser memblokir, Phaser menunda sampai ada interaksi pengguna
  }
  sfx(key: string): void {
    if (!this.game || !this.has(key) || this.muted) return;
    this.game.sound.play(key, { volume: 0.8 });
  }
  set(muted: boolean, volume: number): void {
    this.muted = muted; this.volume = volume; this.apply();
    try { localStorage.setItem(AUDIO_PREF_KEY, JSON.stringify({ muted, volume })); } catch { /* abaikan */ }
  }
  private apply(): void {
    if (!this.game) return;
    this.game.sound.mute = this.muted;
    this.game.sound.volume = this.volume;
  }
}
export const audio = new AudioManager();

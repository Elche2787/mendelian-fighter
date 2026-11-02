import Phaser from 'phaser';
import { FONT_BODY, FONT_TITLE, FRAME, REDUCED_MOTION, SPRITES } from '../config';
import { NARRATION } from '../data/characters';
import { audio } from '../core/audio';
import type { PlayerProfile } from '../types';

interface Layer { depth: number; count: number; tint: number; size: number; dur: number }
const LAYERS: Layer[] = [
  { depth: 1, count: 7, tint: 0x5d6785, size: 1.0, dur: 2300 },   // belakang: gelap, lambat
  { depth: 3, count: 8, tint: 0xaab2c8, size: 1.15, dur: 1900 },  // tengah
  { depth: 5, count: 8, tint: 0xffffff, size: 1.3, dur: 1500 }    // depan: terang, cepat
];
interface Cloud { img: Phaser.GameObjects.Image; sx: number; tx: number; dur: number }

/**
 * Transisi sinematik: awan menelan layar -> cahaya emas + partikel -> teks & narasi (sprite membaca)
 * -> ExplorationScene dimuat di bawah awan -> awan membuka Level 1. Narasi bisa dilewati.
 */
export class CloudTransitionScene extends Phaser.Scene {
  private profile!: PlayerProfile;
  private clouds: Cloud[] = [];
  private pending: (() => void)[] = [];
  private skipAll = false;
  private veil!: Phaser.GameObjects.Rectangle;
  private glow!: Phaser.GameObjects.Image;
  private hero!: Phaser.GameObjects.Sprite;
  private title!: Phaser.GameObjects.Text;
  private story!: Phaser.GameObjects.Text;
  private skipBtn!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private fast = REDUCED_MOTION ? 0.4 : 1;

  constructor() { super('CloudTransitionScene'); }

  init(data: { profile: PlayerProfile }): void {
    this.profile = data.profile;
    this.clouds = []; this.pending = []; this.skipAll = false;
  }

  create(): void {
    const { width: w, height: h } = this.scale;
    const cx = w / 2;
    document.body.classList.add('warp');
    this.veil = this.add.rectangle(cx, h / 2, w, h, 0x141b2e, 1).setAlpha(0).setDepth(0);
    this.buildClouds(w, h);

    this.glow = this.add.image(cx, h * 0.42, 'glow').setDepth(6).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD).setDisplaySize(h * 0.9, h * 0.9);
    this.add.particles(0, 0, 'spark', {
      x: { min: 0, max: w }, y: { min: 0, max: h }, moveToX: cx, moveToY: h * 0.42,
      lifespan: 1500, scale: { start: 0.7, end: 0 }, alpha: { start: 0.9, end: 0 },
      blendMode: 'ADD', frequency: 60, delay: 2300 * this.fast
    }).setDepth(7);

    const sc = (h * 0.34) / FRAME;
    this.hero = this.add.sprite(cx, h * 0.5, SPRITES[this.profile.characterId].read, 0)
      .setOrigin(0.5, 1).setScale(sc).setDepth(10).setAlpha(0);
    this.hero.play(`${this.profile.characterId}-read`);

    const fs = Phaser.Math.Clamp(Math.min(w / 42, h / 26), 14, 24);
    this.title = this.add.text(cx, h * 0.14, '', { fontFamily: FONT_TITLE, fontSize: `${Math.round(fs * 1.5)}px`, color: '#f6dd9a', align: 'center',
      stroke: '#2a1a06', strokeThickness: 5, wordWrap: { width: w * 0.9 } }).setOrigin(0.5).setDepth(20).setAlpha(0);
    this.story = this.add.text(cx, h * 0.56, '', { fontFamily: FONT_BODY, fontSize: `${Math.round(fs)}px`, color: '#fbf1d6', align: 'center',
      lineSpacing: 6, stroke: '#0b1430', strokeThickness: 4, wordWrap: { width: Math.min(w * 0.88, 820) } }).setOrigin(0.5, 0).setDepth(20).setAlpha(0);
    this.hint = this.add.text(cx, h - 18, 'Ketuk layar / tekan Spasi untuk lanjut', { fontFamily: FONT_BODY, fontSize: '13px', color: '#c9c2a8' })
      .setOrigin(0.5, 1).setDepth(20).setAlpha(0);
    this.skipBtn = this.add.text(w - 16, h - 16, 'LEWATI ▸▸', { fontFamily: FONT_TITLE, fontSize: '15px', color: '#2b1a05', backgroundColor: '#e8c26a', padding: { x: 12, y: 8 } })
      .setOrigin(1, 1).setDepth(21).setAlpha(0).setInteractive({ useHandCursor: true });
    this.skipBtn.on('pointerdown', () => { this.skipAll = true; this.advance(); });
    this.input.on('pointerdown', (_p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => { if (over.length === 0) this.advance(); });
    this.input.keyboard?.on('keydown-SPACE', this.advance, this);
    this.input.keyboard?.on('keydown-ENTER', this.advance, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    void this.run();
  }

  // ---------- alur ----------
  private async run(): Promise<void> {
    await this.cover();
    await this.openingTexts();
    await this.narrate();
    await this.loadWorld();
    await this.reveal();
  }

  /** Tahap 2: awan dari kiri & kanan menutup layar (3 lapisan kedalaman). */
  private async cover(): Promise<void> {
    const { width: w } = this.scale;
    audio.sfx('sfx-transition');
    this.tweens.add({ targets: this.veil, alpha: 1, duration: 1800 * this.fast, delay: 300 * this.fast });
    this.clouds.forEach((c, i) => {
      this.tweens.add({ targets: c.img, x: c.tx, duration: c.dur * this.fast,
        delay: (i % 8) * 70 * this.fast, ease: 'Sine.easeOut',
        onComplete: () => { if (!REDUCED_MOTION) this.tweens.add({ targets: c.img, x: c.tx + (c.sx < w / 2 ? 24 : -24), duration: 3500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }); } });
    });
    await this.sleep(2400 * this.fast);
    // Tahap 3: cahaya emas, zoom ringan, karakter muncul
    this.tweens.add({ targets: this.glow, alpha: 0.9, duration: 900 * this.fast });
    if (!REDUCED_MOTION) {
      this.tweens.add({ targets: this.glow, scale: this.glow.scale * 1.12, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.cameras.main.zoomTo(1.07, 4000);
    }
    this.tweens.add({ targets: this.hero, alpha: 1, duration: 700 * this.fast });
    audio.sfx('sfx-portal');
  }

  private async openingTexts(): Promise<void> {
    await this.flash(this.title, 'MEMASUKI DUNIA MENDELIAN...', 1100, false);
    await this.flash(this.title, 'Memulihkan hukum kehidupan...', 1000, false);
  }

  private async narrate(): Promise<void> {
    this.tweens.add({ targets: [this.hint, this.skipBtn], alpha: 1, duration: 500 });
    for (const para of NARRATION) {
      if (this.skipAll) break;
      await this.flash(this.story, para, 1400 + para.length * 26, true);
    }
    this.tweens.add({ targets: [this.hint, this.skipBtn], alpha: 0, duration: 300 });
  }

  /** Tahap 4: muat ExplorationScene di bawah awan; awan dipertahankan sampai scene siap. */
  private async loadWorld(): Promise<void> {
    await this.flash(this.title, 'Memuat Level 1...', 300, false);
    const ready = new Promise<void>((res) => this.game.events.once('exploration-ready', () => res()));
    this.scene.launch('ExplorationScene', { profile: this.profile });
    this.scene.bringToTop();
    await Promise.race([ready, this.sleep(20000)]);
  }

  private async reveal(): Promise<void> {
    this.tweens.add({ targets: [this.hero, this.glow, this.title, this.story], alpha: 0, duration: 500 * this.fast });
    document.body.classList.remove('warp');
    this.cameras.main.zoomTo(1, 700);
    await this.sleep(400 * this.fast);
    this.clouds.forEach((c, i) => {
      this.tweens.killTweensOf(c.img);
      this.tweens.add({ targets: c.img, x: c.sx, alpha: 0, duration: 1800 * this.fast, delay: (i % 8) * 50 * this.fast, ease: 'Sine.easeIn' });
    });
    this.tweens.add({ targets: this.veil, alpha: 0, duration: 1100 * this.fast });
    await this.sleep(2000 * this.fast);
    this.cameras.main.setZoom(1);
    this.registry.set('transitionDone', true);
    this.game.events.emit('transition-complete');
    this.scene.stop();
  }

  // ---------- util ----------
  private buildClouds(w: number, h: number): void {
    LAYERS.forEach((L) => {
      for (let i = 0; i < L.count; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        const dw = w * Phaser.Math.FloatBetween(0.7, 1.0) * L.size * (h > w ? 1.5 : 1);
        const img = this.add.image(0, (i / (L.count - 1)) * h * 1.1 - h * 0.05 + Phaser.Math.Between(-h * 0.04, h * 0.04), `cloud${Phaser.Math.Between(0, 3)}`)
          .setDepth(L.depth).setTint(L.tint).setScale(dw / 640).setFlipX(side === 1);
        const sx = side === -1 ? -dw : w + dw;
        img.x = sx;
        const tx = side === -1 ? Phaser.Math.Between(w * 0.02, w * 0.45) : Phaser.Math.Between(w * 0.55, w * 0.98);
        this.clouds.push({ img, sx, tx, dur: L.dur });
      }
    });
  }

  private sleep(ms: number, skippable = false): Promise<void> {
    if (skippable && this.skipAll) return Promise.resolve();
    return new Promise((res) => {
      const ev = this.time.delayedCall(ms, () => { this.pending = this.pending.filter((f) => f !== done); res(); });
      const done = (): void => { ev.remove(); res(); };
      if (skippable) this.pending.push(done);
    });
  }
  private advance(): void { const p = this.pending; this.pending = []; p.forEach((f) => f()); }
  private fade(t: Phaser.GameObjects.Text, to: number, ms: number): Promise<void> {
    return new Promise((res) => { this.tweens.add({ targets: t, alpha: to, duration: ms * this.fast, onComplete: () => res() }); });
  }
  private async flash(t: Phaser.GameObjects.Text, msg: string, hold: number, skippable: boolean): Promise<void> {
    t.setText(msg);                                   // Phaser Text merender sebagai canvas: aman, bukan HTML
    await this.fade(t, 1, this.skipAll ? 120 : 600);
    await this.sleep(hold, skippable);
    await this.fade(t, 0, this.skipAll ? 100 : 450);
  }

  private cleanup(): void {
    try { this.input.keyboard?.off('keydown-SPACE', this.advance, this); } catch { /* sudah dibersihkan */ }
    try { this.input.keyboard?.off('keydown-ENTER', this.advance, this); } catch { /* sudah dibersihkan */ }
    document.body.classList.remove('warp', 'portal-prep');
    this.pending = []; this.clouds = [];
  }
}

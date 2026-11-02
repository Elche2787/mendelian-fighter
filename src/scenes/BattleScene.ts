import Phaser from 'phaser';
import { FONT_TITLE, REDUCED_MOTION, SPRITES } from '../config';
import { JUMP_FRAMES } from '../config';
import { battleUI } from '../ui/BattleUI';
import { ENEMIES, type EnemyDef } from '../data/levels';
import { QUESTION_SETS } from '../data/questions';
import { Deck, STREAK_FOR_ULTIMATE, enemyDamage, maxHp, playerDamage, type AttackKind } from '../core/battle';
import { audio } from '../core/audio';
import { asset } from '../config';
import { cutscene } from '../ui/Cutscene';
import { consumeItem, getInventory, type ItemId } from '../core/items';
import type { PlayerProfile } from '../types';

/** Pertarungan RPG turn-based: jawab soal -> serangan critical; 3 benar beruntun -> ULTIMATE. */
export class BattleScene extends Phaser.Scene {
  private profile!: PlayerProfile;
  private deck!: Deck; private level = 1; private def!: EnemyDef;
  private pHp = 0; private pMax = 100; private eHp = 0;
  private streak = 0; private qn = 0; private alive = true;
  private player!: Phaser.GameObjects.Sprite;
  private enemy!: Phaser.GameObjects.Sprite;
  private shadowP!: Phaser.GameObjects.Ellipse;
  private shadowE!: Phaser.GameObjects.Ellipse;
  private bg!: Phaser.GameObjects.Image;
  private floor?: Phaser.GameObjects.TileSprite;
  private castle?: Phaser.GameObjects.Image;
  private slabs: Phaser.GameObjects.Image[] = [];
  private slabFill?: Phaser.GameObjects.Rectangle;
  private injectBuff = false;
  private shield = false;
  private feetY = 0; private pHome = 0; private eHome = 0; private sP = 1; private sE = 1;
  private overlay!: Phaser.GameObjects.Rectangle;
  private bars: Phaser.GameObjects.Rectangle[] = [];

  constructor() { super('BattleScene'); }
  init(d: { profile: PlayerProfile; level?: number }): void {
    this.profile = d.profile; this.level = d.level ?? 1; this.def = ENEMIES[this.level] ?? ENEMIES[1];
    this.deck = new Deck(QUESTION_SETS[this.level] ?? QUESTION_SETS[1]); this.alive = true; this.bars = []; this.slabs = [];
  }

  create(): void {
    if (this.level === 1) {
      this.bg = this.add.image(0, 0, 'env-backdrop').setOrigin(0).setDepth(0).setTint(0x9aa3c0);
      this.add.rectangle(0, 0, 4000, 4000, 0x0b1430, 0.28).setOrigin(0).setDepth(0.5);
      this.floor = this.add.tileSprite(0, 0, 10, 10, 'env-ground-tile').setOrigin(0).setDepth(1);
    } else {   // Menara Mendelian: langit badai, istana terbakar, lantai batu
      this.bg = this.add.image(0, 0, 'l2-sky').setOrigin(0).setDepth(0);
      this.castle = this.add.image(0, 0, 'l2-kerajaan_terbakar_background').setOrigin(0.5, 1).setDepth(0.6);
      this.slabFill = this.add.rectangle(0, 0, 10, 10, 0x15101f).setOrigin(0).setDepth(0.9);
      for (let i = 0; i < 8; i++) this.slabs.push(this.add.image(0, 0, 'l2-pijakan_batu_jembatan').setOrigin(0, 0).setDepth(1));
    }
    this.shadowP = this.add.ellipse(0, 0, 10, 10, 0x000000, 0.35).setDepth(2);
    this.shadowE = this.add.ellipse(0, 0, 10, 10, 0x000000, 0.35).setDepth(2);
    const id = this.profile.characterId;
    this.player = this.add.sprite(0, 0, `${id}-standby`, 0);
    this.player.setOrigin(0.5, 1).setDepth(5);
    this.enemy = this.add.sprite(0, 0, this.def.sheet, 0).setOrigin(0.5, 1).setDepth(5).setFlipX(this.def.flip);
    this.enemy.play(this.def.idle);
    this.player.play(`${id}-standby`);
    const cine0 = this.cutsceneSrc();
    if (cine0) cutscene.preload(cine0);                                                              // siapkan video ultimate
    battleUI.itemApi = { get: () => getInventory(), use: (item) => this.useItem(item) };
    this.overlay = this.add.rectangle(0, 0, 4000, 4000, 0x000000, 0).setOrigin(0).setDepth(20);
    this.layout();
    this.scale.on('resize', this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { this.scale.off('resize', this.layout, this); battleUI.hide(); cutscene.abort(); battleUI.itemApi = undefined; battleUI.setBuffs(false, false); });
    void this.run();
  }

  // ---------- layout ----------
  private layout(): void {
    const { width: w, height: h } = this.scale;
    const narrow = w < 720 || w / h < 0.75;                    // panel soal menempati bagian bawah layar
    this.feetY = Math.round(Math.max(h * 0.4, Math.min(h * 0.66, h * (1 - (narrow ? 0.5 : 0.36)) - 14)));
    if (this.level === 1) {
      const sc = Math.max(w * 1.05 / this.bg.width, h / this.bg.height);
      this.bg.setScale(sc).setPosition(-(this.bg.width * sc - w) / 2, h - this.bg.height * sc);
      const gs = Math.max(0.6, (h - this.feetY) / 80);
      this.floor?.setPosition(0, this.feetY - 20 * gs).setSize(w, h - this.feetY + 24 * gs).setTileScale(gs, gs);
    } else {
      this.bg.setDisplaySize(w, h);
      this.castle?.setScale((w * 1.15) / 800).setPosition(w / 2, this.feetY + 30);
      const sh = (h - this.feetY) + 30, sw = 227 * (sh / 87) * 0.92;      // lantai batu: deret platform jembatan
      this.slabFill?.setPosition(0, this.feetY + 20).setSize(w, h);
      this.slabs.forEach((img, i) => img.setDisplaySize(sw * 1.04, sh).setPosition(i * sw - 8, this.feetY - 8));
    }
    const stageH = this.feetY;
    const pBody = 205;
    this.sP = (stageH * 0.46) / pBody; this.sE = (stageH * 0.5) / this.def.bodyH;
    this.pHome = w * (w < h ? 0.27 : 0.28); this.eHome = w * (w < h ? 0.74 : 0.72);
    this.player.setScale(this.sP).setPosition(this.pHome, this.feetY + 4 * this.sP);
    this.enemy.setScale(this.sE).setPosition(this.eHome, this.feetY + this.def.margin * this.sE);
    this.shadowP.setPosition(this.pHome, this.feetY - 2).setSize(160 * this.sP, 26 * this.sP);
    this.shadowE.setPosition(this.eHome, this.feetY - 2).setSize(this.def.shadowW * this.sE, 30 * this.sE);
  }

  // ---------- alur ----------
  private resetBattle(): void {
    this.pMax = maxHp(this.profile.characterId); this.pHp = this.pMax; this.eHp = this.def.hp; this.streak = 0; this.qn = 0;
    this.player.setAlpha(1).setTint(0xffffff).clearTint(); this.enemy.setAlpha(1).setPosition(this.eHome, this.enemy.y);
    this.enemy.clearTint(); this.enemy.play(this.def.idle);
    this.player.play(`${this.profile.characterId}-standby`);
    this.injectBuff = false; this.shield = false; battleUI.setBuffs(false, false);
    this.hud(); battleUI.setStreak(0);
  }
  private hud(): void { battleUI.setHud(this.profile.name, this.pHp, this.pMax, this.def.name, this.eHp, this.def.hp); }

  private async run(): Promise<void> {
    battleUI.show();
    this.resetBattle();
    this.layout();
    await this.wait(300);
    audio.sfx('sfx-portal');
    if (this.level === 2) this.bossIntro();
    await battleUI.announce(`${this.def.name} menghadang!`, 1500);
    for (;;) {
      if (!this.alive) return;
      const r = await this.round();
      if (r === 'win') { await this.victory(); return; }
      if (r === 'lose') {
        await this.defeat();
        this.resetBattle();
        await battleUI.announce('Coba lagi!', 800);
      }
    }
  }

  private async round(): Promise<'win' | 'lose' | 'cont'> {
    this.qn += 1;
    this.layout();
    await battleUI.announce('GILIRANMU', 600);
    const quiz = this.deck.next();
    const ok = await battleUI.ask(quiz, this.qn, this.streak > 0 ? `Combo ${this.streak}/${STREAK_FOR_ULTIMATE}` : 'Jawab dengan benar untuk menyerang!');
    if (!this.alive) return 'cont';
    if (ok) {
      this.streak += 1;
      const ult = this.streak >= STREAK_FOR_ULTIMATE;
      battleUI.setStreak(this.streak, ult);
      await this.playerAttack(ult ? 'ultimate' : 'critical');
      if (ult) { this.streak = 0; battleUI.setStreak(0); }
      if (this.eHp <= 0) return 'win';
    } else {
      this.streak = 0; battleUI.setStreak(0);
      await this.floatText(this.pHome, this.feetY - this.player.displayHeight * 0.9, 'MELESET!', '#cfd5e6', 38);
      this.tweens.add({ targets: this.player, x: this.pHome - 18, duration: 90, yoyo: true, repeat: 1 });
      await this.wait(500);
    }
    await battleUI.announce('GILIRAN MUSUH', 600);
    await this.enemyAttack();
    return this.pHp <= 0 ? 'lose' : 'cont';
  }

  private async victory(): Promise<void> {
    await battleUI.announce('KEMENANGAN!', 1000);
    this.sparks(this.eHome, this.feetY - this.enemy.displayHeight * 0.4, 40, 0xffd36b);
    this.enemy.clearTint();
    if (this.def.death) { this.enemy.play(this.def.death); await this.wait(1000); }
    this.tweens.add({ targets: this.enemy, alpha: 0, y: this.enemy.y + 20, duration: 900 });
    await this.wait(900);
    const next = this.level === 1 ? 'dan Level 2 (Tower of Mendelian) terbuka.' : 'Menara Mendelian berhasil ditaklukkan! Level 3 segera hadir.';
    await battleUI.result('KEMENANGAN!', `${this.def.name} dikalahkan. Kamu mendapat +${this.def.exp} EXP ${next}`, 'LANJUTKAN');
    this.alive = false;
    this.game.events.emit('battle-end', { won: true, level: this.level });
    this.scene.stop();
  }

  private async defeat(): Promise<void> {
    this.tweens.add({ targets: this.player, alpha: 0.25, duration: 500 });
    await this.wait(600);
    await battleUI.result('KALAH...', 'Jangan menyerah! Pelajari penjelasan tiap soal lalu coba lagi.', 'COBA LAGI', true);
  }

  // ---------- item ----------
  private useItem(id: ItemId): boolean {
    const y = this.feetY - this.player.displayHeight * 1.0;
    if (id === 'potion' && this.pHp >= this.pMax) { battleUI.note('HP sudah penuh.', false); return false; }
    if (!consumeItem(id)) return false;
    audio.sfx('sfx-click');
    if (id === 'potion') {
      const heal = Math.min(40, this.pMax - this.pHp); this.pHp += heal; this.hud();
      this.sparks(this.pHome, this.feetY - this.player.displayHeight * 0.5, 26, 0x9be564);
      void this.floatText(this.pHome, y, `+${heal} HP`, '#9be564', 46);
    } else if (id === 'inject') {
      this.injectBuff = true;
      this.sparks(this.pHome, this.feetY - this.player.displayHeight * 0.5, 22, 0x4cdc7a);
      void this.floatText(this.pHome, y, 'GEN INJECT!', '#b6ffc2', 40);
    } else {
      this.shield = true;
      this.ring(this.pHome, this.feetY - this.player.displayHeight * 0.5, 0x6fb8ff, 0.9);
      void this.floatText(this.pHome, y, 'MEMBRAN MAGIC!', '#9fd0ff', 38);
    }
    battleUI.setBuffs(this.injectBuff, this.shield);
    return true;
  }

  // ---------- serangan pemain ----------
  private async playerAttack(kind: AttackKind): Promise<void> {
    const id = this.profile.characterId, big = kind === 'ultimate';
    let dmg = playerDamage(id, kind);
    const boosted = this.injectBuff;
    if (boosted) { dmg = Math.round(dmg * 1.5); this.injectBuff = false; battleUI.setBuffs(false, this.shield); }
    const hitX = this.eHome - this.enemy.displayWidth * 0.32;
    const hitY = this.feetY - this.enemy.displayHeight * 0.5;
    // Ultimate di Level 1 (Arka & Nara): putar video cutscene, lalu lanjut ke dampak serangan di arena
    const src = this.cutsceneSrc();
    const cine = big && src ? await cutscene.play(src) : false;
    if (big && !cine) await this.ultimateIntro();
    audio.sfx('sfx-click');
    if (cine) await this.finisher(kind, dmg, hitX, hitY);
    else if (id === 'arka') await this.arkaStrike(kind, dmg, hitX, hitY);
    else await this.naraCast(kind, dmg, hitX, hitY);

    // dampak penutup
    this.flash(big ? 320 : 160);
    this.shake(big ? 0.02 : 0.014, big ? 520 : 260);
    this.sparks(hitX, hitY, big ? 70 : 34, big ? 0xffffff : this.fxColor(kind), big ? 760 : 520);
    if (big) this.ring(hitX, hitY, this.fxColor(kind));
    this.eHp = Math.max(0, this.eHp - dmg); this.hud();
    void this.floatText(this.eHome, hitY - 80, `${dmg}`, big ? '#ffffff' : '#ffd36b', big ? 84 : 62);
    const title = big ? (id === 'nara' ? 'DNA SUMMON ATTACK!' : 'ULTIMATE!') : 'CRITICAL!';
    void this.floatText(this.pHome + 40, this.feetY - this.player.displayHeight * 1.05, title, big ? '#9be4ff' : '#ffd36b', big ? 50 : 44, true);
    if (boosted) void this.floatText(this.pHome + 40, this.feetY - this.player.displayHeight * 1.3, 'GEN INJECT +50%', '#b6ffc2', 26);
    if (id === 'nara' && big) { this.pHp = Math.min(this.pMax, this.pHp + 25); this.hud(); void this.floatText(this.pHome, this.feetY - 40, '+25 HP', '#9be564', 34); }
    await this.wait(big ? 900 : 650);
    if (big && !cine) await this.ultimateOutro();
    // kembali ke posisi siaga
    this.player.play(`${id}-standby`);
    if (id === 'arka' && !cine) {
      this.player.setFlipX(true);
      this.tweens.add({ targets: this.player, x: this.pHome, duration: 320, ease: 'Sine.easeOut' });
      await this.wait(340);
      this.player.setFlipX(false);
    }
    if (this.eHp > 0) this.enemy.play(this.def.idle);
  }

  /** Video ultimate per karakter (hanya Level 1); null jika tidak ada. */
  private cutsceneSrc(): string | null {
    return this.level === 1 ? asset(`video/ultimate-${this.profile.characterId}.mp4`) : null;
  }

  /** Setelah video cutscene: rentetan dampak cepat di musuh (pemain tidak perlu maju lagi). */
  private async finisher(kind: AttackKind, dmg: number, hitX: number, hitY: number): Promise<void> {
    await this.wait(250);
    const hits = 6;
    for (let i = 0; i < hits; i++) {
      this.hitFx(kind, hitX, hitY, i === hits - 1, i < hits - 1 ? Math.round(dmg / hits) : undefined);
      await this.wait(110);
    }
  }

  /** Reaksi musuh terkena satu pukulan/sihir. */
  private hitFx(kind: AttackKind, hitX: number, hitY: number, last: boolean, shown?: number): void {
    const big = kind === 'ultimate';
    this.slash(hitX + Phaser.Math.Between(-30, 30), hitY + Phaser.Math.Between(-40, 40), this.fxColor(kind), big || last ? 1.2 : 0.8);
    this.sparks(hitX, hitY, big ? 16 : 22, this.fxColor(kind));
    this.shake(big ? 0.006 : 0.01, 110);
    this.enemy.play(this.def.hit);
    if (this.def.hitTint) { this.enemy.setTint(this.def.hitTint); this.time.delayedCall(150, () => this.enemy.clearTint()); }
    this.enemy.x = this.eHome + 10;
    this.tweens.add({ targets: this.enemy, x: this.eHome, duration: 140 });
    if (shown !== undefined) void this.floatText(this.eHome + Phaser.Math.Between(-50, 50), hitY - 40, `${shown}`, '#bfeaff', 34);
  }

  /** Arka: maju & kombo pedang. */
  private async arkaStrike(kind: AttackKind, dmg: number, hitX: number, hitY: number): Promise<void> {
    const big = kind === 'ultimate';
    const run = this.tweens.add({ targets: this.player, x: hitX - this.player.displayWidth * 0.3, duration: big ? 380 : 280, ease: 'Quad.easeIn' });
    this.player.stop(); this.player.setTexture('arka-combo', 2);
    await this.wait(big ? 380 : 280); run.stop();
    this.player.play({ key: 'arka-combo', frameRate: big ? 24 : 16 });
    const hits = big ? 6 : 2;
    for (let i = 0; i < hits; i++) {
      await this.wait(big ? 150 : 190);
      const last = i === hits - 1;
      this.hitFx(kind, hitX, hitY, last, !last && big ? Math.round(dmg / hits) : undefined);
    }
  }

  /** Nara: sihir DNA dari jarak jauh. Serangan biasa = Cast DNA Magic; ultimate = DNA Summon Attack. */
  private async naraCast(kind: AttackKind, dmg: number, hitX: number, hitY: number): Promise<void> {
    const big = kind === 'ultimate';
    const handX = this.pHome + this.player.displayWidth * 0.18, handY = this.feetY - this.player.displayHeight * 0.62;
    this.player.play({ key: big ? 'nara-summon' : 'nara-cast', frameRate: big ? 14 : 15 });
    if (!big) {
      await this.wait(620);                                    // energi terkumpul, lalu dilepas ke musuh
      await this.fireOrb(handX, handY, hitX, hitY, this.fxColor(kind), 260, 2.6);
      for (let i = 0; i < 2; i++) { this.hitFx(kind, hitX, hitY, i === 1); await this.wait(190); }
    } else {
      await this.wait(780);                                    // heliks DNA terbentuk di atas tangan Nara
      const hits = 6;
      await this.dnaStrike(hitX, hitY, hits, (i, last) => this.hitFx(kind, hitX, hitY, last, !last ? Math.round(dmg / hits) : undefined));
    }
  }

  /** Heliks DNA raksasa melesat ke musuh lalu menghantam beberapa kali. */
  private async dnaStrike(hitX: number, hitY: number, hits: number, onHit: (i: number, last: boolean) => void): Promise<void> {
    const sz = this.feetY * 0.62;
    const g = this.add.graphics().setDepth(14).setBlendMode(Phaser.BlendModes.ADD);
    const st = { p: 0 };
    const draw = (): void => { if (g.scene) this.drawHelix(g, sz, sz * 0.2, st.p); };
    this.tweens.add({ targets: st, p: Math.PI * 14, duration: 1900, onUpdate: draw });
    g.setPosition(this.pHome + this.player.displayWidth * 0.2, this.feetY - this.player.displayHeight * 1.15).setAlpha(0).setScale(0.5);
    draw();
    this.tweens.add({ targets: g, alpha: 1, scale: 1, duration: 220 });
    await this.wait(240);
    await new Promise<void>((res) => this.tweens.add({ targets: g, x: hitX, y: hitY - sz * 0.35, scale: 1.25, duration: 340, ease: 'Sine.easeInOut', onComplete: () => res() }));
    await new Promise<void>((res) => this.tweens.add({ targets: g, y: hitY, duration: 160, ease: 'Quad.easeIn', onComplete: () => res() }));
    for (let i = 0; i < hits; i++) { onHit(i, i === hits - 1); await this.wait(150); }
    this.tweens.add({ targets: g, alpha: 0, scale: 1.6, duration: 380, onComplete: () => g.destroy() });
  }

  private drawHelix(g: Phaser.GameObjects.Graphics, H: number, A: number, phase: number): void {
    g.clear();
    const N = 36, pts1: number[][] = [], pts2: number[][] = [];
    for (let i = 0; i <= N; i++) {
      const y = -H / 2 + (i / N) * H, a = phase + i * 0.34;
      pts1.push([Math.sin(a) * A, y, Math.cos(a)]); pts2.push([-Math.sin(a) * A, y, -Math.cos(a)]);
    }
    for (let i = 0; i <= N; i += 2) {                                    // anak tangga basa
      g.lineStyle(3, 0xffffff, 0.45).beginPath().moveTo(pts1[i][0], pts1[i][1]).lineTo(pts2[i][0], pts2[i][1]).strokePath();
    }
    for (const [pts, col] of [[pts1, 0x7fd0ff], [pts2, 0xc79bff]] as [number[][], number][]) {
      g.lineStyle(9, col, 0.35).beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.strokePath();
      g.lineStyle(4, 0xffffff, 0.9).beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.strokePath();
    }
  }

  private fxColor(kind: AttackKind): number {
    if (this.profile.characterId === 'nara') return kind === 'ultimate' ? 0xb9a2ff : 0x8fd8ff;   // helix DNA biru-ungu
    return kind === 'ultimate' ? 0x9be4ff : 0xffe08a;
  }

  /** Intro ultimate: layar gelap, bar sinematik, zoom & sinar cahaya. */
  private async ultimateIntro(): Promise<void> {
    const { width: w, height: h } = this.scale;
    audio.sfx('sfx-transition');
    this.tweens.add({ targets: this.overlay, fillAlpha: 0.6, duration: 260 });
    for (const top of [true, false]) {
      const bar = this.add.rectangle(0, top ? -h * 0.12 : h, w, h * 0.12, 0x000000, 1).setOrigin(0).setDepth(30);
      this.bars.push(bar);
      this.tweens.add({ targets: bar, y: top ? 0 : h * 0.88, duration: 260 });
    }
    const rays = this.add.graphics({ x: this.pHome, y: this.feetY - this.player.displayHeight * 0.5 }).setDepth(4).setBlendMode(Phaser.BlendModes.ADD);
    rays.fillStyle(0x9be4ff, 0.35);
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; rays.fillTriangle(0, 0, Math.cos(a - 0.08) * w, Math.sin(a - 0.08) * w, Math.cos(a + 0.08) * w, Math.sin(a + 0.08) * w); }
    rays.setAlpha(0);
    this.tweens.add({ targets: rays, alpha: 1, angle: REDUCED_MOTION ? 0 : 60, duration: 1300 });
    this.time.delayedCall(1400, () => rays.destroy());
    const t = this.add.text(w / 2, h * 0.3, this.profile.characterId === 'arka' ? 'GENETIC BREAK' : 'DNA SUMMON ATTACK', { fontFamily: FONT_TITLE, fontSize: `${Math.round(Math.min(w / 12, 74))}px`, color: '#e8f8ff',
      stroke: '#0b4a8a', strokeThickness: 8 }).setOrigin(0.5).setDepth(40).setAlpha(0).setScale(1.4);
    this.tweens.add({ targets: t, alpha: 1, scale: 1, duration: 340, hold: 600, yoyo: true, onComplete: () => t.destroy() });
    if (!REDUCED_MOTION) this.cameras.main.zoomTo(1.18, 500, 'Sine.easeInOut', true, undefined, this);
    await this.wait(1000);
  }
  private async ultimateOutro(): Promise<void> {
    this.tweens.add({ targets: this.overlay, fillAlpha: 0, duration: 300 });
    this.bars.forEach((b) => this.tweens.add({ targets: b, y: b.y < 10 ? -b.height : this.scale.height, duration: 260, onComplete: () => b.destroy() }));
    this.bars = [];
    this.cameras.main.zoomTo(1, 400);
    await this.wait(380);
  }

  // ---------- serangan musuh ----------
  private async enemyAttack(): Promise<void> {
    const id = this.profile.characterId, def = this.def;
    let dmg = enemyDamage(id, def.dmg);
    const shielded = this.shield;
    if (shielded) { dmg = Math.max(1, Math.round(dmg * 0.4)); this.shield = false; battleUI.setBuffs(this.injectBuff, false); }
    const target = this.pHome + this.player.displayWidth * 0.55;
    this.enemy.play(def.attack);
    if (def.ranged) {            // menembakkan bola kelopak ke pemain
      await this.wait(330);
      await this.fireOrb(this.eHome - this.enemy.displayWidth * 0.2, this.feetY - this.enemy.displayHeight * 0.55, target, this.feetY - this.player.displayHeight * 0.5, def.fx);
    } else {                     // maju menyerang
      await this.wait(380);
      this.tweens.add({ targets: this.enemy, x: target + this.enemy.displayWidth * 0.3, duration: 320, ease: 'Quad.easeIn' });
      await this.wait(380);
    }
    this.shake(0.012, 240);
    this.sparks(target, this.feetY - this.player.displayHeight * 0.5, 26, def.fx);
    this.player.setTint(0xff6a6a);
    this.tweens.add({ targets: this.player, x: this.pHome - 26, duration: 100, yoyo: true });
    this.time.delayedCall(180, () => this.player.clearTint());
    this.pHp = Math.max(0, this.pHp - dmg); this.hud();
    void this.floatText(this.pHome, this.feetY - this.player.displayHeight * 0.95, `-${dmg}`, '#ff8a8a', 56);
    if (shielded) { this.ring(this.pHome, this.feetY - this.player.displayHeight * 0.5, 0x6fb8ff, 0.9); void this.floatText(this.pHome, this.feetY - this.player.displayHeight * 1.2, 'MEMBRAN MAGIC!', '#9fd0ff', 28); }
    else if (id === 'nara') { this.ring(this.pHome + 30, this.feetY - this.player.displayHeight * 0.5, 0xffd36b, 0.6); void this.floatText(this.pHome, this.feetY - this.player.displayHeight * 1.2, 'PERTAHANAN', '#ffe08a', 26); }
    await this.wait(520);
    if (!def.ranged) {
      this.tweens.add({ targets: this.enemy, x: this.eHome, duration: 380, ease: 'Sine.easeOut' });
      await this.wait(420);
    }
    this.enemy.play(def.idle);
  }

  private async fireOrb(ex: number, ey: number, tx: number, ty: number, color: number, dur = 420, size = 3): Promise<void> {
    const orb = this.add.image(ex, ey, 'spark').setTint(color).setScale(size).setDepth(14).setBlendMode(Phaser.BlendModes.ADD);
    const trail = this.add.particles(0, 0, 'spark', { follow: orb, lifespan: 380, scale: { start: 1.3, end: 0 }, alpha: { start: 0.8, end: 0 },
      blendMode: 'ADD', tint: color, frequency: 18, quantity: 1 }).setDepth(13);
    await new Promise<void>((res) => this.tweens.add({ targets: orb, x: tx, y: ty, duration: dur, ease: 'Sine.easeIn', onComplete: () => res() }));
    trail.stop(); orb.destroy();
    this.time.delayedCall(450, () => trail.destroy());
  }

  /** Kartu perkenalan bos Level 2 (potret Kriptomer Flower) yang muncul sebentar. */
  private bossIntro(): void {
    const { width: w, height: h } = this.scale;
    const img = this.add.image(w * 0.74, this.feetY, 'boss-portrait').setOrigin(0.5, 1).setDepth(3).setAlpha(0).setFlipX(true);
    img.setScale((h * 0.55) / img.height);
    this.tweens.add({ targets: img, alpha: 0.55, x: w * 0.7, duration: 600, hold: 900, yoyo: true, onComplete: () => img.destroy() });
  }

  // ---------- efek ----------
  private wait(ms: number): Promise<void> { return new Promise((r) => this.time.delayedCall(ms, () => r())); }
  private shake(i: number, ms: number): void { if (!REDUCED_MOTION) this.cameras.main.shake(ms, i); }
  private flash(ms: number): void { if (!REDUCED_MOTION) this.cameras.main.flash(ms, 255, 255, 255, true); }

  private slash(x: number, y: number, color: number, k: number): void {
    const g = this.add.graphics({ x, y }).setDepth(12).setBlendMode(Phaser.BlendModes.ADD);
    const ang = Phaser.Math.FloatBetween(-0.9, 0.9), len = 190 * k * (this.sE / 1.3 + 0.5);
    g.fillStyle(color, 1).fillTriangle(-len, 0, 0, -9 * k, len, 0).fillTriangle(-len, 0, 0, 9 * k, len, 0);
    g.fillStyle(0xffffff, 1).fillTriangle(-len * 0.7, 0, 0, -3 * k, len * 0.7, 0).fillTriangle(-len * 0.7, 0, 0, 3 * k, len * 0.7, 0);
    g.setRotation(ang).setScale(0.3, 1);
    this.tweens.add({ targets: g, scaleX: 1, alpha: 0, duration: 260, ease: 'Cubic.easeOut', onComplete: () => g.destroy() });
  }
  private sparks(x: number, y: number, n: number, tint: number, life = 520): void {
    const e = this.add.particles(x, y, 'spark', { emitting: false, speed: { min: 120, max: 560 }, angle: { min: 0, max: 360 }, scale: { start: 1.1, end: 0 },
      alpha: { start: 1, end: 0 }, lifespan: life, blendMode: 'ADD', tint }).setDepth(13);
    e.explode(n);
    this.time.delayedCall(life + 100, () => e.destroy());
  }
  private ring(x: number, y: number, color: number, a = 1): void {
    const c = this.add.circle(x, y, 20, 0xffffff, 0).setStrokeStyle(8, color, a).setDepth(13).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: c, scale: 9, alpha: 0, duration: 650, ease: 'Cubic.easeOut', onComplete: () => c.destroy() });
  }
  private floatText(x: number, y: number, text: string, color: string, size: number, pop = false): Promise<void> {
    const t = this.add.text(x, y, text, { fontFamily: FONT_TITLE, fontSize: `${Math.round(size * Math.max(0.65, Math.min(1.1, this.scale.height / 760)))}px`, color, stroke: '#1a1020', strokeThickness: 7 })
      .setOrigin(0.5).setDepth(40);
    if (pop) t.setScale(0.4);
    return new Promise((res) => this.tweens.add({ targets: t, y: y - 70, scale: pop ? 1.15 : 1, alpha: { from: 1, to: 0 }, duration: 1100, ease: 'Cubic.easeOut', onComplete: () => { t.destroy(); res(); } }));
  }
}

import Phaser from 'phaser';
import { ui } from '../ui/DomUI';
import { setInGame } from '../ui/background';
import { audio } from '../core/audio';
import { loadSave } from '../core/save';
import { addAmbientGold } from '../fx/textures';

/** Halaman login sinematik. Logika UI ada di ui/DomUI.ts (terpisah dari gameplay). */
export class MainMenuScene extends Phaser.Scene {
  constructor() { super('MainMenuScene'); }
  create(): void {
    setInGame(false);
    addAmbientGold(this);
    audio.music('bgm-login');
    audio.sfx('sfx-wind');
    ui.showLogin(loadSave()?.name ?? '');
    ui.handlers = {
      sfx: (k) => audio.sfx(k),
      submit: (name) => { this.registry.set('pendingName', name); this.scene.start('CharacterSelectScene'); }
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => ui.clear());
  }
}

import Phaser from 'phaser';
import { ui } from '../ui/DomUI';
import { audio } from '../core/audio';
import { loadSave, startSession } from '../core/save';
import { addAmbientGold } from '../fx/textures';
import type { CharacterId } from '../types';

export class CharacterSelectScene extends Phaser.Scene {
  private entering = false;
  constructor() { super('CharacterSelectScene'); }

  create(): void {
    this.entering = false;
    const name = this.registry.get('pendingName') as string | undefined;
    if (!name) { this.scene.start('MainMenuScene'); return; }
    addAmbientGold(this);
    ui.showSelect(name, loadSave()?.characterId);
    ui.handlers = {
      sfx: (k) => audio.sfx(k),
      back: () => { if (!this.entering) this.scene.start('MainMenuScene'); },
      enter: (id) => { void this.enter(name, id); }
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => ui.clear());
  }

  private async enter(name: string, id: CharacterId): Promise<void> {
    if (this.entering) return;                       // cegah transisi ganda
    this.entering = true;
    for (const k of ['npcLearned', 'npcRewarded', 'guardDefeated-1', 'guardDefeated-2', 'transitionDone']) this.registry.remove(k);   // mulai bersih
    const { profile } = startSession(name, id);
    this.registry.set('profile', profile);
    audio.sfx('sfx-portal');
    await ui.portalPrep();
    this.scene.start('CloudTransitionScene', { profile });
  }
}

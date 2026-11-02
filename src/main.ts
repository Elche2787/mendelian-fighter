import Phaser from 'phaser';
import './style.css';
import { initBackground } from './ui/background';
import { audio } from './core/audio';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { CharacterSelectScene } from './scenes/CharacterSelectScene';
import { CloudTransitionScene } from './scenes/CloudTransitionScene';
import { ExplorationScene } from './scenes/ExplorationScene';
import { BattleScene } from './scenes/BattleScene';

initBackground();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  transparent: true,                       // video/CSS latar terlihat di belakang canvas
  width: window.innerWidth,
  height: window.innerHeight,
  // RESIZE: canvas selalu mengikuti ukuran layar; tiap scene menyusun layout dari this.scale.
  scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.NO_CENTER },
  input: { activePointers: 3 },
  render: { antialias: true, powerPreference: 'high-performance' },
  disableContextMenu: true,
  scene: [BootScene, PreloadScene, MainMenuScene, CharacterSelectScene, CloudTransitionScene, ExplorationScene, BattleScene]
});
if (game.isBooted) audio.attach(game);
else game.events.once(Phaser.Core.Events.READY, () => audio.attach(game));

// Kontrol audio
const mute = document.getElementById('mute-btn') as HTMLButtonElement;
const vol = document.getElementById('vol') as HTMLInputElement;
const sync = (): void => {
  mute.textContent = audio.muted || audio.volume === 0 ? '🔇' : '🔊';
  mute.setAttribute('aria-pressed', String(audio.muted));
  mute.setAttribute('aria-label', audio.muted ? 'Nyalakan suara' : 'Matikan suara');
  vol.value = String(audio.volume);
};
sync();
mute.addEventListener('click', () => { audio.set(!audio.muted, audio.volume); sync(); });
vol.addEventListener('input', () => { audio.set(false, Number(vol.value)); sync(); });

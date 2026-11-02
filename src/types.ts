export type CharacterId = 'arka' | 'nara';

export interface PlayerProfile {
  name: string;
  characterId: CharacterId;
  playerLevel: number;
  exp: number;
}

export interface GameSave extends PlayerProfile {
  version: 1;
  unlockedLevels: number[];
  completedLevels: number[];
}

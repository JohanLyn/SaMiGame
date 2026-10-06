import type Phaser from 'phaser';
import type { Avatar, ControllerInput, ControllerLayout } from '@samigame/shared';
import type { ChaosModifiers } from '../game/chaos';
import type { MinigameKind, MinigameResult, Teams } from '../game/types';

/** Rolle i et minigame. ffa = alle-mod-alle, duo = 2v2, solo/trio = 1v3. */
export type Role = 'ffa' | 'duo' | 'solo' | 'trio';

/** Det en scene ved om en spiller. */
export interface PlayerView {
  slot: number;
  name: string;
  /** Hex (#rrggbb). */
  color: string;
  /** Samme farve som tal (til Phaser). */
  colorNum: number;
  avatar: Avatar;
  isBot: boolean;
  /** Index i `teams.teams` (ffa: = slot). */
  team: number;
  role: Role;
  score: number;
}

/** Bot-input: delvist ControllerInput. `tap: true` tæller et knaptryk op (sammen med `choice`). */
export type BotInput = Partial<Pick<ControllerInput, 'x' | 'y' | 'a' | 'b' | 'px' | 'py' | 'level'>> & {
  tap?: boolean;
  choice?: number;
};

export interface LayoutContext {
  slot: number;
  role: Role;
  team: number;
  teams: Teams;
  players: PlayerView[];
}

/** Beskrivelse af et minigame. Eksporteres som default fra `minigames/<id>/index.ts`. */
export interface MinigameDef {
  /** Unikt id = mappenavn = scene-nøgle (fx 'sumo'). */
  id: string;
  title: string;
  kind: MinigameKind;
  /** Én sjov linje under titlen. */
  tagline: string;
  /** 1–3 korte regler, vist på intro-kortet. */
  rules: string[];
  /** Styring vist på intro og telefon, fx ['🕹️ Gå', '🅰️ Skub']. Kan afhænge af rolle. */
  controls: string[] | ((role: Role) => string[]);
  /** Emoji-ikon. */
  icon: string;
  /** Accentfarve (hex). */
  color: string;
  /** Telefonens layout under spillet. */
  layout: (ctx: LayoutContext) => ControllerLayout;
  /** Scene-klassen (skal kalde `super('<id>')`). */
  scene: new () => Phaser.Scene;
  /** Kun finalen sætter denne – så vælges den aldrig tilfældigt. */
  finale?: boolean;
}

/** Data en minigame-scene startes med. */
export interface MinigameLaunch {
  def: MinigameDef;
  players: PlayerView[];
  teams: Teams;
  chaos: ChaosModifiers;
  seed: number;
}

/** Beskrivelse af et udvælgelses-ritual. Default-eksport fra `rituals/<id>/index.ts`. */
export interface RitualDef {
  id: string;
  title: string;
  /** Scene-klassen (skal kalde `super('ritual-<id>')`). */
  scene: new () => Phaser.Scene;
  /** Vægt ved tilfældigt valg (default 1). */
  weight?: number;
}

/** Data et ritual startes med: hvilket minigame der skal "findes", og alle minigames til animationer. */
export interface RitualLaunch {
  pick: MinigameDef;
  all: MinigameDef[];
  players: PlayerView[];
  round: number;
  totalRounds: number;
  seed: number;
}

export interface RitualOutcome {
  /** Ritualet udløste et kaos-kort (fx en støvle i Fiskesøen). */
  chaos?: boolean;
  /** Spilleren der "vandt" ritualet (vises/fejres, ingen point). */
  winner?: number;
}

export type { MinigameResult };

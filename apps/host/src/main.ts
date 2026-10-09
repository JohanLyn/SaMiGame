import '@fontsource/lilita-one/400.css';
import '@fontsource/nunito/800.css';
import '@fontsource/nunito/900.css';
import Phaser from 'phaser';
import { audio } from './kit/audio';
import { Director } from './flow/Director';
import { H, W } from './kit/theme';
import { MINIGAMES } from './minigames';
import { RITUALS } from './rituals';
import { FallbackRitual } from './rituals/_framework/FallbackRitual';
import { net, offline } from './net';
import { AwardsScene } from './scenes/AwardsScene';
import { BootScene } from './scenes/BootScene';
import { ChaosScene } from './scenes/ChaosScene';
import { IntroScene } from './scenes/IntroScene';
import { LobbyScene } from './scenes/LobbyScene';
import { ResultsScene } from './scenes/ResultsScene';
import { RoundScene } from './scenes/RoundScene';
import { TeamsScene } from './scenes/TeamsScene';
import { TransitionScene } from './scenes/TransitionScene';

const game = new Phaser.Game({
  type: Phaser.WEBGL,
  parent: 'game',
  width: W,
  height: H,
  backgroundColor: '#12103a',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  render: { antialias: true, roundPixels: false, // maxTextures: 1 undgår en fejl i Phaser 4's multi-tekstur-batching (trekanter med forkert tekstur).
    maxTextures: Number(new URLSearchParams(location.search).get('maxtex') ?? 1) },
  // I test/dev (offline) bruges rå delta, så spillet kører i realtid selv ved lav FPS (headless-browsere).
  fps: offline || new URLSearchParams(location.search).has('rawdelta') ? { smoothStep: false, panicMax: 0 } : undefined,
  physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 } } },
  scene: [
    BootScene,
    LobbyScene,
    RoundScene,
    ChaosScene,
    TeamsScene,
    IntroScene,
    ResultsScene,
    AwardsScene,
    FallbackRitual,
    ...MINIGAMES.map((m) => m.scene),
    ...RITUALS.map((r) => r.scene),
    TransitionScene,
  ],
});

const director = new Director(game, MINIGAMES, RITUALS);
game.registry.set('director', director);
net.start();

// Til fejlfinding, screenshots og end-to-end-tests.
Object.assign(window, { __SAMI__: { net, game, director, audio, minigames: MINIGAMES.map((m) => m.id), rituals: RITUALS.map((r) => r.id) } });

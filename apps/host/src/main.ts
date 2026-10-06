import Phaser from 'phaser';
import { LobbyScene } from './scenes/LobbyScene';
import { HostSession } from './session';

const params = new URLSearchParams(location.search);
const session = new HostSession();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 1280,
  height: 720,
  backgroundColor: '#10194a',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  callbacks: {
    preBoot: (g) => {
      g.registry.set('session', session);
      g.registry.set('keyboardPlayers', params.has('keys'));
    },
  },
  scene: [LobbyScene],
});

session.start();

// Til fejlfinding og end-to-end-tests.
Object.assign(window, { __SAMI__: { session, game } });

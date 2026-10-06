import Phaser from 'phaser';

export type BlokState = 'empty' | 'active' | 'disconnected';

const HOP_HEIGHT = 46;

/** En blokfigur i stil med Roblox/Minecraft – men vores egen. Origin er ved fødderne. */
export class Blok extends Phaser.GameObjects.Container {
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly figure: Phaser.GameObjects.Container;
  private readonly pupils: Phaser.GameObjects.Rectangle[];
  private readonly label: Phaser.GameObjects.Text;
  private readonly sleepy: Phaser.GameObjects.Text;
  private hopTween: Phaser.Tweens.Tween | null = null;
  private walkTime = 0;
  facing = 1;

  constructor(scene: Phaser.Scene, x: number, y: number, color: number) {
    super(scene, x, y);
    const dark = Phaser.Display.Color.ValueToColor(color).darken(25).color;

    this.shadow = scene.add.ellipse(0, 0, 54, 16, 0x000000, 0.25);

    const legL = scene.add.rectangle(-9, -10, 14, 20, 0x2b2b44).setStrokeStyle(3, 0x000000);
    const legR = scene.add.rectangle(9, -10, 14, 20, 0x2b2b44).setStrokeStyle(3, 0x000000);
    const body = scene.add.rectangle(0, -36, 40, 34, color).setStrokeStyle(4, 0x000000);
    const belt = scene.add.rectangle(0, -24, 40, 6, dark);
    const head = scene.add.rectangle(0, -72, 46, 40, color).setStrokeStyle(4, 0x000000);
    const eyeL = scene.add.rectangle(-10, -74, 13, 15, 0xffffff).setStrokeStyle(2, 0x000000);
    const eyeR = scene.add.rectangle(10, -74, 13, 15, 0xffffff).setStrokeStyle(2, 0x000000);
    this.pupils = [scene.add.rectangle(-10, -73, 6, 8, 0x000000), scene.add.rectangle(10, -73, 6, 8, 0x000000)];
    const mouth = scene.add.rectangle(0, -60, 14, 4, 0x000000);

    this.figure = scene.add.container(0, 0, [legL, legR, body, belt, head, eyeL, eyeR, ...this.pupils, mouth]);
    this.figure.setData('legs', [legL, legR]);

    this.label = scene.add
      .text(0, -112, '', { fontFamily: 'Trebuchet MS, sans-serif', fontSize: '20px', fontStyle: 'bold', color: '#ffffff' })
      .setOrigin(0.5)
      .setStroke('#000000', 5);
    this.sleepy = scene.add
      .text(26, -100, 'zzz', { fontFamily: 'Trebuchet MS, sans-serif', fontSize: '18px', color: '#ffffff' })
      .setStroke('#000000', 4)
      .setVisible(false);

    this.add([this.shadow, this.figure, this.label, this.sleepy]);
    scene.add.existing(this);
  }

  get hopping(): boolean {
    return this.hopTween !== null;
  }

  setLabel(text: string): this {
    this.label.setText(text);
    return this;
  }

  setBlokState(state: BlokState): this {
    this.setAlpha(state === 'empty' ? 0.3 : state === 'disconnected' ? 0.6 : 1);
    this.sleepy.setVisible(state === 'disconnected');
    return this;
  }

  /** Opdaterer øjne og gå-animation ud fra bevægelsesretningen (x/y i [-1, 1]). */
  animate(dx: number, dy: number, deltaMs: number): void {
    if (dx !== 0) this.facing = Math.sign(dx);
    this.pupils.forEach((p, i) => p.setPosition((i === 0 ? -10 : 10) + dx * 3, -73 + dy * 3));

    const moving = Math.hypot(dx, dy) > 0.05;
    this.walkTime = moving ? this.walkTime + deltaMs : 0;
    const swing = Math.sin(this.walkTime / 70) * 5;
    const [legL, legR] = this.figure.getData('legs') as Phaser.GameObjects.Rectangle[];
    legL.y = -10 - Math.max(0, swing);
    legR.y = -10 - Math.max(0, -swing);
    this.figure.angle = moving ? Math.sin(this.walkTime / 140) * 4 : 0;
  }

  hop(): void {
    if (this.hopTween) return;
    this.hopTween = this.scene.tweens.add({
      targets: this.figure,
      y: -HOP_HEIGHT,
      duration: 220,
      ease: 'Quad.easeOut',
      yoyo: true,
      onUpdate: () => {
        const t = 1 - -this.figure.y / HOP_HEIGHT;
        this.shadow.setScale(0.6 + 0.4 * t);
      },
      onComplete: () => {
        this.hopTween = null;
        this.shadow.setScale(1);
      },
    });
  }

  /** Lille squash når man bliver skubbet. */
  bonk(): void {
    this.scene.tweens.add({ targets: this.figure, scaleX: 1.2, scaleY: 0.85, duration: 70, yoyo: true });
  }
}

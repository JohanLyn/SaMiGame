# Udviklerguide – minigames, ritualer og scener

Læs også `docs/STYLE.md` (stil, SKAL følges) og `docs/PLAN.md` (spildesign).
Kvalitetskravet er højt: det skal ligne et færdigt konsolspil, ikke en prototype.

## Overblik
```
apps/host/src/
  kit/            theme (farver, W=1920 H=1080), svg (SVG→tekstur), fx (juice), ui (tekst/paneler/timer),
                  scenery (baggrunde, skyer, palmer, ø, sol), textures (partikler), audio (sfx, musik, fortæller)
  objects/        Blok (animeret spillerfigur), ScoreCard
  flow/           Director (scene-flow), PlayScene (base med input/bots), types (MinigameDef, RitualDef ...)
  minigames/      _framework/MinigameScene.ts + én mappe pr. minigame (auto-registreres)
  rituals/        _framework/RitualScene.ts + én mappe pr. ritual (auto-registreres)
  scenes/         Boot, Lobby, Round, Chaos, Teams, Intro, Results, Awards, Transition
packages/shared/  protokol, controller-layouts (layouts.ts), avatar-system
```

## Et nyt minigame
1. Lav mappen `apps/host/src/minigames/<id>/` med:
   - `index.ts` – `export default def` (type `MinigameDef`, se `flow/types.ts`)
   - `<Navn>Scene.ts` – `class extends MinigameScene`, `constructor() { super('<id>') }`
   - `art.ts` – al grafik som SVG-funktioner (se `minigames/sumo/art.ts`)
2. Den registreres automatisk (glob). **Rør ikke fælles filer** (kit, flow, framework, andre mapper).
3. Se `minigames/sumo/` som komplet reference.

### MinigameScene API (se `minigames/_framework/MinigameScene.ts` og `flow/PlayScene.ts`)
- `protected duration = 30` (sek.) eller `null` (du kalder selv `finish`). Typisk 30–60 sek.
- `protected music: MusicTheme = 'game' | 'tense' | 'silly' | ...`
- `preload()` – `loadSvg(this, key, svg, w, h)` for alle teksturer.
- `setup()` – byg verden. Brug `this.spawnBlok(player, x, y, { size })` til spillerfigurer.
- `play(dt)` – logik hvert frame (dt i sekunder) mens spillet kører (efter 3-2-1-KAOS!).
- `timeUp()` – returnér rangering når tiden løber ud.
- `this.finish(ranking)` – afslut før tid. `ranking` = grupper af slots, vindere først, fx `[[2],[0,1],[3]]`.
  Hjælpere: `this.rankByScore(scores)`, `this.rankByTeam(teamIndex | null)`, `rankByElimination(order)` (fra `game/scoring`).
- Input (opdateres hvert frame): `this.pad(slot)` → `{x,y,a,b,taps,choice,px,py,level}`, `this.pressedA(slot)`,
  `this.pressedB(slot)`, `this.pressed(slot)`, `this.taps(slot)` (nye tryk dette frame), `this.choice(slot)` (-1 hvis intet tryk).
- Bots: override `botInput(slot, dt): BotInput | null` → `{ x, y, a, b, px, py, level, tap: true, choice }`. Bots SKAL spille
  fornuftigt (ikke perfekt) så spillet altid afsluttes og er sjovt at se på.
- Spillere: `this.players` (`PlayerView`: slot, name, color, colorNum, avatar, isBot, team, role), `this.teams`,
  `this.team(i)`, `this.solo` (1v3). Roller: `'ffa' | 'duo' | 'solo' | 'trio'`.
- Kaos-kort: `this.chaos.size` (håndteres af spawnBlok), `this.chaos.gravity` (gang med i tyngdekraft), `mirror` (håndteres automatisk).
- Juice: `this.fx.shake/flash/punch/hitstop/burst/dust/stars/confetti/floatText/banner/squash/popIn/breathe/vignette`.
- Lyd: `this.sfx('pop' | 'bonk' | 'splash' | 'fart' | ... )` (se `kit/audio/sfx.ts`), `this.say('...')` (fortæller, dansk).
- Telefon: `def.layout(ctx)` sætter controlleren ved start; ændr undervejs med `this.setLayout(slot, layout)`;
  `this.vibrate(slot, ms)`.
- Statistik til bonuspriser: `this.stat(slot, 'falls' | 'hits' | 'bonks' | 'jumps' | 'screams')`. ('taps', 'distance' tælles automatisk.)

### Controller-layouts (telefonen) – `packages/shared/src/layouts.ts`
`stick` (joystick + A/B), `buttons` (2–6 knapper → `choice`), `mash` (hamre → `taps`), `touchpad` (`px`,`py`,`a`),
`tilt` (gyro → x/y, joystick som reserve), `mic` (`level` 0–1, hamre som reserve), `info` (hemmelig tekst + knapper),
`choice` (gitter med valg, `selected`, `locked`), `wait`. Man kan IKKE lave nye layout-typer – brug disse.

### Blok (spillerfigur) – `objects/Blok.ts`
`walk(dx, dy, deltaMs)` hvert frame når den bevæger sig, `hop()`, `cheer()`, `sad()`, `dance()`, `idle()`, `bonk()`,
`squash()`, `spinOut()`, `setFacing(1|-1)`, `setTag()`, `setRing()`, `hideTag()`. Origin = fødderne. Ca. 230 px høj ved size 1.
`blok.setDepth(y)` for korrekt overlap. Figurer kan også bruges som "ryttere" på andre objekter (se Sumo).

### Grafik
- Alt tegnes som SVG i kode (`art.ts`) med `svgDoc`, `ink()`, `linear()`, `radial()`, `eyes()`, `shine()` fra `kit/svg.ts`.
- Rasterisér i den størrelse det vises i (1920×1080-koordinater). Ingen eksterne billeder/fonte.
- Baggrunde: `gradientBackdrop`, `partyBackdrop`, `sea`, `clouds`, `sun`, `palm`, `islandSvg` fra `kit/scenery.ts` – eller egne.
- Tekst: `title()`, `label()`, `body()` fra `kit/ui.ts` – aldrig rå `this.add.text` uden kontur.
- Brug `setFlipX` i stedet for negativ skala på containere.

## Et nyt ritual
`apps/host/src/rituals/<id>/index.ts` eksporterer `RitualDef` (`{ id, title, scene }`); scenen `extends RitualScene`,
`constructor() { super('ritual-<id>') }`, implementér `setup()`, evt. `play(dt)` og `botInput()`. Ritualet skal
afsløre `this.pick` (minigamet er allerede valgt) og til sidst kalde `this.done({ chaos?: boolean, winner?: slot })`.
`this.all` = alle minigames (til animationer, fx fisk/låger med forskellige ikoner). 10–20 sekunder.

## Test og screenshots (uden server)
- Typecheck: `npx tsc -p apps/host/tsconfig.json`
- Kør og screenshot: `node scripts/shoot.mjs --port <DIN-PORT> --query "minigame=<id>&speed=2" --at 4,10,18 --out shots/<id> --until-result --timeout 150`
  - Ritual: `--query "ritual=<id>"`. Scener: `--query "scene=results|awards|finale|chaos|teams|intro|round"` (tilføj `&pick=<minigame-id>` for at bruge et bestemt spil, fx `scene=teams&pick=toiletter` for 1 mod 3).
  - Headless-browseren renderer i software (~5 FPS), så brug `speed=2..4`, og kør ikke flere `shoot.mjs` samtidig (lange spil når så ikke resultat inden for timeout). Ved konsolfejl afsluttes med kode 1.
  - Kig på screenshots med Read-værktøjet og ret alt der ser billigt ud.
- I browseren manuelt: `?minigame=<id>&keys=1` (WASD + mellemrum for plads 1, piletaster + Enter for plads 2).

## Timing – vigtigt
Tween-uret og `time.delayedCall` kan løbe fra hinanden, når spillet hakker (meget tydeligt i headless-browseren).
Kæd derfor forløb sammen med tweens' `onComplete`/promises i stedet for at stole på at faste `delayedCall`-tider passer
med animationerne. Fælles ritual-hjælpere (overskrift, råb, lokkemad, "NÆSTE SPIL"-afsløring) ligger i
`rituals/_framework/ritualKit.ts`.

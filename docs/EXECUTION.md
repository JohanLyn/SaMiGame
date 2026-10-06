# SaMi Party – udførelsesplan for M1–M4 (hele spillet, i høj kvalitet)

## Context
M0 er færdig og pushet (`4a4feb3`): monorepo med `packages/shared` (protokol, validering, `ReconnectingSocket`), `apps/server` (RoomManager + ws), `apps/controller` (joystick + HOP/B) og `apps/host` (Phaser 4-lobby med QR, ø og `Blok`-figurer). Spildesignet ligger i `docs/PLAN.md`.

Brugeren vil nu have **resten af planen bygget** (M1–M4: hele spil-loopet, alle 16 minigames, 5 udvælgelses-ritualer, Kaos-kort, finale, prisoverrækkelse, lyd, udgivelse), gerne med sub-agenter, og det skal **se forrygende ud, ikke billigt**. Det kræver to ting ud over funktionalitet: (1) et fælles, professionelt **art- og "juice"-kit**, som alle minigames bruger, så helheden føles ensartet og poleret, og (2) en arkitektur, hvor mange agenter kan bygge minigames parallelt uden at træde hinanden over tæerne.

---

## 1. Kvalitetsstrategi: "stråle af storhed"
Ingen grå firkanter. Alt går gennem et fælles kit, som jeg selv bygger først (bølge 0), og som sætter niveauet:

- **Art direction (`docs/STYLE.md`)**: Mættet "candy"-palet med dyb marineblå konturfarve (`#1a1446`), tykke konturer (5–6 px), bløde skygger, blanke highlights, gradienter. Skrifttyper via `@fontsource` (OFL, bundtes lokalt): **Lilita One** (titler) + **Nunito** (brødtekst).
- **Vektorgrafik i høj opløsning**: Al grafik laves som **SVG genereret i kode** (funktioner der returnerer SVG-strenge med farver/parametre) og indlæses som Phaser-teksturer i 2× opløsning (`textures.addBase64` / `load.svg`). Giver skarpe, glatte, "rigtige" illustrationer i stedet for primitive former.
- **Avatar-system i `packages/shared/src/avatar/`**: Én SVG-renderer for blokfigurer (hoved, krop, ben, ansigt, hat, accessory, farver), som bruges **både på TV'et og telefonen** → "Byg-din-Bloks" ser ens ud overalt. Figur-presets: Ridder Agurk, Turbo-Mormor, Axel Axolotl, Brødristeren Bent, Kubus-Kurt, Banan-Bjarne (bruges også til bots). Animeret i Phaser med squash & stretch, idle-vip, blink, gå-cyklus, sejrsdans og "nederlag"-pose.
- **Juice-kit (`apps/host/src/kit/`)**: skærmrystelse, hit-stop, slow-mo, partikler (konfetti, støv, stjerner, sved, sprøjt), "punch"-zoom, hvid flash, Phaser 4-filtre (glow, bloom, vignette, skygge), scene-overgange (blok-wipe / iris), animerede bannere ("3-2-1-KAOS!", "FÆRDIG!", "KO!"), flydende pointtal, UI-paneler med bevel og wobble.
- **Lyd (`apps/host/src/kit/audio/`)**: **ZzFX** (MIT, ~1 KB) til alle lydeffekter + en lille procedurel musik-sequencer i Web Audio (eget tema til hub, minigames, finale). **Fortælleren**: Web Speech API med dansk stemme (`da-DK`) der kommenterer gakket ("Uha, det var en frikadelle for meget!"); slås fra hvis ingen dansk stemme findes.
- **Telefonen er også premium**: samme fonts/farver, blanke knapper med tryk-animation, spillerens avatar i hjørnet, haptik, glidende skift mellem layouts.
- **Kvalitetsport**: Hver minigame skal kunne køres isoleret (`?minigame=<id>&bots=4`), screenshottes automatisk af Playwright, og gennemgås mod `STYLE.md` før den godkendes. Til sidst en **"art director"-agent**, der screenshotter alle skærme og laver en prioriteret polerings-liste, som så rettes.

---

## 2. Arkitektur (udvidelser af M0)

### 2.1 Protokol (`packages/shared/src/protocol.ts`)
- `ControllerInput` udvides: `{ x, y, a, b, choice?: number, pointer?: {x, y, down}, level?: number }` (level = mikrofon-/tilt-styrke 0–1).
- Nye **controller-layouts** som data, sendt fra TV → telefon (`to_player` med `{t:'layout', layout}`), valideret med størrelsesgrænse:
  `stick` (joystick + A/B med egne labels/ikoner) · `buttons` (2–6 store farvede knapper) · `mash` (én kæmpe knap) · `touchpad` (træk-flade, absolut/relativ) · `tilt` (gyro, knap-fallback) · `mic` (lydstyrke, mash-fallback) · `info` (hemmelig tekst/kort på telefonen + knapper, til Kagebomben) · `choice` (grid af valg, fx døre/pumper) · `lobby` (Byg-din-Bloks + "Klar"/"Start") · `wait` (pæn venteskærm med besked).
- Telefon → TV: `{t:'profile', avatar}` (gemmes i serverens slot, overlever reconnect/host-resume) og generisk `{t:'action', name, value}` (fx "start", "ready", "rounds").
- Server: `rooms.ts` gemmer avatar pr. slot, relayer `layout`/`action`. Tests udvides i `apps/server/test/rooms.test.ts`.

### 2.2 Spilforløb (host, `apps/host/src/game/`)
Ren TypeScript-logik (unit-testet med Vitest), adskilt fra Phaser:
- `GameState`: spillere (menneske/bot, avatar, point, statistik), rundenummer, antal runder (5/10/15, vælges af "kaptajnen" = første spiller), aktive kaos-kort, brugte minigames.
- `scoring.ts` (FFA 3/2/1/0, 2v2 vindere 2 hver, 1v3: ener vinder 3 / holdet 1 hver), `teams.ts` (Holdhatten, ener = fører, seeded RNG), `chaos.ts` (kort + effekter), `awards.ts` (bonuspriser ud fra statistik), `selection.ts` (vælg næste minigame: undgå gentagelser, sikre blanding af typer).
- **Scene-flow**: `Boot` (fonts/teksturer/lyd) → `Lobby` (Byg-din-Bloks, bots fylder op, kaptajn starter) → `Hub` (ø + skiftende ritual) → `ChaosCard` (hvis udløst) → `TeamReveal` → `Intro` (titelkort, regler, styring-illustration, alle trykker "Klar", 3-2-1) → `Minigame` → `Results` (placeringer, point flyver op på stillingen) → … → `Finale` (Kaos-Tårnet) → `Awards` (bonuspriser, podie, konfetti) → tilbage til lobby.
- `TransitionManager` til ensartede overgange; `Narrator` til fortællerlinjer.

### 2.3 Minigame-framework (`apps/host/src/minigames/`)
- `framework/MinigameScene.ts` (abstrakt base): giver `this.players` (slot, navn, avatar, hold, rolle, bot?), `this.input(slot)` (telefon eller bot), `this.kit` (fx/lyd/UI), `this.chaos` (aktive modifiers, fx spejlvendt styring anvendes automatisk på input), `this.rng`, `this.stat(slot, key)`, `this.finish(result)`, indbygget timer-HUD og "FÆRDIG!"-afslutning.
- `framework/types.ts`: `MinigameDef { id, title, kind: 'ffa'|'2v2'|'1v3', tagline, rules: string[], controls, layoutFor(role), durationSec, scene, botBrain }`.
- **Auto-registrering**: `import.meta.glob('./*/index.ts', { eager: true })` → hver minigame ligger i sin egen mappe `apps/host/src/minigames/<id>/` og skal **ikke** redigere fælles filer. Det gør parallel udvikling konfliktfri.
- **Offline dev-tilstand**: `?minigame=<id>&bots=4` (og `?scene=hub&ritual=<id>`) kører uden server med 4 bots + tastatur → hver agent kan teste og screenshotte alene på sin egen Vite-port (`HOST_PORT`-env i `vite.config.ts`).
- Reference-minigame jeg selv bygger: **Sumo-Frikadeller** (viser hele mønstret: grafik, bots, juice, lyd, resultat).

### 2.4 Telefon (`apps/controller/src/`)
- `layouts/` med én fil pr. layout-type, fælles `render(layout)` med glidende overgange.
- `avatar-editor.ts`: Byg-din-Bloks (vælg preset eller del-for-del: hat, ansigt, krop, farver), live-preview med shared SVG-renderer, gemmes i `localStorage`.
- Sensorer: `DeviceOrientation` (iOS-tilladelse via knap) og `getUserMedia` (mikrofon) – kræver HTTPS, så altid fallback til knapper. Valgfri `npm run dev:https` med `@vitejs/plugin-basic-ssl`.

### 2.5 Udgivelse (M4)
- Serveren serverer også de byggede `host`- og `controller`-filer (statisk) → én port, ét domæne (`/` = TV, `/play` = telefon).
- `Dockerfile` + `render.yaml` / `fly.toml`, HTTPS via platformen (så gyro/mikrofon virker). Jeg kan ikke selv deploye (kræver jeres konto) – jeg laver konfigurationen og en vejledning i README.

---

## 3. Udførelse i bølger (sub-agenter)

**Bølge 0 – fundament (mig selv, sekventielt; sætter kvalitetsniveauet):**
STYLE.md, fonts, avatar-renderer + presets, juice-kit, lyd-kit + fortæller, UI-komponenter, protokol-udvidelser + server, controller-layouts + avatar-editor, GameState/scoring/teams/chaos/awards (+ tests), scene-flow (Boot/Lobby/Hub-ramme/TeamReveal/Intro/Results), minigame-framework + auto-registrering + offline dev-tilstand, Sumo-Frikadeller som reference, screenshot-script `scripts/shoot.mjs`. Commit + push.

**Bølge 1 – parallelle agenter (6 stk., i baggrunden, samme arbejdstræ, hver i egne mapper, egne porte, ingen commits):**
| Agent | Opgave |
|---|---|
| A – FFA I | Kokken Siger, Svampe-Roulette, Sjippe-Ålen |
| B – FFA II | Selfie-Kirurgen, Prutte-Roulette, Pop-up Kogebogen, Skrige-Ballonen |
| C – 2 mod 2 | Spaghetti-Tovtrækning, Badekar-Bobslæde, Kagebomben, Spejl-Dansen |
| D – 1 mod 3 | Gemmeleg i Toiletterne, Kanon-Kyllingen, Kødbolle-Bowling, Kattens Fisketur |
| E – Hub | De 5 ritualer (Fiskesøen, Den Store Væg, Grabbe-automaten, Vulkanen der nyser, Due-posten) + Kaos-kort-præsentation |
| F – Finale | Kaos-Tårnet + prisoverrækkelse med podie, sejrsdanse og bonuspriser |

Hver agent får: STYLE.md, framework-API, Sumo-Frikadeller som eksempel, krav om bots, lyd, juice, 2× SVG-grafik, typecheck grønt, og **screenshots af hver minigame** (intro, midt i spillet, slut) som de selv gennemgår mod STYLE.md før de melder færdig.

**Bølge 2 – integration og polering (mig + agenter):**
1. Jeg integrerer, kører typecheck/tests/e2e, retter brud, committer + pusher.
2. **Art director-agent**: screenshotter alle scener og minigames, laver prioriteret liste over visuelle svagheder.
3. Poleringsagenter (2–3 parallelt) retter listen; jeg verificerer.
4. M4: statisk servering fra serveren, Dockerfile, deploy-konfiguration, README. Commit + push.

---

## 4. Verifikation
- **Unit (Vitest)**: scoring, holdinddeling, minigame-udvælgelse, kaos-kort, awards, protokol-validering, RoomManager (avatar/layout/action).
- **Per minigame**: `scripts/shoot.mjs <id>` kører `?minigame=<id>&bots=4` headless og gemmer screenshots + tjekker at minigamet afslutter med et gyldigt resultat inden for tidsgrænsen (bots spiller selv).
- **End-to-end (Playwright)**: TV + 2 telefoner joiner, bygger avatar, kaptajn starter et 3-runders spil, resten er bots; tester ritual → hold → intro → minigame → resultat → finale → awards. Skal gennemføres uden konsolfejl.
- `npm run typecheck`, `npm run build`, `npm audit` (0 sårbarheder) før hvert push.
- Manuelt for jer: rigtige telefoner på samme wifi (`npm run dev`), og iOS-test af gyro/mikrofon via HTTPS-deploy.

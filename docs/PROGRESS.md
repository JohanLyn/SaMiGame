# Fremdrift (opdateres ved hver commit)

Design: `docs/PLAN.md`. Udførelsesplan (bølger, arkitektur): `docs/EXECUTION.md`.

## Bølge 0 – fundament ✅ (se docs/DEV_GUIDE.md)
- [x] `docs/STYLE.md` stilguide
- [x] Avatar-system i `packages/shared/src/avatar/` (SVG-renderer, presets, validering) – tjek med `npx tsx scripts/avatar-sheet.ts out.png`
- [x] Protokol: controller-layouts (`packages/shared/src/layouts.ts`), `taps/choice/px/py/level` i input, `profile`/`action`-beskeder, server gemmer avatar
- [x] Host-kit: `apps/host/src/kit/` (theme 1920×1080, svg, textures, fx, ui, audio: sfx/music/narrator)
- [x] `objects/Blok.ts` omskrevet til avatar-dele med animationer
- [x] Spillogik `apps/host/src/game/` (GameState, scoring, teams, selection, chaos, awards) + tests
- [x] Session/bots/offline-tilstand (`net/`), Director (`flow/Director.ts`), PlayScene, InputRouter
- [x] Scener (første version, ikke visuelt testet endnu): Boot, Lobby, Hub-ramme (ritual-plugins), ChaosCard, TeamReveal, Intro, Results, Finale/Awards-ramme
- [x] Minigame-framework (`apps/host/src/minigames/framework/`) + auto-registrering + Sumo-Frikadeller
- [x] Controller: layouts + Byg-din-Bloks-editor
- [x] `scripts/shoot.mjs` screenshot-værktøj, e2e opdateret

## Bølge 1 – parallelle agenter ✅
- 16 minigames + finalen Kaos-Tårnet (`apps/host/src/minigames/`), 5 ritualer (`apps/host/src/rituals/`), ny ChaosScene og AwardsScene.
- A, B og C blev stoppet af en API-grænse lige før deres sidste officielle slut-test. Alle 17 minigames er derefter kørt igennem af mig med bots (`scripts/shoot.mjs --until-result`): alle giver gyldigt resultat uden konsolfejl.

## Afrunding ✅
- Demo-tilstand (`?demo`, `build:demo`): 2 tastatur-spillere + bots, START-knap og minigame-vælger i lobbyen. Udgivet som privat demo-link (se README).
- Æ/Ø/Å i SVG-tekst rettet (UTF-8-header).

## Bølge 2 – næste skridt (ikke startet)
- Art director-gennemgang af alle skærme og poleringsrunde (se `docs/RESUME.md`, trin 3).
- Kendte småting: navneskilte kan overlappe tekst i lobbyen; Sumo-pandens grå "olie"-ellipser; flytbar timer (`TimerHud`) og navneskilt-position på `Blok` ønsket af agenterne.
- Udvidet e2e (`e2e/lobby.spec.ts`: 2 telefoner, 3 runder, finale, priser) er skrevet men ikke kørt endnu.

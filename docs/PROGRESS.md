# Fremdrift (opdateres ved hver commit)

Design: `docs/PLAN.md`. Udførelsesplan (bølger, arkitektur): `docs/EXECUTION.md`.

## Bølge 0 – fundament (i gang)
- [x] `docs/STYLE.md` stilguide
- [x] Avatar-system i `packages/shared/src/avatar/` (SVG-renderer, presets, validering) – tjek med `npx tsx scripts/avatar-sheet.ts out.png`
- [x] Protokol: controller-layouts (`packages/shared/src/layouts.ts`), `taps/choice/px/py/level` i input, `profile`/`action`-beskeder, server gemmer avatar
- [x] Host-kit: `apps/host/src/kit/` (theme 1920×1080, svg, textures, fx, ui, audio: sfx/music/narrator)
- [x] `objects/Blok.ts` omskrevet til avatar-dele med animationer
- [x] Spillogik `apps/host/src/game/` (GameState, scoring, teams, selection, chaos, awards) + tests
- [x] Session/bots/offline-tilstand (`net/`), Director (`flow/Director.ts`), PlayScene, InputRouter
- [x] Scener (første version, ikke visuelt testet endnu): Boot, Lobby, Hub-ramme (ritual-plugins), ChaosCard, TeamReveal, Intro, Results, Finale/Awards-ramme
- [ ] Minigame-framework (`apps/host/src/minigames/framework/`) + auto-registrering + Sumo-Frikadeller
- [ ] Controller: layouts + Byg-din-Bloks-editor
- [ ] `scripts/shoot.mjs` screenshot-værktøj, e2e opdateret

## Bølge 1 – parallelle agenter (ikke startet)
A FFA I · B FFA II · C 2v2 · D 1v3 · E Hub-ritualer · F Finale/awards

## Bølge 2 – integration, art director, polering, deploy (ikke startet)

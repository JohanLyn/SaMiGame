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

## Bølge 2 – art director + polering ✅
- Udvidet e2e (`npm run test:e2e`: 2 telefoner, 3 runder, ritualer, kaos, hold, finale, priser) er grøn (~7 min). Host-Vite kører uden HMR i e2e, så en filændring midt i testen ikke genindlæser TV'et.
- Alle 17 minigames, 5 ritualer og alle scener er screenshottet og gennemgået mod STYLE.md; alle minigames giver gyldigt resultat med bots uden konsolfejl.
- Rettet: bots kan ikke længere få samme navn/figur som en menneskelig spiller; resultat-skærmens vindertekst ligger fri af kronen; ritual-titler skaleres ind i båndet; intro-kortets styring/kaos-linje forankret i bunden (reglerne skaleres); holdfarvede felter + balanceret 1 mod 3-layout i hold-skærmen; kaos-konfetti bag kortet; lyd-hint flyttet væk fra solen i lobbyen; Sumo har fået køkkenkulisse (redskaber, krydderikrukker med øjne, komfur) og gyldne oliepytter i stedet for grå ellipser; Kogebogens advarsel står stort på bogryggen; tydeligere rolleskilte i Badekar og Kagebombe; større hint i Spejldans; telefonlobbyens navnefelt/Jubel-knap passer på smalle skærme.
- Demo genopbygget og udgivet på samme link (`scripts/pack-demo.py`).

## Næste skridt (forslag)
- Vulkan-ritualet: fjer-pindene tegnes hen over navneskiltene.
- Lyd/tekst-gennemgang på et rigtigt TV med rigtige telefoner (afstand, latency).
- `TimerHud` med valgfri placering og navneskilt-position på `Blok` (ønsket af agenterne).

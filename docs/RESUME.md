# SaMi Party – genoptag efter afbrydelse (bølge 1 færdiggørelse + bølge 2)

## Context
Brugeren bad om at bygge hele planen (M1–M4) i høj kvalitet med sub-agenter. Bølge 0 (fundament), M4 (deploy) og Agent E (5 ritualer + ny ChaosScene) er færdige og pushet. Agenterne A, B, C, D og F blev afbrudt af en API-grænse ("session limit") midt i deres sidste test-/poleringsrunder. Deres arbejde er committet som snapshot (`1efc356`) og typecheck er grønt; der er kun én lille ucommittet ændring (`minigames/svampe/SvampeScene.ts`).

Status ved afbrydelsen (fra agenternes sidste besked):
- A (kokken, svampe, sjippe): var ved at rette at sunkne svampe stadig viste en halv kuppel.
- B (selfie, prutte, kogebog, skrig): ventede på de sidste to slut-kørsler.
- C (spaghetti, badekar, kagebombe, spejldans): var i gang med Badekar-scenen.
- D (toiletter, kanon, bowling, fisketur): kørte tests (HMR-problemet er nu løst i `scripts/shoot.mjs`).
- F (kaostaarn + AwardsScene): kiggede på "ankomst-øjeblikket" i finalen.
Alle mapper findes og fylder 700–2300 linjer hver, så det er afslutning/verifikation der mangler, ikke nybygning.

## Trin 1 – Gem og genoptag agenterne
1. Commit + push den ucommittede svampe-ændring.
2. Genoptag de 5 afbrudte agenter med `SendMessage` (deres kontekst er bevaret) med besked om: grænsen er nulstillet; `scripts/shoot.mjs` har nu HMR slået fra og dræber Vite helt (brug den officielle igen); ritual-hjælpere ligger i `rituals/_framework/ritualKit.ts`; gør jeres igangværende arbejde færdigt, kør slut-testen for hvert spil (RESULT uden konsolfejl), og send slutrapport. Ingen commits.
3. Commit et snapshot hver gang en agent melder færdig (stop-hooken kræver et rent arbejdstræ).

## Trin 2 – Integration (mig, når alle er færdige)
- `npx tsc`, `npm test`, `npm run build`, `npm audit`.
- Kør alle 17 minigames sekventielt: `node scripts/shoot.mjs --query "minigame=<id>&speed=2" --until-result` – alle skal give gyldigt RESULT uden konsolfejl. Ret evt. fejl selv eller send dem tilbage til den agent der ejer spillet.
- Udvid e2e (`e2e/lobby.spec.ts`) til 3 runder + finale + awards med 2 telefoner, så hele flowet (ritual → kaos → hold → intro → minigame → resultat → finale → priser) gennemløbes.
- Opdatér `docs/PROGRESS.md`, commit + push.

## Trin 3 – Art director + polering (bølge 2)
- Én art director-agent: screenshotter lobby, alle ritualer, kaos-kort, hold, intro, alle 17 minigames, resultater, finale og awards (+ telefon-layouts via e2e-screenshots), vurderer mod `docs/STYLE.md` og skriver en prioriteret liste (`docs/POLISH.md`) over visuelle svagheder pr. fil.
- 2–3 poleringsagenter fordelt efter fil-ejerskab (ingen overlap) retter listen; jeg verificerer med screenshots og committer løbende.
- Kendte punkter at få med: navneskilt der overlapper skiltet i lobbyen, de grå "olie"-ellipser i Sumo-panden, læsbarhed af småtekst på TV-afstand.

## Verifikation
- Typecheck, unit-tests (44+), build og `npm audit` grønne før hvert push.
- Hvert minigame og ritual afsluttes med gyldigt resultat i `shoot.mjs` uden konsolfejl.
- Udvidet e2e spiller et helt spil (3 runder + finale + priser) med rigtig server og 2 telefoner uden konsolfejl.
- Slut: alt committet og pushet til `claude/wizardly-archimedes-gqx567`; kort status til brugeren med screenshots af de bedste skærme.

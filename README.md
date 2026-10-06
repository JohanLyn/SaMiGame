# SaMi Party 🎉

Et gakket partyspil i stil med Mario Party – **uden spillebræt**. Spillet kører i browseren på et TV eller en storskærm, og op til 4 spillere bruger deres **telefoner som controllere** (scan QR-koden – ingen app). Tomme pladser bliver automatisk til bots.

- **Kaos-Karrusellen** i stedet for et bræt: hver runde findes næste minigame gennem et skørt ritual (Fiskesøen, Den Store Væg, Grabbe-automaten, Vulkanen der nyser, Due-posten).
- **Kaos-kort**: spejlvendt styring, bittesmå figurer, dobbelt point, bytte-bonanza …
- **Minigames** i tre typer: alle mod alle, 2 mod 2 og 1 mod 3 – plus den store finale, **Kaos-Tårnet**.
- **Byg-din-Bloks**: byg din egen blokfigur på telefonen (hatte, ansigter, udstyr, farver) eller vælg en af de faste figurer.
- **Prisoverrækkelse** med bonuspriser, podie og konfetti.

Design: [docs/PLAN.md](docs/PLAN.md) · Stilguide: [docs/STYLE.md](docs/STYLE.md) · Udviklerguide: [docs/DEV_GUIDE.md](docs/DEV_GUIDE.md) · Status: [docs/PROGRESS.md](docs/PROGRESS.md)

## Spil det derhjemme

Kræver Node 22+.

```bash
npm install
npm run dev
```

1. Åbn **http://localhost:5173** på computeren der er koblet til TV'et (fuld skærm: F11).
2. Klik én gang på skærmen for at slå lyd til.
3. Spillerne scanner QR-koden med telefonen (samme wifi som computeren), skriver deres navn og bygger deres figur.
4. Den første spiller er **kaptajn** og vælger antal runder og trykker **START**. Tomme pladser bliver bots.

Har computeren flere netkort, kan QR-koden pege på den forkerte adresse. Sæt den så selv i `apps/host/.env.local`:

```
VITE_CONTROLLER_URL=http://192.168.1.42:5174
```

**Gyroskop og mikrofon** (bruges i enkelte minigames) kræver HTTPS på telefonen. Start med `npm run dev:https` og accepter certifikat-advarslen på telefonen – eller brug knapperne, som altid virker som reserve.

**Taster på TV'et:** `M` slår lyden til/fra · `R` skifter antal runder i lobbyen · `Enter` starter med bots.

## Udgiv spillet online

Hele spillet (server + TV-app + telefon-app) kører fra **én port**:

```bash
npm run build     # bygger apps/host og apps/controller
npm start         # starter serveren på PORT (default 3000)
```

TV'et åbner `/`, telefonerne kommer til `/play/` via QR-koden.

- **Docker:** `docker build -t sami-party . && docker run -p 3000:3000 sami-party`
- **Render.com:** forbind GitHub-repoet og vælg "Blueprint" – `render.yaml` opretter en gratis web-service med HTTPS (så virker gyro og mikrofon også).

## Udvikling

```
apps/host/        TV-appen (Phaser 4 + Vite): scener, minigames, ritualer, grafik-kit, lyd
apps/controller/  Telefon-controlleren (Vite, ren TypeScript): layouts + Byg-din-Bloks
apps/server/      Spilserver (Node + ws): rum, genforbindelse, relay, statiske filer
packages/shared/  Protokol, controller-layouts, avatar-system (SVG), validering
e2e/              Playwright: TV + telefon spiller et helt spil igennem
scripts/          dev-runner, screenshot-værktøj, avatar-ark
```

```bash
npm run dev         # server + TV + telefon med hot reload
npm test            # unit-tests (Vitest)
npm run test:e2e    # end-to-end (Playwright, starter selv serverne)
npm run typecheck   # TypeScript i alle pakker
npm run shoot -- --query "minigame=sumo" --at 3,8 --out shots/sumo --until-result
```

**Dev-genveje på TV'et** (uden server, bots spiller selv):
`?minigame=<id>` · `?ritual=<id>` · `?scene=round|chaos|teams|intro|results|finale|awards` · `?keys=1` (WASD/piletaster styrer plads 1 og 2) · `?speed=2` · `?mute` · `?autostart` (lobbyen starter selv) · `?rounds=3`.

Nye minigames og ritualer registreres automatisk – se [docs/DEV_GUIDE.md](docs/DEV_GUIDE.md).

## Grafik og ophavsret

Al grafik er tegnet som SVG i kode, og alle figurer er egne. Figurerne er inspireret af blokstilen fra Roblox/Minecraft, men der bruges ingen beskyttede figurer, navne eller assets fra andre spil. Skrifttyper: Lilita One og Nunito (SIL Open Font License). Lydeffekter: ZzFX (MIT).

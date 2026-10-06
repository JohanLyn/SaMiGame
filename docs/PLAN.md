# SaMi Party – plan for et gakket minigame-partyspil (uden spillebræt)

## Context
Repoet `SaMiGame` er tomt (ingen commits endnu). Ønsket er et Mario Party-lignende spil, hvor **brættet er fjernet** og erstattet af noget mere kreativt, der vælger det næste minigame. Minigames skal minde om de mest populære Mario Party-klassikere, være gakkede og dække **alle-mod-alle (FFA)**, **2 mod 2** og **1 mod 3**.

Beslutninger fra brugeren:
- **Web/browser** – TypeScript + Phaser 3 + Vite.
- **Telefoner som controllere** (à la Jackbox): spillet kører på TV/storskærm, spillerne scanner en QR-kode.
- **Præcis 4 spillere**; tomme pladser fyldes af bots.

Vigtigt: Alt bliver **egne figurer, navne og grafik** – ingen Nintendo-figurer eller -assets. Vi låner kun *spilmekanik-idéer*.

---

## 1. Kernekonceptet: "Kaos-Karrusellen" (erstatter brættet)
I stedet for et bræt står spillerne på en lille ø midt i en sø. Hver runde vælges næste minigame gennem et **udvælgelses-ritual**, som selv er et mini-øjeblik på 10–15 sek. Ritualet skifter hver runde, så det aldrig bliver ens:

| Ritual | Sådan virker det (på telefonen) |
|---|---|
| **Fiskesøen** | Alle laver et "kast" med telefonen (flick/ryst). Hurtigste kast fanger en fisk med næste minigame i munden. Man kan også fange en **støvle** = et Kaos-kort. |
| **Den Store Væg** | En kæmpe væg med låger som en julekalender. Alle kaster tomater (tap/swipe) – lågen med flest tomat-træffere åbnes. |
| **Grabbe-automaten** | Spilleren på **sidstepladsen** styrer kloen og vælger en kapsel (indbygget catch-up). |
| **Vulkanen der nyser** | Alle mash'er "kild"-knappen; vulkanen nyser et æg ud, som klækker til minigamet. |
| **Due-posten** | En forvirret due flyver rundt; den første, der tapper på den, får brevet med minigamet. |

**Kaos-kort** (det der erstatter brættets tilfældigheder): fanges i Fiskesøen eller dukker op tilfældigt. Eksempler: *Spejlvendt styring*, *Alle er bittesmå*, *Måne-tyngdekraft*, *Dobbelt point*, *Byt point med naboen*, *Fortælleren taler kun i rim*.

**Point og vinder:** Placering giver point (FFA: 3/2/1/0; hold-vindere 2 hver; ener-vinder i 1v3 får 3). Efter N runder (standard 10) kommer en **finale** og en prisoverrækkelse med fjollede bonuspriser ("Mest råbt i mikrofonen", "Flest gange skudt ud af kanonen") – ligesom Mario Partys bonusstjerner.

**Holdinddeling:** Minigamet bestemmer typen. 2v2: "Holdhatten" blander tilfældigt. 1v3: Den, der fører, bliver "ener" (handicap) – eller tilfældigt, hvis der er lighed.

**Figurer – inspireret af Roblox/Minecraft/Fortnite, men lovligt:**
Selve figurerne fra de spil (Steve, Creeper, Peely, Roblox-"Noob" osv.) er beskyttet af ophavsret og varemærker hos Microsoft/Mojang, Epic og Roblox Corp., så dem kan vi ikke bruge i et selvstændigt webspil. **Stilarten** derimod (blokfigurer, voxel-grafik, cartoon-skins, sjove dansemoves/emotes) er ikke beskyttet, så den kan vi godt låne. Derfor:

- **Figurskaber på telefonen ("Byg-din-Bloks"):** Hver spiller sætter sin egen blokfigur sammen i lobbyen (hoved, krop, hat, farver, ansigt, accessory). Det minder om Roblox-avatarer og Minecraft-skins, men designet er spillernes eget. Figuren gemmes på telefonen til næste gang.
- **Faste egne figurer i samme blokstil**, hvis man ikke gider bygge selv: Ridder Agurk (syltet agurk i rustning, à la et sjovt Fortnite-skin), Turbo-Mormor (blok-bedstemor på el-løbehjul), Axel Axolotl (i træningsdragt), Brødristeren Bent (spytter toast ud, når han er sur), Kubus-Kurt (en sur jordklump, Minecraft-agtig), Banan-Bjarne (dansende banan-fyr).
- **Emotes/sejrsdanse:** Egne fjollede danse efter hvert minigame (Fortnite-feeling), uden at kopiere kendte emotes.
- **Grafikstil:** Low-poly/voxel 2D-sprites i Phaser. Pixel- og blokstil er hurtigt at tegne selv eller lave med frie assets (fx CC0-pakker fra Kenney.nl).
- **Undgå:** Kendte navne, logoer, lyde, specifikke skins/teksturer og genkendelige emotes fra de tre spil.

*Alternativ, hvis I absolut vil have de rigtige figurer:* Byg spillet **inde i** platformene, fx som et Roblox-spil i Roblox Studio, et Fortnite-ø i UEFN eller et Minecraft-minigame/map. Der tillader deres regler brug af deres egne assets. Det er så en anden teknologi end webspillet.

---

## 2. Minigames (inspireret af de mest populære Mario Party-klassikere)
De mest elskede klassikere går igen i rangeringer og remakes: Face Lift, Bumper Balls, Hexagon Heat, Shy Guy Says, Mushroom Mix-Up, Hot Rope Jump, Bowser's Big Blast, Booksquirm, Tug o' War, Hide and Go BOOM, Fish 'n' Drips, Bobsled Run, Snowball Summit, Rumble Fishing. Vores versioner:

### Alle mod alle (FFA)
| # | Navn | Inspiration | Gakket twist | Telefon-input |
|---|---|---|---|---|
| 1 | **Sumo-Frikadeller** | Bumper Balls | Man er frikadeller i en stegepande, der langsomt bliver varmere og tipper | Joystick |
| 2 | **Kokken Siger** | Shy Guy Says | En tysk kok løfter ketchup/sennep – men nogle gange en pølse for at narre | 2 store knapper |
| 3 | **Selfie-Kirurgen** | Face Lift | Træk og stræk et ansigt på telefonen, så det ligner det sure museumsportræt | Touch/træk |
| 4 | **Svampe-Roulette** | Mushroom Mix-Up | Kæmpe svampe i farver synker i et hav af suppe; alle løber til den rigtige farve | Joystick + hop |
| 5 | **Sjippe-Ålen** | Hot Rope Jump | To krokodiller svinger en ål som sjippetov – den bliver hurtigere og hikker | Hop-knap (timing) |
| 6 | **Prutte-Roulette** | Bowser's Big Blast | Tryk på pumper; én af dem puster kæmpe-pruttepuden der sender én i kredsløb | Vælg + tryk |
| 7 | **Pop-up Kogebogen** | Booksquirm | Kæmpe kogebog falder om; man skal stå i hullet formet som en fisk/banan | Joystick |
| 8 | **Skrige-Ballonen** | (eget, gakket) | Råb i telefonen for at puste ballonen – den der popper først taber | Mikrofon (fallback: mash) |

### 2 mod 2
| # | Navn | Inspiration | Gakket twist | Telefon-input |
|---|---|---|---|---|
| 9 | **Spaghetti-Tovtrækning** | Tug o' War | Trækker i én lang spaghetti over en gryde med tomatsovs | Mash + rytme-bonus |
| 10 | **Badekar-Bobslæde** | Bobsled Run | Én styrer, én bremser – i et badekar ned ad en snebakke | Tilt (gyro) / knapper |
| 11 | **Kagebomben** | Defuse or Lose | Én ser manualen på sin telefon, den anden ser bomben (asymmetrisk info – perfekt til telefoner!) | Info-skærm / knapper |
| 12 | **Spejl-Dansen** | Shadow Play-agtig | Holdet skal ramme samme dansebevægelse på samme tid | Swipe-retninger |

### 1 mod 3
| # | Navn | Inspiration | Gakket twist | Telefon-input |
|---|---|---|---|---|
| 13 | **Gemmeleg i Toiletterne** | Hide and Go BOOM | 3 gemmer sig i festival-toiletter, eneren åbner døre – nogle indeholder en and | Vælg dør |
| 14 | **Kanon-Kyllingen** | Snowball Summit | Eneren styrer en kæmpe kylling der skyder æg; de 3 undviger | Joystick + skyd |
| 15 | **Kødbolle-Bowling** | Goomba Bowling (omvendt) | Eneren ruller en kæmpe kødbolle; de 3 er keglerne og hopper | Sigte + kraft / hop |
| 16 | **Kattens Fisketur** | Fish 'n' Drips / Rumble Fishing | Eneren er en kat med fiskestang; de 3 fisk undgår krogen men skal spise orme for point | Joystick |

**Finale (alle 4):** **Kaos-Tårnet** – alle klatrer op ad et tårn af madrasser, mens tidligere minigames "gæsteoptræder" som forhindringer.

---

## 3. Teknisk arkitektur
Monorepo (npm workspaces), alt i TypeScript:

```
apps/host/        Phaser 3 + Vite – kører på TV/storskærm, al spillogik (host-autoritativ)
apps/controller/  Let mobil-webapp (Vite, ren HTML/Canvas) – tegner controller-layouts
apps/server/      Node + ws (eller Socket.IO) – rum-koder, relay mellem host og telefoner
packages/shared/  Beskedtyper, minigame-metadata, controller-layout-skemaer, pointlogik
```

- **Forbindelse:** Host opretter rum → viser QR-kode + 4-bogstavs kode → telefoner joiner → vælger figur. Server relayer kun beskeder; spillogik kører i host-browseren. Reconnect ved telefon-dvale (spiller-ID i `localStorage`).
- **Controller-layouts som data:** Hvert minigame erklærer sit layout (`joystick+A`, `mash`, `tilt`, `touch-canvas`, `secret-info`, `mic`). Telefonen tegner layoutet ud fra skemaet og sender input ~30 Hz. Vibration ved hits.
- **Minigame-plugin-interface** (`packages/shared/src/minigame.ts`):
  `MinigameDefinition { id, name, kind: 'ffa'|'2v2'|'1v3', durationSec, instructions, controllerLayout, scene (Phaser.Scene), botBrain(state) => input }` → returnerer en `MinigameResult` (placeringer). Nye minigames = ny mappe under `apps/host/src/minigames/<id>/`, registreret ét sted.
- **Spil-flow (state machine i host):** `Lobby → Hub(ritual) → [Kaos-kort] → Holdafsløring → Instruktion + "Klar?"-øverunde → Minigame → Resultat → … → Finale → Prisoverrækkelse`.
- **Bots:** Simple `botBrain` per minigame, så man kan spille/teste med 1–3 mennesker.
- **Dev-værktøjer:** `?minigame=sumo&bots=3` for at hoppe direkte i et spil; tastatur-emulering af controllere på hosten.
- **Telefon-sensorer:** Gyro/mikrofon kræver HTTPS og (på iOS) eksplicit tilladelse → altid en knap-fallback.

---

## 4. Faser
- **M0 – Skelet:** Monorepo, server med rum, QR-join, 4 prikker der bevæger sig på TV via telefonernes joysticks.
- **M1 – Spilsløjfe:** Lobby med "Byg-din-Bloks"-figurskaber (simpel version: farver + 3 hatte + 3 ansigter) og de faste blokfigurer, Den Store Væg-ritual, point, resultatskærm, bots + 3 minigames (ét per type): *Sumo-Frikadeller*, *Spaghetti-Tovtrækning*, *Kanon-Kyllingen*.
- **M2 – Kaos:** Fiskesøen + Grabbe-automaten, Kaos-kort, 5 nye minigames (Kokken Siger, Selfie-Kirurgen, Kagebomben, Gemmeleg i Toiletterne, Sjippe-Ålen).
- **M3 – Fuld pakke:** Resten af minigames, finale, prisoverrækkelse, lyd/musik, fortællerstemme, animationer og "juice".
- **M4 – Udgivelse:** Host som statisk side + server på fx Render/Fly.io med HTTPS.

## 5. Verifikation
- **Enhedstests (Vitest):** Pointberegning, holdinddeling, ritual-/kort-tilfældighed (seedet RNG), rum-håndtering på serveren.
- **End-to-end (Playwright, forudinstalleret Chromium):** Åbn host + 4 controller-sider, join via rumkode, kør en runde med `?minigame=…` og tjek at resultat/point opdateres.
- **Manuelt:** `vite --host` på LAN, rigtige telefoner (iOS + Android) – test gyro, vibration, mikrofon-tilladelse og reconnect.
- Hver milepæl committes og pushes til `claude/wizardly-archimedes-gqx567`.

# SaMi Party – stilguide

Målet: Det skal ligne et rigtigt, poleret konsolspil – ikke en prototype. Alt på skærmen er tegnet med vilje, bevæger sig, og reagerer.

## 1. Grundprincipper
1. **Intet står stille.** Alt har en idle-animation (vip, bølge, blink, puls). Statiske skærme føles døde.
2. **Alt reagerer.** Hver handling har feedback: lyd + partikler + squash/stretch + evt. skærmrystelse. Se `kit/fx.ts`.
3. **Tykke konturer og bløde former.** Alle figurer og objekter har kontur i `INK` (5–6 px på 1280×720), afrundede hjørner (radius ≥ 10), en blød skygge under sig og en hvid highlight øverst.
4. **Mættede farver, mørk baggrundskontrast.** Baggrunde er dybe/mørke eller himmel-gradienter; spilobjekter er lyse og mættede, så de popper.
5. **Læsbarhed på 3 meters afstand.** Minimum 22 px tekst på TV'et; titler 48–96 px i Lilita One med kontur og skygge.
6. **Gakket, ikke grimt.** Humoren ligger i idéerne og animationerne (frikadeller med øjne, en ål der hikker) – ikke i sjusket grafik.

## 2. Palet (`apps/host/src/kit/theme.ts`)
| Navn | Hex | Brug |
|---|---|---|
| `INK` | `#1a1446` | Alle konturer, mørk tekst |
| `NIGHT` | `#12103a` | Dybeste baggrund |
| `DEEP` | `#2a1f7a` | Paneler, baggrunds-gradienter |
| `SKY` | `#47b8ff` | Himmel, vand |
| `CREAM` | `#fff6e0` | Lys tekst, papir |
| `SUN` | `#ffcf3a` | Primær accent, guld, vindere |
| `TANGERINE` | `#ff8a2b` | Sekundær accent |
| `BUBBLEGUM` | `#ff5fa2` | Kaos, sjov |
| `MINT` | `#3ee6a8` | Succes |
| `GRAPE` | `#9b5cff` | Magi, kaos-kort |
| `TOMATO` | `#ff4b4b` | Fare, fejl |

Spillerfarver (fra `PLAYER_COLORS`): Rød `#ff4d4d`, Blå `#3d8bff`, Grøn `#3ccf5a`, Gul `#ffc928`. Brug altid spillerens farve på alt, der tilhører spilleren (navneskilt, pointtal, partikler, ring under figuren).

## 3. Typografi
- **Lilita One** – titler, tal, bannere, knapper. Altid med `INK`-kontur (stroke 6–10) og en skygge-forskydning (0, 6).
- **Nunito 800/900** – regler, beskrivelser, labels.
- Brug `kit/ui.ts` → `title()`, `label()`, `body()` i stedet for at sætte styles selv.

## 4. Grafik
- Tegn alt som **SVG i kode** (`kit/svg.ts` → `svgTexture(scene, key, w, h, svgBody)`), som rasteriseres i 2× opløsning. Brug `<linearGradient>`/`<radialGradient>` til dybde, `stroke="#1a1446"` med `stroke-linejoin="round"`.
- Opbygning af et objekt: skygge (sort ellipse, 20–25 % alpha) → kontur-form med gradient → highlight (hvid, 35–60 % alpha) → detaljer (øjne!).
- **Ting med øjne er sjovere.** Frikadeller, svampe, bomber, pander – giv dem øjne (`kit/svg.ts` → `eyes()`).
- Baggrunde: lag på lag (fjern → nær) med langsom parallax/bevægelse, gerne en vignette (`kit/fx.ts` → `vignette()`).

## 5. Bevægelse
- Easing: `Back.easeOut` til ting der dukker op, `Sine.easeInOut` til idle, `Quad`/`Cubic` til fysik-agtigt, `Bounce`/`Elastic` sparsomt til komik.
- Ind-animation: skala 0 → 1.15 → 1 (pop). Ud: skala 1 → 0 med `Back.easeIn`.
- Squash & stretch ved landing/kollision: (1.25, 0.8) → (1, 1).
- Hver minigame starter med `kit.countdown()` og slutter med `kit.banner('FÆRDIG!')`.

## 6. Lyd
- Hver handling har en lyd fra `kit/audio/sfx.ts` (`pop`, `bonk`, `whoosh`, `coin`, `splash`, `boing`, `fart`, `explosion`, `win`, `lose`, `tick`, `go`, `select`, `cheer`...).
- Musik via `kit/audio/music.ts` (`hub`, `game`, `tense`, `finale`, `results`).
- Fortælleren (`kit/audio/narrator.ts`) siger korte, gakkede danske linjer ved start, slut og skøre øjeblikke. Max én linje hver 4. sekund.

## 7. Tjekliste før en skærm er "færdig"
- [ ] Ingen standard-Phaser-tekst uden kontur/skygge, ingen ensfarvede firkanter uden kontur.
- [ ] Baggrund har mindst 3 lag og noget der bevæger sig.
- [ ] Alle spillere kan skelnes (farve + navn), også bots.
- [ ] Alle handlinger har lyd + visuel feedback.
- [ ] Screenshot i 1280×720 ser godt ud uden forklaring.

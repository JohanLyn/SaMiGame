# SaMi Party

Et gakket Mario Party-inspireret partyspil til 4 spillere, uden spillebræt. Spillet kører i browseren på TV'et, og telefonerne bruges som controllere.

Se den fulde plan i [docs/PLAN.md](docs/PLAN.md).

## Status: M0 – skelet ✅

- TV'et opretter et rum og viser rumkode + QR-kode.
- Op til 4 telefoner joiner ved at scanne QR-koden. Hver får en farve og en blokfigur på øen.
- Telefonen er en controller med joystick, HOP-knap og B-knap. Figurerne løber rundt, hopper og støder ind i hinanden, og så summer telefonen.
- Telefoner, der går i dvale eller bliver genindlæst, kommer tilbage på samme plads. Rummet overlever også et kort udfald på TV'et.

## Kom i gang

Kræver Node 22+.

```bash
npm install
npm run dev
```

Det starter tre ting:

| Del | Adresse | Hvad |
|---|---|---|
| Spilserver | `http://localhost:3000` | Rum og beskeder mellem TV og telefoner (WebSocket på `/ws`) |
| TV (host) | `http://localhost:5173` | Åbn denne på computeren/TV'et |
| Controller | `http://<din-ip>:5174` | Telefonerne kommer hertil via QR-koden |

Telefonerne skal være på **samme wifi** som computeren. QR-koden bruger automatisk computerens LAN-adresse. Har computeren flere netkort, kan du sætte adressen selv i `apps/host/.env.local`:

```
VITE_CONTROLLER_URL=http://192.168.1.42:5174
```

**Test uden telefoner:** Åbn `http://localhost:5173/?keys=1`. Så styres plads 1 med WASD + mellemrum og plads 2 med piletaster + Enter.

## Projektstruktur

```
apps/host/        TV-appen (Phaser 4 + Vite)
apps/controller/  Telefon-controlleren (Vite, ren TypeScript/HTML)
apps/server/      Spilserver (Node + ws): rum, genforbindelse, relay
packages/shared/  Fælles protokol, konstanter og validering
e2e/              Playwright-tests der kører TV + telefon i en browser
```

## Kommandoer

```bash
npm run dev         # start alt
npm test            # unit-tests (Vitest)
npm run test:e2e    # end-to-end (Playwright, starter selv serverne)
npm run typecheck   # TypeScript i alle pakker
npm run build       # produktionsbuild af host + controller
```

# Louis Kitchen

Louis Kitchen (technischer Name im Code: Kochmod) ist ein Minecraft-Bedrock-Add-on (1.26) zum Kochen und für ein kleines Restaurant.
Es ist für ein 7-jähriges Kind gemacht und komplett auf Deutsch.

## Etappe 2: Alle Gerichte

- 9 Gerichte: Hamburger, Cheeseburger, Döner, Sushi, Pizza Margherita, Salamipizza, Ramen, Kartoffelsuppe, Bratnudeln
- 4 neue Geräte: Pizzaofen, Suppentopf, Dönerspieß und Wok
- Rezeptbuch: zeigt zu jedem Gericht die Schritte mit Bild
- Die Glocke setzt an jeden freien Stuhl einen Gast; die Gäste wünschen sich, was die Küche kochen kann
- Der Restaurant-Baukasten baut eine Küche mit allen Geräten

## Download und Installation

- Neueste Version: <https://github.com/matthias-coder/louis-kitchen/releases/latest/download/LouisKitchen.mcaddon>
- Alle Versionen zum Auswählen: <https://github.com/matthias-coder/louis-kitchen/releases>
- Die Datei auf dem PC oder Tablet antippen bzw. doppelklicken, Minecraft importiert beide Pakete.
- In Minecraft heißen die Pakete „Louis Kitchen x.y.z“, die Versionsnummer steht also direkt im Namen. Nach einem Update das Verhaltenspaket der neuen Version in der Welt aktivieren.

## Neue Version veröffentlichen

1. Version in `packs/BP/manifest.json` und `packs/RP/manifest.json` (Header, Module, Abhängigkeit) sowie in beiden `.lang`-Dateien erhöhen, Tests laufen lassen, committen.
2. Tag setzen und pushen: `git tag v2.0.0 && git push origin main v2.0.0`.
3. GitHub Actions baut die `.mcaddon` und legt sie als Release ab (der Tag muss zur Manifest-Version passen, sonst bricht der Workflow ab).

## Befehle

```
npm install       # Abhängigkeiten holen (einmal)
npm test          # Tests laufen lassen
npm run build     # baut dist/LouisKitchen_<version>.mcaddon (zum Weitergeben, z. B. aufs Tablet)
npm run deploy    # kopiert beide Pakete in den Minecraft-Ordner (Minecraft muss einmal gestartet worden sein)
```

## Weitere Dateien

- **Kochbuch – Anleitung für jedes Gericht: [docs/kochbuch.md](docs/kochbuch.md)**
- Konzept: `docs/superpowers/specs/2026-11-05-kochmod-design.md`
- Plan: `docs/superpowers/plans/2026-11-05-kochmod-etappe-1-burger.md`
- Plan Etappe 2: `docs/superpowers/plans/2026-11-07-kochmod-etappe-2-gerichte.md`
- Testbogen zum Ausprobieren: `docs/test-etappe-1.md` (Etappe 1), `docs/test-etappe-2.md` (Etappe 2)

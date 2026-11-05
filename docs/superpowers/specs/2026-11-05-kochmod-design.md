# Kochmod – Konzept

Stand: 2026-11-05. Arbeitstitel „Kochmod" (technischer Namensraum `kochmod`).

Markierungen: **[Wunsch]** = so von Vater/Sohn gesagt. **[Festlegung]** = von Claude entschieden, darf beim Lesen korrigiert werden.

## 1. Worum es geht

Ein Minecraft-Mod zum Thema Kochen für einen siebenjährigen Jungen. Er betreibt ein eigenes Restaurant: Gäste setzen sich an Tische, wünschen sich ein Gericht, er kocht es Schritt für Schritt an Küchenstationen und serviert es. Gelingt das Gericht, gibt es Smaragde, sonst grummelt der Gast.

Der Anstoß war ein Video zu „Farmer's Delight" (Java-Mod). Der eigene Mod soll sich davon abheben: **Das Restaurant-Gefühl ist wichtiger als möglichst viele Kochdetails.** [Wunsch]

## 2. Ziele

- Küchenstationen und Werkzeuge, an denen man die Arbeitsschritte mit den passenden Zutaten selbst ausführt. [Wunsch]
- Mehrere Rezepte pro Gerichtstyp (z. B. Hamburger und Cheeseburger). [Wunsch]
- Ein eigenes Restaurant mit Tischen, an die sich Gäste setzen. [Wunsch]
- Gäste zeigen ihren Wunsch als Bild über dem Kopf und warten geduldig. [Wunsch]
- Richtiges Gericht: Smaragde. Falsches oder misslungenes Gericht: Grummel-Reaktion wie bei Dorfbewohnern. [Wunsch]
- Vorratskisten mit unendlichen Zutaten und eine Küchenwerkzeugkiste. [Wunsch]
- Ein Rezeptbuch zum Antippen: Liste der Gerichte, pro Gericht die Schritte als Bilder. [Wunsch]
- Ein fertiges Restaurant auf Knopfdruck. [Wunsch]
- Spielbar im Kreativ- und im Überlebensmodus. [Wunsch]
- Für einen Siebenjährigen ohne Hilfe bedienbar: Bilder statt Text, deutsche Texte, großzügige Zeitfenster. [Festlegung]

## 3. Nicht-Ziele

- Keine Java-Version (vorerst). Gewünscht war „Java und Bedrock"; da beides getrennt gebaut werden müsste und der Sohn auf dem Tablet spielt, gibt es zuerst nur Bedrock. [Festlegung, mit dem Vater besprochen]
- Kein Anbau von Pflanzen, keine Tierhaltung, kein Sammeln von Zutaten. Zutaten kommen aus den Vorratskisten.
- Kein Zeitdruck, keine ungeduldigen Gäste.
- Keine Veröffentlichung im Marketplace.
- Kühlschrank, Mixer, Wok, Pfanne, Sterne-System und weitere Rezepte gehören nicht zu den Etappen 1–3 (siehe Etappe 4).

## 4. Was den Mod scheitern ließe

- Fenster mit Zutatenfeldern statt Handlung in der Welt.
- Viel Lesetext.
- Frust: enge Zeitfenster, harte Strafen, unklare Fehler.
- Ein Mod, der nur mit experimentellen Spieloptionen läuft und beim nächsten Minecraft-Update bricht.

## 5. Rahmenbedingungen

- **Plattform:** Minecraft Bedrock, als Add-on (Verhaltens- und Ressourcenpaket). Gespielt wird auf einem Tablet, getestet auf diesem Windows-PC, auf dem Bedrock installiert ist. [Festlegung]
- **Auslieferung:** eine `.mcaddon`-Datei, die sich auf dem Tablet per Antippen installieren lässt. Für die Entwicklung zusätzlich direktes Ablegen in den Entwicklungsordnern von Minecraft auf dem PC.
- **Zielversion:** die aktuell auf dem PC installierte Bedrock-Version; der Builder prüft sie zu Beginn. Möglichst nur stabile Funktionen, keine experimentellen Schalter. Wo das nicht geht, sagt der Builder es vorher. [Festlegung]
- **Testen:** Claude kann Minecraft nicht selbst bedienen. Vater und Sohn testen am PC. Jede Etappe endet mit einer kurzen Prüfliste zum Durchspielen. Logik, die sich ohne Spiel prüfen lässt (z. B. Rezepterkennung), wird automatisch getestet.
- **Sprache:** Spieltexte deutsch. Code, Bezeichner und Commits englisch.
- **Grafik:** Claude erstellt Pixelbilder und Blockformen selbst im Minecraft-Stil; schlicht, aber gut erkennbar. [Festlegung]

## 6. Bedienung

Alles geschieht durch Antippen in der Welt. [Festlegung]

- Zutat in der Hand, Station antippen: Die Zutat liegt sichtbar auf der Station.
- Werkzeug in der Hand, Station antippen: Der Arbeitsschritt wird ausgeführt (schneiden, herunternehmen, schöpfen).
- Leere Hand, Station antippen: Inhalt zurücknehmen bzw. auf der Anrichte das Gericht fertigstellen.
- Der Zustand ist immer sichtbar: was auf der Station liegt, ob etwas roh, gar oder angebrannt ist.

## 7. Stationen und Werkzeuge (Etappen 1–3)

| Station | Aufgabe |
|---|---|
| Grill | Frikadelle braten |
| Kochplatte | Topf daraufstellen, Suppen, Nudeln und Reis kochen |
| Ofen | Pizza backen |
| Dönerspieß | Fleisch grillt von selbst, mit dem Messer abschneiden |
| Schneidebrett (auf Arbeitsplatte) | Zutaten mit dem Messer schneiden |
| Anrichte | Gerichte aus Einzelteilen zusammenstellen |
| Vorratskisten | Gemüse, Fleisch und Fisch, Brot und Teig, Milchprodukte, Sonstiges; unendlich |
| Werkzeugkiste | alle Werkzeuge; unendlich |
| Tisch, Stuhl | Sitzplätze für Gäste, Gericht wird auf den Tisch gestellt |
| Restaurantglocke | lockt Gäste an, markiert das Restaurant |

Werkzeuge: Messer, Pfannenwender (Grill), Topf, Schöpfkelle mit Schüssel (Suppen), Pizzaschieber (Ofen). [Festlegung]

Die Anrichte ist die einzige Station zum Zusammenstellen, auch für Pizza und Sushi. Der Vater hatte für Pizza die Arbeitsplatte genannt; eine gemeinsame Station ist für ein Kind leichter zu merken. [Festlegung]

## 8. Garen und Fehler

- Alles, was auf Grill, Kochplatte oder im Ofen liegt, durchläuft **roh → gar → angebrannt**, erkennbar an der Farbe. [Festlegung]
- Richtwerte: gar nach etwa 8 Sekunden, angebrannt erst etwa 30 Sekunden später. Der Builder stellt die Werte beim Testen ein. [Festlegung]
- Zu früh heruntergenommen: Man bekommt die rohe Zutat zurück und kann sie wieder auflegen.
- Der Dönerspieß brennt nicht an. [Festlegung]
- Auf der Anrichte ist die Reihenfolge der Zutaten egal. [Festlegung]
- Fertigstellen mit leerer Hand: Passt die Zusammenstellung genau zu einem Rezept und sind alle Teile richtig zubereitet, entsteht das Gericht. Fehlt etwas, ist etwas zu viel, roh oder angebrannt, entsteht ein „misslungenes Gericht". [Festlegung]
- Einzige Folge eines Fehlers: Die Zutaten sind weg, man probiert es noch einmal.
- Fertige Gerichte kann der Spieler auch selbst essen. [Festlegung]

## 9. Rezepte (Etappen 1–2)

Die Gerichte sind [Wunsch], die genauen Zutaten und Schritte [Festlegung].

| Gericht | Vorbereitung | Zusammenstellen / Fertig |
|---|---|---|
| Hamburger | Frikadelle grillen; Tomate schneiden | Anrichte: Brötchen, Frikadelle, Salat, Tomatenscheiben |
| Cheeseburger | wie Hamburger | zusätzlich Käse |
| Pizza Margherita | – | Anrichte: Teig, Tomatensoße, Käse; dann im Ofen backen, mit Pizzaschieber herausnehmen |
| Salamipizza | – | wie Margherita, zusätzlich Salami |
| Ramen | – | Topf auf Kochplatte: Brühe, Nudeln, Ei, Frühlingszwiebel; kochen, mit Kelle in Schüssel schöpfen |
| Kartoffelsuppe | Kartoffel und Karotte schneiden | Topf: Kartoffelwürfel, Karottenscheiben, Sahne; kochen, schöpfen |
| Döner | Fleisch vom Spieß schneiden; Tomate und Zwiebel schneiden | Anrichte: Dönertasche, Dönerfleisch, Salat, Tomatenscheiben, Zwiebelringe, Soße |
| Sushi | Reis im Topf kochen; Lachs schneiden | Anrichte: Algenblatt, gekochter Reis, Lachsstreifen |

Rezepte sollen als Daten angelegt sein, damit später weitere ohne Umbau dazukommen.

## 10. Restaurant und Gäste

- Gäste sind eigene Figuren im Aussehen von Dorfbewohnern, keine umgebauten echten Dorfbewohner. Sie funktionieren auch ohne Dorf. [Festlegung]
- Die Restaurantglocke bestimmt das Restaurant: Stühle an Tischen im Umkreis (Richtwert 16 Blöcke) sind Sitzplätze. [Festlegung]
- Ist ein Platz frei, kommt nach einer kurzen Pause (Richtwert 20–40 Sekunden) ein neuer Gast, geht zum Stuhl und setzt sich. Findet er den Weg nicht, wird er nach kurzer Zeit an den Platz versetzt. [Festlegung]
- Über dem Kopf erscheint das Bild des Wunschgerichts. Gäste wünschen sich nur Gerichte, für die alle nötigen Stationen im Restaurant stehen. [Festlegung]
- Gäste warten unbegrenzt. [Wunsch]
- Servieren: Gericht in der Hand, Tisch vor dem Gast antippen. Der Teller steht sichtbar auf dem Tisch, der Gast isst.
- Richtiges Gericht: Herzchen, fröhliches Geräusch, 1–3 Smaragde auf dem Tisch. [Wunsch: Smaragde; Menge Festlegung]
- Falsches oder misslungenes Gericht: Kopfschütteln, Grummel-Geräusch und Wölkchen wie beim Dorfbewohner, keine Smaragde. [Wunsch]
- Danach geht der Gast. Ein leerer Teller bleibt, Antippen räumt ihn ab. [Festlegung]
- Mehr Tische bedeuten mehr Gäste gleichzeitig (ab Etappe 3).

## 11. Rezeptbuch

Ein Buch im Inventar. Antippen öffnet eine Liste aller Gerichte mit Bild. Ein Gericht antippen zeigt die Schritte nummeriert als Bildfolge „Zutat ➜ Station" mit kurzem deutschem Text. [Wunsch: Variante A aus dem Entwurf]

## 12. Restaurant-Baukasten

Ein Gegenstand: Auf den Boden tippen, und ein vollständig eingerichtetes Restaurant steht da (Küche mit allen Stationen, Vorratskisten, Werkzeugkiste, mehrere Tische mit Stühlen, Glocke). Funktioniert in jeder Welt. Eine fertige Welt-Datei kann der Vater danach selbst aus Minecraft exportieren. [Festlegung, als Antwort auf den Wunsch nach einer vorgefertigten Welt]

## 13. Überlebensmodus

Im Kreativmodus liegt alles im Inventar. Im Überlebensmodus gibt es einfache Werkbank-Rezepte aus Holz, Stein und Eisen für Stationen, Kisten, Möbel, Glocke, Rezeptbuch und Baukasten. Die Vorratskisten bleiben unendlich. [Festlegung]

## 14. Etappen

Jede Etappe ist für sich spielbar und wird von Vater und Sohn getestet, bevor die nächste beginnt.

1. **Burger komplett:** Grill, Schneidebrett, Anrichte, Vorratskisten, Werkzeugkiste (Messer, Pfannenwender), ein Tisch mit Stuhl, Glocke, ein Gast mit Wunschbild und Reaktion. Hamburger und Cheeseburger.
2. **Alle Gerichte:** Kochplatte mit Topf, Ofen, Dönerspieß, restliche Werkzeuge und Zutaten, alle acht Rezepte, Rezeptbuch.
3. **Restaurant:** mehrere Gäste gleichzeitig, Restaurant-Baukasten, Werkbank-Rezepte für den Überlebensmodus, fertige `.mcaddon` fürs Tablet.
4. **Später (eigenes Konzept):** Kühlschrank, Mixer, Wok, Pfanne, weitere Rezepte, Sterne fürs Restaurant, eventuell Java.

## 15. Klarstellungen aus der Gegenprüfung

- **PC-Version:** die normale Minecraft-Version aus dem Microsoft Store, keine Preview. [vom Vater gesagt]
- **Nur stabile Funktionen:** Ist etwas nur experimentell machbar, wird es durch eine einfachere stabile Lösung ersetzt (z. B. Gast erscheint direkt am Stuhl statt hinzulaufen). Der Builder nennt solche Ersetzungen im Etappenbericht. [Festlegung]
- **Abbauen:** Stationen und Möbel lassen sich normal abbauen und umstellen, auch im Kreativmodus; das gehört zum Bauen. Kochen nutzt nur das kurze Antippen (Interagieren). Abgebaute Stationen lassen ihren Inhalt fallen. Gäste sind unverwundbar. Der Builder prüft die Touch-Bedienung früh auf dem Tablet. [Festlegung]
- **Gäste:** Form, Textur und Geräusche des normalen Dorfbewohners dürfen wiederverwendet werden. [Festlegung]
- **Grafik:** einfache, per Programm erzeugte Pixelbilder (16×16) genügen; kein höherer Anspruch. Angebrannte und rohe Varianten dürfen Einfärbungen derselben Grafik sein. [Festlegung]
- **Mehrspieler:** Der Mod muss funktionieren, wenn Vater und Sohn in derselben Welt spielen. Zustände gehören zur Welt (Station, Gast), nicht zum einzelnen Spieler. Eigene Mehrspieler-Funktionen gibt es nicht. [Festlegung]

## 16. Dem Builder überlassen

- Technische Umsetzung der sichtbaren Zutaten auf Stationen, der Gedankenblase und des Sitzens.
- Aufbau des Projekts, Werkzeuge zum Packen, Art der automatischen Tests.
- Genaue Zeiten, Abstände und Smaragdmengen innerhalb der Richtwerte.
- Aussehen der Blöcke, Figuren und Symbole.
- Werkbank-Rezepte im Einzelnen.
- Grundriss des Baukasten-Restaurants.

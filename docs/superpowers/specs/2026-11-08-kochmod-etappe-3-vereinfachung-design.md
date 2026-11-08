# Kochmod – Etappe 3: Vereinfachung, großzügige Gäste, Pommes, Pizza zum Mitnehmen

Stand: 2026-11-08. Baut auf dem Konzept vom 2026-11-05 und den Etappen 1 und 2 auf.

Markierungen: **[Wunsch]** = so vom Vater gesagt. **[Festlegung]** = von Claude entschieden, darf beim Lesen korrigiert werden.

## 1. Worum es geht

Die Kochmod funktioniert, ist aber für den Sohn an einigen Stellen zu fummelig: fünf verschiedene Werkzeuge, Reis extra kochen, Schüssel-Werkzeug neben Teller, und ein Gast, der nur genau ein Gericht annimmt. Diese Etappe macht das Spiel weicher, ohne das Restaurant-Gefühl zu verlieren. Dazu kommen zwei neue Spielelemente: Pommes aus der Fritteuse und Gäste, die Pizza zum Mitnehmen bestellen. [Wunsch]

Leitsatz bleibt: Das Restaurant-Gefühl ist wichtiger als Kochdetails. Weniger Fehler durch falsche Zutaten oder falsches Werkzeug, mehr erfolgreiche Bestellungen. [Wunsch]

## 2. Ziele

1. Ein einziges Küchenwerkzeug (Multitool) statt Messer, Pfannenwender, Pizzaschieber und Wokwender. [Wunsch]
2. Das Multitool muss nur im Inventar liegen, nicht in der Hand. [Wunsch]
3. Sushi beginnt mit gekochtem Reis aus dem Vorratsschrank, der Topf-Schritt fällt weg. [Wunsch]
4. Zutaten-Zuordnung Kühlschrank / Vorratsschrank geprüft und bereinigt. [Wunsch]
5. Gäste sind großzügig: Jedes Gericht, das zur Küche des Restaurants passt, wird angenommen. Burger in der Sushi-Bar oder Reis auf der Pizza bleiben ein Fehlschlag. [Wunsch]
6. Einfacheres Geschirr: Der Geschirrschrank hält Teller, Suppenschüsseln und Pizzakartons. [Wunsch]
7. Pizza zum Mitnehmen: Ein Gast wartet mit Lauf-Symbol und Pizza in der Blase, bekommt die Pizza im Karton und geht. [Wunsch]
8. Pommes als Gericht, Fritteuse als Station. Pommes passen zur Burger- und zur Dönerküche. [Wunsch]

## 3. Nicht-Ziele

- Keine automatische Zutaten-Entnahme aus dem Inventar an Theke oder Topf. Zutaten und Gerichte nimmt der Spieler weiter in die Hand. Nur das Werkzeug wird automatisch gefunden. [Wunsch: „Stufe A“]
- Mitnehmen gibt es nur für Pizza, nicht für andere Gerichte. [Festlegung]
- Keine neuen Restaurant-Bausätze. Die bestehenden sechs Themen bekommen nur die Fritteuse dazu, wo sie hingehört. [Festlegung]
- Keine Bestrafung bei falschem Gericht: Gast grummelt und zahlt nichts, wie bisher. [Konzept]

## 4. Was diese Etappe scheitern ließe

- Alte Welten, in denen noch Messer, Pfannenwender usw. in Truhen oder Händen liegen, laden nicht mehr oder die Stationen reagieren nicht mehr darauf.
- Ein Gast nimmt zwar ein anderes Gericht an, aber Bild und Reaktion erklären dem Kind nicht, warum es weniger Smaragde gab.
- Der Mitnahme-Gast blockiert die Glocke oder den Weg und das Restaurant steht still.

## 5. Die Teile im Einzelnen

### 5.1 Multitool

Neues Werkzeug-Item `kochmod:multitool` („Küchen-Multitool“). Es ersetzt Messer, Pfannenwender, Pizzaschieber und Wokwender an allen Stationen: Schneidebrett, Grill, Ofen, Wok, Dönerspieß.

- Die Werkzeugkiste gibt aus: Multitool, Rezeptbuch, saubere Teller (als Reserve, falls der Schrank leer ist). Die Schüssel entfällt dort (siehe 5.6). [Festlegung]
- Die vier alten Werkzeuge bleiben als Items im Pack, damit alte Welten laden, aber sie verschwinden aus allen Kisten und aus dem Rezeptbuch. Jede Station akzeptiert zusätzlich das alte passende Werkzeug, damit niemand etwas wegwerfen muss. [Festlegung]
- Das Rezeptbuch zeigt in den Schritten das Multitool statt der Einzelwerkzeuge.
- Textur: eine Kombination aus Messer und Wender, eigenständig erkennbar, im Stil der vorhandenen 16×16-Sprites (Generator in `tools/sprites/items.js`). [Festlegung]

### 5.2 Werkzeug aus dem Inventar

Alle Stationen, die ein Werkzeug brauchen, prüfen zuerst die Hand und dann das gesamte Spieler-Inventar (alle 36 Slots). Liegt dort ein Multitool oder das alte passende Werkzeug, gilt das Werkzeug als vorhanden. [Wunsch]

Daraus folgt eine neue Bedienregel an den Zeitstationen (Grill, Ofen, Wok, Spieß, Schneidebrett):

- Hand hält ein rohes Item, das die Station annimmt: auflegen.
- Hand ist leer (oder hält etwas, das die Station nicht annimmt) und ein Werkzeug ist im Inventar: wenden / abnehmen / schneiden, wie bisher mit dem Werkzeug in der Hand.
- Kein Werkzeug im Inventar: Hinweis „Du brauchst das Küchen-Multitool aus der Werkzeugkiste.“ (ersetzt die vier bisherigen Werkzeug-Hinweise).

Für den Topf gilt das Gleiche mit der Suppenschüssel (siehe 5.6): Sie wird aus dem Inventar genommen und verbraucht. Der Wok behält den Ablauf „leere Hand + Werkzeug im Inventar = ausschöpfen“.

Reine Logik (Werkzeug-Suche in einer Slot-Liste) liegt in `packs/BP/scripts/logic/`, der Zugriff auf das echte Inventar in `packs/BP/scripts/world/`, wie beim restlichen Code.

### 5.3 Sushi mit gekochtem Reis

- `kochmod:cooked_rice` wird zur Zutat aus dem Vorratsschrank („Gekochter Reis“). [Wunsch]
- `kochmod:rice` (roher Reis) und das Topf-Rezept „Reis kochen“ entfallen aus Katalog, Kisten und Rezeptbuch. Das Item bleibt als Leiche im Pack für alte Welten. [Festlegung]
- Sushi-Rezept unverändert: Nori + gekochter Reis + Lachsstreifen an der Theke. Stationen für Sushi: Schneidebrett, Theke. Die Sushi-Bar braucht damit keinen Topf mehr für Sushi; der Topf bleibt dort für Ramen.

### 5.4 Kisten-Zuordnung (Prüfung)

Ergebnis der Prüfung, Änderungen fett. Maßstab: Was ein Kind in einer echten Küche im Kühlschrank bzw. im Schrank erwarten würde. [Festlegung]

| Zutat | bisher | neu |
|---|---|---|
| Brötchen, Pita | Vorratsschrank | Vorratsschrank |
| Tomate, Salat, Frühlingszwiebel | Kühlschrank | Kühlschrank |
| Rohes Patty, Dönerfleisch roh, Lachs, Käse, Salami, Ei, Sahne | Kühlschrank | Kühlschrank |
| **Kartoffel, Zwiebel, Karotte** | Kühlschrank | **Vorratsschrank** (Gemüsekiste) |
| **Teig** | Vorratsschrank | **Kühlschrank** |
| Tomatensauce (Glas) | Vorratsschrank | Vorratsschrank |
| **Dönersauce** | Vorratsschrank | **Kühlschrank** |
| Nudeln, Brühe, Nori, Sojasauce | Vorratsschrank | Vorratsschrank |
| **Gekochter Reis** | (Topf) | **Vorratsschrank** |
| ~~Roher Reis~~ | Vorratsschrank | entfällt |

Beide Kisten behalten damit eine überschaubare Länge (Kühlschrank 14, Vorratsschrank 9 Einträge).

### 5.5 Großzügige Gäste

Jedes Gericht gehört zu einer oder mehreren Küchen: [Festlegung, mit dem Vater besprochen]

| Küche | Gerichte |
|---|---|
| Burger | Hamburger, Cheeseburger, Pommes |
| Italienisch | Pizza Margherita, Salamipizza |
| Japanisch | Sushi, Ramen, Bratnudeln |
| Döner | Döner, Pommes |
| Klassisch | Kartoffelsuppe |

Jede Küche hat ein Kennzeichen-Gerät: Burger = Grill, Italienisch = Pizzaofen, Japanisch = Wok, Döner = Dönerspieß, Klassisch = Suppentopf. Eine Küche wird angeboten, wenn ihr Kennzeichen-Gerät in Reichweite der Glocke steht. Gäste wünschen sich nur Gerichte, die kochbar sind **und** zu einer angebotenen Küche gehören. Folge: Sushi (nur noch Schneidebrett + Anrichte) wird nur gewünscht, wo ein Wok steht; Pommes allein machen keine Burgerküche. Das Mega-Restaurant bietet alles. [Festlegung bei der Planung; ersetzt die Regel „ein exklusives Gericht kochbar“, die nach dem Reis-Umbau Sushi in jedem Laden erlaubt hätte]

Ein Gast wünscht sich weiter ein konkretes Gericht (Blase). Beim Servieren gilt:

| Serviert | Reaktion | Smaragde |
|---|---|---|
| Wunschgericht | glücklich, nickt | 1–3 (wie bisher) |
| Anderes Gericht einer angebotenen Küche | zufrieden, nickt | 1 |
| Gericht einer fremden Küche | grummelt, schüttelt Kopf | 0 |
| Fehlgericht | grummelt, schüttelt Kopf | 0 |

Die Bewertung bekommt dafür die Menge der angebotenen Küchen (abgeleitet aus den Stationen rund um die Glocke) als Eingabe. Die Funktion `rate` in `restaurant.js` ist dafür die Stelle.

### 5.6 Einfacheres Geschirr

Der Geschirrschrank hält drei Dinge und zeigt sie als Picture-Menü oder per Zyklus (Builder-Entscheidung, siehe 7):

- **Teller** (`clean_plate`): wie bisher, für alle Gerichte außer Suppen.
- **Suppenschüssel** (`soup_bowl`, neu): ersetzt das Schüssel-Werkzeug. Ramen und Kartoffelsuppe werden mit der Suppenschüssel aus dem Topf geschöpft; die Schüssel wird dabei verbraucht und ist Teil des Gerichts. Am Tisch zählt ein Suppengericht als „mit Geschirr“, es braucht keinen Teller. Nach dem Essen bleibt eine schmutzige Schüssel, die wie der schmutzige Teller in den Geschirrspüler kommt und als saubere Schüssel wieder herauskommt. [Wunsch: Suppenschüssel im Küchenschrank]
- **Pizzakarton** (`pizza_box`, neu): nur fürs Mitnehmen (5.7). Pizza + Karton in der Hand auf den Karton klicken bzw. Pizza mit Karton im Inventar an den Mitnahme-Gast geben (Builder-Entscheidung, siehe 7). Pizzakartons werden nicht gespült; sie sind unendlich im Schrank. [Festlegung]

Der Geschirrschrank startet mit Tellern, Schüsseln und Kartons gefüllt. Das Werkzeug-Item `bowl` verschwindet aus Kisten und Rezeptbuch, bleibt als Item im Pack. [Festlegung]

Zustände: Der Schrank zählt Teller und Schüsseln getrennt (je endlich, Höchststand wie heute die Teller), Kartons sind unendlich. Alte gespeicherte Schränke ohne Schüssel-Zähler laden mit vollem Schüsselbestand. Der Geschirrspüler nimmt schmutzige Teller und Schüsseln gemischt an, zählt beide getrennt und gibt nach dem Spülen genau die eingelegten Stücke sauber zurück. Der Schrank zeigt weiter die Tellerzahl als Blockzustand. [Festlegung nach Prüfer-Rückfrage]

Tisch: Der Tischzustand merkt sich, ob nach dem Essen ein schmutziger Teller oder eine schmutzige Schüssel liegen bleibt (neuer Wert neben `empty`). Alte Tische mit `empty` geben einen Teller. Ein Suppengericht wird ohne Teller serviert; die Teller-Prüfung am Tisch entfällt dafür. [Festlegung nach Prüfer-Rückfrage]

### 5.7 Pizza zum Mitnehmen

Vorbedingung: Das Restaurant hat einen Ofen (also die italienische Küche im Angebot).

Ablauf: [Wunsch, Details Festlegung]

1. Beim Klingeln entsteht mit einer Wahrscheinlichkeit von etwa einem Drittel statt eines Tisch-Gastes ein Mitnahme-Gast, aber nur wenn italienische Küche angeboten wird und noch kein Mitnahme-Gast an dieser Glocke wartet. Gibt es keinen freien Tisch, kann trotzdem ein Mitnahme-Gast kommen.
2. Der Gast erscheint wie alle Gäste neben der Glocke und bleibt dort stehen (eine freie Bodenzelle neben dem Glocken-Block, nicht die Zelle vor der Tür) und bleibt dort stehen. Über ihm: Lauf-Symbol (kleines laufendes Männchen) und in der Blase eine der beiden Pizzen.
3. Der Spieler klickt den Gast mit der fertigen Pizza in der Hand und einem Pizzakarton im Inventar an; beides wird genommen. Der Gast nickt, zahlt wie ein Tischgast (5.5 gilt: Margherita statt Salami gibt 1 Smaragd) und verschwindet nach kurzer Zeit mit derselben Wolke wie Tischgäste. [Festlegung: kein Hinauslaufen, das wäre eine eigene Wegfindung]
4. Pizza ohne Karton: Hinweis „Pizza bitte in den Karton packen!“, nichts passiert.
5. Anderes Gericht (auch Pommes oder Burger): Gast schüttelt den Kopf, zahlt nichts, bleibt stehen und wartet weiter. Der Mitnahme-Gast nimmt nur Pizza; die Großzügigkeit aus 5.5 gilt bei ihm nur zwischen den beiden Pizzen. [Festlegung nach Prüfer-Rückfrage]
6. Der Gast wartet geduldig wie Tischgäste. Wird die Glocke abgebaut, verschwindet er wie die anderen.
7. Der Mitnahme-Gast belegt keinen Tisch und zählt nicht gegen die Tisch-Gäste; pro Glocke wartet höchstens einer. Tischgäste kommen weiter wie bisher, die Glocke wird nie blockiert. [Festlegung nach Prüfer-Rückfrage]

Technisch: ein weiterer Gast-Zustand neben „walking / seated / …“, ein neuer Wert für die Pose (stehend wartend) und eine Lauf-Symbol-Geometrie am Gast-Modell, geschaltet über eine Entity-Property wie die Blase.

### 5.8 Pommes und Fritteuse

- Neue Zutat aus der Kartoffel: **Kartoffelstifte** (`potato_sticks`) am Schneidebrett. Die Kartoffel wird damit zweideutig (Würfel für Suppe, Stifte für Pommes). Lösung: Das Schneidebrett fragt nicht, sondern die Kartoffel wird zu Stiften geschnitten, und die Kartoffelsuppe nimmt künftig **Kartoffelstifte** statt Würfel. Die Würfel entfallen. Ein Schnitt-Ergebnis pro Zutat bleibt so erhalten. [Festlegung]
- Neue Station **Fritteuse** (`fryer`): Zeitstation wie Grill und Ofen. Nimmt Kartoffelstifte an, macht nach der Garzeit **Pommes** (`fries`), bei zu langem Warten **verbrannte Pommes** (`burnt_fries`) für den Mülleimer. Abnehmen mit Multitool im Inventar. Blockmodell: Edelstahlkasten mit zwei Körben, Blubber-Partikel und Brutzel-Ton wie der Grill. Fassungsvermögen wie der Grill. [Festlegung]
- **Pommes** sind ein eigenes Gericht, werden auf dem Teller serviert, erscheinen als Gästewunsch und im Rezeptbuch. Küche: Burger und Döner.
- Die Fritteuse kommt in den Burger-Bausatz, den Döner-Bausatz, das klassische Restaurant (damit „alle Geräte“ wahr bleibt; an der linken Wand neben dem Mülleimer, wo die Küchenreihe voll ist) und ins Mega-Restaurant (Küchenreihe), dazu in die Kochmod-Kiste. Pizzeria und Sushi-Bar bleiben unverändert. Das Kochbuch (`docs/kochbuch.md`) bekommt den Pommes-Eintrag. [Wunsch]

## 6. Alte Welten

- Alte Werkzeuge, roher Reis, Kartoffelwürfel und die Werkzeug-Schüssel bleiben als Items definiert, verschwinden aber aus Menüs und Rezeptbuch. Stationen, die sie früher angenommen haben, nehmen sie weiterhin an: Die Kartoffelsuppe gelingt auch mit Würfeln statt Stiften, der Topf kocht rohen Reis weiter zu gekochtem Reis, das Schneidebrett schneidet Kartoffeln nur noch zu Stiften. Ein gespeicherter Topf mit Reis oder Würfeln lädt unverändert. [Festlegung nach Prüfer-Rückfrage]
- Bestehende Bausätze in alten Welten werden nicht umgebaut; nur neu gesetzte Bausätze enthalten die Fritteuse.
- Gespeicherte Gast- und Tischzustände müssen weiter laden (die Validierungen in `stations.js` und `guest-flow.js` erweitern, nicht umbauen).

## 7. Dem Builder überlassen

- Wie der Geschirrschrank drei Dinge ausgibt: Picture-Menü wie bei den Kisten, oder leere Hand = Teller, Schleichen + Klick = Schüssel usw. Picture-Menü ist der sicherere Weg für ein Kind.
- Ob der Pizzakarton am Karton-Item (Pizza in Hand, Karton im Inventar wird verbraucht) oder umgekehrt verpackt wird. Ein Weg ohne Zwischen-Item „Pizza im Karton“ ist erlaubt, wenn der Mitnahme-Gast einfach Pizza in der Hand plus Karton im Inventar akzeptiert und beides nimmt.
- Property-Namen am Gast (Lauf-Symbol eigenes Property oder Teil der Pose), Garzeit der Fritteuse (Richtwert wie Grill).
- Texturen und Modelle für Multitool, Suppenschüssel, Pizzakarton, Kartoffelstifte, Pommes, verbrannte Pommes, Fritteuse und das Lauf-Symbol über die vorhandenen Sprite-Generatoren.
- Testaufbau: Die bestehenden Testdateien unter `tests/` sind der Maßstab; jede neue Logik bekommt Tests nach demselben Muster, die Pack-Tests (Items, Texturen, Lang-Keys, Rezeptbuch) müssen weiter grün sein.
- Reihenfolge der Umsetzung. Empfehlung: zuerst Multitool + Inventar-Werkzeug (größte Vereinfachung, kleinstes Risiko), dann Reis + Kisten, dann Geschirr, dann großzügige Gäste, dann Pommes, zuletzt Mitnahme-Gast.

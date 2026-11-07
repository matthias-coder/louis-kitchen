# Testbogen Louis Kitchen 2.0.0, Etappe 2

Für Papa und Sohn. Hake ab, was klappt. Erst am PC, dann am Tablet.

## Teil 0: Installieren oder aktualisieren

- [ ] Am PC: Im Projekt `npm run deploy` ausführen (Minecraft muss einmal gestartet worden sein). Oder: Doppelklick auf `dist/LouisKitchen_2.0.0.mcaddon`.
- [ ] Öffne deine alte Welt aus Etappe 1 (Bearbeiten, Pakete). Schalte das Verhaltenspaket „Louis Kitchen 2.0.0" an. Das Ressourcenpaket kommt mit.
- [ ] Schalte das Inhaltsprotokoll ein: „Einstellungen → Ersteller → Inhaltsprotokoll-GUI aktivieren".
- [ ] Nach dem Laden der Welt kommt keine Fehlermeldung im Inhaltsprotokoll.

## Teil 1: Die alte Welt funktioniert weiter

- [ ] Koche einen Hamburger: Frikadelle auf den Grill, Tomate schneiden, alles auf die Anrichte, mit leerer Hand antippen.
- [ ] Der alte Grill zeigt die Frikadelle.
- [ ] Die Anrichte zeigt einen wachsenden Stapel, bis zu 6 Lagen.
- [ ] Der Tisch zeigt einen Teller mit Essen. Bei einem Misslungenen Gericht liegt dort eine graue Masse.
- [ ] Alte Anrichte, alter Tisch und altes Schneidebrett zeigen ihren Inhalt erst nach dem nächsten Antippen. Das ist richtig so.
- [ ] Im Inhaltsprotokoll stehen keine Fehler zum Inhalt.

## Teil 2: Kisten und Schränke

- [ ] Der Kühlschrank enthält: Tomate, Salat, Rohe Frikadelle, Käse, Salami, Ei, Lachs, Sahne, Zwiebel, Karotte, Kartoffel, Frühlingszwiebel, Dönerfleisch (roh).
- [ ] Der Vorratsschrank enthält: Brötchen, Pizzateig, Tomatensoße, Nudeln, Reis, Brühe, Algenblatt, Dönertasche, Dönersoße, Sojasoße.
- [ ] Die Werkzeugkiste enthält: Messer, Pfannenwender, Schüssel, Pizzaschieber, Wokwender, Rezeptbuch und Sauberer Teller.
- [ ] Alle haben einen deutschen Namen und ein Bild.

## Teil 3: Jedes Gerät einmal

### Schneidebrett

- [ ] Zwiebel aufs Brett, mit dem Messer antippen: Zwiebelringe.
- [ ] Karotte: Karottenscheiben.
- [ ] Kartoffel: Kartoffelwürfel.
- [ ] Lachs: Lachsstreifen.

### Pizzaofen

- [ ] Rohe Pizza in den Ofen legen. Sie liegt sichtbar da.
- [ ] Nach ca. 8 Sekunden ist die Pizza gar.
- [ ] Nach weiteren ca. 30 Sekunden ist sie verbrannt. Mit dem Pizzaschieber gibt es eine Verbrannte Pizza.
- [ ] Mit leerer Hand erscheint der Hinweis „Nimm den Pizzaschieber!".
- [ ] Zweite Pizza in den vollen Ofen: Hinweis „Der Ofen ist belegt.".

### Suppentopf

- [ ] Zutaten in den Topf legen (zum Beispiel Brühe, Nudeln, Ei, Frühlingszwiebel). Der Topf blubbert und Dampf steigt auf.
- [ ] Mit leerer Hand: Hinweis „Nimm eine Schüssel!".
- [ ] Antippen, solange es kocht: Hinweis „Das kocht noch.".
- [ ] Mit der Schüssel antippen, wenn es fertig ist: Man bekommt Ramen.
- [ ] Lege zu viele Zutaten hinein: Hinweis „Der Topf ist voll.".
- [ ] Tippe den leeren Topf an: Hinweis „Der Topf ist leer.".
- [ ] Lass die Suppe zu lange kochen. Sie ist angebrannt, und die Schüssel holt ein Misslungenes Gericht.

### Dönerspieß

- [ ] Hänge rohes Dönerfleisch an den Spieß. Es dreht sich.
- [ ] Nach 8 Sekunden mit dem Messer antippen: 6 Scheiben Dönerfleisch.
- [ ] Zweites Fleisch an den vollen Spieß: Hinweis „Da hängt schon Fleisch.".
- [ ] Mit dem Messer, bevor es fertig ist: Hinweis „Das Fleisch ist noch nicht fertig.".
- [ ] Leeren Spieß antippen: Hinweis „Häng Dönerfleisch an den Spieß.".
- [ ] Lass das Fleisch lange hängen. Es brennt nie an.

### Wok

- [ ] Zutaten in den Wok legen (Nudeln, Ei, Karottenscheiben, Frühlingszwiebel, Sojasoße). Er brutzelt.
- [ ] Mit dem Wokwender antippen, wenn es fertig ist: Bratnudeln.
- [ ] Mit leerer Hand: Hinweis „Nimm den Wokwender!".
- [ ] Zu viele Zutaten: Hinweis „Der Wok ist voll.".

## Teil 4: Jedes Gericht einmal nach dem Rezeptbuch

- [ ] Hamburger: Brötchen, Frikadelle (Grill), Salat, Tomatenscheiben (Schneidebrett), alles auf die Anrichte.
- [ ] Cheeseburger: wie der Hamburger, dazu Käse.
- [ ] Döner: Dönertasche, Dönerfleisch (Spieß, Messer), Salat, Tomatenscheiben, Zwiebelringe, Dönersoße, alles auf die Anrichte.
- [ ] Sushi: Reis im Topf kochen (Gekochter Reis, mit der Schüssel holen), dazu Algenblatt und Lachsstreifen, alles auf die Anrichte.
- [ ] Pizza Margherita: Pizzateig, Tomatensoße, Käse auf die Anrichte (rohe Pizza), dann in den Ofen.
- [ ] Salamipizza: wie die Margherita, dazu Salami.
- [ ] Ramen: Brühe, Nudeln, Ei, Frühlingszwiebel in den Topf, mit der Schüssel holen.
- [ ] Kartoffelsuppe: Kartoffelwürfel, Karottenscheiben, Sahne in den Topf, mit der Schüssel holen.
- [ ] Bratnudeln: Nudeln, Ei, Karottenscheiben, Frühlingszwiebel, Sojasoße in den Wok, mit dem Wokwender holen.

## Teil 5: Rezeptbuch

- [ ] Das Rezeptbuch hat einen deutschen Namen und ein Bild.
- [ ] Tippe mit dem Rezeptbuch in der Hand. Eine Liste mit 9 Bildknöpfen öffnet sich, einer pro Gericht.
- [ ] Tippe ein Gericht an. Es erscheinen nummerierte Schritte, zum Beispiel „1. Zwiebel ➜ Schneidebrett (Messer)".
- [ ] Jeder Schritt hat die Form „Zutat ➜ Station (Werkzeug)" und ein Bild.
- [ ] Der Knopf „Zurück" bringt dich zur Liste.

## Teil 6: Gäste

- [ ] Läute die Glocke mehrmals. Die Gäste wünschen sich alle neun Gerichte, aber nur solche, die die Küche kochen kann.
- [ ] Die Wunschblase über dem Gast zeigt das richtige Bild.
- [ ] Die Glocke setzt an jeden freien Stuhl einen Gast.
- [ ] Sind alle Stühle besetzt, erscheint der Hinweis „Alle Plätze sind besetzt.".
- [ ] Serviere jedes Gericht einmal mit einem sauberen Teller. Der Gast isst und lässt Smaragde da.
- [ ] Baue den Pizzaofen ab. Jetzt wünscht sich kein Gast mehr eine Pizza.

## Teil 7: Restaurant-Baukasten

- [ ] Tippe mit dem Restaurant-Baukasten auf den Boden. Das Restaurant entsteht.
- [ ] In der Küche stehen alle Geräte: Dönerspieß, Suppentopf, Grill, Schneidebrett, Anrichte, Pizzaofen, Spülmaschine, Geschirrschrank und Wok.
- [ ] Die ganze Küche ist begehbar. Man kommt an jedes Gerät, jede Kiste und jeden Stuhl.
- [ ] Tippe die Glocke an. Ein Gast kommt und setzt sich.

## Teil 8: Tablet

- [ ] Die `.mcaddon` aufs Tablet bringen und antippen. Minecraft installiert beide Pakete.
- [ ] In der Welt das Verhaltenspaket „Louis Kitchen 2.0.0" aktivieren.
- [ ] Alle Geräte lassen sich mit dem Finger antippen.
- [ ] Rezeptbuch, Kisten und Glocke funktionieren per Fingertipp.
- [ ] Ein Gericht von Anfang bis Ende kochen und einem Gast servieren.

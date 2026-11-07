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
- [ ] Die Kochmod-Kiste enthält auch die Restaurant-Kiste und die sechs Baukästen.
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

- [ ] Zutaten in den Topf legen (zum Beispiel Brühe, Nudeln, Ei, Frühlingszwiebel). Der Topf blubbert. Nach etwa 4 Sekunden steigt Dampf auf.
- [ ] Mit leerer Hand: Hinweis „Nimm eine Schüssel!".
- [ ] Antippen, solange es kocht: Hinweis „Das kocht noch.".
- [ ] Mit der Schüssel antippen, wenn es fertig ist: Man bekommt Ramen.
- [ ] Lege zu viele Zutaten hinein: Hinweis „Der Topf ist voll.".
- [ ] Tippe den leeren Topf an: Hinweis „Der Topf ist leer.".
- [ ] Lass die Suppe zu lange kochen. Sie ist angebrannt, und die Schüssel holt ein Misslungenes Gericht.

### Dönerspieß

- [ ] Hänge rohes Dönerfleisch an den Spieß. Das Fleisch ist am Spieß zu sehen.
- [ ] Nach 8 Sekunden mit dem Messer antippen: Jedes Antippen gibt eine Scheibe Dönerfleisch, insgesamt 6 Scheiben.
- [ ] Zweites Fleisch an den vollen Spieß: Hinweis „Da hängt schon Fleisch.".
- [ ] Mit dem Messer, bevor es fertig ist: Hinweis „Das Fleisch ist noch nicht fertig.".
- [ ] Leeren Spieß antippen: Hinweis „Häng Dönerfleisch an den Spieß.".
- [ ] Lass das Fleisch lange hängen. Es brennt nie an.

### Wok

- [ ] Zutaten in den Wok legen (Nudeln, Ei, Karottenscheiben, Frühlingszwiebel, Sojasoße). Er brutzelt.
- [ ] Mit dem Wokwender antippen, wenn es fertig ist: Bratnudeln. Der Wokwender bleibt in der Hand.
- [ ] Mit leerer Hand: Hinweis „Nimm den Wokwender!".
- [ ] Zu viele Zutaten: Hinweis „Der Wok ist voll.".

### Mülleimer

- [ ] Stell den Mülleimer hin (aus der Kochmod-Kiste). Er ist grau, aus Metall, mit Deckel.
- [ ] Tippe ihn mit einer Verbrannten Pizza in der Hand an: Genau eine Pizza verschwindet, es klackt, ein kleines Rauchwölkchen steigt auf und der Deckel hüpft kurz hoch und fällt wieder zu.
- [ ] Ein Misslungenes Gericht, eine Angebrannte Frikadelle und ein Schmutziger Teller verschwinden genauso, immer nur eins pro Antippen.
- [ ] Mit leerer Hand: Hinweis „Nimm etwas in die Hand, das weg soll.".
- [ ] Mit Messer, Pfannenwender, Schüssel, Pizzaschieber, Wokwender, Rezeptbuch oder einem Baukasten: Hinweis „Werkzeuge gehören nicht in den Müll.", nichts verschwindet.
- [ ] Mülleimer abbauen: Es fällt nur der Mülleimer selbst heraus, nichts von dem Weggeworfenen.

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
- [ ] Tippe ein Gericht an. Es erscheinen nummerierte Schritte mit Bild. Zuerst steht jede Zutat mit ihrem Schrank da, dann das Gerät, zum Beispiel beim Cheeseburger „1. Brötchen ➜ Vorratsschrank", „2. Rohe Frikadelle ➜ Kühlschrank", „3. Rohe Frikadelle ➜ Grill (Pfannenwender)" … „8. Cheeseburger ➜ Anrichte".
- [ ] Hamburger und Cheeseburger sehen verschieden aus (nur beim Cheeseburger steht Käse). Bei Pizza und Sushi stehen Pizzateig, Tomatensoße, Käse, Reis und Algenblatt dabei.
- [ ] Tippe einen Schritt an: Dieselbe Seite bleibt offen.
- [ ] Der Knopf „Zurück" bringt dich zur Liste.

## Teil 6: Gäste

- [ ] Läute die Glocke mehrmals. Die Gäste wünschen sich alle neun Gerichte, aber nur solche, die die Küche kochen kann.
- [ ] Die Wunschblase über dem Gast zeigt das richtige Bild.
- [ ] Die Glocke setzt an jeden freien Stuhl einen Gast.
- [ ] Sind alle Stühle besetzt, erscheint der Hinweis „Alle Plätze sind besetzt.".
- [ ] Serviere jedes Gericht einmal mit einem sauberen Teller. Der Gast isst und lässt Smaragde da.
- [ ] Baue den Pizzaofen ab. Jetzt wünscht sich kein Gast mehr eine Pizza.

## Teil 7: Restaurant-Kiste und Baukästen

- [ ] Stell die Restaurant-Kiste hin (aus der Kochmod-Kiste). Sie sieht aus wie eine Holzkiste mit Haus und Bauplan.
- [ ] Tippe sie an: Sechs Knöpfe mit Bild: Burger-Laden, Pizzeria, Sushi-Bar, Döner-Imbiss, Restaurant, Mega-Restaurant.
- [ ] Jeder Knopf gibt genau einen Baukasten, zum Beispiel „Baukasten: Pizzeria". Jeder Baukasten hat ein eigenes Bild.

Baue jedes Restaurant einmal auf einer freien, ebenen Fläche (im Überlebensmodus verschwindet der Baukasten danach):

- [ ] Burger-Laden: rot-weiße Wände, Schachbrett-Boden, 4 Tische. Küche: Grill, Schneidebrett, Anrichte. Gäste wünschen sich nur Hamburger und Cheeseburger.
- [ ] Pizzeria: Ziegelwände, grün-weiß-rote Markise über der Tür, 4 Tische. Küche: Pizzaofen, Suppentopf, Schneidebrett, Anrichte. Gäste wünschen sich Pizza, Ramen, Kartoffelsuppe und Sushi.
- [ ] Sushi-Bar: dunkles Holz, weiße Wände, Laternen, 4 Tische als Theke in einer Reihe. Küche: Suppentopf, Wok, Schneidebrett, Anrichte. Gäste wünschen sich Sushi, Ramen, Kartoffelsuppe und Bratnudeln.
- [ ] Döner-Imbiss: klein, hell, gekachelt, 3 Tische. Küche: Dönerspieß, Schneidebrett, Anrichte. Gäste wünschen sich nur Döner.
- [ ] Restaurant: wie in Etappe 1, alle Geräte: Dönerspieß, Suppentopf, Grill, Schneidebrett, Anrichte, Pizzaofen, Spülmaschine, Geschirrschrank, Wok und Mülleimer.
- [ ] Mega-Restaurant: zwei Stockwerke mit Treppe, unten die Küche, oben und unten je 4 Tische und eine Glocke.
- [ ] Jedes Restaurant hat Kühlschrank, Vorratsschrank, Werkzeugkiste, Kochmod-Kiste, Restaurant-Kiste, Spülmaschine und Geschirrschrank.
- [ ] In jeder Küche steht genau ein Mülleimer, und er funktioniert gleich nach dem Bauen.
- [ ] Im Restaurant und im Döner-Imbiss steht der Mülleimer an der linken Wand der Küche, nicht in der Küchenreihe; an die Kochmod-Kiste in der Ecke kommt man direkt heran.
- [ ] Alles ist begehbar. Man kommt an jedes Gerät, jede Kiste und jeden Stuhl. Im Mega-Restaurant kommt man über die Treppe nach oben.
- [ ] Tippe die Glocke an. Auf jeden freien Stuhl setzt sich ein Gast, einer nach dem anderen. Im Mega-Restaurant kommen auch oben Gäste (obere Glocke läuten).
- [ ] Ein alter „Restaurant-Baukasten" aus Etappe 1 baut weiterhin das Restaurant.

## Teil 8: Tablet

- [ ] Die `.mcaddon` aufs Tablet bringen und antippen. Minecraft installiert beide Pakete.
- [ ] In der Welt das Verhaltenspaket „Louis Kitchen 2.0.0" aktivieren.
- [ ] Alle Geräte lassen sich mit dem Finger antippen.
- [ ] Rezeptbuch, Kisten und Glocke funktionieren per Fingertipp.
- [ ] Ein Gericht von Anfang bis Ende kochen und einem Gast servieren.

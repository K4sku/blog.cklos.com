# CLAUDE.md

Notatki dla przyszłych sesji Claude'a pracujących nad tym projektem.

## Czym jest projekt

Webowa gra w czystym JS ucząca dwóch chłopców (3 i 4 lata) numerów telefonów do rodziców.

- Strona statyczna, **bez build-stepu, bez zależności, bez frameworka**.
- Tekst UI i komentarze w kodzie po polsku.
- UI dopasowane do tabletu ~9". Skaluje się w dół przez `clamp()` i responsywne stałe w JS.
- Działa z dowolnego statycznego hostingu (np. GitHub Pages w podkatalogu Jekylla). **Uwaga:** `gra.html` ma front matter Jekylla (wersjonowanie assetów dla Cloudflare cache-bustingu), więc bezpośrednie otwarcie przez `file://` pokazuje surowe Liquid tagi na górze i ładuje skrypty z `?v={{ asset_v }}` w URL. Do testów lokalnych użyj `bundle exec jekyll serve` z roota bloga albo otwórz `_site/numerki/gra.html` po buildzie.

## Struktura plików

```
index.html        – szkielet, ładuje skrypty w kolejności
styles.css        – wszystkie style w jednym pliku
CLAUDE.md         – ten plik
js/
  storage.js      – Storage: numery + ustawienia w localStorage
  sounds.js       – Sounds: piknięcia/melodie (Web Audio API, bez plików)
  speech.js       – Speech: polski głos (Web Speech API), wymowa cyfr i słów
  celebrate.js    – Celebrate: animacja nagrody (emoji, "Brawo!", duża maskotka)
  phone-game.js   – PhoneGame: minigra "telefon" + tryb "listen" (Posłuchaj i wpisz)
  drag-game.js    – DragGame: minigra "układanka"
  quiz-game.js    – QuizGame: "Wybierz właściwy numer" (3 rundy)
  whack-game.js   – WhackGame: bąbelki / whack-a-mole
  app.js         – router, ekran startowy, wybór gry, ekran "po wygranej" (IIFE, startuje sam)
```

Kolejność skryptów w `index.html` ma znaczenie — `app.js` musi być ostatni, `speech.js` / `sounds.js` / `celebrate.js` muszą być przed grami.

## Architektura

- Brak frameworka, wszystko przez bezpośrednie DOM API.
- Moduły jako IIFE pod globalnymi nazwami: `Storage`, `Sounds`, `Speech`, `Celebrate`, `PhoneGame`, `DragGame`, `QuizGame`, `WhackGame`.
- Router (`app.js`) czyści `#app` i mount-uje widok. Każda `renderXxx` rysuje swój widok od zera (`renderHome`, `renderGamePicker`, `renderPhoneGame`, `renderDragGame`, `renderQuizGame`, `renderListenGame`, `renderWhackGame`, `renderAfterWin`).
- Każda gra eksponuje to samo API:
  ```js
  GameName.start(rootEl, targetDigitsString, { onBack, onWin, fullHints, label, icon, ... })
  ```
- `onWin` z gry prowadzi do `renderAfterWin(item, gameType)` — ekran z 3 przyciskami: jeszcze raz / inna gra / koniec. `GAME_RENDERERS` mapuje `gameType` na funkcję.
- Wszystkie ścieżki w HTML są względne — działa z dowolnego subpath.

## Logika minigier

### Telefon (`phone-game.js`)

- Opcje: `fullHints`, `listen`, `label`.
- Stan: `entered[]`, `failCount`.
- Zielona słuchawka aktywna dopiero przy `entered.length === target.length`.
- Po błędzie: shake + `cross-overlay`, `entered = []`, `failCount++`, fail-dźwięk, Speech mówi "Spróbuj jeszcze raz".
- Cienie cyfr: `ghostsVisible() = fullHints ? digits.length : max(0, failCount - 1)`.
- Każda cyfra przy wciśnięciu jest wymawiana (`Speech.sayDigit`).
- **Tryb `listen`**: po `setTimeout(450)` auto-wymowa całego numeru. Topbar ma przycisk 🔊 do powtórki (klasa `.speaker`, obsłużony w głównym `wrap.addEventListener('click')`).

### Układanka (`drag-game.js`)

- Opcje: `fullHints`.
- Kafelki = cyfry numeru + do 4 nadmiarowych (spoza zbioru).
- Drag-and-drop przez pointer events. `touch-action: none` na `.piece`.
- Kafelki `position: absolute` w `.pool` (`overflow: visible`).
- Sloty: `flex: 1 1 0; max-width: 84px; aspect-ratio: 4/5`.
- **Hover slotu** ma 3 stany w JS: `.hover` + `.hover-match` (zielony glow) lub `.hover-nomatch` (czerwony tint). Wymaga `transition: ... transform, box-shadow` na `.slot`.
- **Po sukcesie kafelek "leci" do slotu** — animacja `translate + scale` (cubic-bezier z bounce), potem opacity 0; w slocie pop-in tekstu `.slot-value`. Implementacja w `placeInSlot`: wyciąga `translate(x,y)` z bieżącego transformu (regex na `style.transform`) i dodaje delta do środka slotu obliczonego z `getBoundingClientRect`. `Speech.sayDigit` w momencie placement.
- `fullHints`: po utworzeniu slotów od razu wstawia `.ghost-hint` z cyfrą.
- `handleFail`: znika 1 nadmiarowa cyfra + cień w pierwszym pustym slocie bez podpowiedzi (jak wcześniej).

### Quiz (`quiz-game.js`)

- 3 rundy. Każda runda: prompt "Który to numer Mamy?" (Speech czyta) + 2 przyciski z numerami (jeden prawdziwy, drugi z 1-2 zmienionymi cyframi).
- `makeFake(target)`: kopia ze zmienionymi `numChanges` losowymi cyframi (każda zmieniona na inną niż oryginał).
- Polski numer 9-cyfrowy formatowany jako `123 456 789`. Krótsze: 7-cyfrowy `123 4567`, inne — grupowanie po 3.
- `capitalizeVoc(label)`: prosta mapa imion na dopełniacz ("Mama" → "Mamy"). Fallback: bez zmiany.
- Sukces po 3 prawidłowych w rzędzie → `Celebrate.show`. Błąd: shake + krzyżyk, ale runda się nie kończy — dziecko próbuje dalej.

### Bąbelki (`whack-game.js`)

Styl wizualny: wanna widziana z lotu ptaka + zaparowane lustro nad nią jako pasek postępu.

- Stan: `expectedIndex`, `inTransition` (lockuje tapy podczas animacji między rundami).
- **Lustro** (`.mirror` → `.mirror-inner` → N × `.mirror-cell`): każda komórka ma tylko `.mirror-digit` (cyfra na srebrzystym tle szyby ze smugą światła z `::after`). Efekt "nieodgadnięte" robi `filter: blur(22px)` na samej cyfrze – wygląda jak rozmazany ciemny cień, nieczytelny. Stany:
  - **default** (niewybrana): `blur(22px)`, opacity 0.55 – bardzo rozmazany cień.
  - **`.hint`** (tryb pełnych podpowiedzi): `blur(4px)`, opacity 0.8 – czytelny cień cyfry.
  - **`.revealing`**: `blur(0)`, opacity 1, `scale(1.15)` – chwilowy "punch" przy trafieniu.
  - **`.revealed`**: `blur(0)`, opacity 1, scale 1 – ostra cyfra końcowa.
  - Przejścia obsługuje `transition: filter, opacity, transform` (0.7 s ease), więc te same klasy działają w obu trybach bez glitcha (z hint→revealed jest gładko).
- Klasa `.next` pulsuje na komórce do odgadnięcia (`nextPulse` box-shadow). Pulsuje też w trybie `.hint`.
- **Wanna** (`.bathtub`): rounded-rect z białym brzegiem (porcelana), gradient niebieski wewnątrz (woda), inset shadow dla głębi.
- **Piana** (`.foam` → `FOAM_COUNT` × `.foam-bubble`): małe białe kulki w losowych pozycjach `%`, animacja `foamFloat`. `pointer-events: none` żeby nie blokowała tapów.
- **Duże bąbelki** (`.big-bubble`): zawsze 4 sztuki. 1 poprawna + 3 RÓŻNE błędne cyfry (bez duplikatów). Rozkład 2×2 grid z jitterem (`pickPositions`) — zawsze bez nakładania.
- Rozmiar bąbelka skalowany od `tub.clientWidth`: 150 / 120 / 96 px.
- **Tap poprawny**: `revealCell(idx)` ściera mgłę w odpowiedniej komórce lustra, `expectedIndex++`, **wszystkie 4 bąbelki dostają `.popping`** ze stagger 70 ms, po 800 ms `spawnBubbles()` wsadza nowy zestaw 4 z `bubbleEnter` animacją.
- **Tap zły**: tylko wybrany bąbelek `shake`, fail dźwięk, krzyżyk; stan się nie zmienia.
- Wygrana po odgadnięciu wszystkich cyfr → `Celebrate.show` z opóźnieniem 1.1 s żeby animacja popu zdążyła się skończyć.
- `inTransition = true` na czas popu+spawn, blokuje wielokrotne tapnięcia.
- **`fullHints`**: niewytypowane komórki dostają `.hint` zamiast pełnego rozmycia – cyfra widoczna jako delikatny cień (blur 4 px). Po trafieniu `revealCell` zdejmuje `.hint` i `.next`, dodaje `.revealing` (chwilowy scale 1.15 + blur 0), po 700 ms `.revealed`. Dzięki transitionom przejście hint→revealed jest płynne, bez chwilowego pojawienia się mgły.

## Mowa (`speech.js`)

- Polski głos wybierany przez `pl-PL` z `getVoices()`. `onvoiceschanged` re-pickuje, bo niektóre przeglądarki ładują głosy asynchronicznie.
- `say(text, { rate, pitch, cancel, onEnd })` — pojedyncza wypowiedź.
- `sayDigit(d)` — cyfra jako słowo (mapowanie 0-9 → "zero"…"dziewięć"). Kasuje poprzednie (cancel: true), żeby przy szybkim klikaniu nie kumulowało się.
- `sayNumber(numStr, opts)` — łączy cyfry przecinkami w jedną wypowiedź → naturalne pauzy. Wolniejsze (`rate: 0.85`).
- `cancel()` — wycisz wszystko (wołane w `renderHome` i `renderGamePicker`, żeby przy nawigacji speech się nie nakładał).

## Dźwięki (`sounds.js`)

- AudioContext lazy. `Sounds.unlock()` przy pierwszej interakcji odblokowuje iOS.
- Klawisze: melodyjna paleta (`KEY_FREQS`), nie prawdziwy DTMF.

## Storage (`storage.js`)

- localStorage. Klucze: `ppn_numbers_v1` (lista), `ppn_settings_v1` (ustawienia).
- Schema numeru: `{ id, label, number, icon }`. `number` jako same cyfry.
- API: `Storage.list/add/remove/get/move/getSetting/setSetting`.
- `move(id, delta)` swapuje element z sąsiadem (`delta = -1` w górę, `+1` w dół). Brak operacji jeśli poza zakresem.
- Ustawienie `fullHints` (bool) jest czytane przez `app.js` i przekazywane do gier jako opcja.

## Ekran startowy: zarządzanie listą

Zaprojektowany tak, żeby dzieci nie mogły przypadkiem usunąć ani dodać numerów.

- **Karta numeru** pokazuje ikonę, imię (`label`) i sformatowany numer (`formatNumber`: 9 cyfr → "123 456 789", 7 cyfr → "123 4567", inne → grupowanie po 3).
- **Krótki tap na karcie** = uruchomienie ekranu wyboru gry (zwykły flow).
- **Przytrzymanie 5 s na karcie** (`LONG_PRESS_MS`) = wejście w tryb zarządzania (`selectedId = item.id`). Wizualnie: pomarańczowy pasek wypełniający kartę (`.press-fill`) podczas trzymania. Po 5 s wibracja (jeśli dostępna) + `Sounds.pop()`.
- **W trybie zarządzania**: karta dostaje pomarańczową obwódkę i `selectedPulse`, pozostałe karty są przygaszone (`.dimmed`, opacity 0.35). Pod kartą widoczne 4 akcje:
  - **↑/↓** → `Storage.move(id, -1/+1)`, re-render
  - **✕** usuwa (bez confirma, bo long-press był bramką)
  - **✓** wychodzi z trybu (`selectedId = null`)
  - Tap na tło wybranej karty lub na przygaszoną kartę też wychodzi z trybu.
- **Brak inline-formularza dodawania** – formularz jest w modalu.

## Floating Action Button (FAB) i modal dodawania

- **FAB `+`** w prawym dolnym rogu (`position: fixed; bottom: 28px; right: 28px`).
- **Krótki tap na FAB** = pokaz podpowiedzi `"Przytrzymaj 5 sekund"` (`.fab-hint`, znika po 1.8 s).
- **Przytrzymanie 5 s na FAB** = otwarcie modala dodawania numeru. Postęp pokazywany jako żółty SVG ring obwodu (`stroke-dashoffset` od 289 do 0, animacja 5 s linear).
- **Modal**: backdrop półprzezroczysty (z animacją fade-in), karta modala (scale + opacity in). Pole imienia + numeru + chipy presetów. Zamykanie: `Escape`, klik w backdrop, `Anuluj`, lub poprawny `Zapisz`.

### setupLongPress helper

`setupLongPress(el, { durationMs, onTap, onLongPress })` w `app.js`:
- Po `pointerdown` rusza timer na `durationMs` i dodaje klasę `.pressing`.
- `pointermove` poza progiem 18 px → kasuje (palec się ślizga = nie przytrzymanie).
- `pointerup` przed timerem → krótki tap (`onTap`).
- `pointerup` po timerze → long-press (`onLongPress`).
- `pointerleave` / `pointercancel` → kasuje.

Używany dla kart numerów (tap=gra, long-press=tryb zarządzania) i FAB (tap=hint, long-press=modal).

## Maskotka

- **Mała w rogu** (`mascot-corner`): `position: fixed` lewy-dół, animacja `mascotBounce`, dodawana do `#app` w `renderHome` (rodzic robi append do `root` po `wrap`).
- **Duża po wygranej** (`mascot-big`): używana w `renderAfterWin` — wskakuje od dołu, dłonie do góry (`mascotJump`).
- **Wielka w celebracji** (`celebrate-mascot`): podczas `Celebrate.show()` wskakuje od dołu, kręci się, wraca na dół (`mascotCelebrate`). Losowa z `MASCOTS = ['🐶','🐱','🐼','🦊','🐯','🦁','🐵']`.

## Tryb "pełne podpowiedzi"

- Toggle w ekranie wyboru gry (`.hint-toggle` z `<input type="checkbox">`). Zapisywany w settings pod kluczem `fullHints`.
- Włączony: Telefon pokazuje wszystkie cienie od początku, Układanka ma cień w każdym slocie od startu.
- Bąbelki / Quiz nie używają tego ustawienia (mają własną dynamikę).

## Konwencje

- Tekst UI po polsku, komentarze w kodzie po polsku.
- Emoji intencjonalne: presety (`👩 👨 👵 👴`), klawisze (`📞 ⌫ 🔊`), gry (`🧩 🤔 👂 🫧`), maskotki, nagroda.
- **Bez build-stepu** — nie wprowadzaj `npm`, `webpack`, `sass`, `ts-config` bez wyraźnej zgody. Surowe pliki to cecha projektu.
- Brak testów automatycznych. Testowanie ręczne w przeglądarce.

## Jak uruchomić

- **Najlepiej**: `bundle exec jekyll serve` z roota bloga, potem `http://localhost:4000/numerki/gra.html`. Tylko ten tryb prawidłowo zrenderuje wersjonowanie `?v={{ asset_v }}`.
- Alternatywa bez Jekylla: `python3 -m http.server` w katalogu `numerki/` — strona zadziała, ale na górze pojawią się surowe Liquid tagi i `?v={{ asset_v }}` w URLach (assety i tak się załadują, bo serwery ignorują query stringi przy plikach statycznych).
- `file://` już nie działa czysto z powodu front matter w `gra.html`.
- Sprawdzenie składni JS: `for f in js/*.js; do node --check "$f"; done`.

## Deploy

- **W blogu Jekylla na GitHub Pages**: wrzucić folder jako `numerki/` do repo bloga. `gra.html` ma front matter (`layout: null`, `permalink: /numerki/gra.html`) — Jekyll przetwarza Liquid i serwuje pod tym samym URL. Reszta plików (JS/CSS) bez front matter jest kopiowana "as is".
- **Cache-busting**: w `<head>` jest `{%- assign asset_v = site.github.build_revision | default: site.time | date: '%s' -%}`, a wszystkie `<script>`/`<link>` mają `?v={{ asset_v }}`. Każdy push generuje nowy build_revision → Cloudflare/przeglądarka zaciągają świeże assety bez ręcznego purge. Plus meta `Cache-Control: no-cache, no-store, must-revalidate` na samym HTML.
- **Osobne repo z GitHub Pages**: Settings → Pages → branch `main` / root.

## Pułapki / już-naprawione rzeczy

- **Sloty zawijały się** dla 9-cyfrowych numerów → `flex: 1 1 0` + tekst w slocie zamiast kafelka.
- **`pool` `overflow: hidden`** → zmienione na `visible`, inaczej dragged piece był cięty.
- **Letter-spacing między `<span>`-ami** w `.digits-row` nie działa — dodany `gap`.
- **Audio na iOS** — `Sounds.unlock()` w user gesture.
- **Drag i scroll na iOS** — `touch-action: none` na `.piece` i `.bubble`.
- **Speech na iOS** — pierwsza wypowiedź musi być w handlerze gestu; obsłużone (Speech wywołujemy z click handlerów).
- **Voiceschanged** — bez `speechSynthesis.onvoiceschanged` Firefox/Safari mogą nie znaleźć głosu PL przy pierwszym wywołaniu.

## TODO / pomysły na rozwój

Zaimplementowane jako kolejny krok:

- [ ] **PWA** — `manifest.json`, ikona, prosty service worker. Wtedy "Dodaj do ekranu głównego" daje fullscreen.
- [ ] **Wake Lock API** — ekran tabletu nie gaśnie w trakcie gry.
- [ ] **Vibration API** — krótki buzz przy błędzie.
- [ ] **PIN rodzicielski** na ekran dodawania/usuwania (np. long-press 3s + 4 cyfry).
- [ ] **Profile dziecka** — przełącznik między dziećmi, osobne listy + statystyki.
- [ ] **Statystyki** — ile prób / pomyłek per numer per gra, kiedy ostatnia sesja.
- [ ] **Eksport/import** listy numerów (JSON lub kod QR).
- [ ] **Memory / Pexeso** jako kolejna gra (pary cyfr z numeru).
- [ ] **Tracing cyfr** — szlaczek do obrysowania palcem.
- [ ] **Kolekcja naklejek** za sukcesy — gamifikacja.
- [ ] Większa różnorodność dźwięków sukcesu (random z 3-4 melodii).

## Co warto sprawdzić przed wprowadzaniem zmian

- Zmiana rozmiarów slotów / liczby cyfr: sprawdź na wąskim ekranie (~320px) **i** tablecie (~768-1024px).
- Zmiana w `phone-game.js`: wpis poniżej długości (przycisk nieaktywny), zły numer (shake/krzyżyk/czyszczenie), cienie po kolejnych błędach, sukces, tryb `listen` (głośnik, auto-mowa).
- Zmiana w `drag-game.js`: pointer capture na touchscreen, kolejność `handleFail`, kasowanie hover na end-drag, animacja lotu kafelka (delta z `getBoundingClientRect`).
- Zmiana w `app.js`: każdy `render*` zaczynaj od `clear()`; po nawigacji wołaj `Speech.cancel()` żeby stara wypowiedź się nie kończyła na nowym ekranie.
- Zmiana w `whack-game.js`: pamiętaj `clearInterval(refreshTimer)` przy wygranej **i** powrocie. Inaczej zombie timer.
- Zmiana w `quiz-game.js`: nie blokuj wszystkich przycisków po dobrej odpowiedzi — wystarczy lock samego wybranego (data-locked), inaczej szybkie podwójne kliknięcie psuje stan.

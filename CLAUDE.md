# CLAUDE.md — APEX/THRUST MEDIA Buildbook

> Diese Datei ist meine eigene Bauanleitung. Vor jeder größeren Änderung **erst diese Datei lesen**, danach den eigenen Code hinterfragen.

---

## 0. Selbstcheck vor jeder Änderung

1. **Was will der Nutzer wirklich?** Nicht das wörtliche Brief abarbeiten, sondern das ästhetische Ziel: *aggressiv, schwarz/rot, Neon, kompromisslos, Top-Animationsqualität.*
2. **MOBILE IST PFLICHT** — jede neue Section, jedes neue Element, jede Animation MUSS auch auf 375 px Breite funktionieren. Nie nur Desktop bauen und Mobile später nachreichen. Mobile-Checks in der Browser-DevTools-Resize sind kein Bonus, sondern Mindestanforderung.
3. **Bricht meine Änderung den Designvertrag?** (Siehe §2.) Wenn ja → zurück zum Briefing.
4. **Performance-Budget eingehalten?** (Siehe §6.)
5. **Habe ich bestehendes hinterfragt?** Ich darf bestehenden Code immer optimieren — aber nie verstecken statt fixen. Wenn eine Animation stottert → root cause finden, nicht weichspülen.

---

## 1. Projekt-Identität

- **Studio**: Apex Thrust Media (Inhaber: `Tolunay Usul`, Dresden). Logo-Lockup: `APEX/THRUST MEDIA`.
- **Positionierung**: aggressives Web-Design-Studio, F1-/Karbon-/Cyberpunk-Sprache.
- **Name-Bedeutung**:
  - „Apex" = Scheitelpunkt einer Rennlinie / höchster Punkt / typografisch Spitze eines Buchstabens — Präzision.
  - „Thrust" = Vorwärtsschub, Antrieb — Power.
  - „Media" = das Medium, in dem wir liefern — klare Disziplin.
- **Slogan-Vokabular**: „Apex", „Thrust", „Redline", „Velocity", „Pit Lane", „Pole Position", „Carbon", „Throttle", „Signal".
- **Referenz**: collabcapitolium.fr — daraus übernommen: Hero mit Bewegtbild-Hintergrund, große brutalistische Display-Typografie, Stat-Block, kuratierte Cases, monospaced Labels.

---

## 2. Design-Vertrag (nicht aufweichen)

| Aspekt | Regel |
|---|---|
| Hintergrund | Pures Schwarz `#060305`, niemals Dunkelgrau Richtung Blau. |
| Akzent | Neon-Rot `#ff1f3d` (`--red`) für jedes interaktive/lebendige Element. |
| Typo Headlines | **Anton** (Display) + **Big Shoulders Display Italic** (Akzent-Italic). Niemals Inter/Roboto/Arial. |
| Typo Code/Labels | **JetBrains Mono**, immer `letter-spacing` ≥ 0.12em, immer UPPERCASE. |
| Typo Body | **Manrope**, max-width ~560px. |
| Layout | Asymmetrie, Eck-Marker (4-Corner-Brackets), Mono-Telemetrie in Ecken, große Negativräume. |
| Effekte-Layer | Noise-Overlay + Scanlines + Vignette sind fix — niemals entfernen. |
| Cursor | Custom-Cursor mit Dot+Ring, `mix-blend-mode: difference`. |
| Sprache | Deutsch primär, englische Tech-Begriffe sind okay („Pit Lane", „Throttle"). |

---

## 3. Dateistruktur

```
.
├── index.html             # Hauptseite – Services = 4 Karten, verlinken auf angebot.html
├── angebot.html           # „Was wir anbieten" – interaktiver Solar-Explorer (solar.js)
├── about.html             # Über Uns – Ping-Pong-Video-Hintergrund (.bg-loop, Boomerang), kein Scrub/Solar
├── team.html              # Team – Video als FULL-PAGE Scroll-Scrub-Hintergrund (#teamBg)
├── partner.html           # Partner – Ping-Pong-Video-Hintergrund (.bg-loop), kein Solar
├── kontakt.html           # Kontakt + Google Maps – Ping-Pong-Video-Hintergrund (.bg-loop)
├── impressum.html         # Impressum, Datenschutz, AGB (DDG + DSGVO konform)
├── CLAUDE.md              # ← diese Datei
└── assets/
    ├── css/style.css      # Komplettes Stylesheet (Single-File-Strategie)
    ├── js/main.js         # IIFE; enthält proxyScrub() — wiederverwendbare Scrub-Engine
    ├── js/model.js        # ESM: GLB-Viewer + Rennstrecken-Env (about, derzeit aus)
    ├── js/solar.js        # ESM: interaktiver Solar-Angebots-Explorer (NUR angebot.html)
    ├── models/model.glb   # Meshy-F1-Modell, gltf-transform-komprimiert (1.16 MB)
    ├── video/
    │   ├── hero.mp4              # Hero-Loop (autoplay)
    │   ├── scroll.mp4            # Desktop Scroll-Scrub Background Homepage (16:9)
    │   ├── scroll-mobile.mp4     # Mobile Background-Loop Homepage (9:16)
    │   ├── team-reel.mp4         # Team Full-Page Desktop-Scrub (16:9, keyint=1)
    │   ├── team-reel-mobile.mp4  # Team Full-Page Mobile-Loop (16:9)
    │   ├── about-boomerang.mp4   # Über-Uns Ping-Pong-Hintergrund (vorwärts+rückwärts, native loop)
    │   ├── partner-boomerang.mp4 # Partner Ping-Pong-Hintergrund (Quelle wie about: 3.1)
    │   └── kontakt-boomerang.mp4 # Kontakt Ping-Pong-Hintergrund (Quelle: 10.1)
    └── images/            # Logo + frei für echte Case-Visuals
```

**Nav-Rubriken**: Über Uns · **Angebot** (angebot.html) · Team · Partner · Kontakt · / · Impressum. Neue Seite ⇒ Nav-Item auf ALLEN Seiten (Desktop `.nav__links` + Mobile `.mobile-nav__links` + Footer `/ NAV`) ergänzen.

**Prinzip**: alles in wenigen großen Dateien lassen, nicht in 30 Module zerlegen. Single Page, kein Build-Step.

---

## 4. Sections (Reihenfolge nicht ändern, ohne Grund)

1. **Hero** — Hero-Video als Background, riesiges Anton-Display, Ecken-Telemetrie, Marquee am Ende.
2. **Manifesto** (`#manifesto`) — Statement + Stat-Counter.
3. **Services** (`#services`) — 2×2 Grid mit 4 Disziplinen (Web Design / Development / Motion & 3D / Brand Identity). Jede Karte ist ein `<a href="angebot.html">` (Hover-Glow folgt der Maus, `.service__more` „Was wir anbieten →"). Der eigentliche **Solar-Angebots-Explorer** lebt auf der eigenen Seite **angebot.html** (siehe §5.7). *(Zwischenstand v3: kurzzeitig war der Solar-Explorer direkt in `#services` — auf User-Wunsch zurück zu verlinkten Karten + eigener Rubrik.)*
4. **Engineering** (`#engineering`) — sticky Kinetik-Typografie-Phasen (`.phases` → `.phase` CRAFT / VELOCITY / EDGE), Char-Rise-Animation, sticky ~320vh (Desktop) bis 220vh (Mobile). *(Bis v2 ein Three.js-Icosahedron mit Displacement-Shader — in v3 entfernt, siehe §5.2.)*
5. **Process** (`#process`) — vertikale Neon-Linie + pulsierende Steps.
6. **Work** (`#work`) — 12-col Grid, Case-Visuals aus CSS-Gradienten oder echten Bildern.
7. **Big Marquee** (Vollrot).
8. **Contact** (`#contact`) — Formular mit Chips/Radio/Validation, `mailto:`-Fallback.
9. **Footer** — Giant-Text + Live-Clock + Spalten.

Nav-Nummerierung passt sich an: `00 · Manifest · 01 · Services · …`. Wer eine Section hinzufügt, **muss** die Nav-Indizes mit-aktualisieren.

---

## 5. Animations-System

### 5.1 Scroll-Scrub-Video — wiederverwendbare `proxyScrub()`-Engine (`main.js`)
- **Eine Engine, zwei Einsätze**: die Hybrid-Proxy-Scrub-Pipeline (§5A/§13) ist als `function proxyScrub({ wrap, video, canvas, src, computeProg })` faktorisiert (Function-Declaration → gehoisted). Genutzt von **(a)** dem Homepage-Hintergrund (`#bgScroll`, `computeProg` = `#manifesto`→`.contact`, blendet an den Rändern aus) und **(b)** dem **Team-Full-Page-Hintergrund** (`#teamBg` auf team.html, `computeProg` = GANZE-Seite-Fortschritt `scrollY / (scrollHeight − innerHeight)`, immer sichtbar via `.bg-scroll--page { opacity:1 }` + `.bg-scroll-tint` für Textlesbarkeit). Mobile (≤900px) ruft `proxyScrub` NICHT auf — schlichter Autoplay-Loop (§5.6).
- **Endpunkt-Snap**: beim Deaktivieren (prog 0/1) snappt `currentTime` auf den ersten/letzten Frame; nach der Proxy-Extraktion wird auf 0 zurückgesetzt. Wichtig für **immer sichtbare** Hintergründe wie den Team-BG (der Homepage-BG ist im Ruhezustand ausgeblendet, daher dort unsichtbar).
- **Nicht-Scrub-Hintergründe** (`.bg-loop` auf about/partner/kontakt): einfache, fixe Endlos-Videos OHNE Scroll-Kopplung. `<video autoplay loop muted playsinline>` + `.bg-scroll-tint` für Lesbarkeit; main.js stupst `play()` an. **Ping-Pong (vor→zurück→vor…)**: KEIN negativer `playbackRate` (browserweit nicht unterstützt) und KEIN manuelles Rückwärts-Seeken (ruckelt) — stattdessen eine **vorgerenderte Boomerang-Datei** (ffmpeg `split` → `reverse` → `concat=n=2`) nativ loopen. Smooth, iOS-sicher, kein JS. Befehl: `ffmpeg -i src -filter_complex "[0:v]scale=1920:-2,fps=24,split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1[v]" -map "[v]" -an -c:v libx264 -crf 23 -movflags +faststart out.mp4`.
- **Funktioniert so**: Video ist fixed, `position: fixed; inset: 0; z-index: -3;`. `video.currentTime` wird in einer `requestAnimationFrame`-Loop **gelerpt** Richtung Scroll-Target.
- **Warum lerpen**: Browser drosseln direktes `currentTime`-Setzen. Lerp glättet die Bewegung und vermeidet Stutter.
- **Aktiv-Bereich**: ab `#manifesto`, endet bei 60% von `.contact` (siehe `computeTarget()`).
- **Section-Backgrounds**: alle Sections ab Manifesto haben `rgba(6,3,5,0.78-0.95)` statt solid bg, damit Video durchblendet. **Nicht** opaque machen.
- **Performance**: Video MUSS `preload="auto"` haben, sonst springt's beim ersten Sichtbarwerden.
- **Bekanntes Limit**: für butterweichen Scrub sollte das Video mit **alle-Frames-Keyframes** encoded sein (`ffmpeg -i src.mp4 -c:v libx264 -x264opts keyint=1 -g 1 -an out.mp4`). Wenn der Nutzer mehr Smoothness will → das ist die Lösung.

### 5.2 Engineering-Szene — Kinetik-Typografie (Three.js in v3 entfernt)
- **Aktueller Stand**: `.engineering` ist eine sticky Section (`.phases` enthält drei `.phase`-Artikel: CRAFT / VELOCITY / EDGE). Beim Durchscrollen wird je `.phase` `.is-active` getoggelt; die Headline-Chars steigen per `charRise`-Keyframe (`.phase__title .char`, gestaffelt über `--i`). **Kein WebGL auf der Homepage** — die Engineering-Bühne ist reine CSS-Typo + Video-Color-Treatments.
- **Sticky-Höhe**: `min-height: 320vh` (Desktop) → `280vh` (≤ Tablet) → `220vh` (Mobile). Pin-Effekt rein über `position: sticky` des inneren Containers, kein GSAP-Pin nötig.
- **Warum entfernt** (v2 → v3): der frühere Three.js-Icosahedron (`IcosahedronGeometry` + Displacement-Shader, Wireframe-Overlay, 1400-Punkt-Partikelring) wurde gestrichen — die Three.js-CDN-Tag ist aus `index.html` raus, der JS-Block ist auskommentiert ([main.js](assets/js/main.js), „THREE.JS block removed in v3"). Damit hat die Homepage **null aktive WebGL-Contexts** (der Scroll-Proxy ist ein **2D**-Canvas). Wichtig für §5B/§5.7: nur die Subpages (`solar.js`) halten je einen WebGL-Context.
- **Re-Enable-Regel**: Wer den Icosahedron zurückholt, baut einen neuen WebGL-Context auf der Homepage auf → dann §6/§5.7-Budget prüfen (DPR clampen, IntersectionObserver-Gate, Off-Screen-Pause) und sicherstellen, dass keine zweite Szene gleichzeitig läuft.

### 5.3 GSAP / ScrollTrigger
- Wird nur aktiviert, wenn `window.gsap && window.ScrollTrigger && !reduce`.
- Hero hat 2 Scrub-Animationen (`yPercent` + `opacity`).
- Sections haben einmalige Reveal-Animationen, kein Pin-Scroll außer Engineering.

### 5.4 Reveal-Pattern
- CSS: `[data-service], [data-case], [data-step] { opacity: 0; transform: translateY(40px); }`.
- JS: `IntersectionObserver` togglet `.is-in`.
- Neue scrolling Komponenten → entweder `data-*` Attribut + Observer-Set ergänzen, oder GSAP-`from(..., { scrollTrigger })`.

### 5.5 Custom Cursor
- Zwei Lerp-Layer (Dot schnell, Ring langsam).
- Hoverables-Selector erweitern, wenn neue interaktive Klassen dazukommen.
- Wird auf Touch-Geräten deaktiviert (`@media (hover: none)`).

### 5.6 Mobile-Strategie
- **Breakpoint**: `max-width: 900px` für Tablets/Phones, `420px` für ganz kleine Phones (Feintuning).
- **Background-Video auf Mobile**: KEIN Scroll-Scrub. Stattdessen reiner `autoplay loop muted playsinline` mit `scroll-mobile.mp4` (9:16). Reason: 90 ImageBitmaps in GPU-Memory + Frame-Extraktion ist auf Phones unzuverlässig und ruckelt mehr als ein sauberer Loop.
- **Hamburger-Nav**: ab 900 px wird die Inline-Nav versteckt und durch `#navBurger` + `.mobile-nav`-Overlay ersetzt. Animation: Linkliste fliegt von links rein mit per-Link `--i` Stagger.
- **Engineering-Phasen**: Section bleibt sticky, aber `min-height` von 320vh auf 240vh reduziert auf Mobile. Schrift mit `clamp()` getuned.
- **Work-Grid**: ab 900 px werden alle Cases zu 1 Spalte (`grid-column: span 1`).
- **Process-Track**: vertikale Linie und Step-Index sind schmaler skaliert.
- **Form**: padding und font-size schrumpfen, chips bleiben aber lesbar.
- **Lenis auf Touch**: `smoothTouch: false` — native Touch-Scrolling bleibt erhalten, Lenis greift nur ins Wheel ein.

**Pflicht-Check** für jede neue Komponente: in DevTools auf 375 px resizen, sicherstellen dass nichts overflowt und alle Schriften lesbar bleiben.

### 5.7 3D-Module (ESM, three@0.160.0 via importmap)
- **model.js (about.html)**: GLB-Viewer mit Rennstrecken-Environment. `Reflector` = nasser Asphalt (Mobile: halbe Textur), transparenter Shader-Plane mit Kerbs/Markierungen darüber, 22 additive Light-Streaks. **Speed-Kopplung**: `speedFactor = 0.6 + scrollProg*1.4 + dragBoost` — Drag am Modell beschleunigt Strecke, Streaks und Karosserie-Vibration. Render nur wenn Section sichtbar.
- **solar.js (NUR `angebot.html` — die Rubrik „Was wir anbieten")**: Das Solarsystem ist **section-enthalten** (nicht mehr full-page fixed BG auf Subpages — von about/team/partner/kontakt entfernt; auf der Homepage NICHT aktiv). Canvas `.solar-section-canvas` = `position: absolute; inset: 0` IN der `#services`-Section auf angebot.html (Section `min-height: 100vh`, opak). Sonne = Studio-Standard, **4 Planeten = die 4 Disziplinen** (Web Design / Development / Motion & 3D / Brand Identity), jeweils mit Angebotstext im HUD. Die Homepage-Service-Karten verlinken hierher. **Planeten sind Shader** (ShaderMaterial pro Planet: 5-Oktaven-Simplex-fBm, Tag/Nacht-Terminator, Fresnel-Atmosphäre; `uType` 0 rocky / 1 gas-bands / 2 swirl). Sonne = Shader-Sphere + Korona-Shell + Glow-Sprite.
- **Section-Containment (Pflicht-Details)**: Sizing auf `canvas.clientWidth/Height` (nicht `window`). **Render-Gating** per `IntersectionObserver` — WebGL pausiert, wenn Section off-screen (`if (!sectionVisible) return;` in der rAF-Loop). **Picking section-relativ**: Klick auf `window`, `closest(INTERACTIVE_SEL)` schließt UI aus, Klick muss INNERHALB `canvasRect` liegen, NDC aus `canvasRect`-Offset. `canvasRect` per Frame (sichtbar) + on scroll/resize aufgefrischt (Section scrollt mit).
- **JARVIS-HUD (viewport-fixed)**: Panel + Leitlinie bleiben `position: fixed` (oben rechts / full-viewport SVG). Leader-Line projiziert in **Client-Koordinaten** (`canvasRect.left + ndc…`), Panel-Anker via gecachtem `panelRect` (open/resize/transitionend — KEIN `getBoundingClientRect` pro Frame). Beim Off-Screen-Scrollen schließt der IntersectionObserver das Panel (kein lingernder fixer HUD).
- **Shader-uTime wird modulo 1000s gewrappt** (float32-Präzision bei Langzeit-Sessions).
- **WebGL-Contexts pro Seite**: Homepage = NULL (Scroll-Proxy ist 2D-Canvas), angebot.html = EINER (Solar-Explorer), about.html = NULL (Modell auskommentiert, Solar entfernt → schlichte Content-Seite). Beim Re-Enable des F1-Modells auf about: nur EINE WebGL-Szene pro Seite halten.
- **Importmap-Regel**: pro Seite genau EINE aktive importmap (auskommentierte zählen nicht), VOR dem ersten `type="module"`-Script. three.module.js per `modulepreload` mit SRI gelockt.

---

## 5A. REZEPT — Scroll-gesteuertes Hintergrund-Video (wiederverwendbar)

> Dieses Muster IMMER nehmen, wenn ein Video beim Scrollen vor-/zurücklaufen soll. Es löst die zwei Dauerprobleme: Ruckeln **und** Qualitätsverlust. Vorlage: `main.js` Desktop-Branch „hybrid proxy scrub".

**Das Grundproblem (warum naive Ansätze scheitern):**
1. `video.currentTime = x` bei jedem Scroll-Tick → der Decoder staut Seeks → **Ruckeln**. Browser drosseln Seeks zusätzlich.
2. Alle Frames vorab als ImageBitmaps cachen (alte Lösung) → 200+ Frames × Full-HD = **> 1 GB GPU-Speicher → WebGL/Canvas-Context-Loss** auf schwächeren Geräten → „Video geht gar nicht".
3. Frames runterskalieren, damit's in den Speicher passt → **Qualitätsverlust** im Standbild.

**Die Lösung — Hybrid aus drei Schichten:**
1. **Natives `<video>` ist die immer sichtbare Ebene.** Im Ruhezustand (Scroll steht) zeigt es den vollen Codec-Frame → **null Qualitätsverlust**. Genau das ist der Punkt, der bei reinen Canvas-Lösungen fehlt.
2. **Seek-Manager**: immer nur EIN `currentTime`-Seek „in flight". Nächster Seek erst nach `seeked`-Event (mit ~300 ms Stall-Timeout als Sicherheitsnetz, „latest target wins"). Das killt den Decoder-Stau = killt das Ruckeln.
3. **Bewegungs-Proxy (nur während Bewegung)**: einmalig ~96 Frames bei niedriger Auflösung (~960px, ~170 MB statt > 1 GB) extrahieren — bevorzugt per `requestVideoFrameCallback`-Playthrough bei 4× Speed, Fallback ist Seek-Stepping. Während gescrollt wird, blendet ein `<canvas>` diese Proxy-Frames **frame-geblendet** (Frame N + N+1 mit Alpha) über das Video. Wenn die Bewegung aufhört (`|currentTime − target| ≤ 0.05s` UND Scroll steht), fadet das Canvas in ~220 ms aus → das scharfe native Bild kommt durch.

**Pflicht-Details, sonst bricht's:**
- Extraktion läuft genau EINMAL; Aktivierung des Overlays währenddessen unterdrücken (sonst sieht man den 4×-Playthrough).
- Seek-Warteschleifen mit `settled`-Flag + Listener-Removal absichern (kein doppelt-auflösendes Promise, kein Listener-Leak).
- `prefers-reduced-motion`: Proxy-Frames stark reduzieren, Auto-Animation aus.
- Mobile: **gar kein Scrub** — schlichter `autoplay loop muted playsinline` mit einem 9:16-Clip (siehe §5.6). Frame-Extraktion ist auf Phones unzuverlässig.
- Lokaler Test NUR mit Range-fähigem Server (`npx http-server`), nie `python -m http.server`.

## 5B. REZEPT — Interaktive 3D-Hintergrund-Szene / Solarsystem (wiederverwendbar)

> Vorlage: `solar.js`. Muster für jede „anklickbare 3D-Welt als Seiten-Hintergrund mit Info-Panel".

**Aufbau (zwei Varianten):**
- **(A) Full-page-Background**: **Canvas** `position: fixed; z-index: -2; pointer-events: none` + eine `.solar-tint`-Gradient-Ebene (`z-index: -1`) darüber. Body/Sections transparent.
- **(B) Section-enthalten** (aktuell live in `#services`, siehe §5.7): Canvas `position: absolute; inset: 0` in einer opaken Section (`min-height: 100vh`), Sizing auf `canvas.clientWidth/Height` statt `window`, **`IntersectionObserver`-Render-Gate** (WebGL pausiert off-screen), Picking-NDC aus `canvasRect`-Offset + Klick muss in `canvasRect` liegen. HUD/Leitlinie bleiben viewport-fixed (Client-Koordinaten via `canvasRect.left + ndc…`); Panel beim Off-Screen-Scroll schließen.
- **Inhalt ist Daten, nicht Code**: ein `CONFIG`-Array (Titel/Text/Link/Farbe/Bahn pro Objekt). Neue Kapitel = Array-Eintrag, sonst nichts. So bleibt's wartbar.
- **Picking-Trick** (wichtig): Da das Canvas `pointer-events: none` hat, Klicks auf `window` abfangen → `if (e.target instanceof Element && e.target.closest(INTERACTIVE_SEL)) return;` (UI ausschließen: a/button/input/.chip/.field/.map-wrap/iframe/[data-magnetic]/nav/…), Rest wird geraycastet. So sind Objekte „durch" leere Seitenbereiche klickbar, ohne je Formular/Nav-Klicks zu stehlen.
- **Detaillierte Objekte = ShaderMaterial pro Planet** (Simplex-fBm-Oberfläche, Tag/Nacht-Terminator von der Lichtquelle, Fresnel-Atmosphäre, `uType` für Varianten). Reine `MeshStandardMaterial`-Kugeln wirken billig.
- **HUD-Panel (JARVIS-Stil)** oben rechts: Eck-Brackets, Scanlines, Meta-Grid, plus optional eine SVG-Leitlinie, die das gewählte Objekt anvisiert (World→Screen-Projektion pro Frame).

**Pflicht-Performance-Regeln (sonst Ruckler / Memory):**
- `getBoundingClientRect` NIE pro Frame — Panel-Rect cachen (open / resize / transitionend).
- Shader-`uTime` modulo ~1000s wrappen (float32-Präzision bei Langzeit-Sessions).
- DPR clampen (`min(devicePixelRatio, isMobile ? 1.5 : 2)`), Sternen-/Objektzahl auf Mobile reduzieren.
- Pro Seite nur EINE WebGL-Szene aktiv (Solar ODER Modell, nicht beide — Context-Limit).
- `prefers-reduced-motion`: Orbits/Twinkle einfrieren (`speedMul = 0`), Interaktion bleibt.

**Tonalität:** Akzent (Marke) sparsam als Lichtquelle/Kern; Objekte/Sterne eher kühl/natürlich, sonst wirkt's „unheimlich" und überladen (gelernt: ein komplett roter Raum war zu viel).

---

## 6. Performance-Budget

| Asset | Limit | Status |
|---|---|---|
| Hero-Video | ≤ 12 MB, ≤ 15s | aktuell ~11 MB ✓ |
| Scroll-Video | ≤ 18 MB, ≤ 30s | aktuell ~13 MB ✓ |
| JS (ohne CDNs) | ≤ 25 KB | aktuell ~12 KB ✓ |
| CSS | ≤ 50 KB | aktuell ~40 KB ✓ |
| Three.js | aus CDN, blockt nicht Hero | ✓ |
| First Contentful Paint | < 1.6s | nur prüfen, wenn man Real-Server hat |

**Wenn ein neues Video > 20 MB ist** → erst re-encoden (H.264, CRF 23, max-keyint=1 für Scrub-Videos).

---

## 7. Code-Hygiene — Was ich mir selbst nicht erlaube

- ❌ **`setInterval` ohne Off-Screen-Pause** — alle wiederkehrenden Timer brauchen einen `IntersectionObserver`-Gate (siehe Hero-Telemetrie).
- ❌ **Solide Section-Backgrounds** im Scroll-Video-Bereich.
- ❌ **`scroll`-Listener mit teurer Arbeit** ohne `requestAnimationFrame`-Throttle.
- ❌ **CSS-Variablen umbenennen** — `--red`, `--bg`, `--ink` sind System-Tokens.
- ❌ **„Cleanup"-Kommentare** im Code — der Code soll selbsterklärend sein.
- ❌ **Generic Fonts laden** — Inter, Roboto, System-UI sind verboten.
- ❌ **`body { background: solid-color }`** — das verdeckt das Scroll-Video. `body` MUSS `background: transparent`. Solide Fallback-Farbe gehört auf `html`.
- ❌ **`overflow-x: hidden` auf `html`** — killt `position: sticky` (Engineering-Section). Stattdessen `overflow-x: clip` auf `body`.
- ❌ **`python -m http.server`** zum Testen — kein Range-Request-Support → Video nicht scrubbar. Immer `npx http-server` o.ä.

## 8. Code-Hygiene — Was ich tun MUSS

- ✅ Vor `currentTime = x` immer prüfen, ob `video.readyState >= 1` und `Math.abs(currentTime - x) > 0.033` (eine Frame-Distanz).
- ✅ Bei jedem neuen scroll-/animation-haltigen Element: `prefers-reduced-motion` ehren.
- ✅ Bei jedem WebGL-Setup: `powerPreference: "high-performance"`, DPR clampen.
- ✅ Bei jedem Asset-Add: Pfad relativ (`assets/...`), nie absolut.
- ✅ Vor Commit den eigenen Diff lesen.

---

## 9. Bekannte Schwächen & TODOs

- **Form-Backend fehlt**: aktuell nur `mailto:`. Wenn produktiv → Formspree/Resend/eigener Endpoint. Field-Level-Inline-Validation wäre Bonus.
- **Case-Visuals sind CSS-Gradienten**: ersetzen mit echten Bildern in `assets/images/` und `background-image: url(...)` in `.case__visual--0X`.
- **Scroll-Video braucht Keyframe-Dense-Encoding** für echten Butter-Scrub.
- **Three.js Sektion hat keine Post-Processing** — bewusst, für Performance. Wenn Bloom gewünscht: `EffectComposer` einbauen, aber Mobile-Fallback prüfen.
- ~~**Mobile-Nav fehlt**~~: erledigt — `#navBurger` + `.mobile-nav` Overlay (siehe §5.6).
- **`mailto:`-Fallback** ist nicht GDPR-elegant — der User klickt, Mail-Client öffnet sich, der User sendet. Kein Tracking, das ist okay, aber für richtige Leads sollte ein Backend ran.

---

## 10. Mein eigener Review-Checklist nach jedem Build

```
[ ] Hero lädt mit Video-Background, keine grauen Frames.
[ ] Scrollt man zum Manifesto, fadet das Scroll-Video sanft ein.
[ ] Scrollen vorwärts spielt das Scroll-Video vorwärts, rückwärts rückwärts.
[ ] Engineering-Section: sticky Phasen (CRAFT/VELOCITY/EDGE), Headline-Chars steigen beim Scrollen sauber ein.
[ ] FPS in DevTools-Performance ≥ 55 auf normalem Laptop.
[ ] Kein Console-Error (außer `favicon.ico` 404 — egal).
[ ] Mobile (DevTools-Resize <600px): Sections stapeln, kein Overflow.
[ ] Impressum lädt mit konsistentem Look.
[ ] Form-Submit ohne Pflichtfelder → ERROR-Status. Mit Pflichtfeldern → mailto öffnet.
[ ] `prefers-reduced-motion`: alle Animations-Intervalle near-zero.
```

---

## 11. Tonalität, wenn ich Inhalte schreibe

- Kurz. Aggressiv. Selbstbewusst.
- „Wir bauen X." — niemals „Wir können Ihnen helfen, X aufzubauen."
- Italic-Wörter sind die Punchline (`<em>EINSCHLAGEN</em>`, `<em>einschlagen</em>`).
- Englische Tech-Begriffe sind Stilmittel, nicht Schwäche.
- Nummerierung wie `00`, `01`, `02` für Sections, `/ 01`, `/ 02` für Felder/Cases.

---

## 12. Wenn der Nutzer etwas Neues will

1. Erst denken, **wo** es im Designsystem sitzt.
2. Dann **Performance-Impact** abschätzen (siehe §6).
3. Dann implementieren — bestehende Komponenten erweitern statt parallele zu bauen.
4. **Vorhandenen Code beim Bauen hinterfragen**: gibt's ein `setInterval` ohne Gate? Ein `scroll`-Listener ohne rAF? Sofort mitfixen.
5. Browser-Smoke-Test mit Playwright durchziehen (siehe §10 Checklist).
6. **Im Zweifel weniger als mehr.** Das Design lebt von Disziplin, nicht von Effekt-Stacking.

---

## 13. VIDEO-SCROLL — Exakte Einstellungen (1:1-Copy-Paste-Referenz)

> §5A erklärt das **Warum**. Dieser Abschnitt ist das **Was genau** — jede Konstante, jeder CSS-Wert, jeder ffmpeg-Befehl, mit dem das ruckelfreie + verlustfreie Scroll-Video im aktuellen Projekt läuft. Bei „mach das Scroll-Video wie bei Apex" diese Werte nehmen, nicht neu raten. Quelle: `main.js` Desktop-Branch + `style.css` `.bg-scroll*`.

### 13.1 Encoding der Quell-Videos (ffmpeg)
Zwei Clips: Desktop 16:9 (`scroll.mp4`) + Mobile 9:16 (`scroll-mobile.mp4`).
```bash
# Desktop-Scrub-Clip — DICHTE Keyframes sind Pflicht (jeder Frame seekbar):
ffmpeg -i src.mp4 -an -vf "scale=1920:-2,fps=30" \
  -c:v libx264 -preset slow -crf 23 \
  -x264opts keyint=1:min-keyint=1:no-scenecut -movflags +faststart scroll.mp4
#  keyint=1  → jeder Frame ist ein I-Frame → currentTime-Seek landet sofort, kein Ruckeln.
#  -an       → Tonspur weg (Background-Video, spart Größe).
#  +faststart→ moov-Atom nach vorn → startet ohne Full-Download.
#  CRF 23    → sichtbar verlustfrei bei vertretbarer Größe. Budget: ≤ 18 MB / ≤ 30s (§6).

# Mobile-Loop-Clip — KEIN Scrub, normaler Loop, normale Keyframes reichen:
ffmpeg -i src.mp4 -an -vf "scale=1080:-2,fps=30" \
  -c:v libx264 -preset slow -crf 24 -movflags +faststart scroll-mobile.mp4
```
Faustregel: Scrub-Clip = `keyint=1`. Loop-Clip = egal. Wird der Scrub-Clip ohne dichte Keyframes encoded, ruckelt's trotz korrektem JS — **immer zuerst das Encoding prüfen.**

### 13.2 Die JS-Konstanten (main.js, Desktop-Branch)
| Konstante | Wert | Bedeutung / warum genau so |
|---|---|---|
| `FRAME_TARGET` | `96` (reduced-motion: `10`) | Proxy-Frames für die Bewegungsphase. 96 ≈ flüssig, ~170 MB. Mehr → Memory-Risiko. |
| `PROXY_W` | `960` px | Breite der Proxy-Frames. Halbe Full-HD-Breite = scharf genug in Bewegung, ¼ Memory. |
| Seek-„in-flight"-Gate | nur **1** Seek gleichzeitig | Nächster Seek erst nach `seeked`-Event. **Das** killt den Decoder-Stau = killt das Ruckeln. |
| Seek-Stall-Timeout | `300` ms | Feuert `seeked` mal nicht, wird nach 300 ms entsperrt („latest target wins"). |
| Seek-Mindestdistanz | `0.033` s | `< 1` Frame Unterschied → gar nicht seeken (spart sinnlose Seeks). |
| Scroll-Glättung (lerp) | `0.11` pro Frame | `smoothedProg = lerp(smoothedProg, targetProg, 0.11)`. Kleiner = träger/weicher, größer = direkter/härter. |
| „in Bewegung"-Schwelle | `0.0015` | `|targetProg − smoothedProg| > 0.0015` → Proxy zeigen. |
| „Video holt noch auf" | `0.05` s | `|currentTime − targetT| > 0.05` → noch Proxy zeigen, bis das native Bild sitzt. |
| `motionHold` | `14` Frames (~230 ms) | Nach letzter Bewegung bleibt der Proxy 14 Frames, dann Fade-out. Verhindert Flackern bei Mikro-Scrolls. |
| Extraktion | `requestVideoFrameCallback` @ `playbackRate 4.0` | Einmaliger 4×-Durchlauf zieht die Proxy-Frames. Fallback: Seek-Stepping (`duration/FRAME_TARGET`, 400 ms Timeout). |
| Aktiv-Bereich | `#manifesto` → 70 % von `.contact` | Außerhalb ist das Video aus (`is-active` weg). |

**Pflicht-Guard:** Während der Extraktion (`extracting === true`) das Canvas-Overlay **nie** aktivieren — sonst sieht man den 4×-Durchlauf.

### 13.3 Die CSS-Werte (style.css)
```css
.bg-scroll {                /* fixed Layer hinter allem */
  position: fixed; inset: 0; z-index: -3;
  opacity: 0; pointer-events: none;
  transition: opacity 1.2s var(--ease-out);   /* sanftes Ein-/Ausblenden am Bereichsrand */
}
.bg-scroll.is-active { opacity: 1; }
.bg-scroll__video {          /* native, IMMER sichtbare Ebene = volle Qualität im Ruhezustand */
  position: absolute; inset: 0; width: 100%; height: 100%;
  object-fit: cover;
  filter: contrast(1.15) saturate(1.4) brightness(1.0);   /* Look-Grading */
  transform: scale(1.05);    /* 5 % Overscan, kaschiert Kanten */
}
.bg-scroll__canvas {         /* Bewegungs-Proxy, NUR beim Scrollen sichtbar (JS setzt opacity) */
  position: absolute; inset: 0; width: 100%; height: 100%;
  object-fit: cover;
  filter: contrast(1.15) saturate(1.4) brightness(1.0);   /* MUSS identisch zum Video sein, sonst sichtbarer Sprung */
  transform: scale(1.05);    /* identisch zum Video → kein Versatz beim Wechsel */
  opacity: 0; transition: opacity 0.22s linear;           /* 220 ms Fade zwischen Proxy und nativem Frame */
}
```
Wichtig: `filter` und `transform` **müssen** auf Video und Canvas exakt gleich sein — sonst „springt" das Bild beim Proxy↔Nativ-Wechsel.

### 13.4 Markup-Skelett
```html
<div id="bgScroll" class="bg-scroll">
  <video id="bgScrollVideo" class="bg-scroll__video" muted playsinline preload="auto"></video>
  <canvas id="bgScrollCanvas" class="bg-scroll__canvas"></canvas>
</div>
```
`<source>` wird im JS **nach dem ersten Paint** angehängt (Hero blockt nicht). `preload="auto"` ist Pflicht, sonst springt's beim ersten Sichtbarwerden.

### 13.5 Wenn es trotzdem ruckelt — Checkliste in dieser Reihenfolge
1. **Encoding**: Scrub-Clip wirklich mit `keyint=1` encoded? (häufigste Ursache)
2. **Server**: lokal mit `npx http-server` getestet? `python -m http.server` kann keine Range-Requests → kein Seeking.
3. **Seek-Gate**: läuft wirklich nur 1 Seek gleichzeitig (`pendingSeek`)? Ohne das staut der Decoder.
4. **lerp**: zu hoch (> 0.2) → hart/ruckelig; zu niedrig (< 0.05) → träge. `0.11` ist der getunte Wert.
5. **Memory**: `FRAME_TARGET`/`PROXY_W` nicht hochgedreht? > 96 @ > 960px riskiert Context-Loss auf schwachen GPUs.
6. **Mobile**: auf dem Handy gar keinen Scrub — nur Loop (§5.6). Frame-Extraktion ist auf Phones unzuverlässig.

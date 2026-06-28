/* =========================================================
   LANGUAGE SWITCH (DE ⇄ EN)
   A button in the nav toggles the page language. We translate at the
   TEXT-NODE level against a German→English dictionary, so it also covers
   content rendered by content.js (CMS) and keeps accent <em> markup intact
   (each text fragment is translated on its own). Unknown strings simply stay
   German — graceful, never broken. Choice is remembered in localStorage.

   SECURITY: only node.nodeValue (plain text) is ever written — never innerHTML.
   No user input, no network. Dictionary is static data.
   ========================================================= */
(() => {
  const KEY = "atm-lang";

  // German (trimmed) → English. Strings identical in EN (Web Design, Backups,
  // proper nouns, brand) are intentionally omitted.
  const EN = {
    // ---- nav / chrome ----
    "Über Uns": "About",
    "Angebot": "Services",
    "Projekte": "Work",
    "Partner": "Partners",
    "Kontakt": "Contact",
    "Impressum": "Imprint",
    "Datenschutz": "Privacy",
    "AGB": "Terms",
    "Sprache / Language": "Sprache / Language",
    "Menü öffnen": "Open menu",
    "Startseite": "Home",

    // ---- hero ----
    "Wir gestalten und entwickeln Websites für Marken, die sichtbar werden wollen — strategisch durchdacht, technisch sauber, spürbar schnell. Keine Vorlagen von der Stange.":
      "We design and build websites for brands that want to be seen — strategically considered, technically clean, noticeably fast. No off-the-shelf templates.",
    "Sondern Maßarbeit.": "Just bespoke work.",
    "— MESCHEDE / WELTWEIT": "— MESCHEDE / WORLDWIDE",
    "SCROLLEN ↓": "SCROLL ↓",

    // ---- manifesto ----
    "DAS CREDO": "THE CREED",
    "Wir bauen Websites,": "We build websites",
    "die": "that",
    "wirken": "work",
    "Messbar. Schnell. Verlässlich.": "Measurable. Fast. Reliable.",
    "Jedes Pixel hat einen Grund, jede Animation eine Aufgabe. Wir arbeiten strukturiert und schnell — von der ersten Skizze bis zum Go-Live. Was wir abliefern, überzeugt: visuell, technisch und wirtschaftlich.":
      "Every pixel has a reason, every animation a job. We work in a structured, fast way — from the first sketch to go-live. What we deliver convinces: visually, technically and commercially.",
    "Kundenzufriedenheit": "Client satisfaction",
    "Projekte realisiert": "Projects delivered",

    // ---- services (home) ----
    "WAS WIR BAUEN": "WHAT WE BUILD",
    "— WAS WIR BAUEN": "— WHAT WE BUILD",
    "Vier Disziplinen.": "Four disciplines.",
    "Ein": "One",
    "kompromissloser Standard.": "uncompromising standard.",
    "Konzept, Art Direction, UX/UI. Wir gestalten Interfaces, die deine Besucher führen und deine Marke unverwechselbar machen — klar, präzise, durchdacht.":
      "Concept, art direction, UX/UI. We craft interfaces that guide your visitors and make your brand unmistakable — clear, precise, considered.",
    "Sauberer, performanter Frontend-Code. React, Next, WebGL, Headless CMS — wir wählen die Technik, die deine Seite zuverlässig unter 2 Sekunden lädt.":
      "Clean, performant frontend code. React, Next, WebGL, headless CMS — we pick the tech that reliably loads your site in under 2 seconds.",
    "Hosting & Wartung": "Hosting & Maintenance",
    "Schnelles, sicheres Hosting plus laufende Pflege. Updates, Backups und Monitoring laufen automatisch — deine Seite bleibt erreichbar, aktuell und geschützt.":
      "Fast, secure hosting plus ongoing care. Updates, backups and monitoring run automatically — your site stays available, up to date and protected.",
    "GSAP, Three.js, WebGL Shader. Bewegung, die deine Marke nicht dekoriert, sondern transportiert.":
      "GSAP, Three.js, WebGL shaders. Motion that doesn't decorate your brand but carries it.",
    "GSAP, Three.js, WebGL Shader. Bewegung, die deine Marke nicht dekoriert, sondern":
      "GSAP, Three.js, WebGL shaders. Motion that doesn't decorate your brand but",
    "transportiert": "carries it",
    "Was wir anbieten →": "What we offer →",

    // ---- engineering ----
    "ZWISCHENSPIEL": "INTERLUDE",
    "KINETISCHES MANIFEST": "KINETIC MANIFESTO",
    "— KINETISCHES MANIFEST": "— KINETIC MANIFESTO",
    "↓ SCROLLEN — 3 PHASEN": "↓ SCROLL — 3 PHASES",
    "DIE PHILOSOPHIE": "THE PHILOSOPHY",
    "— DIE PHILOSOPHIE": "— THE PHILOSOPHY",
    "Aus": "From",
    "reinem": "pure",
    "Karbon.": "Carbon.",
    "Jede Form ein Statement. Jede Kante kalkuliert.": "Every shape a statement. Every edge calculated.",
    "Bewegung als Sprache.": "Motion as language.",
    "Gebaut": "Built",
    "für": "for",
    "Speed.": "Speed.",
    "Kurze Ladezeit. 60 fps unverhandelbar.": "Short load times. 60 fps non-negotiable.",
    "Performance ist Charakter.": "Performance is character.",
    "Kein": "No",
    "Kompromiss.": "Compromise.",
    "Wir entwerfen, wie F1-Teams entwickeln — am Limit.": "We design the way F1 teams develop — at the limit.",
    "Immer.": "Always.",

    // ---- process (home) ----
    "ABLAUF": "PROCESS",
    "— VON DER STARTLINIE ZUR ZIELFLAGGE": "— FROM START LINE TO CHECKERED FLAG",
    "Vier Runden.": "Four laps.",
    "Eine": "One",
    "Pole Position.": "Pole Position.",
    "— POLE POSITION · STARTLINIE": "— POLE POSITION · START LINE",
    "— ZIELFLAGGE": "— CHECKERED FLAG",
    "— FORMATION LAP · POLE POSITION": "— FORMATION LAP · POLE POSITION",
    "Wir verstehen dein Geschäftsmodell, deine Zielgruppe und deinen Markt. Ein klares Briefing ist die Basis für alles Weitere.":
      "We understand your business model, your audience and your market. A clear brief is the basis for everything that follows.",
    "Ø 1 Woche": "approx. 1 week",
    "— PIT BOX · KONZEPTION": "— PIT BOX · CONCEPT",
    "Konzept & Design": "Concept & Design",
    "Art Direction, Wireframes, High-Fidelity-Designs in Figma. Du bekommst durchdachte Vorschläge, die du in Ruhe prüfen und mitgestalten kannst.":
      "Art direction, wireframes, high-fidelity designs in Figma. You get considered proposals you can review and shape at your own pace.",
    "Ø 2–3 Wochen": "approx. 2–3 weeks",
    "Code, Motion, Integration. Saubere Architektur, lückenlose Performance, jede Animation auf 60fps.":
      "Code, motion, integration. Clean architecture, seamless performance, every animation at 60fps.",
    "Ø 2–4 Wochen": "approx. 2–4 weeks",
    "Launch & Support": "Launch & Support",
    "Go-Live, Analytics, Iteration. Wir verschwinden nicht nach dem Launch — wir bleiben für dich ansprechbar.":
      "Go-live, analytics, iteration. We don't vanish after launch — we stay reachable for you.",
    "Laufend": "Ongoing",

    // ---- contact (home) ----
    "Lust auf eine": "Up for a",
    "schnelle": "quick",
    "Runde?": "lap?",
    "Schreib uns. In der Regel antworten wir innerhalb von 24 Stunden — persönlich und unverbindlich.":
      "Drop us a line. We usually reply within 24 hours — personally and with no obligation.",
    "— KANAL ÖFFNEN": "— OPEN A CHANNEL",

    // ---- footer ----
    "Meschede, Deutschland": "Meschede, Germany",
    "Services": "Services",

    // ---- page heroes (subpages) ----
    "Über": "About",
    "Uns.": "Us.",
    "Axion Studio ist ein unabhängiges Web-Design-Studio aus Meschede.\n        Wir bauen Websites, die": "Axion Studio is an independent web design studio from Meschede.\n        We build websites that",
    "— gestalterisch eigenständig,\n        performance-getrieben und sorgfältig umgesetzt.": "— design-led, performance-driven and carefully built.",
    "Das": "The",
    "Team.": "Team.",
    "Axion Studio ist bewusst klein und fokussiert. Kein anonymes Großraumbüro —\n        sondern ein": "Axion Studio is deliberately small and focused. No anonymous open-plan office —\n        but a",
    "eingespieltes Team": "well-rehearsed team",
    ", in dem klar ist, wer wofür Verantwortung trägt.": ", where it's clear who's responsible for what.",
    "Ausgewählte": "Selected",
    "Arbeiten.": "Work.",
    "Kein Stockfoto-Portfolio. Was hier steht, ist": "No stock-photo portfolio. What's here is",
    "echt gebaut": "really built",
    "— sorgfältig,\n        schnell und mit Anspruch. Ein Auszug aus unseren bisherigen Arbeiten.": "— careful,\n        fast and with standards. A selection of our work so far.",
    "Partner &": "Partners &",
    "Allianzen.": "Alliances.",
    "Wir arbeiten nicht im Vakuum — wir arbeiten mit": "We don't work in a vacuum — we work with",
    "starken Partnern": "strong partners",
    ".\n        Hier die Unternehmen, mit denen wir gemeinsam Projekte umsetzen.": ".\n        Here are the companies we deliver projects with.",
    "schnelle Runde?": "quick lap?",

    // ---- about body ----
    "Manifest": "Manifesto",
    "Gegründet": "Founded",
    "Inhaber": "Owner",
    "Disziplinen": "Disciplines",
    "Sprachen": "Languages",
    "Deutsch · Englisch": "German · English",
    "Wir designen": "We design",
    "mit Anspruch": "with standards",
    "Jede Zeile Code ist eine Entscheidung, jede Animation hat eine Aufgabe. Wir arbeiten": "Every line of code is a decision, every animation has a job. We work",
    "präzise, schnell und verlässlich": "precisely, fast and reliably",
    "— und liefern Ergebnisse, die visuell, technisch und wirtschaftlich überzeugen.": "— and deliver results that convince visually, technically and commercially.",
    "Unsere Kunden kommen nicht zu uns, weil sie irgendeine Website brauchen. Sie kommen, weil sie eine Marke aufbauen wollen, die im Gedächtnis bleibt. Vorlagen von der Stange sind austauschbar — wir gestalten": "Our clients don't come to us because they need just any website. They come because they want to build a brand that sticks. Off-the-shelf templates are interchangeable — we craft",
    "Originale": "originals",
    "Prinzipien": "Principles",
    "Standpunkt": "Stance",
    "Design ist kein Service. Design ist Position.": "Design isn't a service. Design is a stance.",
    "Vier": "Four",
    "Regeln, an die wir uns halten.": "rules we live by.",
    "Performance ist nicht verhandelbar.": "Performance is non-negotiable.",
    "60 fps, unter 2 Sekunden Ladezeit, Lighthouse 95+. Eine langsame Seite ist für uns keine fertige Seite.": "60 fps, under 2 seconds load time, Lighthouse 95+. A slow site isn't a finished site to us.",
    "Bewegung ist Sprache.": "Motion is language.",
    "Jede Animation soll etwas": "Every animation should",
    "sagen": "say something",
    "— sonst lassen wir sie weg.": "— otherwise we drop it.",
    "Typografie trägt den halben Auftritt.": "Typography carries half the impression.",
    "Statt Standard-System-Schriften arbeiten wir mit Display-Schriften, die Charakter haben.": "Instead of default system fonts we work with display typefaces that have character.",
    "Code ist Handwerk.": "Code is craft.",
    "Sauberes Markup, semantisches HTML, modernes CSS — und das richtige Werkzeug für den Job statt unnötigem Technik-Overkill.": "Clean markup, semantic HTML, modern CSS — and the right tool for the job instead of needless tech overkill.",
    "Standort": "Location",
    "Worldwide.": "Worldwide.",
    "Unser Studio sitzt in Meschede, mitten im Sauerland. Wir arbeiten mit Kunden in DACH, EU und Übersee —\n        remote oder vor Ort. Sprachgrenzen sind dabei kein Hindernis.": "Our studio sits in Meschede, in the heart of the Sauerland. We work with clients across DACH, the EU and overseas —\n        remote or on site. Language barriers are no obstacle.",
    "Projekt starten": "Start a project",

    // ---- team body ----
    "Das Team · 01": "The Team · 01",
    "Gründer · Web Design & Entwicklung": "Founder · Web Design & Development",
    "Methode": "Method",
    "Wie wir fahren": "How we drive",
    "Motivation": "Motivation",
    "Aus echter Leidenschaft": "Out of genuine passion",
    "Direkt zum Macher": "Straight to the maker",
    "Tempo": "Pace",
    "Erste Ergebnisse in Tagen": "First results in days",
    "Limit": "Limit",
    "Max. vier Projekte gleichzeitig": "Max. four projects at a time",
    "Ein Team.": "One team.",
    "Volle Kontrolle.": "Full control.",
    "Keine Übergaben, keine Stille Post. Wer dein Projekt plant, baut es auch —\n            vom ersten Wireframe bis zur letzten Animation. Das hält die Linie sauber\n            und das Tempo hoch.": "No handovers, no broken telephone. Whoever plans your project also builds it —\n            from the first wireframe to the last animation. That keeps the line clean\n            and the pace high.",
    "Wir arbeiten in kurzen, sichtbaren Etappen. Du siehst, woran wir schrauben,\n            bevor es lackiert ist — und kannst jederzeit nachsteuern.": "We work in short, visible stages. You see what we're tuning\n            before it's painted — and can steer at any time.",
    "KULTUR": "CULTURE",
    "Wie wir arbeiten": "How we work",
    "Aufstellung": "Line-up",
    "Werkzeuge": "Tools",
    "Rhythmus": "Cadence",
    "Wöchentliche Review": "Weekly review",
    "Haltung": "Ethos",
    "Eigenverantwortung statt Hierarchie": "Ownership over hierarchy",
    "Klein.": "Small.",
    "Aber wirkungsvoll.": "But effective.",
    "Wir sind bewusst klein gehalten. Keine Account-Manager, keine Zwischeninstanzen:\n            Wenn du mit uns sprichst, sprichst du direkt mit der Person, die deine Website\n            auch baut.": "We're deliberately kept small. No account managers, no middle layers:\n            when you talk to us, you talk directly to the person who also builds your website.",
    "Vom Schatten ins Licht": "From shadow into light",
    "Wir machen aus": "We turn",
    "Unscheinbar": "Unremarkable",
    "Unübersehbar.": "Unmissable.",
    "Dieselbe Maschine, zwei Gesichter: was eben noch im Dunkeln stand, fährt im nächsten Moment ins\n            Rampenlicht. Genau diesen Wechsel bauen wir für deine Marke — sichtbar, schnell, kompromisslos.": "Same machine, two faces: what stood in the dark a moment ago drives into the spotlight the next. That exact switch is what we build for your brand — visible, fast, uncompromising.",
    "Briefing senden": "Send a brief",

    // ---- partner body ----
    "Unsere Partner": "Our Partners",
    "Mit wem wir": "Who we",
    "zusammenarbeiten": "work with",
    "Marken und Betriebe, mit denen wir gemeinsam an digitalen Projekten arbeiten.": "Brands and businesses we work with on digital projects.",
    "Become a Partner": "Become a Partner",
    "Du willst mit uns": "Want to",
    "arbeiten?": "work with us?",
    "Wir arbeiten mit Studios, Agenturen und Freelancern zusammen, die ihr Handwerk\n        wirklich beherrschen. Wenn das auf dich zutrifft, schreib uns — wir antworten\n        in der Regel innerhalb von 24 Stunden.": "We work with studios, agencies and freelancers who truly master their craft. If that's you, get in touch — we usually reply within 24 hours.",
    "Partner werden": "Become a partner",

    // ---- projekte body ----
    "Live-Projekte": "Live projects",
    "Übersicht": "Overview",
    "Dein Projekt": "Your project",
    "Der nächste Case ist": "The next case is",
    "deins.": "yours.",
    "Wir nehmen maximal vier aktive Projekte gleichzeitig an. Wenn du es ernst meinst, sichern wir dir einen festen Platz und volle Aufmerksamkeit.": "We take on a maximum of four active projects at a time. If you're serious, we'll secure you a fixed slot and full attention.",

    // ---- kontakt body ----
    "Direct": "Direct",
    "Kontaktdaten": "Contact details",
    "Du hast": "Got",
    "30 Sekunden?": "30 seconds?",
    "Schreib uns drei Sätze:": "Send us three sentences:",
    "was du baust, bis wann, welches Budget": "what you're building, by when, what budget",
    ". Wir melden uns spätestens am nächsten Werktag mit einer Einschätzung — ob wir der richtige Partner sind, was es kostet, und wann wir starten können.": ". We'll get back to you by the next business day with an assessment — whether we're the right partner, what it costs, and when we can start.",
    "Keine Lust auf Formulare?": "Don't like forms?",
    "Direkt-Mail genügt.": "A direct email is enough.",
    "Wir lesen jede Zeile.": "We read every line.",
    "Standort & Map": "Location & map",
    "Die Garage.": "The garage.",
    "Vor-Ort-Meetings nach Vereinbarung — sonst läuft alles unkompliziert remote.": "On-site meetings by arrangement — otherwise everything runs smoothly remote.",
    "Adresse": "Address",
    "Anreise": "Getting here",
    "Projekt-Anfrage": "Project enquiry",
    "Schick uns ein": "Send us a",
    "Briefing.": "brief.",
    "Je präziser dein Briefing, desto schneller unsere Antwort.": "The more precise your brief, the faster our reply.",
    "Dein vollständiger Name": "Your full name",
    "Optional — Brand / Firma": "Optional — brand / company",
    "Erzähl uns von deinem Projekt — Ziele, Timeline, Konkurrenz, alles.": "Tell us about your project — goals, timeline, competition, everything.",
    "Ich stimme zu, dass meine Angaben gemäß": "I agree that my details are processed according to the",
    "verarbeitet werden.": ".",
    "Datenschutzerklärung": "privacy policy",

    // ---- angebot body ----
    "Was wir": "What we",
    "anbieten.": "offer.",
    "Jede Welt ist eine Disziplin — Planet wählen.": "Each world is a discipline — pick a planet.",
    "Disziplin": "Discipline",
    "Was drinsteckt": "What's inside",
    "Sechs Leistungen.": "Six services.",
    "Ein ganzes Arsenal.": "A whole arsenal.",
    "Jede Welt da oben ist nur die Spitze. Darunter liegt das volle Werkzeug — du wählst, was dein Projekt nach vorne bringt.": "Every world up there is just the tip. Below sits the full toolkit — you pick what moves your project forward.",
    "Landingpages": "Landing pages",
    "Conversion-getriebene Seiten, die in Sekunden überzeugen — Art Direction inklusive.": "Conversion-driven pages that convince in seconds — art direction included.",
    "Skalierbare Komponenten-Bibliotheken in Figma und Code — ein Look, jede Seite.": "Scalable component libraries in Figma and code — one look, every page.",
    "Web-Apps": "Web apps",
    "Next.js- und React-Anwendungen mit Headless-Backend, sauber und wartbar.": "Next.js and React apps with a headless backend, clean and maintainable.",
    "Shopify- und Stripe-Stores, die verkaufen statt zu laden.": "Shopify and Stripe stores that sell instead of stall.",
    "WebGL-Szenen": "WebGL scenes",
    "Three.js-Welten, Shader und Scroll-Storytelling — wie das System hier oben.": "Three.js worlds, shaders and scroll storytelling — like the system up here.",
    "Managed Hosting": "Managed hosting",
    "Schnelles Hosting, Updates, Backups und Monitoring — wir halten deine Seite am Laufen.": "Fast hosting, updates, backups and monitoring — we keep your site running.",
    "Vom Brief zum Launch": "From brief to launch",
    "Vier Etappen.": "Four stages.",
    "Kein Leerlauf.": "No idling.",
    "Kurze, sichtbare Etappen statt monatelanger Blackbox. Nach jeder Etappe gibt es\n              einen Stand zum Anfassen — du steuerst jederzeit mit.": "Short, visible stages instead of a months-long black box. After each stage there's something tangible — you steer along the way.",
    "Erste sichtbare Ergebnisse in Tagen, nicht Wochen. Pole Position ab dem ersten Sprint.": "First visible results in days, not weeks. Pole position from the very first sprint.",
    "Nicht verhandelbar": "Non-negotiable",
    "Der kompromisslose Standard.": "The uncompromising standard.",
    "Egal welche Disziplin du wählst — diese vier Dinge liefern wir immer.": "Whichever discipline you pick — we always deliver these four things.",
    "Ladezeit, 60 fps. Wenn es ruckelt, ist es nicht fertig.": "Load time, 60 fps. If it stutters, it isn't finished.",
    "Jede Section funktioniert auf jedem Screen — Mobile ist Pflicht, nicht Bonus.": "Every section works on every screen — mobile is a must, not a bonus.",
    "Sichtbar": "Visible",
    "Kontrast, Fokus, Reduced-Motion — von Anfang an mitgedacht.": "Contrast, focus, reduced motion — considered from the start.",
    "Saubere Semantik, Meta-Daten und Speed — von Suchmaschinen geliebt.": "Clean semantics, metadata and speed — loved by search engines.",
    "Bereit?": "Ready?",
    "Such dir eine": "Pick a",
    "— wir bauen den Rest.": "— we build the rest.",

    // ---- cookie banner ----
    "Wir verwenden nur technisch notwendige Mittel. Externe Inhalte (Google Maps) werden erst nach deiner Zustimmung geladen.":
      "We only use technically necessary means. External content (Google Maps) loads only after your consent.",
    "Akzeptieren": "Accept",
    "Ablehnen": "Decline",
    "Mehr": "More",
  };

  let cur = "de";
  try { cur = localStorage.getItem(KEY) || "de"; } catch (_) {}

  const origText = new WeakMap();  // text node → original German value

  const skipParent = (p) => {
    const t = p && p.nodeName;
    return t === "SCRIPT" || t === "STYLE" || t === "NOSCRIPT" || t === "TEXTAREA";
  };

  function apply(lang) {
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        if (skipParent(n.parentNode)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    let n;
    while ((n = w.nextNode())) {
      if (!origText.has(n)) origText.set(n, n.nodeValue);
      const de = origText.get(n);
      if (lang === "en") {
        const en = EN[de.trim()];
        if (en != null) n.nodeValue = de.replace(de.trim(), en);
      } else if (n.nodeValue !== de) {
        n.nodeValue = de;
      }
    }
    document.documentElement.lang = lang;
    document.querySelectorAll(".lang-toggle__opt").forEach((o) =>
      o.classList.toggle("is-active", o.dataset.lang === lang)
    );
  }

  function setLang(lang) {
    if (lang !== "de" && lang !== "en") return;
    cur = lang;
    try { localStorage.setItem(KEY, lang); } catch (_) {}
    apply(lang);
  }

  document.addEventListener("click", (e) => {
    const opt = e.target instanceof Element && e.target.closest(".lang-toggle__opt");
    if (!opt) return;
    setLang(opt.dataset.lang);
  });

  const run = () => apply(cur);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
  // re-translate after the CMS loader injects its content
  document.addEventListener("content:loaded", () => apply(cur));
})();

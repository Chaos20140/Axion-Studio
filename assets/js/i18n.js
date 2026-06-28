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

    // ---- section / nav-index labels ----
    "00 MANIFEST": "00 MANIFESTO",
    "01 LEISTUNGEN": "01 SERVICES",
    "02 ABLAUF": "02 PROCESS",
    "03 UNTERNEHMEN": "03 COMPANY",
    "04 KONTAKT": "04 CONTACT",
    "06 BRIEFING": "06 BRIEF",
    "05 — PROJEKTE": "05 — WORK",
    "04 — KANAL ÖFFNEN": "04 — OPEN A CHANNEL",
    "LEISTUNGEN": "SERVICES",
    "ANGEBOT": "SERVICES",
    "AUSGEWÄHLT": "SELECTED",
    "AUSGEWÄHLTES PROJEKT": "SELECTED PROJECT",
    "ÜBERSICHT": "OVERVIEW",
    "METHODE": "METHOD",
    "NÄCHSTES": "NEXT",
    "Erreichbar": "Available",
    "Telefon": "Phone",
    "HOSTING & WARTUNG": "HOSTING & MAINTENANCE",
    "— DAS CREDO": "— THE CREED",
    ". Wir lesen jede Zeile.": ". We read every line.",
    "E-Mail": "Email",
    "E-Mail:": "Email:",
    "02 E-MAIL": "02 EMAIL",

    // ---- about principle eyebrows ----
    "01 — Performance ist nicht verhandelbar.": "01 — Performance is non-negotiable.",
    "02 — Bewegung ist Sprache.": "02 — Motion is language.",
    "03 — Typografie trägt den halben Auftritt.": "03 — Typography carries half the impression.",
    "04 — Code ist Handwerk.": "04 — Code is craft.",

    // ---- about bio (full + <em> fragments) ----
    "Hi, ich bin Tolunay — Gründer von Axion Studio und studierter Elektrotechniker. Technik hat mich schon immer fasziniert: Ich wollte nie nur wissen, dass etwas funktioniert, sondern warum. Aus dieser Begeisterung ist Axion Studio entstanden — ein Studio, das moderne Webauftritte mit technischem Anspruch und einem Auge fürs Detail baut. Webdesign und Entwicklung waren für mich lange mehr als ein Hobby, bevor daraus ein Studio wurde. Bei mir bekommst du keinen anonymen Dienstleister, sondern einen festen Ansprechpartner, der dein Projekt persönlich begleitet — von der ersten Idee bis zum Launch. Qualität ist mir dabei genauso wichtig wie dir.":
      "Hi, I'm Tolunay — founder of Axion Studio and a qualified electrical engineer. Technology has always fascinated me: I never just wanted to know that something works, but why. Out of that enthusiasm Axion Studio was born — a studio that builds modern web presences with technical ambition and an eye for detail. Web design and development were more than a hobby to me for a long time before they became a studio. With me you don't get an anonymous service provider but a dedicated point of contact who personally guides your project — from the first idea to launch. Quality matters just as much to me as it does to you.",
    "Hi, ich bin Tolunay — Gründer von Axion Studio und studierter Elektrotechniker. Technik hat mich schon immer fasziniert: Ich wollte nie nur wissen, dass etwas funktioniert, sondern warum.":
      "Hi, I'm Tolunay — founder of Axion Studio and a qualified electrical engineer. Technology has always fascinated me: I never just wanted to know that something works, but why.",
    "Hi, ich bin Tolunay — Gründer von Axion Studio und studierter Elektrotechniker. Technik hat mich schon immer fasziniert: Ich wollte nie nur wissen,":
      "Hi, I'm Tolunay — founder of Axion Studio and a qualified electrical engineer. Technology has always fascinated me: I never just wanted to know",
    "dass": "that",
    "etwas funktioniert, sondern": "something works, but",
    "warum": "why",
    "Aus dieser Begeisterung ist Axion Studio entstanden — ein Studio, das moderne Webauftritte mit technischem Anspruch und einem Auge fürs Detail baut. Webdesign und Entwicklung waren für mich lange mehr als ein Hobby, bevor daraus ein Studio wurde.":
      "Out of that enthusiasm Axion Studio was born — a studio that builds modern web presences with technical ambition and an eye for detail. Web design and development were more than a hobby to me for a long time before they became a studio.",
    "Bei mir bekommst du keinen anonymen Dienstleister, sondern einen festen Ansprechpartner, der dein Projekt persönlich begleitet — von der ersten Idee bis zum Launch. Qualität ist mir dabei genauso wichtig wie dir.":
      "With me you don't get an anonymous service provider but a dedicated point of contact who personally guides your project — from the first idea to launch. Quality matters just as much to me as it does to you.",

    // ---- manifesto stat (full + fragments) ----
    "Wir nehmen": "We take on",
    "maximal vier aktive Projekte": "a maximum of four active projects",
    "gleichzeitig an. Wir sind überzeugt, dass Qualität eine Frage von Aufmerksamkeit ist — nicht von Teamgröße.":
      "at a time. We're convinced that quality is a matter of attention — not team size.",

    // ---- home process steps (CMS) ----
    "Ziele, Zielgruppe, Scope — ein klarer Brief.": "Goals, audience, scope — a clear brief.",
    "Sauberer Code, 60 fps, unter 2 Sekunden.": "Clean code, 60 fps, under 2 seconds.",
    "Deploy, Feinschliff, Übergabe.": "Deploy, polish, handover.",

    // ---- home / kontakt contact intros (CMS) ----
    "Schreib uns. In der Regel antworten wir innerhalb von 24 Stunden — persönlich und unverbindlich, ohne Bot und ohne Umwege.":
      "Drop us a line. We usually reply within 24 hours — personally and with no obligation, no bot, no detours.",
    "Drei Sätze genügen: was du baust, bis wann, welches Budget. Du bekommst innerhalb von 24 Stunden eine persönliche Antwort — direkt vom Gründer.":
      "Three sentences are enough: what you're building, by when, what budget. You'll get a personal reply within 24 hours — straight from the founder.",
    "Sichtbarkeit ist kein Zufall.": "Visibility is no accident.",
    "Direkt-Mail genügt": "A direct email is enough",
    "Andere": "Other",
    "+49 176 76668002 — direkt schreiben": "+49 176 76668002 — message directly",

    // ---- contact details / map (CMS) ----
    "Telefon: auf Anfrage": "Phone: on request",
    "auf Anfrage / wird ggf. ergänzt": "on request / added if applicable",
    "Deutschland": "Germany",
    "NRW · Deutschland": "NRW · Germany",
    "Bahn: Bestwig · 8 min": "Rail: Bestwig · 8 min",
    "Flughafen Dortmund (DTM): 80 min": "Dortmund Airport (DTM): 80 min",
    "A46 direkter Anschluss": "A46 direct access",
    "Karte laden": "Load map",
    "Google Maps wird erst nach deiner Zustimmung geladen — dabei werden Daten an Google übertragen.":
      "Google Maps loads only after your consent — data is transferred to Google in the process.",

    // ---- angebot solar / sections (fragments) ----
    "Erste sichtbare Ergebnisse in": "First visible results in",
    "Tagen": "days",
    ", nicht Wochen. Pole Position ab dem ersten Sprint.": ", not weeks. Pole position from the very first sprint.",
    "Der": "The",
    "kompromisslose": "uncompromising",

    // ---- SOLAR explorer (angebot) ----
    "Ein Standard": "One Standard",
    "Vier Disziplinen, ein kompromissloser Standard. Jede Welt hier draußen ist ein Weg dorthin — Web Design, Development, Motion & 3D, Hosting & Wartung. Wähl einen Planeten.":
      "Four disciplines, one uncompromising standard. Every world out here is a path to it — Web Design, Development, Motion & 3D, Hosting & Maintenance. Pick a planet.",
    "Konzept, Art Direction, UX/UI. Wir gestalten Interfaces, die deine Besucher führen und deine Marke unverwechselbar machen — klar, präzise, durchdacht. Art Direction · UX & UI · Design Systems · Prototyping.":
      "Concept, art direction, UX/UI. We craft interfaces that guide your visitors and make your brand unmistakable — clear, precise, considered. Art Direction · UX & UI · Design Systems · Prototyping.",
    "Sauberer, performanter Frontend-Code. React, Next, WebGL, Headless CMS — wir wählen die Technik, die deine Seite zuverlässig unter 2 Sekunden lädt. Next.js · Headless CMS · E-Commerce · API Integrations.":
      "Clean, performant frontend code. React, Next, WebGL, headless CMS — we pick the tech that reliably loads your site in under 2 seconds. Next.js · Headless CMS · E-Commerce · API Integrations.",
    "GSAP, Three.js, WebGL-Shader. Bewegung, die deine Marke nicht dekoriert, sondern transportiert. Scroll Storytelling · WebGL Scenes · Microinteractions · Reels & Showcases.":
      "GSAP, Three.js, WebGL shaders. Motion that doesn't decorate your brand but carries it. Scroll Storytelling · WebGL Scenes · Microinteractions · Reels & Showcases.",
    "Schnelles, sicheres Hosting plus laufende Pflege: Updates, Backups, Monitoring und schneller Support. Deine Seite bleibt erreichbar, aktuell und geschützt — du musst dich um nichts kümmern. Managed Hosting · Updates & Security · Backups · Monitoring & Support.":
      "Fast, secure hosting plus ongoing care: updates, backups, monitoring and quick support. Your site stays available, up to date and protected — you don't have to worry about a thing. Managed Hosting · Updates & Security · Backups · Monitoring & Support.",
    "Projekt starten →": "Start a project →",
    "Briefing senden →": "Send a brief →",
    "Stack besprechen →": "Discuss stack →",
    "Reel anfragen →": "Request a reel →",
    "Setup anfragen →": "Request setup →",
    "SYSTEM ONLINE — DISZIPLIN WÄHLEN": "SYSTEM ONLINE — PICK A DISCIPLINE",

    // ---- projekte / partner cards (CMS) ----
    "In Vorbereitung": "In preparation",
    "Pflege · Betreuung": "Care · Support",
    "Pflege · Betreuung ↗": "Care · Support ↗",
    "curadoma.de ansehen ↗": "View curadoma.de ↗",
    "puron-media.de ansehen ↗": "View puron-media.de ↗",
    "Ambulanter Betreuungsdienst mit Herz — „Sie können nicht immer da sein. Wir können es.“ Ein warmer, vertrauensvoller Auftritt für Pflege & Betreuung zuhause: klar strukturiert, einladend und auf Angehörige zugeschnitten. Schau es dir live an.":
      "Outpatient care service with heart — “You can't always be there. We can.” A warm, trustworthy presence for care and support at home: clearly structured, welcoming and tailored to relatives. Take a live look.",
    "Ambulanter Betreuungsdienst mit Herz:": "Outpatient care service with heart:",
    "„Sie können nicht immer da sein. Wir können es.“": "“You can't always be there. We can.”",
    "Ein warmer, vertrauensvoller Auftritt für Pflege & Betreuung zuhause — klar strukturiert, einladend und auf Angehörige zugeschnitten. Schau es dir live an.":
      "A warm, trustworthy presence for care and support at home — clearly structured, welcoming and tailored to relatives. Take a live look.",
    "Social-Media- & Creative-Agency mit einem klaren Auftrag:": "Social media & creative agency with a clear mission:",
    "Social-Media- & Creative-Agency mit einem klaren Auftrag: Sichtbarkeit ist kein Zufall. Wir haben den digitalen Auftritt umgesetzt — mit Bewegtbild-Hero, animiertem Partikel-Raum und markanter Typografie. Schau es dir live an.":
      "Social media & creative agency with a clear mission: visibility is no accident. We delivered the digital presence — with a motion hero, an animated particle space and bold typography. Take a live look.",
    "Social-Media- & Creative-Agency. Den digitalen Auftritt haben wir gemeinsam umgesetzt —":
      "Social media & creative agency. We delivered the digital presence together —",
    "Wir haben den digitalen Auftritt umgesetzt — mit Bewegtbild-Hero, animiertem Partikel-Raum und markanter Typografie. Schau es dir live an.":
      "We delivered the digital presence — with a motion hero, an animated particle space and bold typography. Take a live look.",

    // ============ LEGAL (impressum / datenschutz / agb) ============
    "Impressum &": "Imprint &",
    "Alle gesetzlich vorgeschriebenen Angaben gemäß § 5 DDG (vormals TMG) sowie zur Datenverarbeitung gemäß DSGVO. Stand: 2026.":
      "All legally required information pursuant to § 5 DDG (formerly TMG) and on data processing under the GDPR. As of: 2026.",
    "Angaben gemäß § 5 DDG": "Information pursuant to § 5 DDG",
    "Axion Studio — Web Design Studio (Einzelunternehmen)": "Axion Studio — Web Design Studio (sole proprietorship)",
    "Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV": "Responsible for content pursuant to § 18 (2) MStV",
    "Verantwortlicher": "Controller",
    "Umsatzsteuer-ID": "VAT ID",
    "Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:": "VAT identification number pursuant to § 27a German VAT Act:",
    "Tolunay Usul, Anschrift wie oben.": "Tolunay Usul, address as above.",
    "Tolunay Usul — Kontakt siehe Impressum.": "Tolunay Usul — contact see imprint.",
    "Haftung für Inhalte": "Liability for content",
    "Als Diensteanbieter sind wir gemäß § 7 Abs. 1 DDG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 DDG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.":
      "As a service provider we are responsible for our own content on these pages under the general laws pursuant to § 7 (1) DDG. According to §§ 8 to 10 DDG, however, we as a service provider are not obliged to monitor transmitted or stored third-party information or to investigate circumstances that indicate unlawful activity.",
    "Haftung für Links": "Liability for links",
    "Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich.":
      "Our offering contains links to external third-party websites over whose content we have no influence. We can therefore accept no liability for this third-party content. The respective provider or operator of the linked pages is always responsible for their content.",
    "Urheberrecht": "Copyright",
    "Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.":
      "The content and works created by the site operators on these pages are subject to German copyright law. Reproduction, editing, distribution and any kind of use beyond the limits of copyright require the written consent of the respective author or creator.",
    "EU-Streitschlichtung": "EU dispute resolution",
    "Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:":
      "The European Commission provides a platform for online dispute resolution (ODR):",
    ". Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.":
      ". We are neither willing nor obliged to take part in dispute resolution proceedings before a consumer arbitration board.",
    "Wir freuen uns über dein Interesse an unserem Studio. Datenschutz hat einen besonders hohen Stellenwert. Eine Nutzung der Internetseiten ist grundsätzlich ohne jede Angabe personenbezogener Daten möglich. Sofern eine betroffene Person besondere Services in Anspruch nehmen möchte, könnte jedoch eine Verarbeitung personenbezogener Daten erforderlich werden.":
      "We're glad you're interested in our studio. Data protection is of particularly high importance to us. Use of our websites is generally possible without providing any personal data. However, if a data subject wishes to use special services, processing of personal data may become necessary.",
    "Erfassung allgemeiner Daten und Informationen": "Collection of general data and information",
    "Die Website erfasst mit jedem Aufruf durch eine betroffene Person oder ein automatisiertes System eine Reihe von allgemeinen Daten und Informationen. Diese werden in den Logfiles des Servers gespeichert. Erfasst werden können:":
      "With each access by a data subject or an automated system, the website records a range of general data and information. These are stored in the server's log files. The following may be recorded:",
    "eine Internet-Protokoll-Adresse (IP-Adresse),": "an Internet Protocol address (IP address),",
    "Datum und Uhrzeit eines Zugriffs auf die Internetseite,": "the date and time of access to the website,",
    "verwendete Browsertypen und Versionen,": "the browser types and versions used,",
    "das vom zugreifenden System verwendete Betriebssystem,": "the operating system used by the accessing system,",
    "die Website, von welcher ein zugreifendes System auf unsere Internetseite gelangt (Referrer),":
      "the website from which an accessing system reaches our website (referrer),",
    "sonstige ähnliche Daten und Informationen, die der Gefahrenabwehr im Falle von Angriffen auf unsere informationstechnologischen Systeme dienen.":
      "other similar data and information used to avert danger in the event of attacks on our information technology systems.",
    "Kontaktaufnahme": "Getting in touch",
    "Bei Kontaktaufnahme über das Formular oder per E-Mail werden deine Angaben zur Bearbeitung deiner Anfrage und für den Fall von Anschlussfragen bei uns gespeichert. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Vertragsanbahnung) bzw. Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der Beantwortung).":
      "When you contact us via the form or by email, your details are stored with us to process your enquiry and in case of follow-up questions. The legal basis is Art. 6 (1) (b) GDPR (initiation of a contract) or Art. 6 (1) (f) GDPR (legitimate interest in responding).",
    "Schriftarten von Google Fonts": "Google Fonts",
    "Diese Website lädt Schriftarten von Google Fonts. Beim Aufruf einer Seite werden die benötigten Schriftarten geladen. Hierzu muss dein Browser eine Verbindung zu Servern von Google LLC herstellen, wodurch deine IP-Adresse an Google übertragen wird. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einer einheitlichen Darstellung des Studio-Auftritts).":
      "This website loads fonts from Google Fonts. When a page is opened, the required fonts are loaded. For this, your browser has to connect to servers of Google LLC, whereby your IP address is transmitted to Google. The legal basis is Art. 6 (1) (f) GDPR (legitimate interest in a consistent presentation of the studio's appearance).",
    "Diese Website setzt aktuell": "This website currently sets",
    "keine": "no",
    "Tracking- oder Marketing-Cookies ein. Technisch notwendige Cookies können in Einzelfällen verwendet werden, um die Funktionalität zu gewährleisten.":
      "tracking or marketing cookies. Technically necessary cookies may be used in individual cases to ensure functionality.",
    "Speicherdauer": "Storage period",
    "Personenbezogene Daten werden für die Dauer der Speicherung bis zur Erfüllung der Zweckbestimmung oder gesetzlicher Aufbewahrungsfristen gespeichert.":
      "Personal data is stored for the duration of storage until the purpose is fulfilled or until statutory retention periods expire.",
    "Rechte der betroffenen Person": "Rights of the data subject",
    "Recht auf Bestätigung (Art. 15 DSGVO)": "Right to confirmation (Art. 15 GDPR)",
    "Recht auf Auskunft (Art. 15 DSGVO)": "Right of access (Art. 15 GDPR)",
    "Recht auf Berichtigung (Art. 16 DSGVO)": "Right to rectification (Art. 16 GDPR)",
    "Recht auf Löschung („Recht auf Vergessenwerden“, Art. 17 DSGVO)": "Right to erasure (“right to be forgotten”, Art. 17 GDPR)",
    "Recht auf Einschränkung der Verarbeitung (Art. 18 DSGVO)": "Right to restriction of processing (Art. 18 GDPR)",
    "Recht auf Datenübertragbarkeit (Art. 20 DSGVO)": "Right to data portability (Art. 20 GDPR)",
    "Recht auf Widerspruch (Art. 21 DSGVO)": "Right to object (Art. 21 GDPR)",
    "Beschwerderecht bei einer Aufsichtsbehörde (Art. 77 DSGVO)": "Right to lodge a complaint with a supervisory authority (Art. 77 GDPR)",
    "Allgemeine Geschäftsbedingungen": "General Terms and Conditions",
    "§ 1 Geltungsbereich": "§ 1 Scope",
    "Diese AGB gelten für alle Verträge, die zwischen Axion Studio (im Folgenden „Auftragnehmer“) und einem Kunden („Auftraggeber“) geschlossen werden. Abweichende Bedingungen des Auftraggebers werden nicht anerkannt, sofern ihnen nicht ausdrücklich schriftlich zugestimmt wurde.":
      "These terms apply to all contracts concluded between Axion Studio (hereinafter the “Contractor”) and a customer (the “Client”). Deviating conditions of the Client are not recognised unless expressly agreed to in writing.",
    "§ 2 Vertragsgegenstand": "§ 2 Subject of the contract",
    "Der Auftragnehmer erbringt Leistungen in den Bereichen Konzeption, Design, Entwicklung und Beratung im Bereich digitaler Medien. Der konkrete Leistungsumfang ergibt sich aus dem individuellen Angebot bzw. Auftrag.":
      "The Contractor provides services in the areas of concept, design, development and consulting in the field of digital media. The specific scope of services results from the individual offer or order.",
    "§ 3 Vergütung & Zahlungsbedingungen": "§ 3 Remuneration & payment terms",
    "Die Vergütung richtet sich nach Angebot. Sofern nichts anderes vereinbart, sind Rechnungen innerhalb von 14 Tagen nach Rechnungsdatum ohne Abzug zur Zahlung fällig. Bei größeren Projekten kann eine Anzahlung von 30–50 % vereinbart werden.":
      "Remuneration is based on the offer. Unless otherwise agreed, invoices are due for payment without deduction within 14 days of the invoice date. For larger projects, a deposit of 30–50% may be agreed.",
    "§ 4 Nutzungsrechte": "§ 4 Usage rights",
    "Mit vollständiger Bezahlung erhält der Auftraggeber die im Vertrag definierten Nutzungsrechte an den erstellten Werken. Quellcode und Designdateien verbleiben — wenn nicht ausdrücklich anders vereinbart — beim Auftragnehmer.":
      "Upon full payment, the Client receives the usage rights to the created works as defined in the contract. Source code and design files remain — unless expressly agreed otherwise — with the Contractor.",
    "§ 5 Haftung": "§ 5 Liability",
    "Der Auftragnehmer haftet uneingeschränkt für Vorsatz und grobe Fahrlässigkeit. Bei leichter Fahrlässigkeit haftet der Auftragnehmer nur bei Verletzung wesentlicher Vertragspflichten und beschränkt auf den vertragstypisch vorhersehbaren Schaden.":
      "The Contractor is liable without limitation for intent and gross negligence. In the case of slight negligence, the Contractor is liable only for the breach of essential contractual obligations and limited to the foreseeable damage typical for the contract.",
    "§ 6 Gerichtsstand": "§ 6 Place of jurisdiction",
    "Erfüllungsort und Gerichtsstand für sämtliche Streitigkeiten aus diesem Vertragsverhältnis ist Meschede, soweit der Auftraggeber Kaufmann, juristische Person des öffentlichen Rechts oder öffentlich-rechtliches Sondervermögen ist.":
      "The place of performance and jurisdiction for all disputes arising from this contractual relationship is Meschede, provided the Client is a merchant, a legal entity under public law or a special fund under public law.",
    "§ 7 Schlussbestimmungen": "§ 7 Final provisions",
    "Sollten einzelne Bestimmungen dieses Vertrages unwirksam oder undurchführbar sein oder nach Vertragsschluss unwirksam oder undurchführbar werden, bleibt davon die Wirksamkeit des Vertrages im Übrigen unberührt.":
      "Should individual provisions of this contract be or become invalid or unenforceable, the validity of the remainder of the contract remains unaffected.",
    "← Zurück": "← Back",
    "← Zurück zur Pit Lane": "← Back to the Pit Lane",

    // ---- kontakt: remote-first ops panel (replaces the map) ----
    "Kein Büro.": "No office.",
    "Volle Reichweite.": "Full reach.",
    "Axion Studio ist remote-first. Von Meschede aus arbeiten wir mit Kunden in DACH, EU und Übersee — Briefing, Calls und Reviews laufen komplett digital. Kein Termin vor Ort nötig: kein Umweg, kein Zeitverlust.":
      "Axion Studio is remote-first. From Meschede we work with clients across DACH, the EU and overseas — briefings, calls and reviews run entirely digital. No on-site appointment needed: no detour, no lost time.",
    "Dein Projekt läuft.": "Your project's running.",
    "Wir sind am Funk.": "We're on the radio.",
    "REMOTE-FIRST · DACH · EU · ÜBERSEE": "REMOTE-FIRST · DACH · EU · OVERSEAS",
    "Reichweite": "Reach",
    "DACH · EU · Übersee": "DACH · EU · Overseas",
    "Antwortzeit": "Response time",
    "Ø < 24 h — persönlich": "Ø < 24 h — personal",
    "Kanäle": "Channels",
    "WhatsApp · E-Mail · Video-Call": "WhatsApp · Email · Video call",
    "Basis": "Base",
    "Meschede · NRW · Deutschland": "Meschede · NRW · Germany",

    // ---- attributes (placeholder / aria-label / title / alt) ----
    "Dein vollständiger Name": "Your full name",
    "dein@unternehmen.de": "you@company.com",
    "Optional — Brand / Firma": "Optional — brand / company",
    "Erzähl uns von deinem Projekt — Ziele, Timeline, Konkurrenz, alles.": "Tell us about your project — goals, timeline, competition, everything.",
    "Axion Studio — Startseite": "Axion Studio — Home",
    "Was wir anbieten": "What we offer",
    "Zurück zum System": "Back to the system",
    "Info schliessen": "Close info",
    "Heranzoomen": "Zoom in",
    "Herauszoomen": "Zoom out",
    "Tolunay Usul — Gründer von Axion Studio": "Tolunay Usul — founder of Axion Studio",
    "Vorschau der Website von Puron Media — Social Media & Creative Agency": "Preview of the Puron Media website — social media & creative agency",
    "Vorschau der Website von Cura Doma — Ambulanter Betreuungsdienst": "Preview of the Cura Doma website — outpatient care service",

    // ---- cookie banner ----
    "Wir verwenden nur technisch notwendige Mittel. Externe Inhalte (Google Maps) werden erst nach deiner Zustimmung geladen.":
      "We only use technically necessary means. External content (Google Maps) loads only after your consent.",
    "Akzeptieren": "Accept",
    "Ablehnen": "Decline",
    "Mehr": "More",
    "Wir verwenden nur technisch notwendige Cookies. Mehr dazu in der": "We only use technically necessary cookies. More in the",
    "Nur notwendige": "Only necessary",
    "Alle akzeptieren": "Accept all",
    "Cookie-Hinweis": "Cookie notice",
  };

  // Normalized lookup key: collapse internal whitespace and drop soft-hyphens /
  // zero-width spaces, so multi-line HTML, CMS one-liners and hyphenated legal
  // prose all resolve to the same dictionary entry.
  const normKey = (s) => s
    .replace(/[­​]/g, "")                 // drop soft-hyphens / zero-width
    .replace(/[„“”«»]/g, '"') // unify double quotes
    .replace(/[‚‘’]/g, "'")           // unify single quotes
    .replace(/\s+/g, " ")
    .trim();
  const ENn = {};
  for (const de in EN) ENn[normKey(de)] = EN[de];

  let cur = "de";
  try { cur = localStorage.getItem(KEY) || "de"; } catch (_) {}

  const origText = new WeakMap();  // text node → original German value
  const origAttr = new WeakMap();  // element → { attr: original German value }
  const ATTRS = ["placeholder", "title", "aria-label", "alt"];

  const skipParent = (p) => {
    const t = p && p.nodeName;
    return t === "SCRIPT" || t === "STYLE" || t === "NOSCRIPT" || t === "TEXTAREA";
  };

  function apply(lang) {
    // Engineering phase titles are pre-split into per-char spans for the rise
    // animation, so the text-node walker can't match whole words. Translate the
    // word via its data-text and rebuild the char spans (same shape main.js uses).
    document.querySelectorAll(".phase__title .word[data-text]").forEach((el) => {
      if (!el.dataset.textDe) el.dataset.textDe = el.dataset.text || "";
      const de = el.dataset.textDe;
      const target = (lang === "en" && ENn[normKey(de)] != null) ? ENn[normKey(de)] : de;
      if (el.dataset.text === target && el.querySelector(".char")) return;
      el.dataset.text = target;
      el.textContent = "";
      [...target].forEach((c, i) => {
        const s = document.createElement("span");
        s.className = "char";
        s.textContent = c === " " ? " " : c;
        s.style.setProperty("--i", i);
        s.style.animationDelay = "calc(var(--i) * 28ms)";
        el.appendChild(s);
      });
    });

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
        const en = ENn[normKey(de)];
        if (en != null) n.nodeValue = de.replace(de.trim(), en);
      } else if (n.nodeValue !== de) {
        n.nodeValue = de;
      }
    }
    // text-bearing attributes (placeholder/title/aria-label/alt) aren't text
    // nodes, so translate them separately.
    document.querySelectorAll("[placeholder],[title],[aria-label],[alt]").forEach((el) => {
      for (const a of ATTRS) {
        if (!el.hasAttribute(a)) continue;
        let store = origAttr.get(el);
        if (!store) { store = {}; origAttr.set(el, store); }
        if (!(a in store)) store[a] = el.getAttribute(a);
        const de = store[a];
        if (lang === "en") {
          const en = ENn[normKey(de)];
          if (en != null && el.getAttribute(a) !== en) el.setAttribute(a, en);
        } else if (el.getAttribute(a) !== de) {
          el.setAttribute(a, de);
        }
      }
    });
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

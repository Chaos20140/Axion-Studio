/* =========================================================
   REDLINE/STUDIO — Core Script v3
   Highlights: Lenis smooth scroll · canvas-rendered scroll video
   · three.js 3D · perf-aware
   ========================================================= */
(() => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isMobile = window.matchMedia("(max-width: 900px)").matches;
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const lerp  = (a, b, n) => a + (b - a) * n;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* =========================================================
     LENIS — smooth scroll (Apple/Stripe-style inertia)
     Single shared instance, hooked into GSAP ticker so
     ScrollTrigger updates in lock-step.
     ========================================================= */
  let lenis = null;
  if (window.Lenis && !reduce) {
    // try/catch: ein Fehler hier (z.B. CDN liefert inkompatible Version)
    // darf NIE die IIFE killen — sonst bleibt der Loader für immer stehen.
    try {
      lenis = new Lenis({
        duration: 1.15,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        smoothTouch: false,
        wheelMultiplier: 1.0,
        lerp: 0.085,
      });
      /* Firefox-Scrollgeschwindigkeit angleichen.
         Firefox liefert für eine Mausrad-Raste `deltaY: 3` mit `deltaMode: 1`
         (DOM_DELTA_LINE), Chrome und Edge liefern `deltaY: 100` mit
         `deltaMode: 0` (PIXEL). Lenis rechnet Zeilen mit 100/6 ≈ 16.67 um und
         kommt damit auf 50 px statt 100 — Firefox scrollt also halb so schnell.
         Auf einer Seite mit 320vh Sticky-Pin und Video-Scrub fühlt sich das
         zäh und doppelt so lang an.
         Der Multiplikator wird pro Event nachgeführt statt einmalig gesetzt:
         wer zwischen Maus und Präzisions-Touchpad wechselt (Touchpad meldet
         deltaMode 0), bekommt sonst die doppelte Geschwindigkeit ab.
         Capture-Phase, damit es VOR Lenis' eigenem Handler greift.
         Achtung: der Wert sitzt an der VirtualScroll-Instanz, nicht an
         `lenis.options` — Lenis reicht ihn beim Konstruieren als eigenes
         Objektliteral weiter. */
      window.addEventListener("wheel", (e) => {
        const vs = lenis && lenis.virtualScroll;
        if (!vs || !vs.options) return;
        vs.options.wheelMultiplier = e.deltaMode === 1 ? 2 : 1;
      }, { capture: true, passive: true });

      // Use GSAP ticker as the single rAF source — no double scheduling.
      if (window.gsap) {
        gsap.ticker.add((time) => lenis.raf(time * 1000));
        gsap.ticker.lagSmoothing(0);
      } else {
        const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
        requestAnimationFrame(raf);
      }
      // Connect Lenis to ScrollTrigger so pinning + scrub stay aligned.
      if (window.ScrollTrigger) {
        lenis.on("scroll", ScrollTrigger.update);
      }
      window.lenisInstance = lenis;   // used by the Engineering scroll hook (§5.2)
    } catch (_) { lenis = null; }
  }

  /* ---------- LOADER ---------- */
  const loader = $("#loader");
  const loaderCount = $("#loaderCount");
  const loaderBar = $(".loader__bar span");
  if (loader) {
    let n = 0;
    const dur = reduce ? 200 : 1500;
    const start = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      n = Math.round(eased * 100);
      if (loaderCount) loaderCount.textContent = String(n).padStart(3, "0");
      if (loaderBar) loaderBar.style.width = n + "%";
      if (p < 1) requestAnimationFrame(tick);
      else {
        setTimeout(() => {
          loader.classList.add("is-done");
          document.body.classList.add("is-loaded");
        }, 200);
      }
    };
    requestAnimationFrame(tick);
  } else {
    document.body.classList.add("is-loaded");
  }

  /* Kein Custom-Cursor mehr (entfernt am 26.07.2026, siehe CLAUDE.md §2).
     Damit entfallen: eine dauerhaft laufende rAF-Lerp-Schleife, ein globaler
     mousemove-Listener, zwei mouseover/mouseout-Delegates und — der teuerste
     Posten — eine bildschirmfüllende Ebene mit `mix-blend-mode: difference`,
     die den Browser zwang, alles darunter neu zu rastern und zu blenden.
     Der Systemzeiger ist zurück; `cursor: none` steht nirgends mehr. */

  /* ---------- NAV SCROLLED ---------- */
  const nav = $("#nav");
  const onNavScroll = () => {
    if (window.scrollY > 50) nav?.classList.add("is-scrolled");
    else nav?.classList.remove("is-scrolled");
  };
  window.addEventListener("scroll", onNavScroll, { passive: true });
  onNavScroll();

  /* ---------- SERVICE CARD GLOW TRACKING ---------- */
  $$(".service").forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const r = card.getBoundingClientRect();
      const mx = ((e.clientX - r.left) / r.width) * 100;
      const my = ((e.clientY - r.top) / r.height) * 100;
      card.style.setProperty("--mx", mx + "%");
      card.style.setProperty("--my", my + "%");
    });
  });

  /* ---------- INTERSECTION REVEAL ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-in");
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.18, rootMargin: "0px 0px -10% 0px" });
  $$("[data-service], [data-case], [data-step], .stat, .reveal").forEach((el) => io.observe(el));

  /* ---------- STAT COUNTERS ---------- */
  const counters = $$(".stat__num[data-count]");
  const countIO = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseInt(el.dataset.count, 10);
      const dur = reduce ? 200 : 1600;
      const start = performance.now();
      const step = (t) => {
        const p = Math.min(1, (t - start) / dur);
        const eased = 1 - Math.pow(1 - p, 4);
        el.textContent = Math.round(eased * target);
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
      countIO.unobserve(el);
    });
  }, { threshold: 0.4 });
  counters.forEach((el) => countIO.observe(el));

  // Race-Fix: content.js setzt die Counter nach dem site.json-Fetch auf "0"
  // zurück und aktualisiert data-count — war der Observer da schon durch
  // (unobserve nach Animation), blieben die Stats für immer "0". Auf
  // content:loaded alle zurückgesetzten Counter erneut beobachten.
  document.addEventListener("content:loaded", () => {
    counters.forEach((el) => {
      const target = parseInt(el.dataset.count, 10);
      if (el.textContent.trim() === "0" && target > 0) countIO.observe(el);
    });
  });

  /* ---------- HERO VIDEO PAUSE WHEN OFF-SCREEN ---------- */
  const heroVideo = $(".hero__video");
  const heroSection = $(".hero");
  if (heroVideo && heroSection && "IntersectionObserver" in window) {
    const heroIO = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) heroVideo.play().catch(() => {});
        else heroVideo.pause();
      });
    }, { threshold: 0.05 });
    heroIO.observe(heroSection);
  }

  /* ---------- HERO TELEMETRY (only while visible) ---------- */
  const rpmEl = $("#rpm");
  const spdEl = $("#spd");
  let telemetryActive = false;
  if (rpmEl && spdEl && !reduce && "IntersectionObserver" in window) {
    let timer = null;
    const teleIO = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && !timer) {
          timer = setInterval(() => {
            const base = 12480;
            rpmEl.textContent = (base + Math.floor(Math.random() * 200 - 100))
              .toLocaleString("en-US").replace(",", " ");
            spdEl.textContent = 328 + Math.floor(Math.random() * 8 - 4);
          }, 220);
        } else if (!e.isIntersecting && timer) {
          clearInterval(timer); timer = null;
        }
      });
    }, { threshold: 0.05 });
    teleIO.observe(heroSection);
  }

  /* ---------- FOOTER CLOCK ---------- */
  // Sekundentakt nur, solange die Uhr wirklich sichtbar ist (§7: kein
  // setInterval ohne Off-Screen-Gate). Der Footer steht auf jeder Seite ganz
  // unten — ungegated lief hier auf jeder Seite dauerhaft ein Timer plus
  // Layout-Schreibzugriff, auch während der gesamten Scroll-Animationen.
  const clock = $("#clock");
  if (clock) {
    const fmt = (n) => String(n).padStart(2, "0");
    const tickClock = () => {
      const d = new Date();
      clock.textContent = `${fmt(d.getHours())} : ${fmt(d.getMinutes())} : ${fmt(d.getSeconds())} — BERLIN`;
    };
    let clockTimer = null;
    const startClock = () => {
      if (clockTimer) return;
      tickClock();
      clockTimer = setInterval(tickClock, 1000);
    };
    const stopClock = () => {
      if (!clockTimer) return;
      clearInterval(clockTimer);
      clockTimer = null;
    };
    tickClock();
    if ("IntersectionObserver" in window) {
      let onScreen = false;
      new IntersectionObserver((entries) => {
        onScreen = entries.some((e) => e.isIntersecting);
        if (onScreen && !document.hidden) startClock(); else stopClock();
      }, { threshold: 0 }).observe(clock);
      // Hintergrund-Tabs drosseln Timer zwar, halten sie aber am Leben.
      document.addEventListener("visibilitychange", () => {
        if (onScreen && !document.hidden) startClock(); else stopClock();
      });
    } else {
      startClock();
    }
  }

  /* ---------- CONTACT FORM ---------- */
  // POST an die Supabase Edge Function (axion-mail → Strato SMTP). Solange
  // CONTACT_ENDPOINT leer ist, greift der mailto-Fallback an info@axion-studio.de.
  const CONTACT_ENDPOINT = "https://qcbarlmhsgupeqwehnwe.supabase.co/functions/v1/axion-mail";
  const form = $("#contactForm");
  const status = $("#formStatus");
  if (form) {
    const setStatus = (msg, kind) => {
      status.textContent = msg;
      status.classList.remove("is-ok", "is-err");
      if (kind) status.classList.add(kind);
    };
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const name = data.get("name")?.toString().trim() || "";
      const email = data.get("email")?.toString().trim() || "";
      const msg = data.get("message")?.toString().trim() || "";
      const consent = data.get("consent");
      const company = data.get("company")?.toString().trim() || "";
      const services = data.getAll("service").map(String);
      const budget = data.get("budget")?.toString() || "";
      const website = data.get("website")?.toString() || "";  // honeypot

      if (!name || !email || !msg || !consent) {
        setStatus("// ERROR — Bitte Name, E-Mail, Briefing und die Bestätigung ausfüllen.", "is-err");
        return;
      }
      // Muss deckungsgleich mit isEmail() in supabase/functions/axion-mail/index.ts
      // sein — sonst kommt der Nutzer durch die Client-Prüfung und kassiert erst
      // vom Server ein "Ungültige E-Mail-Adresse".
      if (email.length > 254 || !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,63}$/.test(email)) {
        setStatus("// ERROR — E-Mail-Format ungültig.", "is-err");
        return;
      }

      const submit = form.querySelector('[type="submit"]');

      if (CONTACT_ENDPOINT) {
        setStatus("// SENDE SIGNAL …", null);
        if (submit) submit.disabled = true;
        // Ohne Abbruch hängt das Formular bei einem stillen Netzwerk-Stall
        // unbegrenzt im Zustand "SENDE SIGNAL …" — Button gesperrt, ohne dass
        // der Nutzer je eine Rückmeldung bekommt.
        const ctrl = new AbortController();
        const killer = setTimeout(() => ctrl.abort(), 20000);
        try {
          const res = await fetch(CONTACT_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, company, services, budget, message: msg, website }),
            signal: ctrl.signal,
          });
          const json = await res.json().catch(() => ({}));
          if (res.ok && json.ok) {
            setStatus("// SIGNAL EMPFANGEN — wir melden uns innerhalb von 24 h.", "is-ok");
            form.reset();
          } else if (res.status === 429) {
            setStatus("// ERROR — Zu viele Anfragen in kurzer Zeit. Bitte in ein paar Minuten erneut versuchen oder direkt an info@axion-studio.de schreiben.", "is-err");
          } else {
            setStatus("// ERROR — " + (json.error || "Senden fehlgeschlagen. Schreib uns an info@axion-studio.de."), "is-err");
          }
        } catch (err) {
          setStatus(
            err && err.name === "AbortError"
              ? "// ERROR — Zeitüberschreitung. Schreib uns an info@axion-studio.de."
              : "// ERROR — Verbindung fehlgeschlagen. Schreib uns an info@axion-studio.de.",
            "is-err",
          );
        } finally {
          clearTimeout(killer);
          if (submit) submit.disabled = false;
        }
        return;
      }

      // Fallback ohne Backend: mailto an info@axion-studio.de
      setStatus("// ÖFFNE MAIL-CLIENT …", null);
      const subject = encodeURIComponent(`Projekt-Anfrage — ${name}`);
      const body = encodeURIComponent(
        `Name: ${name}\nE-Mail: ${email}\nUnternehmen: ${company || "-"}\n` +
        `Services: ${services.join(", ") || "-"}\nBudget: ${budget || "-"}\n\nBriefing:\n${msg}`
      );
      setTimeout(() => {
        window.location.href = `mailto:info@axion-studio.de?subject=${subject}&body=${body}`;
        setStatus("// MAIL-CLIENT GEÖFFNET.", "is-ok");
        form.reset();
      }, 500);
    });
  }

  /* ---------- ANCHOR LINKS ---------- */
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (id.length < 2) return;
      const el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      // Route through Lenis when present — a native scrollIntoView({behavior:
      // 'smooth'}) would run its own animation that fights Lenis's rAF scroll.
      if (lenis) lenis.scrollTo(el, { offset: -60, duration: 1.2 });
      else el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    });
  });

  /* =========================================================
     BACKGROUND SCROLL VIDEOS — the homepage background AND the
     team.html showreel both run the SAME reusable hybrid proxy-
     scrub (proxyScrub factory below; see CLAUDE.md §5A / §13).
     Mobile: no scrub anywhere — a plain autoplay loop (§5.6).
     ========================================================= */

  /* ---- Homepage background video (#bgScroll) ---- */
  (() => {
    const wrap   = $("#bgScroll");
    const video  = $("#bgScrollVideo");
    const canvas = $("#bgScrollCanvas");
    if (!wrap || !video) return;
    const startEl = $("#manifesto");
    const endEl   = $(".contact") || $("#contact");
    if (!startEl || !endEl) return;

    // Aktiv-Bereich EINMAL messen statt 2x getBoundingClientRect pro Frame/Event
    // (Layout-Reads im Scroll-Hot-Path waren ein §7-Verstoß). Neu messen, wenn
    // sich Layout real ändern kann: resize, CMS-Inhalte, Font-Swap, load.
    let sTop = 0, eBottom = 1;
    const measure = () => {
      const sRect = startEl.getBoundingClientRect();
      const eRect = endEl.getBoundingClientRect();
      sTop = sRect.top + window.scrollY;
      eBottom = eRect.top + window.scrollY + eRect.height * 0.7;
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("load", measure, { once: true });
    document.addEventListener("content:loaded", () => setTimeout(measure, 60));
    if (document.fonts?.ready) document.fonts.ready.then(measure);

    if (isMobile) {
      canvas?.remove();   // canvas only needed on desktop
      const src = document.createElement("source");
      src.src = "assets/video/scroll-mobile.mp4?v=20260726h";
      src.type = "video/mp4";
      video.appendChild(src);
      video.loop = true; video.autoplay = true; video.muted = true;
      video.setAttribute("muted", "");
      video.setAttribute("playsinline", "");
      video.load();
      const tryPlay = () => video.play().catch(() => {});
      video.addEventListener("loadeddata", tryPlay, { once: true });
      document.addEventListener("touchstart", tryPlay, { once: true });
      const onScroll = () => {
        const mid = window.scrollY + window.innerHeight * 0.5;
        wrap.classList.toggle("is-active", mid > sTop && mid < eBottom);
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
      return;
    }
    if (!canvas) return;
    proxyScrub({
      wrap, video, canvas,
      src: "assets/video/scroll.mp4?v=20260726h",
      computeProg: () => {
        const scrollMid = window.scrollY + window.innerHeight * 0.5;
        return clamp((scrollMid - sTop) / Math.max(1, eBottom - sTop), 0, 1);
      },
    });
  })();

  /* ---- Team page: FULL-PAGE scroll-scrub background video (team.html).
          The clip scrubs across the ENTIRE page scroll; content sits on top
          with a tint for legibility (.bg-scroll--page stays always-visible). ---- */
  (() => {
    const wrap   = $("#teamBg");
    const video  = $("#teamBgVideo");
    const canvas = $("#teamBgCanvas");
    if (!wrap || !video) return;

    if (isMobile) {
      canvas?.remove();
      const src = document.createElement("source");
      src.src = "assets/video/team-reel-mobile.mp4?v=20260726h";
      src.type = "video/mp4";
      video.appendChild(src);
      video.loop = true; video.autoplay = true; video.muted = true;
      video.setAttribute("muted", "");
      video.setAttribute("playsinline", "");
      video.load();
      const tryPlay = () => video.play().catch(() => {});
      video.addEventListener("loadeddata", tryPlay, { once: true });
      document.addEventListener("touchstart", tryPlay, { once: true });
      return;
    }
    if (!canvas) return;

    /* Reel-reactive light (DESKTOP only — removed on mobile): drive --reel-flash
       (0..1) continuously from the bg video's currentTime. It RISES as the black
       car turns white (~11s) and FALLS as it turns dark (~13s); CSS maps it to
       two banners opening from the CENTRE outward + a lighter SCREEN tone between
       them (then closing again). */
    {
      const root = document.documentElement;
      const ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
      const whiteEnv = (t) => Math.max(0, Math.min(ss(10.9, 11.4, t), 1 - ss(11.7, 12.3, t)));
      let last = -1;
      const flashTick = () => {
        requestAnimationFrame(flashTick);
        const f = (video.duration && !document.hidden) ? whiteEnv(video.currentTime) : 0;
        if (Math.abs(f - last) > 0.003) { last = f; root.style.setProperty("--reel-flash", f.toFixed(3)); }
      };
      requestAnimationFrame(flashTick);
    }

    proxyScrub({
      wrap, video, canvas,
      src: "assets/video/team-reel.mp4?v=20260726h",
      // eager: der Team-BG ist das immer sichtbare Fundament der Seite —
      // hier gibt es kein Hero-Video, mit dem der Download konkurrieren könnte.
      eagerSource: true,
      // beim Öffnen spielt das Reel einmal komplett durch, dann Scroll-Scrub.
      introPlaythrough: true,
      computeProg: () => {
        const max = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
        return clamp(window.scrollY / max, 0, 1);
      },
    });
  })();

  /* ---- Plain infinite background loop (about.html #bg-loop) — no scrub,
          just an autoplay loop. Nudge play() in case the attribute is gated. ---- */
  (() => {
    const v = $(".bg-loop__video");
    if (!v) return;
    // WCAG 2.2.2: bildschirmfüllende Endlosbewegung darf sich niemandem
    // aufzwingen. Bei prefers-reduced-motion bleibt das Standbild stehen
    // (Poster über --poster/--poster-mobile), das Video wird gar nicht
    // erst gestartet.
    if (reduce) {
      v.removeAttribute("autoplay");
      v.pause();
      return;
    }
    const play = () => v.play().catch(() => {});
    v.addEventListener("loadeddata", play, { once: true });
    document.addEventListener("touchstart", play, { once: true });
    play();
  })();

  /* ---- Quellenwechsel bei Größenänderung ----
     `media` an <source> wird NUR beim Laden ausgewertet, nicht bei einem
     Resize. Wer die Seite in einem schmalen Fenster öffnet (Windows-Snap,
     angedockte DevTools) und danach maximiert, behält sonst den Mobile-Clip:
     720 px Hochformat auf voller Breite, um Faktor ~3.6 hochskaliert. Nur ein
     Reload half.
     Gilt bewusst NUR für die dekorativen Loop-Videos. Die Scrub-Videos
     (#bgScrollVideo, #teamBgVideo) hängen an der Proxy-Engine, deren
     Mobile-Zweig den Canvas bereits entfernt hat — ein load() dort würde die
     laufende Engine unter sich wegziehen. Dort bleibt die Entscheidung vom
     Seitenaufruf stehen. */
  (() => {
    const loops = $$(".hero__video, .bg-loop__video");
    if (!loops.length || !window.matchMedia) return;
    const mq = window.matchMedia("(max-width: 900px)");
    let t = 0;
    const pruefen = () => {
      clearTimeout(t);
      t = setTimeout(() => {
        for (const v of loops) {
          const passend = $$("source", v).find(
            (s) => !s.media || window.matchMedia(s.media).matches,
          );
          if (!passend) continue;
          const soll = new URL(passend.getAttribute("src"), location.href).href;
          if (v.currentSrc === soll) continue;
          const liefVorher = !v.paused;
          v.load();
          // Nicht nur neu starten, wenn es VORHER lief: bei blockiertem Autoplay
          // (Datensparmodus, Energiesparen) wäre das Video sonst nach dem Wechsel
          // dauerhaft eingefroren. Diese Clips sollen laufen — außer bei
          // reduced-motion, wo autoplay oben bewusst entfernt wurde.
          if (!reduce && (liefVorher || v.hasAttribute("autoplay"))) v.play().catch(() => {});
        }
      }, 250);   // Debounce: beim Ziehen des Fensterrands nicht pro Pixel neu laden
    };
    if (mq.addEventListener) mq.addEventListener("change", pruefen);
    else mq.addListener(pruefen);   // Fallback für ältere Safari-Versionen
  })();

  /* =========================================================
     REUSABLE hybrid "proxy scrub" — buttery motion AND zero
     quality loss at rest (CLAUDE.md §5A / §13).
     - The NATIVE <video> is the always-visible layer → at rest
       you see the codec's full-resolution frame. No quality loss.
     - Seeks go through a manager that keeps exactly ONE seek in
       flight (waits for 'seeked' before the next) — that one rule
       kills the decoder seek pile-up that IS the visible stutter.
     - During motion a low-res PROXY strip (≤96 frames @ ~960px)
       is frame-blended on the canvas, then fades out at rest to
       reveal the crisp native frame underneath.
     ========================================================= */
  function proxyScrub({ wrap, video, canvas, src: srcUrl, computeProg, eagerSource = false, introPlaythrough = false }) {
    const FRAME_TARGET = reduce ? 10 : 96;
    const PROXY_W = 960;                       // proxy strip width (motion-only)

    const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });

    let off = null, offCtx = null;             // sized once metadata is known
    let duration     = 0;
    let frames       = [];                     // { t, bmp } proxy frames
    let framesReady  = false;
    let extracting   = false;
    let sourceLoaded = false;
    let smoothedProg = 0;
    let targetProg   = 0;
    let active       = false;
    let motionHold   = 0;                      // frames to keep proxy visible
    let proxyShown   = false;
    let frozen       = false;                  // canvas shows a freeze-frame cover
    let extractScheduled = false;
    // Intro-Playthrough (team.html): das Video spielt beim Öffnen EINMAL
    // komplett durch (0→Ende), erst danach übernimmt der Scroll-Scrub. Bei
    // reduced-motion kein Auto-Playthrough (Bewegung ohne Nutzer-Aktion).
    let introActive   = introPlaythrough && !reduce;
    let postIntroUntil = 0;                     // kurze Rewind/Settle-Phase nach dem Intro

    /* ---- seek manager: one in-flight seek, latest target wins ---- */
    let pendingSeek = false;
    let seekStamp   = 0;
    video.addEventListener("seeked", () => { pendingSeek = false; });
    /* Liegt dieser Zeitpunkt schon im Puffer?
       DAS ist der Unterschied zwischen flüssig und ruckelig. Ein Seek in einen
       gepufferten Bereich kostet wenige Millisekunden; ein Seek in einen NOCH
       NICHT geladenen Bereich wartet auf eine Netzwerk-Range-Anfrage und kostet
       gemessen 32–782 ms — das Zwanzig- bis Fünfzigfache des 60fps-Budgets.
       Genau dieser Fall tritt beim echten Nutzer immer ein: er scrollt los,
       während die Datei noch lädt. Statt zu seeken halten wir dann lieber das
       zuletzt gezeigte Bild — ein stehendes Bild fällt nicht auf, ein
       hängender Scrub schon. */
    const bufferedAt = (t) => {
      const b = video.buffered;
      for (let i = 0; i < b.length; i++) {
        if (t >= b.start(i) - 0.1 && t <= b.end(i)) return true;
      }
      return false;
    };

    const requestSeek = (t) => {
      if (extracting || !sourceLoaded || !duration) return;
      // safety: a seek that never fires 'seeked' unblocks after 300ms
      if (pendingSeek && performance.now() - seekStamp < 300) return;
      if (Math.abs(video.currentTime - t) < 0.033) return;
      if (!bufferedAt(t)) return;          // lieber Standbild als Netz-Stall
      pendingSeek = true;
      seekStamp = performance.now();
      try { video.currentTime = t; } catch (_) { pendingSeek = false; }
    };

    // Canvas sized to viewport at DPR 1 — it only ever shows motion,
    // where extra resolution is invisible; saves fill rate.
    const sizeCanvas = () => {
      const w = wrap.clientWidth, h = wrap.clientHeight;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w; canvas.height = h;
      }
    };
    sizeCanvas();
    window.addEventListener("resize", sizeCanvas);

    /* ---- frame-blended proxy draw (cover-fit) ---- */
    const drawAt = (prog) => {
      if (!framesReady || frames.length === 0) return;
      const cw = canvas.width, ch = canvas.height;
      const exact = prog * (frames.length - 1);
      const i0 = Math.floor(exact);
      const i1 = Math.min(i0 + 1, frames.length - 1);
      const t  = exact - i0;

      const drawBitmap = (bmp, alpha) => {
        const scale = Math.max(cw / bmp.width, ch / bmp.height);
        const dw = bmp.width * scale, dh = bmp.height * scale;
        ctx.globalAlpha = alpha;
        ctx.drawImage(bmp, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
      };
      const a = frames[i0]?.bmp;
      const b = frames[i1]?.bmp;
      if (a) drawBitmap(a, 1.0);
      if (b && i1 !== i0 && t > 0.001) drawBitmap(b, t);
      ctx.globalAlpha = 1.0;
    };

    /* ---- main loop ---- */
    /* Erst einblenden, wenn der Scrub auch wirklich scrubben kann.
       Der Layer fadet ohnehin über 1.2s ein — ihn eine Sekunde später zu
       zeigen fällt niemandem auf. Ihn zu zeigen, während jeder Seek am Netz
       hängt, fällt sofort auf. Einmal scharf geschaltet bleibt es dabei
       (kein Flackern); ab da fängt requestSeek() einzelne Lücken ab.
       Not-Freigabe nach 8s, damit eine langsame Leitung den Hintergrund
       nicht dauerhaft unterschlägt — dann greift eben der Seek-Filter. */
    const ARM_RATIO = 0.9;
    const ARM_TIMEOUT_MS = 8000;
    let armed = false, armClock = 0;
    const scrubArmed = () => {
      if (armed) return true;
      if (!duration || !sourceLoaded) return false;
      if (!armClock) armClock = performance.now();
      let s = 0;
      for (let i = 0; i < video.buffered.length; i++) s += video.buffered.end(i) - video.buffered.start(i);
      if (s / duration >= ARM_RATIO || performance.now() - armClock > ARM_TIMEOUT_MS) armed = true;
      return armed;
    };

    const tick = () => {
      requestAnimationFrame(tick);
      if (introActive) return;   // während des Intros gehört das Video dem play()-Durchlauf
      targetProg = computeProg();
      smoothedProg = lerp(smoothedProg, targetProg, 0.11);

      // Activation: never while the extraction playback is running
      // (the racing video must not be seen). Der postIntro-Settle hält den
      // Scrub kurz aktiv, damit das Video vom Intro-Endframe sanft auf die
      // Scroll-Position lerpt (statt hart zu springen).
      const settle = performance.now() < postIntroUntil;
      const wantActive = settle || (targetProg > 0 && targetProg < 1 && !extracting && scrubArmed());
      if (wantActive !== active) {
        active = wantActive;
        wrap.classList.toggle("is-active", active);
        if (!active) {
          if (proxyShown && !frozen) {         // clear any stale proxy frame
            proxyShown = false;                // (never while the freeze-frame
            canvas.style.opacity = "0";        //  covers a running extraction)
          }
          // snap the resting frame to the exact endpoint (first / last),
          // so an always-visible scrub (e.g. the team reel) shows the right
          // still at progress 0 and 1. Harmless on the hidden homepage bg.
          // NIE während der Extraktion — das würde den Playthrough zerreißen.
          if (duration && sourceLoaded && !extracting) {
            try { video.currentTime = targetProg >= 1 ? duration - 0.05 : 0; } catch (_) {}
          }
        }
      }
      if (!active) return;

      const targetT = smoothedProg * duration;
      requestSeek(targetT);

      // Motion detection: scroll still travelling OR video still
      // catching up → show the proxy strip; otherwise fade it out
      // and let the native full-res frame shine.
      const travelling = Math.abs(targetProg - smoothedProg) > 0.0015;
      const settling   = duration > 0 && Math.abs(video.currentTime - targetT) > 0.05;
      if (travelling || settling) motionHold = 14;           // ~230ms hold
      else if (motionHold > 0) motionHold--;

      const showProxy = framesReady && motionHold > 0;
      if (showProxy) drawAt(smoothedProg);
      if (showProxy !== proxyShown) {
        proxyShown = showProxy;
        canvas.style.opacity = showProxy ? "1" : "0";
      }
    };
    requestAnimationFrame(tick);

    /* ---- attach source late (after first paint) ---- */
    const attachSource = () => {
      const srcEl = document.createElement("source");
      srcEl.src = srcUrl;
      srcEl.type = "video/mp4";
      video.appendChild(srcEl);
      video.load();
    };

    /* ---- proxy extraction: one fast playthrough via rVFC,
            seek-stepping as fallback ---- */
    const extract = async () => {
      duration = video.duration;
      if (!duration || !isFinite(duration)) return;

      const vw = video.videoWidth || 1920, vh = video.videoHeight || 1080;
      const pw = Math.min(PROXY_W, vw);
      const ph = Math.round(pw * (vh / vw));
      off = (typeof OffscreenCanvas !== "undefined")
        ? new OffscreenCanvas(pw, ph)
        : Object.assign(document.createElement("canvas"), { width: pw, height: ph });
      offCtx = off.getContext("2d", { alpha: false });

      extracting = true;
      try {
        if ("requestVideoFrameCallback" in HTMLVideoElement.prototype) {
          try {
            await extractViaPlayback(FRAME_TARGET);
            if (frames.length > 0) return;
          } catch (_) { /* fall through to seek extraction */ }
        }
        await extractViaSeek(FRAME_TARGET, duration / FRAME_TARGET);
      } finally {
        extracting = false;
        framesReady = frames.length > 0;
        video.pause();
        video.playbackRate = 1.0;
        pendingSeek = false;
        // The 4x playthrough leaves currentTime at the end; reset so the
        // resting frame at progress 0 is the FIRST frame, not the last.
        try { video.currentTime = 0; } catch (_) {}
      }
    };

    const extractViaPlayback = (targetCount) => new Promise((resolve, reject) => {
      const raw = [];
      video.muted = true;
      video.playbackRate = 4.0;
      video.currentTime = 0;

      /* Dieses Promise MUSS settlen. Es hing bisher an genau zwei Auswegen —
         dem `ended`-Event und einem abgelehnten `play()`. Bricht das Video
         mittendrin ab (Netzwerk weg, Decode-Fehler), feuert `ended` nie und
         `play()` ist längst aufgelöst: das Promise hängt für immer, das
         `finally` in extract() läuft nie, `extracting` bleibt dauerhaft true
         und `wantActive` ist ab da in JEDEM Frame false. Folge: für den Rest
         der Sitzung überhaupt kein Hintergrundvideo — kein Standbild, kein
         Scrub. Selten, aber ein Totalausfall.
         Bewusst NICHT auf `stalled` reagieren — das feuert regulär bei jeder
         zähen Leitung und würde gesunde Verbindungen abwürgen. */
      let fertig = false;
      let wachhund = 0;
      const onFehler = () => abbruch("Video-Fehler während der Extraktion");
      const aufraeumen = () => {
        clearTimeout(wachhund);
        video.removeEventListener("error", onFehler);
        video.removeEventListener("emptied", onFehler);
      };
      const abbruch = (grund) => {
        if (fertig) return;
        fertig = true;
        aufraeumen();
        reject(new Error(grund));
      };
      const fertigMit = (fn) => {
        if (fertig) return;
        fertig = true;
        aufraeumen();
        fn();
      };
      // Notbremse: doppelte Spieldauer bei 4× Tempo, plus 10s Puffer.
      wachhund = setTimeout(() => abbruch("Extraktion überfällig"), (duration / 4.0) * 2000 + 10000);
      video.addEventListener("error", onFehler);
      video.addEventListener("emptied", onFehler);

      const onFrame = async (_now, meta) => {
        try {
          offCtx.drawImage(video, 0, 0, off.width, off.height);
          raw.push({ t: meta.mediaTime, bmp: await createImageBitmap(off) });
        } catch (_) {}
        if (!video.ended && !video.paused) video.requestVideoFrameCallback(onFrame);
      };
      video.requestVideoFrameCallback(onFrame);

      video.addEventListener("ended", () => {
        if (raw.length < 2) { abbruch("no frames"); return; }
        fertigMit(() => {
          // resample to evenly spaced buckets
          frames = new Array(targetCount);
          for (let i = 0; i < targetCount; i++) {
            const want = (i / (targetCount - 1)) * raw[raw.length - 1].t;
            let best = raw[0], bestD = Math.abs(raw[0].t - want);
            for (let j = 1; j < raw.length; j++) {
              const d = Math.abs(raw[j].t - want);
              if (d < bestD) { best = raw[j]; bestD = d; }
            }
            frames[i] = best;
          }
          for (const r of raw) if (!frames.includes(r)) r.bmp.close?.();
          resolve();
        });
      }, { once: true });

      video.play().catch((e) => abbruch("play() abgelehnt: " + (e && e.name)));
    });

    const extractViaSeek = async (targetCount, step) => {
      video.muted = true;
      for (let i = 0; i < targetCount; i++) {
        const t = i * step;
        await new Promise((res) => {
          // single-resolution guard: whichever fires first ('seeked' or
          // the 400ms safety timeout) wins AND removes the listener, so
          // no stale listener can resolve a later iteration early.
          let settled = false;
          const finish = () => {
            if (settled) return;
            settled = true;
            video.removeEventListener("seeked", finish);
            res();
          };
          video.addEventListener("seeked", finish);
          setTimeout(finish, 400);
          try { video.currentTime = t; } catch (_) { finish(); }
        });
        try {
          offCtx.drawImage(video, 0, 0, off.width, off.height);
          frames.push({ t, bmp: await createImageBitmap(off) });
        } catch (_) {}
      }
    };

    /* ---- Extraktions-Staging (Startup-Jank-Fix, gemessen 2026-07-03) ----
       Vorher lief extract() sofort nach loadedmetadata: der 4x-Playthrough
       kroch dann am DOWNLOAD-Tempo entlang (13-17 MB Clip) und hielt
       `extracting` zig Sekunden auf true → Scrub in der Zeit KOMPLETT tot
       ("Hintergrund stockt am Anfang"). Neu in drei Stufen:
       1) Quelle erst bei erstem Scroll ODER ~5s nach load anhängen
          (eagerSource überspringt das — z.B. Team-BG ohne Hero-Konkurrenz),
       2) Extraktion erst starten, wenn der Clip DURCHGEPUFFERT ist
          (dann ist sie ein ~7s-CPU-Fenster statt netzwerk-gebunden),
       3) währenddessen deckt ein Standbild auf dem Canvas das Video ab —
          der 4x-Durchlauf ist unsichtbar, danach currentTime-Restore.
       Bis die Proxy-Frames da sind, scrubbt das native Video seek-managed
       (funktional, etwas gröber). ---- */
    const bufferedThrough = () => {
      try {
        const b = video.buffered;
        return b.length > 0 && b.end(b.length - 1) >= duration - 1;
      } catch (_) { return false; }
    };

    const drawVideoCover = () => {
      const cw = canvas.width, ch = canvas.height;
      const vw = video.videoWidth || 16, vh = video.videoHeight || 9;
      const scale = Math.max(cw / vw, ch / vh);
      const dw = vw * scale, dh = vh * scale;
      try { ctx.drawImage(video, (cw - dw) / 2, (ch - dh) / 2, dw, dh); } catch (_) {}
    };

    /* ---- Braucht diese Maschine den Proxy überhaupt? (gemessen, nicht geraten)
       Der Bewegungs-Proxy war die Antwort auf LANGSAME Seeks. Seit die
       Scrub-Clips all-I-frame encodet sind, seekt der Decoder auf normaler
       Hardware in wenigen Millisekunden — dann ist der Proxy nicht nur
       überflüssig, er KOSTET: er zeigt während der Bewegung 96 Frames bei
       960 px statt aller Quell-Frames in voller Auflösung, hält ~200 MB
       Bitmaps und blockiert den Scrub für die Dauer der Extraktion.
       Deshalb wird vor der Extraktion die echte Seek-Latenz gemessen. Ist sie
       gut, bleibt der Proxy dauerhaft aus (framesReady bleibt false ⇒ das
       Canvas wird nie eingeblendet). Ist sie schlecht — schwache GPU, zäher
       Decoder —, läuft die Extraktion wie bisher. Messwerte 2026-07-26 auf
       einem normalen Laptop: Median 3.9 ms, p99 7.5 ms bei 1080p all-intra. ---- */
    const SEEK_BUDGET_MS = 8;   // ~halbes 60fps-Frame
    const measureSeekCost = async (n = 8) => {
      const times = [];
      for (let i = 1; i <= n; i++) {
        const t = duration * (i / (n + 1));
        const t0 = performance.now();
        await new Promise((res) => {
          let settled = false;
          const done = () => {
            if (settled) return;
            settled = true;
            video.removeEventListener("seeked", done);
            clearTimeout(bail);
            res();
          };
          const bail = setTimeout(done, 400);   // kein hängendes Promise
          video.addEventListener("seeked", done);
          try { video.currentTime = t; } catch (_) { done(); }
        });
        times.push(performance.now() - t0);
      }
      times.sort((a, b) => a - b);
      return times[Math.floor(times.length / 2)];
    };

    const beginExtract = () => {
      sizeCanvas();
      drawVideoCover();
      frozen = true;
      canvas.style.opacity = "1";
      const preT = video.currentTime;
      const finish = () => {
        try { video.currentTime = preT; } catch (_) {}
        frozen = false;
        proxyShown = false;
        canvas.style.opacity = "0";
      };
      measureSeekCost()
        .then((median) => {
          // Schnell genug: nativ scrubben, in voller Auflösung und mit jedem
          // Quell-Frame statt mit 96 Proxy-Stufen.
          if (median <= SEEK_BUDGET_MS) return finish();
          return extract().catch(() => {}).finally(finish);
        })
        .catch(finish);
    };

    const scheduleExtract = () => {
      if (extractScheduled) return;
      const armedAt = performance.now();
      let pollTimer = 0;
      const tryStart = () => {
        if (extractScheduled) return;
        // voll gepuffert ODER Not-Start nach 45s (falls der Browser nie
        // fertig puffert, reicht readyState >= 3 zum 4x-Abspielen)
        const forced = performance.now() - armedAt > 45000 && video.readyState >= 3;
        if (!bufferedThrough() && !forced) return;
        extractScheduled = true;
        video.removeEventListener("progress", tryStart);
        clearInterval(pollTimer);
        if ("requestIdleCallback" in window) requestIdleCallback(beginExtract, { timeout: 4000 });
        else beginExtract();
      };
      video.addEventListener("progress", tryStart);
      pollTimer = setInterval(tryStart, 1000);
      tryStart();
    };

    /* ---- intro playthrough (team.html): einmal 0→Ende, dann Scrub ---- */
    let introStarted = false, introDone = false;
    const endIntro = () => {
      if (introDone) return;
      introDone = true;
      introActive = false;
      try { video.pause(); } catch (_) {}
      // Scrub startet dort, wo das Intro steht (i.d.R. am Ende) und lerpt in
      // ~1.4s sanft zur aktuellen Scroll-Position (postIntro-Settle in tick()).
      smoothedProg = duration ? clamp(video.currentTime / duration, 0, 1) : 0;
      postIntroUntil = performance.now() + 1400;
    };
    const startIntro = () => {
      if (introStarted || introDone) return;
      introStarted = true;
      try { video.currentTime = 0; } catch (_) {}
      const p = video.play();
      if (p && p.catch) p.catch(() => endIntro());   // Autoplay geblockt → direkt Scrub
    };
    if (introActive) {
      video.addEventListener("canplaythrough", startIntro, { once: true });
      // Übergabe an den Scroll-Scrub NUR nach dem KOMPLETTEN ersten Durchlauf.
      // Scrollen während des Intros lässt das Reel bewusst ungestört weiterlaufen
      // (kein früher Hand-off) — die Seite scrollt, das Video spielt zu Ende.
      video.addEventListener("ended", endIntro, { once: true });
      // Not-Start, falls canplaythrough (langsame Leitung) nie feuert; und
      // absoluter Backstop, falls 'ended' ausbleibt — nie den Scrub blockieren.
      setTimeout(() => { if (!introStarted) startIntro(); }, 6000);
      setTimeout(endIntro, 32000);
    }

    /* ---- bootstrap ---- */
    video.addEventListener("loadedmetadata", () => {
      sourceLoaded = true;
      duration = video.duration || 0;   // ab jetzt scrubbt das native Video seek-managed
      if (!introPlaythrough) scheduleExtract();   // Intro-Modus: nativer keyint=1-Seek statt Proxy
    }, { once: true });

    const deferAttach = () => {
      let attached = false;
      // Wheel/Touch feuern VOR der Scroll-Position — so beginnt das Video schon
      // beim ersten Scroll-Impuls zu laden ("direkt sobald ich runterscrolle").
      const intent = ["wheel", "touchstart", "scroll"];
      const go = () => {
        if (attached) return;
        attached = true;
        intent.forEach((ev) => window.removeEventListener(ev, go));
        attachSource();
      };
      intent.forEach((ev) => window.addEventListener(ev, go, { passive: true }));
      // Fallback: ~1.2s nach load im Idle anhängen — der Clip ist schlank
      // (keyint=1, ~3.7 MB), lädt also im Hintergrund vor UND puffert schnell
      // durch, ohne dem Hero den Start wegzunehmen; ist so schon bereit, falls
      // jemand erst nach ein paar Sekunden scrollt.
      const arm = () => setTimeout(() => {
        if ("requestIdleCallback" in window) requestIdleCallback(go, { timeout: 3000 });
        else go();
      }, 1200);
      if (document.readyState === "complete") arm();
      else window.addEventListener("load", arm, { once: true });
    };

    if (eagerSource) {
      if (document.readyState === "complete") attachSource();
      else window.addEventListener("load", attachSource, { once: true });
    } else {
      deferAttach();
    }
  }

  /* =========================================================
     ENGINEERING — KINETIC TYPOGRAPHY + COLOR-PLAY
     3 phases pinned, scrub-driven crossfade between them.
     Color treatment layers on bg-scroll video shift with scroll.
     ========================================================= */
  (() => {
    const section = $(".engineering");
    if (!section) return;
    const phases = $$(".phase", section);
    if (!phases.length) return;

    // Split each word into character spans so we can stagger-animate them
    const splitChars = () => {
      $$(".word[data-text]", section).forEach((w) => {
        const text = w.dataset.text || w.textContent;
        // Screenreader lesen Char-Spans als Einzelbuchstaben ("C-R-A-F-T") —
        // aria-label + role="text" lässt AT das ganze Wort lesen.
        w.setAttribute("role", "text");
        w.setAttribute("aria-label", text);
        w.innerHTML = "";
        [...text].forEach((c, i) => {
          const s = document.createElement("span");
          s.className = "char";
          s.textContent = c === " " ? " " : c;
          s.style.setProperty("--i", i);
          // Reset animation-delay so it picks up the per-char CSS variable
          s.style.animationDelay = "calc(var(--i) * 28ms)";
          w.appendChild(s);
        });
      });
    };
    splitChars();

    const seqMeter    = $("#seqMeter");
    const chromaMeter = $("#chromaMeter");
    const scrollMeter = $("#scrollMeter");
    const burn   = $(".treatment--burn",   section);
    const cool   = $(".treatment--cool",   section);
    const strobe = $(".treatment--strobe", section);

    // Drive everything through one progress value (0..1) across the section
    const setPhase = (idx) => {
      phases.forEach((p, i) => p.classList.toggle("is-active", i === idx));
      if (seqMeter) seqMeter.textContent = String(idx + 1).padStart(2, "0");
    };

    let currentPhase = -1;

    const onScroll = () => {
      const r = section.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      const prog = clamp(-r.top / Math.max(1, total), 0, 1);

      // Phase derivation — 3 even buckets
      const idx = Math.min(2, Math.floor(prog * 3));
      if (idx !== currentPhase) {
        currentPhase = idx;
        setPhase(idx);
      }

      // Color-treatment crossfade tied to local progress
      // Phase 1 (0..0.33): BURN strong, COOL/STROBE off
      // Phase 2 (0.33..0.66): BURN fades, COOL on
      // Phase 3 (0.66..1.0): STROBE bursts, COOL stays
      const pp1 = clamp(1 - prog * 2.2,        0, 1);  // burn dominance
      const pp2 = clamp((prog - 0.25) * 2.4,   0, 1);  // cool slide
      const pp3 = clamp((prog - 0.6)  * 2.8,   0, 1);  // strobe + chroma

      if (burn)   burn.style.opacity   = (0.35 + pp1 * 0.55).toFixed(3);
      if (cool)   cool.style.opacity   = (pp2 * 0.85).toFixed(3);
      if (strobe) strobe.style.opacity = (pp3 * 0.6).toFixed(3);

      // Hue rotation on the bg-scroll video for a chromatic sweep
      const wrap = $("#bgScroll");
      if (wrap) {
        const hue = -10 + prog * 35;          // -10° at start → +25° at end
        const sat = 1.25 + pp3 * 0.6;
        wrap.style.filter = `hue-rotate(${hue.toFixed(2)}deg) saturate(${sat.toFixed(2)})`;
      }

      if (chromaMeter) chromaMeter.textContent = Math.round(80 + pp3 * 40);
      if (scrollMeter) scrollMeter.textContent = Math.round(prog * 100) + "%";
    };

    // Set initial phase
    setPhase(0);
    onScroll();

    // Use the unified scroll source — Lenis if present, else window
    if (window.lenisInstance) {
      window.lenisInstance.on("scroll", onScroll);
    } else {
      window.addEventListener("scroll", onScroll, { passive: true });
    }
    window.addEventListener("resize", onScroll);
  })();

  /* ---- THREE.JS block removed in v3 ----
     The icosahedron + displacement shader was replaced with kinetic
     typography phases + video color-treatments (above). Three.js CDN
     tag was also removed from index.html.
     -------------------------------------------------------------- */
  /* =========================================================
     GSAP REVEAL ANIMATIONS
     ========================================================= */
  if (window.gsap && window.ScrollTrigger && !reduce) {
    gsap.registerPlugin(ScrollTrigger);

    gsap.to(".hero__video", {
      yPercent: 18, scale: 1.08, ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
    });
    gsap.to(".hero__title", {
      yPercent: -20, opacity: 0.4, ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom 30%", scrub: true },
    });

    gsap.from(".manifesto__text h2 span", {
      y: 80, opacity: 0, duration: 1, stagger: 0.12, ease: "power3.out",
      scrollTrigger: { trigger: ".manifesto", start: "top 70%" },
    });
    gsap.from(".services__title", {
      y: 60, opacity: 0, duration: 1, ease: "power3.out",
      scrollTrigger: { trigger: ".services", start: "top 75%" },
    });
    // Engineering enter animation — fade up the kicker + lead
    gsap.from(".engineering__head", {
      y: 30, opacity: 0, duration: 0.9, ease: "power3.out",
      scrollTrigger: { trigger: ".engineering", start: "top 70%" },
    });
    gsap.from(".process__title", {
      y: 60, opacity: 0, duration: 1, ease: "power3.out",
      scrollTrigger: { trigger: ".process", start: "top 75%" },
    });
    // (Die frühere .work-Section gibt es nicht mehr — die Referenzen leben auf
    //  projekte.html. Der Reveal dafür stand hier noch und hat bei jedem
    //  Seitenaufruf zwei GSAP-Warnungen in die Konsole geschrieben.)
    gsap.from(".contact__title", {
      y: 80, opacity: 0, duration: 1.2, ease: "power3.out",
      scrollTrigger: { trigger: ".contact", start: "top 70%" },
    });

    /* PROCESS — F1 STARTING GRID (staggered formation)
       Per slot, in order: .is-set draws the grid-box marking +
       number, then .is-parked sends the car driving in from the
       centre lane. Each slot arms when IT scrolls into view, but a
       promise chain guarantees strict P1→P2→P3→P4 sequencing even
       if several slots are visible at once. */
    const slots = gsap.utils.toArray(".grid__slot[data-step]");
    if (slots.length) {
      let chain = Promise.resolve();
      const launch = (slot) => {
        chain = chain.then(() => new Promise((done) => {
          slot.classList.add("is-set");                 // marking draws in
          setTimeout(() => {
            slot.classList.add("is-parked");            // car drives in
            setTimeout(done, 480);                      // spacing to next car
          }, 420);
        }));
      };
      slots.forEach((slot) => {
        ScrollTrigger.create({
          trigger: slot,
          start: "top 84%",
          once: true,
          onEnter: () => launch(slot),
        });
      });
    } else {
      // Fallback for any legacy [data-step] markup
      gsap.utils.toArray("[data-step]").forEach((step) => {
        gsap.fromTo(step,
          { x: -40, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.9, ease: "power3.out",
            scrollTrigger: { trigger: step, start: "top 80%" } }
        );
      });
    }

    gsap.from(".footer__giant", {
      y: 200, ease: "power3.out", duration: 1.4,
      scrollTrigger: { trigger: ".footer", start: "top 80%" },
    });
  }

  /* Fallback ohne GSAP/ScrollTrigger oder bei prefers-reduced-motion:
     die Process-Slots stehen per CSS auf opacity 0 und werden NUR über
     .is-set/.is-parked sichtbar — ohne diesen Pfad wären Steps + F1-Cars
     Content-Verlust (leere Grid-Boxen), kein Animations-Downgrade. */
  if (!(window.gsap && window.ScrollTrigger) || reduce) {
    const slots = $$(".grid__slot[data-step]");
    if (slots.length && "IntersectionObserver" in window) {
      const slotIO = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          en.target.classList.add("is-set", "is-parked");
          slotIO.unobserve(en.target);
        });
      }, { threshold: 0.25 });
      slots.forEach((s) => slotIO.observe(s));
    } else {
      slots.forEach((s) => s.classList.add("is-set", "is-parked"));
    }
  }

  /* =========================================================
     MOBILE NAV — burger toggle + overlay
     ========================================================= */
  (() => {
    const burger = $("#navBurger");
    const overlay = $("#mobileNav");
    if (!burger || !overlay) return;
    const links = $$("[data-mobile-link]", overlay);
    links.forEach((a, i) => a.style.setProperty("--i", i));

    // Alles, was beim geöffneten Overlay HINTER dem Overlay liegt und sonst
    // weiter fokussierbar bliebe. inert nimmt es zusätzlich aus dem
    // Accessibility-Tree — sonst tabbt man aus dem Menü heraus in eine Seite,
    // die man gar nicht sieht.
    const behind = [$("#nav"), $("main"), $("footer"), $(".wa-fab")].filter(Boolean);
    const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const setOpen = (open) => {
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      overlay.classList.toggle("is-open", open);
      overlay.setAttribute("aria-hidden", open ? "false" : "true");
      document.body.classList.toggle("nav-open", open);
      if (lenis) open ? lenis.stop() : lenis.start();
      // Der Burger sitzt IM #nav — er muss bedienbar bleiben, damit man das
      // Menü auch wieder schließen kann.
      behind.forEach((el) => {
        if (el.contains(burger)) return;
        if (open) el.setAttribute("inert", ""); else el.removeAttribute("inert");
      });
      if (open) {
        (overlay.querySelector(FOCUSABLE) || overlay).focus({ preventScroll: true });
      } else {
        burger.focus({ preventScroll: true });
      }
    };

    burger.addEventListener("click", () => {
      const isOpen = burger.getAttribute("aria-expanded") === "true";
      setOpen(!isOpen);
    });

    document.addEventListener("keydown", (e) => {
      if (burger.getAttribute("aria-expanded") !== "true") return;
      if (e.key === "Escape") { setOpen(false); return; }
      if (e.key !== "Tab") return;
      // Fokus im Overlay halten: Tab am Ende springt an den Anfang und umgekehrt.
      const items = [...overlay.querySelectorAll(FOCUSABLE), burger].filter(
        (el) => el.offsetParent !== null || el === burger,
      );
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    links.forEach((a) => {
      a.addEventListener("click", (e) => {
        const id = a.getAttribute("href");
        setOpen(false);
        if (id && id.startsWith("#")) {
          e.preventDefault();
          // wait a tick so the overlay starts closing before we scroll
          setTimeout(() => {
            const el = document.querySelector(id);
            if (el) {
              if (lenis) lenis.scrollTo(el, { offset: -60, duration: 1.2 });
              else el.scrollIntoView({ behavior: "smooth", block: "start" });
            }
          }, 80);
        }
      });
    });

    // close on resize past breakpoint
    window.addEventListener("resize", () => {
      if (window.innerWidth > 900 && burger.getAttribute("aria-expanded") === "true") {
        setOpen(false);
      }
    });
  })();
})();

/* =========================================================
   Kein Consent-Banner: die Seite setzt keine Cookies und lädt
   keine Einbettung, die auf dem Endgerät speichert oder liest
   (Cloudflare Web Analytics arbeitet cookielos, § 25 TDDDG greift
   damit nicht). Der frühere Banner war folgenlos — er hat nichts
   freigeschaltet und nichts blockiert — und stand damit im
   Widerspruch zur eigenen Datenschutzerklärung. Kommt später ein
   echtes Drittanbieter-Embed dazu (z. B. Google Maps), MUSS hier
   ein echtes Gate wieder rein: Embed erst nach Zustimmung laden,
   Ablehnung dauerhaft respektieren, Widerruf ermöglichen.
   ========================================================= */

/* =========================================================
   CONTACT SHORTCUTS — floating WhatsApp button (all pages) +
   a WhatsApp icon in the mobile-nav footer. wa.me opens the
   chat directly. (Instagram is added once the handle is known.)
   ========================================================= */
(() => {
  const WA = "https://wa.me/4917676668002?text=" +
    encodeURIComponent("Hallo Axion Studio! Ich interessiere mich für ein Projekt.");
  const WA_SVG =
    '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16.04 4C9.45 4 4.1 9.35 4.1 15.94c0 2.1.55 4.16 1.6 5.97L4 28l6.25-1.64a11.9 11.9 0 0 0 5.79 1.48h.01c6.58 0 11.93-5.35 11.94-11.94A11.86 11.86 0 0 0 16.04 4zm0 21.79h-.01a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.71.97.99-3.62-.24-.37a9.86 9.86 0 0 1-1.51-5.24c0-5.47 4.45-9.92 9.93-9.92 2.65 0 5.14 1.03 7.02 2.91a9.86 9.86 0 0 1 2.91 7.02c-.01 5.47-4.46 9.91-9.96 9.91zm5.45-7.42c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.49 0 1.47 1.07 2.89 1.22 3.09.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.19 1.87.12.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35z"/></svg>';

  // Floating WhatsApp button (every page)
  const fab = document.createElement("a");
  fab.className = "wa-fab";
  fab.href = WA; fab.target = "_blank"; fab.rel = "noopener noreferrer";
  fab.setAttribute("aria-label", "Direkt über WhatsApp Kontakt aufnehmen");
  fab.innerHTML = WA_SVG;
  const mountFab = () => document.body.appendChild(fab);
  if (document.body) mountFab();
  else document.addEventListener("DOMContentLoaded", mountFab, { once: true });

  // WhatsApp icon in the mobile-nav footer
  const foot = document.querySelector(".mobile-nav__foot");
  if (foot) {
    const row = document.createElement("div");
    row.className = "mobile-nav__social";
    const wa = document.createElement("a");
    wa.className = "is-wa";
    wa.href = WA; wa.target = "_blank"; wa.rel = "noopener noreferrer";
    wa.setAttribute("aria-label", "WhatsApp");
    wa.innerHTML = WA_SVG;
    row.appendChild(wa);
    foot.appendChild(row);
  }
})();

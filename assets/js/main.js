/* =========================================================
   REDLINE/STUDIO — Core Script v3
   Highlights: Lenis smooth scroll · canvas-rendered scroll video
   · three.js 3D · perf-aware
   ========================================================= */
(() => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isTouch = window.matchMedia("(hover: none)").matches;
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
    lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      smoothTouch: false,
      wheelMultiplier: 1.0,
      lerp: 0.085,
    });
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

  /* ---------- CUSTOM CURSOR ---------- */
  const cursor = $(".cursor");
  const cdot = $(".cursor__dot");
  const cring = $(".cursor__ring");
  let pointerX = window.innerWidth / 2, pointerY = window.innerHeight / 2;

  window.addEventListener("mousemove", (e) => {
    pointerX = e.clientX; pointerY = e.clientY;
  });

  if (cursor && !isTouch) {
    let dx = pointerX, dy = pointerY, rx = pointerX, ry = pointerY;
    const tickCursor = () => {
      dx = lerp(dx, pointerX, 0.55);
      dy = lerp(dy, pointerY, 0.55);
      rx = lerp(rx, pointerX, 0.18);
      ry = lerp(ry, pointerY, 0.18);
      if (cdot) cdot.style.transform = `translate3d(${dx}px, ${dy}px, 0) translate(-50%, -50%)`;
      if (cring) cring.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;
      requestAnimationFrame(tickCursor);
    };
    tickCursor();

    const hoverables = "a, button, .chip, .service, .case, .nav__cta, .footer__top-btn, input, textarea, [data-magnetic]";
    document.addEventListener("mouseover", (e) => {
      if (e.target.closest(hoverables)) cursor.classList.add("is-hover");
    });
    document.addEventListener("mouseout", (e) => {
      if (e.target.closest(hoverables)) cursor.classList.remove("is-hover");
    });
  }

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
  const clock = $("#clock");
  if (clock) {
    const fmt = (n) => String(n).padStart(2, "0");
    const tickClock = () => {
      const d = new Date();
      clock.textContent = `${fmt(d.getHours())} : ${fmt(d.getMinutes())} : ${fmt(d.getSeconds())} — BERLIN`;
    };
    tickClock();
    setInterval(tickClock, 1000);
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
        setStatus("// ERROR — Bitte Name, E-Mail, Briefing und Zustimmung ausfüllen.", "is-err");
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setStatus("// ERROR — E-Mail-Format ungültig.", "is-err");
        return;
      }

      const submit = form.querySelector('[type="submit"]');

      if (CONTACT_ENDPOINT) {
        setStatus("// SENDE SIGNAL …", null);
        if (submit) submit.disabled = true;
        try {
          const res = await fetch(CONTACT_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, company, services, budget, message: msg, website }),
          });
          const json = await res.json().catch(() => ({}));
          if (res.ok && json.ok) {
            setStatus("// SIGNAL EMPFANGEN — wir melden uns innerhalb von 24 h.", "is-ok");
            form.reset();
          } else {
            setStatus("// ERROR — " + (json.error || "Senden fehlgeschlagen. Schreib uns an info@axion-studio.de."), "is-err");
          }
        } catch (_) {
          setStatus("// ERROR — Verbindung fehlgeschlagen. Schreib uns an info@axion-studio.de.", "is-err");
        } finally {
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
      el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
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

    if (isMobile) {
      canvas?.remove();   // canvas only needed on desktop
      const src = document.createElement("source");
      src.src = "assets/video/scroll-mobile.mp4?v=20260523g";
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
        const sTop = startEl.getBoundingClientRect().top + window.scrollY;
        const eBox = endEl.getBoundingClientRect();
        const eBottom = eBox.top + window.scrollY + eBox.height * 0.7;
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
      src: "assets/video/scroll.mp4?v=20260523g",
      computeProg: () => {
        const sTop = startEl.getBoundingClientRect().top + window.scrollY;
        const eBox = endEl.getBoundingClientRect();
        const eBottom = eBox.top + window.scrollY + eBox.height * 0.7;
        const scrollMid = window.scrollY + window.innerHeight * 0.5;
        return clamp((scrollMid - sTop) / (eBottom - sTop), 0, 1);
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
      src.src = "assets/video/team-reel-mobile.mp4?v=20260611a";
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
      src: "assets/video/team-reel.mp4?v=20260611a",
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
    const play = () => v.play().catch(() => {});
    v.addEventListener("loadeddata", play, { once: true });
    document.addEventListener("touchstart", play, { once: true });
    play();
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
  function proxyScrub({ wrap, video, canvas, src: srcUrl, computeProg }) {
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

    /* ---- seek manager: one in-flight seek, latest target wins ---- */
    let pendingSeek = false;
    let seekStamp   = 0;
    video.addEventListener("seeked", () => { pendingSeek = false; });
    const requestSeek = (t) => {
      if (extracting || !sourceLoaded || !duration) return;
      // safety: a seek that never fires 'seeked' unblocks after 300ms
      if (pendingSeek && performance.now() - seekStamp < 300) return;
      if (Math.abs(video.currentTime - t) < 0.033) return;
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
    const tick = () => {
      requestAnimationFrame(tick);
      targetProg = computeProg();
      smoothedProg = lerp(smoothedProg, targetProg, 0.11);

      // Activation: never while the extraction playback is running
      // (the racing video must not be seen).
      const wantActive = targetProg > 0 && targetProg < 1 && !extracting;
      if (wantActive !== active) {
        active = wantActive;
        wrap.classList.toggle("is-active", active);
        if (!active) {
          if (proxyShown) {                    // clear any stale proxy frame
            proxyShown = false;
            canvas.style.opacity = "0";
          }
          // snap the resting frame to the exact endpoint (first / last),
          // so an always-visible scrub (e.g. the team reel) shows the right
          // still at progress 0 and 1. Harmless on the hidden homepage bg.
          if (duration && sourceLoaded) {
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

      const onFrame = async (_now, meta) => {
        try {
          offCtx.drawImage(video, 0, 0, off.width, off.height);
          raw.push({ t: meta.mediaTime, bmp: await createImageBitmap(off) });
        } catch (_) {}
        if (!video.ended && !video.paused) video.requestVideoFrameCallback(onFrame);
      };
      video.requestVideoFrameCallback(onFrame);

      video.addEventListener("ended", () => {
        if (raw.length < 2) { reject(new Error("no frames")); return; }
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
      }, { once: true });

      video.play().catch(reject);
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

    /* ---- bootstrap ---- */
    video.addEventListener("loadedmetadata", () => {
      sourceLoaded = true;
      // Even if extraction fails entirely, the seek-managed native
      // video still scrubs (slightly chunkier, but functional).
      extract().catch(() => {});
    }, { once: true });

    if (document.readyState === "complete") attachSource();
    else window.addEventListener("load", attachSource, { once: true });
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
    gsap.from(".work__title", {
      y: 60, opacity: 0, duration: 1, ease: "power3.out",
      scrollTrigger: { trigger: ".work", start: "top 75%" },
    });
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

  /* =========================================================
     MOBILE NAV — burger toggle + overlay
     ========================================================= */
  (() => {
    const burger = $("#navBurger");
    const overlay = $("#mobileNav");
    if (!burger || !overlay) return;
    const links = $$("[data-mobile-link]", overlay);
    links.forEach((a, i) => a.style.setProperty("--i", i));

    const setOpen = (open) => {
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      overlay.classList.toggle("is-open", open);
      overlay.setAttribute("aria-hidden", open ? "false" : "true");
      document.body.classList.toggle("nav-open", open);
      if (lenis) open ? lenis.stop() : lenis.start();
    };

    burger.addEventListener("click", () => {
      const isOpen = burger.getAttribute("aria-expanded") === "true";
      setOpen(!isOpen);
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
   COOKIE CONSENT — shown on first visit (all pages). The choice
   is stored in localStorage. Any third-party embed carrying a
   data-consent-src is only loaded after "accept" (generic gate).
   ========================================================= */
(() => {
  const KEY = "atm-consent";
  let stored = null;
  try { stored = localStorage.getItem(KEY); } catch (_) {}

  const loadGated = () => {
    document.querySelectorAll("[data-consent-src]").forEach((el) => {
      if (!el.getAttribute("src")) el.setAttribute("src", el.getAttribute("data-consent-src"));
    });
    document.querySelectorAll(".map-consent").forEach((el) => el.remove());
  };

  const setConsent = (choice) => {
    try { localStorage.setItem(KEY, choice); } catch (_) {}
    if (choice === "accepted") loadGated();
    document.body.classList.remove("cookie-open");
    const bar = document.querySelector(".cookie-bar");
    if (bar) { bar.classList.remove("is-in"); setTimeout(() => bar.remove(), 450); }
  };

  // Delegated handler — works for the banner buttons AND a "Karte laden" button.
  document.addEventListener("click", (e) => {
    const btn = e.target instanceof Element && e.target.closest("[data-consent]");
    if (!btn) return;
    e.preventDefault();
    setConsent(btn.getAttribute("data-consent"));
  });

  if (stored === "accepted") { loadGated(); return; }
  if (stored === "declined") { return; }  // already chose — no banner

  const bar = document.createElement("div");
  bar.className = "cookie-bar";
  bar.setAttribute("role", "dialog");
  bar.setAttribute("aria-label", "Cookie-Hinweis");
  bar.innerHTML =
    '<div class="cookie-bar__inner">' +
      '<p class="cookie-bar__text">Wir verwenden nur technisch notwendige Cookies. Mehr dazu in der <a href="impressum.html#datenschutz">Datenschutzerklärung</a>.</p>' +
      '<div class="cookie-bar__actions">' +
        '<button type="button" class="cookie-bar__btn cookie-bar__btn--ghost" data-consent="declined">Nur notwendige</button>' +
        '<button type="button" class="cookie-bar__btn cookie-bar__btn--solid" data-consent="accepted">Alle akzeptieren</button>' +
      '</div>' +
    '</div>';

  const mount = () => {
    document.body.appendChild(bar);
    document.body.classList.add("cookie-open");
    requestAnimationFrame(() => bar.classList.add("is-in"));
    document.dispatchEvent(new Event("content:loaded"));  // let i18n translate the banner
  };
  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount, { once: true });
})();

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

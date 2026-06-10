/* =========================================================
   APEX/THRUST MEDIA — SOLAR SYSTEM BACKGROUND
   Ambient interactive 3D scene behind the subpages
   (team / partner / kontakt). A dark, red-accented solar
   system: the sun is the studio core, each planet is one
   chapter of the company. Click a planet → camera focuses
   it and an info panel opens with the story + a link.

   Interaction model:
   - The canvas sits at z-index -2 and never receives
     pointer events itself. We listen on `window`, ignore
     clicks on real UI (links, buttons, forms), and raycast
     everything else. So planets are clickable "through"
     empty page regions without stealing UI input.
   ========================================================= */
import * as THREE from "three";

(() => {
  const reduce   = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isMobile = window.matchMedia("(max-width: 900px)").matches;
  const canvas = document.getElementById("solarCanvas");
  if (!canvas) return;

  const panel  = document.getElementById("solarPanel");
  const pKick  = document.getElementById("solarKicker");
  const pTitle = document.getElementById("solarTitle");
  const pText  = document.getElementById("solarText");
  const pCta   = document.getElementById("solarCta");
  const pClose = document.getElementById("solarClose");
  const hint   = document.getElementById("solarHint");
  const cursorEl = document.querySelector(".cursor");

  const lerp  = (a, b, n) => a + (b - a) * n;

  /* ---------- CONTENT: the system IS the company ---------- */
  const SUN_CFG = {
    id: "core", label: "APEX CORE", kicker: "/ 00 — CORE",
    title: "Apex Thrust Media",
    text: "Der Kern des Systems: ein unabhängiges Web-Design-Studio aus Meschede. Apex — Präzision. Thrust — Schub. Media — das Medium. Gegründet 2024 von Tolunay Usul.",
    href: "about.html", cta: "Das Studio →",
  };
  const PLANET_CFG = [
    { id: "manifest", label: "MANIFEST", kicker: "/ 01 — STUDIO", title: "Das Manifest",
      text: "Websites, die einschlagen — brutalistisch, performance-getrieben, kompromisslos. Templates sind Komfortzone. Wir bauen Originale.",
      href: "about.html", cta: "Über Uns →",
      radius: 0.30, orbit: 2.6, speed: 0.16, angle0: 0.6,  tone: 0x33141c, accent: 0xff1f3d },
    { id: "services", label: "SERVICES", kicker: "/ 02 — BUILD", title: "Vier Disziplinen",
      text: "Web Design, Development, Motion & 3D, Brand Identity. Ein kompromissloser Standard, vier Wege dorthin.",
      href: "index.html#services", cta: "Services →",
      radius: 0.42, orbit: 3.7, speed: 0.115, angle0: 2.4, tone: 0x241019, accent: 0xff4a64 },
    { id: "engineering", label: "ENGINEERING", kicker: "/ 03 — CRAFT", title: "Code als Craft",
      text: "GSAP, Three.js, WebGL-Shader. Bewegung, die transportiert — 60 fps, unverhandelbar, auf jedem Gerät.",
      href: "index.html#engineering", cta: "Engineering →",
      radius: 0.26, orbit: 4.7, speed: 0.09, angle0: 4.4,  tone: 0x1c0d12, accent: 0xff8095 },
    { id: "team", label: "TEAM", kicker: "/ 04 — CREW", title: "Das Team",
      text: "Klein, scharf, schnell. Ein Boxenstopp-Team mit klarer Verantwortung — maximal vier aktive Projekte gleichzeitig.",
      href: "team.html", cta: "Crew kennenlernen →",
      radius: 0.34, orbit: 5.7, speed: 0.07, angle0: 1.5,  tone: 0x2b1a1e, accent: 0xffd2d8 },
    { id: "partner", label: "PARTNER", kicker: "/ 05 — ALLIANCES", title: "Allianzen",
      text: "Tech-Stack von Vercel bis Stripe — plus offene Slots für Studios und Freelancer, die Champions League spielen.",
      href: "partner.html", cta: "Partner werden →",
      radius: 0.38, orbit: 6.9, speed: 0.055, angle0: 5.3, tone: 0x201318, accent: 0xff1f3d, ring: true },
    { id: "kontakt", label: "KONTAKT", kicker: "/ 06 — SIGNAL", title: "Open a Channel",
      text: "Drei Sätze reichen: was du baust, bis wann, welches Budget. Antwort in unter 24 Stunden — vom Gründer, nicht vom Bot.",
      href: "kontakt.html", cta: "Kontakt aufnehmen →",
      radius: 0.30, orbit: 8.0, speed: 0.045, angle0: 3.3, tone: 0x36121a, accent: 0xff1f3d },
  ];

  /* ---------- RENDERER ---------- */
  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: true, alpha: true, powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
  const CAM_BASE = new THREE.Vector3(0, 3.6, 11.8);
  camera.position.copy(CAM_BASE);

  /* ---------- LIGHTS — defensive layering so planets always read ---------- */
  scene.add(new THREE.AmbientLight(0xffffff, 0.38));
  const camFill = new THREE.DirectionalLight(0xfff0ec, 0.5);
  camFill.position.set(0, 4, 10);
  scene.add(camFill);
  // Sun-anchored red point light → planets lit from the core
  const sunLight = new THREE.PointLight(0xff5a6e, 28, 0, 1.4);
  scene.add(sunLight);

  /* ---------- SYSTEM GROUP ---------- */
  const SYSTEM_X = isMobile ? 0 : 1.8;
  const system = new THREE.Group();
  system.position.x = SYSTEM_X;
  system.scale.setScalar(isMobile ? 0.62 : 0.85);
  system.rotation.x = 0.34;
  system.rotation.z = 0.05;
  scene.add(system);
  sunLight.position.set(SYSTEM_X, 0, 0);

  /* ---------- SUN ---------- */
  const sunMesh = new THREE.Mesh(
    new THREE.SphereGeometry(1.0, 48, 48),
    new THREE.MeshBasicMaterial({ color: 0x2a0a10 })
  );
  sunMesh.userData.cfg = SUN_CFG;
  system.add(sunMesh);

  // Inner hot core (slightly smaller, brighter)
  const sunCore = new THREE.Mesh(
    new THREE.SphereGeometry(0.86, 32, 32),
    new THREE.MeshBasicMaterial({
      color: 0xff1f3d, transparent: true, opacity: 0.55,
      blending: THREE.AdditiveBlending, depthWrite: false,
    })
  );
  sunMesh.add(sunCore);

  // Glow sprite from a generated radial-gradient texture
  const glowTex = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const x = c.getContext("2d");
    const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0.0, "rgba(255, 90, 110, 0.85)");
    g.addColorStop(0.3, "rgba(255, 31, 61, 0.32)");
    g.addColorStop(1.0, "rgba(255, 31, 61, 0)");
    x.fillStyle = g;
    x.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  sunGlow.scale.setScalar(6.5);
  sunMesh.add(sunGlow);

  /* ---------- ORBIT RINGS ---------- */
  const orbitLine = (r) => {
    const pts = [];
    for (let i = 0; i <= 128; i++) {
      const a = (i / 128) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
    }
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    return new THREE.Line(g, new THREE.LineBasicMaterial({
      color: 0xff1f3d, transparent: true, opacity: 0.13,
    }));
  };

  /* ---------- PLANETS ---------- */
  const planets = [];   // { cfg, pivot, mesh, baseEmissive }
  for (const cfg of PLANET_CFG) {
    system.add(orbitLine(cfg.orbit));

    const pivot = new THREE.Group();
    pivot.rotation.y = cfg.angle0;
    system.add(pivot);

    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(cfg.radius, 32, 32),
      new THREE.MeshStandardMaterial({
        color: cfg.tone,
        roughness: 0.55,
        metalness: 0.35,
        emissive: cfg.accent,
        emissiveIntensity: 0.14,
      })
    );
    mesh.position.x = cfg.orbit;
    mesh.userData.cfg = cfg;
    pivot.add(mesh);

    if (cfg.ring) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(cfg.radius * 1.55, cfg.radius * 2.3, 48),
        new THREE.MeshBasicMaterial({
          color: 0xff1f3d, transparent: true, opacity: 0.30,
          side: THREE.DoubleSide, depthWrite: false,
        })
      );
      ring.rotation.x = Math.PI / 2 - 0.35;
      mesh.add(ring);
    }

    planets.push({ cfg, pivot, mesh, angle: cfg.angle0 });
  }

  /* ---------- STARFIELD ---------- */
  {
    const N = isMobile ? 420 : 1000;
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      // shell between r 26..60
      const r = 26 + Math.random() * 34;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
      if (Math.random() < 0.15) { col[i*3] = 1.0; col[i*3+1] = 0.25; col[i*3+2] = 0.35; }
      else { col[i*3] = 0.62; col[i*3+1] = 0.58; col[i*3+2] = 0.58; }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color",    new THREE.BufferAttribute(col, 3));
    const stars = new THREE.Points(g, new THREE.PointsMaterial({
      size: 0.07, vertexColors: true, transparent: true,
      opacity: 0.8, sizeAttenuation: true, depthWrite: false,
    }));
    scene.add(stars);
  }

  /* ---------- SIZE ---------- */
  const resize = () => {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener("resize", resize);

  /* ---------- PICKING ---------- */
  const raycaster = new THREE.Raycaster();
  const pointerNdc = new THREE.Vector2(10, 10);   // off-screen until first move
  const pickables = [sunMesh, ...planets.map(p => p.mesh)];
  let hovered = null;
  let selected = null;
  const hintText = document.getElementById("solarHintText");
  const HINT_DEFAULT = hintText ? hintText.textContent : "";

  const INTERACTIVE_SEL =
    "a, button, input, textarea, select, label, nav, .nav, .mobile-nav, " +
    ".solar-panel, .footer, .contact__form, .nav__burger";

  window.addEventListener("pointermove", (e) => {
    pointerNdc.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointerNdc.y = -(e.clientY / window.innerHeight) * 2 + 1;
  }, { passive: true });

  const openPanel = (cfg) => {
    if (!panel) return;
    if (pKick)  pKick.textContent  = cfg.kicker;
    if (pTitle) pTitle.textContent = cfg.title;
    if (pText)  pText.textContent  = cfg.text;
    if (pCta) {
      pCta.href = cfg.href;
      const here = location.pathname.split("/").pop() || "index.html";
      pCta.textContent = (cfg.href.split("#")[0] === here) ? "Du bist hier ●" : cfg.cta;
    }
    panel.classList.add("is-open");
    panel.setAttribute("aria-hidden", "false");
    hint?.classList.add("is-dim");
  };
  const closePanel = () => {
    selected = null;
    panel?.classList.remove("is-open");
    panel?.setAttribute("aria-hidden", "true");
  };

  window.addEventListener("click", (e) => {
    if (e.target.closest(INTERACTIVE_SEL)) return;
    raycaster.setFromCamera(pointerNdc, camera);
    const hit = raycaster.intersectObjects(pickables, false)[0];
    if (hit) {
      selected = hit.object;
      openPanel(hit.object.userData.cfg);
    } else if (selected) {
      closePanel();
    }
  });
  pClose?.addEventListener("click", closePanel);
  window.addEventListener("keydown", (e) => { if (e.key === "Escape") closePanel(); });

  /* ---------- RENDER LOOP ---------- */
  const clock = new THREE.Clock();
  const camTarget = new THREE.Vector3(SYSTEM_X, 0, 0);
  const tmpV1 = new THREE.Vector3();
  const tmpV2 = new THREE.Vector3();
  const FOCUS_OFFSET = new THREE.Vector3(0, 0.8, 2.6);
  let sunPulse = 0;

  const render = () => {
    requestAnimationFrame(render);
    if (document.hidden) return;

    const dt = Math.min(clock.getDelta(), 0.05);
    const speedMul = reduce ? 0 : 1;

    // Orbits + self-rotation
    for (const p of planets) {
      p.angle += dt * p.cfg.speed * speedMul;
      p.pivot.rotation.y = p.angle;
      p.mesh.rotation.y += dt * 0.3 * speedMul;
    }
    system.rotation.y += dt * 0.015 * speedMul;

    // Sun pulse
    sunPulse += dt * 1.6 * speedMul;
    sunGlow.scale.setScalar(6.5 + Math.sin(sunPulse) * 0.45);

    // Hover raycast (objects move, so test every frame)
    raycaster.setFromCamera(pointerNdc, camera);
    const hit = raycaster.intersectObjects(pickables, false)[0];
    const newHover = hit ? hit.object : null;
    if (newHover !== hovered) {
      hovered = newHover;
      if (hintText) {
        hintText.textContent = hovered
          ? `${hovered.userData.cfg.label} — KLICKEN`
          : HINT_DEFAULT;
      }
      cursorEl?.classList.toggle("is-hover", !!hovered);
    }

    // Hover/selection feedback: scale + emissive
    for (const p of planets) {
      const active = (p.mesh === hovered) || (p.mesh === selected);
      const s = lerp(p.mesh.scale.x, active ? 1.25 : 1.0, 0.12);
      p.mesh.scale.setScalar(s);
      p.mesh.material.emissiveIntensity =
        lerp(p.mesh.material.emissiveIntensity, active ? 0.55 : 0.14, 0.1);
    }

    // Camera: focus selected planet (it keeps orbiting — cinematic track)
    if (selected) {
      selected.getWorldPosition(tmpV1);
    } else {
      tmpV1.set(SYSTEM_X, 0, 0);
    }
    camTarget.lerp(tmpV1, 0.05);

    tmpV2.copy(CAM_BASE);
    if (selected) tmpV2.lerp(tmpV1, 0.30).add(FOCUS_OFFSET);
    // gentle parallax from pointer
    tmpV2.x += pointerNdc.x * 0.5;
    tmpV2.y += pointerNdc.y * -0.3;
    camera.position.lerp(tmpV2, 0.045);
    camera.lookAt(camTarget);

    renderer.render(scene, camera);
  };
  requestAnimationFrame(render);
})();

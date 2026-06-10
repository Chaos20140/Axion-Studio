/* =========================================================
   APEX/THRUST MEDIA — SOLAR SYSTEM BACKGROUND
   Interactive 3D scene behind the subpages
   (about / team / partner / kontakt). A dark, red-accented
   solar system: the sun is the studio core, each planet is
   one chapter of the company. Click a planet → camera tracks
   it, a JARVIS-style HUD opens top-right and a leader line
   snaps from the planet to the panel.

   Planets are custom-shaded (fBm surface, day/night
   terminator, atmosphere fresnel) for a detailed look.

   Interaction model:
   - Canvas at z-index -2, pointer-events: none. We listen on
     `window`, ignore clicks on real UI via closest(), and
     raycast everything else — so planets are clickable
     "through" empty page regions without stealing UI input.
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
  const pOrbit = document.getElementById("solarMetaOrbit");
  const pClass = document.getElementById("solarMetaClass");
  const hint   = document.getElementById("solarHint");
  const hintText = document.getElementById("solarHintText");
  const cursorEl = document.querySelector(".cursor");

  // Leader-line SVG overlay (JARVIS targeting)
  const linkSvg  = document.getElementById("solarLink");
  const linkLine = document.getElementById("solarLinkLine");
  const linkDot  = document.getElementById("solarLinkDot");
  const linkDot2 = document.getElementById("solarLinkDot2");

  const lerp  = (a, b, n) => a + (b - a) * n;

  // Cached panel rect — only changes on open + resize, never per frame.
  // (The orbiting planet moves the line's source end, not the panel anchor.)
  // Declared up here so resize() — invoked during setup — can call it.
  let panelRect = null;
  const refreshPanelRect = () => { if (panel) panelRect = panel.getBoundingClientRect(); };

  /* ---------- CONTENT: the system IS the company ----------
     type: 0 rocky · 1 gas-bands · 2 swirl  (shader surface)  */
  const SUN_CFG = {
    id: "core", label: "APEX CORE", kicker: "/ 00 — CORE",
    title: "Apex Thrust Media", cls: "KERN · STUDIO", dist: "0.0 AU",
    text: "Der Kern des Systems: ein unabhängiges Web-Design-Studio aus Meschede. Apex — Präzision. Thrust — Schub. Media — das Medium. Gegründet 2024 von Tolunay Usul.",
    href: "about.html", cta: "Das Studio →",
  };
  const PLANET_CFG = [
    { id: "manifest", label: "MANIFEST", kicker: "/ 01 — STUDIO", title: "Das Manifest",
      cls: "TERRESTRISCH", text: "Websites, die einschlagen — brutalistisch, performance-getrieben, kompromisslos. Templates sind Komfortzone. Wir bauen Originale.",
      href: "about.html", cta: "Über Uns →",
      radius: 0.32, orbit: 2.6, speed: 0.16, angle0: 0.6,  tone: 0x3a1620, accent: 0xff1f3d, type: 0 },
    { id: "services", label: "SERVICES", kicker: "/ 02 — BUILD", title: "Vier Disziplinen",
      cls: "GASRIESE", text: "Web Design, Development, Motion & 3D, Brand Identity. Ein kompromissloser Standard, vier Wege dorthin.",
      href: "index.html#services", cta: "Services →",
      radius: 0.46, orbit: 3.8, speed: 0.115, angle0: 2.4, tone: 0x2a1119, accent: 0xff4a64, type: 1 },
    { id: "engineering", label: "ENGINEERING", kicker: "/ 03 — CRAFT", title: "Code als Craft",
      cls: "PLASMA-KÖRPER", text: "GSAP, Three.js, WebGL-Shader. Bewegung, die transportiert — 60 fps, unverhandelbar, auf jedem Gerät.",
      href: "index.html#engineering", cta: "Engineering →",
      radius: 0.28, orbit: 4.8, speed: 0.09, angle0: 4.4,  tone: 0x24121a, accent: 0xff8095, type: 2 },
    { id: "team", label: "TEAM", kicker: "/ 04 — CREW", title: "Das Team",
      cls: "GASRIESE", text: "Klein, scharf, schnell. Ein Boxenstopp-Team mit klarer Verantwortung — maximal vier aktive Projekte gleichzeitig.",
      href: "team.html", cta: "Crew kennenlernen →",
      radius: 0.36, orbit: 5.9, speed: 0.07, angle0: 1.5,  tone: 0x32202a, accent: 0xffd2d8, type: 1 },
    { id: "partner", label: "PARTNER", kicker: "/ 05 — ALLIANCES", title: "Allianzen",
      cls: "RING-SYSTEM", text: "Tech-Stack von Vercel bis Stripe — plus offene Slots für Studios und Freelancer, die Champions League spielen.",
      href: "partner.html", cta: "Partner werden →",
      radius: 0.40, orbit: 7.1, speed: 0.055, angle0: 5.3, tone: 0x281620, accent: 0xff1f3d, type: 0, ring: true },
    { id: "kontakt", label: "KONTAKT", kicker: "/ 06 — SIGNAL", title: "Open a Channel",
      cls: "PLASMA-KÖRPER", text: "Drei Sätze reichen: was du baust, bis wann, welches Budget. Antwort in unter 24 Stunden — vom Gründer, nicht vom Bot.",
      href: "kontakt.html", cta: "Kontakt aufnehmen →",
      radius: 0.32, orbit: 8.3, speed: 0.045, angle0: 3.3, tone: 0x3a141d, accent: 0xff1f3d, type: 2 },
  ];

  /* ---------- RENDERER ---------- */
  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: true, alpha: true, powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
  const CAM_BASE = new THREE.Vector3(0, 3.0, 10.6);
  camera.position.copy(CAM_BASE);

  /* ---------- SYSTEM GROUP — more foreground: bigger + centred-right ---------- */
  const SYSTEM_X = isMobile ? 0 : 1.6;
  const system = new THREE.Group();
  system.position.x = SYSTEM_X;
  system.scale.setScalar(isMobile ? 0.66 : 1.0);
  system.rotation.x = 0.34;
  system.rotation.z = 0.05;
  scene.add(system);

  // World-space sun position (constant: system origin) for shader lighting
  const SUN_WORLD = new THREE.Vector3();

  /* ---------- SHARED NOISE GLSL ---------- */
  const NOISE_GLSL = `
    vec3 mod289(vec3 x){ return x - floor(x*(1.0/289.0))*289.0; }
    vec4 mod289(vec4 x){ return x - floor(x*(1.0/289.0))*289.0; }
    vec4 permute(vec4 x){ return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314*r; }
    float snoise(vec3 v){
      const vec2 C = vec2(1.0/6.0, 1.0/3.0);
      const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
      vec3 i  = floor(v + dot(v, C.yyy));
      vec3 x0 = v - i + dot(i, C.xxx);
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min(g.xyz, l.zxy);
      vec3 i2 = max(g.xyz, l.zxy);
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;
      i = mod289(i);
      vec4 p = permute( permute( permute(
                i.z + vec4(0.0, i1.z, i2.z, 1.0))
              + i.y + vec4(0.0, i1.y, i2.y, 1.0))
              + i.x + vec4(0.0, i1.x, i2.x, 1.0));
      float n_ = 0.142857142857;
      vec3 ns = n_ * D.wyz - D.xzx;
      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_);
      vec4 x = x_ * ns.x + ns.yyyy;
      vec4 y = y_ * ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);
      vec4 b0 = vec4(x.xy, y.xy);
      vec4 b1 = vec4(x.zw, y.zw);
      vec4 s0 = floor(b0)*2.0 + 1.0;
      vec4 s1 = floor(b1)*2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));
      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
      vec3 p0 = vec3(a0.xy, h.x);
      vec3 p1 = vec3(a0.zw, h.y);
      vec3 p2 = vec3(a1.xy, h.z);
      vec3 p3 = vec3(a1.zw, h.w);
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
      p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
      vec4 m = max(0.6 - vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)), 0.0);
      m = m*m;
      return 42.0 * dot(m*m, vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
    }
    float fbm(vec3 p){
      float v=0.0, a=0.5;
      for(int i=0;i<5;i++){ v += a*snoise(p); p*=2.02; a*=0.5; }
      return v;
    }
  `;

  const PLANET_VERT = `
    varying vec3 vWorldNormal;
    varying vec3 vWorldPos;
    varying vec3 vObjPos;
    void main(){
      vObjPos = position;
      vWorldNormal = normalize(mat3(modelMatrix) * normal);
      vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;
  const PLANET_FRAG = `
    uniform float uTime;
    uniform float uSeed;
    uniform float uType;
    uniform float uActive;
    uniform vec3  uColorA;
    uniform vec3  uColorB;
    uniform vec3  uAccent;
    uniform vec3  uSunWorld;
    varying vec3 vWorldNormal;
    varying vec3 vWorldPos;
    varying vec3 vObjPos;
    ${NOISE_GLSL}
    void main(){
      vec3 n  = normalize(vWorldNormal);
      vec3 op = normalize(vObjPos);
      float t = uTime * 0.05;
      vec3 q  = op * 2.0 + vec3(uSeed);

      float surf;
      if (uType < 0.5) {
        surf = fbm(q * 1.8 + vec3(t));                       // rocky
      } else if (uType < 1.5) {
        float lat = vObjPos.y;
        surf = sin(lat * 13.0 + fbm(q * 1.3 + t) * 3.0) * 0.5 + 0.5; // gas bands
      } else {
        surf = fbm(q * 1.1 + fbm(q * 2.6) * 0.9 + vec3(t));  // swirl
        surf = surf * 0.5 + 0.5;
      }
      if (uType < 0.5) surf = surf * 0.5 + 0.5;

      vec3 base = mix(uColorA, uColorB, smoothstep(0.34, 0.66, surf));

      // Day / night terminator (lit from the sun/core)
      vec3 sunDir = normalize(uSunWorld - vWorldPos);
      float diff  = max(dot(n, sunDir), 0.0);
      vec3 lit = base * (0.16 + diff * 1.15);
      lit += uAccent * (1.0 - diff) * 0.07;                  // night self-glow
      lit += vec3(1.0, 0.86, 0.8) * pow(diff, 7.0) * 0.28;   // subsolar hotspot

      // Atmosphere fresnel rim
      vec3 viewDir = normalize(cameraPosition - vWorldPos);
      float fres = pow(1.0 - max(dot(n, viewDir), 0.0), 3.0);
      lit += uAccent * fres * (0.55 + uActive * 1.0);

      lit += uAccent * uActive * 0.16;                        // select boost

      gl_FragColor = vec4(lit, 1.0);
    }
  `;

  /* ---------- SUN ---------- */
  const sunUniforms = { uTime: { value: 0 } };
  const sunMesh = new THREE.Mesh(
    new THREE.SphereGeometry(1.0, 64, 64),
    new THREE.ShaderMaterial({
      uniforms: sunUniforms,
      vertexShader: PLANET_VERT,
      fragmentShader: `
        uniform float uTime;
        varying vec3 vWorldNormal;
        varying vec3 vWorldPos;
        varying vec3 vObjPos;
        ${NOISE_GLSL}
        void main(){
          vec3 op = normalize(vObjPos);
          float t = uTime * 0.12;
          float f = fbm(op * 2.4 + vec3(t));
          float veins = fbm(op * 5.0 - vec3(t * 0.6));
          vec3 deep = vec3(0.45, 0.02, 0.06);
          vec3 hot  = vec3(1.0, 0.42, 0.22);
          vec3 col = mix(deep, hot, smoothstep(0.2, 0.8, f * 0.5 + 0.5));
          col += vec3(1.0, 0.5, 0.3) * pow(max(veins, 0.0), 2.0) * 0.5;
          // limb darkening
          vec3 viewDir = normalize(cameraPosition - vWorldPos);
          float rim = pow(1.0 - max(dot(normalize(vWorldNormal), viewDir), 0.0), 2.0);
          col += vec3(1.0, 0.3, 0.4) * rim * 0.6;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    })
  );
  sunMesh.userData.cfg = SUN_CFG;
  system.add(sunMesh);

  // Fresnel corona shell (additive, slightly larger)
  const corona = new THREE.Mesh(
    new THREE.SphereGeometry(1.18, 48, 48),
    new THREE.ShaderMaterial({
      transparent: true, blending: THREE.AdditiveBlending,
      depthWrite: false, side: THREE.BackSide,
      uniforms: {},
      vertexShader: PLANET_VERT,
      fragmentShader: `
        varying vec3 vWorldNormal;
        varying vec3 vWorldPos;
        varying vec3 vObjPos;
        void main(){
          vec3 viewDir = normalize(cameraPosition - vWorldPos);
          float fres = pow(1.0 - max(dot(normalize(vWorldNormal), viewDir), 0.0), 2.4);
          gl_FragColor = vec4(vec3(1.0, 0.18, 0.32) * fres, fres);
        }
      `,
    })
  );
  sunMesh.add(corona);

  // Glow sprite (soft radial bloom)
  const glowTex = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const x = c.getContext("2d");
    const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0.0, "rgba(255, 90, 110, 0.9)");
    g.addColorStop(0.3, "rgba(255, 31, 61, 0.34)");
    g.addColorStop(1.0, "rgba(255, 31, 61, 0)");
    x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  sunGlow.scale.setScalar(6.8);
  sunMesh.add(sunGlow);

  /* ---------- ORBIT RINGS ---------- */
  const orbitLine = (r) => {
    const pts = [];
    for (let i = 0; i <= 160; i++) {
      const a = (i / 160) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
    }
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    return new THREE.Line(g, new THREE.LineBasicMaterial({
      color: 0xff1f3d, transparent: true, opacity: 0.15,
    }));
  };

  /* ---------- PLANETS ---------- */
  const planets = [];
  for (const cfg of PLANET_CFG) {
    system.add(orbitLine(cfg.orbit));

    const pivot = new THREE.Group();
    pivot.rotation.y = cfg.angle0;
    system.add(pivot);

    const colorA = new THREE.Color(cfg.tone);
    const colorB = new THREE.Color(cfg.accent).lerp(new THREE.Color(0x000000), 0.35);
    const uniforms = {
      uTime:     { value: 0 },
      uSeed:     { value: cfg.orbit * 1.37 },
      uType:     { value: cfg.type },
      uActive:   { value: 0 },
      uColorA:   { value: colorA },
      uColorB:   { value: colorB },
      uAccent:   { value: new THREE.Color(cfg.accent) },
      uSunWorld: { value: SUN_WORLD },
    };
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(cfg.radius, 48, 48),
      new THREE.ShaderMaterial({
        uniforms, vertexShader: PLANET_VERT, fragmentShader: PLANET_FRAG,
      })
    );
    mesh.position.x = cfg.orbit;
    mesh.userData.cfg = cfg;
    mesh.rotation.z = 0.18;   // slight axial tilt
    pivot.add(mesh);

    if (cfg.ring) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(cfg.radius * 1.5, cfg.radius * 2.35, 64),
        new THREE.MeshBasicMaterial({
          color: 0xff3a55, transparent: true, opacity: 0.32,
          side: THREE.DoubleSide, depthWrite: false,
        })
      );
      ring.rotation.x = Math.PI / 2 - 0.38;
      mesh.add(ring);
    }

    planets.push({ cfg, pivot, mesh, uniforms, angle: cfg.angle0 });
  }

  /* ---------- STARFIELD ---------- */
  {
    const N = isMobile ? 460 : 1100;
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const r = 26 + Math.random() * 36;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i*3]   = r * Math.sin(phi) * Math.cos(theta);
      pos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i*3+2] = r * Math.cos(phi);
      if (Math.random() < 0.16) { col[i*3]=1.0; col[i*3+1]=0.25; col[i*3+2]=0.35; }
      else { col[i*3]=0.66; col[i*3+1]=0.62; col[i*3+2]=0.62; }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color",    new THREE.BufferAttribute(col, 3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({
      size: 0.08, vertexColors: true, transparent: true,
      opacity: 0.85, sizeAttenuation: true, depthWrite: false,
    })));
  }

  /* ---------- SIZE ---------- */
  const sizeState = { w: 0, h: 0 };
  const resize = () => {
    const w = window.innerWidth, h = window.innerHeight;
    sizeState.w = w; sizeState.h = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (linkSvg) { linkSvg.setAttribute("viewBox", `0 0 ${w} ${h}`); }
    refreshPanelRect();
  };
  resize();
  window.addEventListener("resize", resize);

  /* ---------- PICKING ---------- */
  const raycaster = new THREE.Raycaster();
  const pointerNdc = new THREE.Vector2(10, 10);
  const pickables = [sunMesh, ...planets.map(p => p.mesh)];
  let hovered = null;
  let selected = null;
  const HINT_DEFAULT = hintText ? hintText.textContent : "";

  const INTERACTIVE_SEL =
    "a, button, input, textarea, select, label, nav, .nav, .mobile-nav, " +
    ".solar-panel, .footer, .contact__form, .nav__burger, .map-wrap, iframe, " +
    ".chip, .field, [data-magnetic]";

  window.addEventListener("pointermove", (e) => {
    pointerNdc.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointerNdc.y = -(e.clientY / window.innerHeight) * 2 + 1;
  }, { passive: true });

  const openPanel = (cfg) => {
    if (!panel) return;
    if (pKick)  pKick.textContent  = cfg.kicker;
    if (pTitle) pTitle.textContent = cfg.title;
    if (pText)  pText.textContent  = cfg.text;
    if (pClass) pClass.textContent = cfg.cls || "—";
    if (pOrbit) pOrbit.textContent = cfg.dist || (cfg.orbit ? cfg.orbit.toFixed(1) + " AU" : "—");
    if (pCta) {
      pCta.href = cfg.href;
      const here = location.pathname.split("/").pop() || "index.html";
      pCta.textContent = (cfg.href.split("#")[0] === here) ? "Du bist hier ●" : cfg.cta;
    }
    panel.classList.add("is-open");
    panel.setAttribute("aria-hidden", "false");
    hint?.classList.add("is-dim");
    refreshPanelRect();   // initial (pre-transition) measure
  };
  const closePanel = () => {
    selected = null;
    panel?.classList.remove("is-open");
    panel?.setAttribute("aria-hidden", "true");
    linkSvg?.classList.remove("is-on");
  };

  window.addEventListener("click", (e) => {
    // Guard: only Element targets have closest(); ignore exotic targets.
    const t = e.target;
    if (t && typeof t.closest === "function" && t.closest(INTERACTIVE_SEL)) return;
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
  // Re-measure once the slide-in transition settles (transform changes the box)
  panel?.addEventListener("transitionend", refreshPanelRect);
  window.addEventListener("keydown", (e) => { if (e.key === "Escape") closePanel(); });

  /* ---------- RENDER LOOP ---------- */
  const clock = new THREE.Clock();
  const camTarget = new THREE.Vector3(SYSTEM_X, 0, 0);
  const tmpV1 = new THREE.Vector3();
  const tmpV2 = new THREE.Vector3();
  const tmpProj = new THREE.Vector3();
  const FOCUS_OFFSET = new THREE.Vector3(0, 0.7, 2.4);
  let sunPulse = 0;

  // Update the JARVIS leader line from selected planet → panel anchor
  const updateLink = () => {
    if (!linkSvg || !selected || !panel || !panel.classList.contains("is-open")) {
      linkSvg?.classList.remove("is-on");
      return;
    }
    selected.getWorldPosition(tmpProj);
    tmpProj.project(camera);
    if (tmpProj.z > 1) { linkSvg.classList.remove("is-on"); return; }  // behind camera
    const sx = (tmpProj.x * 0.5 + 0.5) * sizeState.w;
    const sy = (-tmpProj.y * 0.5 + 0.5) * sizeState.h;
    if (!panelRect) refreshPanelRect();
    const r = panelRect;
    if (!r) { linkSvg.classList.remove("is-on"); return; }
    // anchor: bottom-left corner of the panel (closest to centre)
    const ax = r.left;
    const ay = r.bottom - 14;
    linkLine.setAttribute("x1", sx.toFixed(1));
    linkLine.setAttribute("y1", sy.toFixed(1));
    linkLine.setAttribute("x2", ax.toFixed(1));
    linkLine.setAttribute("y2", ay.toFixed(1));
    linkDot.setAttribute("cx", sx.toFixed(1));
    linkDot.setAttribute("cy", sy.toFixed(1));
    if (linkDot2) { linkDot2.setAttribute("cx", sx.toFixed(1)); linkDot2.setAttribute("cy", sy.toFixed(1)); }
    linkSvg.classList.add("is-on");
  };

  const render = () => {
    requestAnimationFrame(render);
    if (document.hidden) return;

    const dt = Math.min(clock.getDelta(), 0.05);
    const speedMul = reduce ? 0 : 1;

    // Wrap shader time (modulo 1000s) so float32 precision never degrades
    // on multi-hour sessions; the noise pattern is seamless across the wrap.
    sunUniforms.uTime.value = (sunUniforms.uTime.value + dt) % 1000;
    sunMesh.getWorldPosition(SUN_WORLD);

    for (const p of planets) {
      p.angle += dt * p.cfg.speed * speedMul;
      p.pivot.rotation.y = p.angle;
      p.mesh.rotation.y += dt * 0.3 * speedMul;
      p.uniforms.uTime.value = (p.uniforms.uTime.value + dt) % 1000;
    }
    system.rotation.y += dt * 0.015 * speedMul;

    sunPulse += dt * 1.6 * speedMul;
    sunGlow.scale.setScalar(6.8 + Math.sin(sunPulse) * 0.5);

    // Hover raycast (objects move → test every frame)
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

    // Hover/select feedback: scale + shader uActive
    for (const p of planets) {
      const active = (p.mesh === hovered) || (p.mesh === selected);
      const s = lerp(p.mesh.scale.x, active ? 1.28 : 1.0, 0.12);
      p.mesh.scale.setScalar(s);
      p.uniforms.uActive.value = lerp(p.uniforms.uActive.value, active ? 1.0 : 0.0, 0.1);
    }

    // Camera tracks the selected planet (it keeps orbiting — cinematic)
    if (selected) selected.getWorldPosition(tmpV1);
    else          tmpV1.set(SYSTEM_X, 0, 0);
    camTarget.lerp(tmpV1, 0.05);

    tmpV2.copy(CAM_BASE);
    if (selected) tmpV2.lerp(tmpV1, 0.30).add(FOCUS_OFFSET);
    tmpV2.x += pointerNdc.x * 0.5;
    tmpV2.y += pointerNdc.y * -0.3;
    camera.position.lerp(tmpV2, 0.045);
    camera.lookAt(camTarget);

    updateLink();
    renderer.render(scene, camera);
  };
  requestAnimationFrame(render);
})();

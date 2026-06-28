/* =========================================================
   Axion Studio — 3D MODEL VIEWER (about.html)
   Loads a Meshy-generated GLB and presents it as an
   interactive piece on the About page:
   - Auto-rotate while idle
   - Drag (mouse / touch) to orbit — dragging also feeds the
     track speed, so spinning the car accelerates the world
   - Scroll progress nudges rotation + speed
   - Mouse parallax on camera
   - Visibility-gated render loop (off-screen → 0 cost)

   Environment v2 — "night straight":
   - Reflector plane = glossy wet asphalt with a real-time
     mirror of the car
   - Translucent shader plane on top paints lane edges, F1
     kerbs, contact shadow, skid marks
   - Trackside light streaks (additive sprites) rush past,
     opacity + speed coupled to the shared speed factor
   - Scene fog fades everything into the night
   ========================================================= */
import * as THREE from "three";
import { GLTFLoader }      from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder }  from "three/addons/libs/meshopt_decoder.module.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { Reflector }       from "three/addons/objects/Reflector.js";

(() => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isMobile = window.matchMedia("(max-width: 900px)").matches;
  const stage  = document.getElementById("modelStage");
  const canvas = document.getElementById("modelCanvas");
  const loader = document.getElementById("modelLoader");
  const loaderBar = loader?.querySelector(".model-stage__loader-bar span");
  const rotMeter  = document.getElementById("modelRot");
  const scrMeter  = document.getElementById("modelScr");
  const velMeter  = document.getElementById("modelVel");
  if (!stage || !canvas) return;

  const lerp  = (a, b, n) => a + (b - a) * n;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ---------- RENDERER ---------- */
  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: true, alpha: true, powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  /* ---------- SCENE + CAMERA ---------- */
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x080406, 7, 21);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 100);
  camera.position.set(0, 0.4, 4);

  // Subtle PBR env for nice highlights without an HDR file
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  // Brand-colored fill lights
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
  keyLight.position.set(2.5, 3, 2);
  scene.add(keyLight);

  const rimRed = new THREE.PointLight(0xff1f3d, 6, 12, 2);
  rimRed.position.set(-2.5, 1.2, -1.5);
  scene.add(rimRed);

  const rimCool = new THREE.PointLight(0xffe2d5, 2.5, 10, 2);
  rimCool.position.set(2.8, -0.6, 1.8);
  scene.add(rimCool);

  scene.add(new THREE.AmbientLight(0xffffff, 0.18));

  /* ---------- ROOT NODE FOR THE MODEL ---------- */
  const root = new THREE.Group();
  scene.add(root);

  /* ---------- TRACK GROUP: reflector + markings + streaks ----------
     Grouped so the whole environment can be dropped to the model's
     floor height in one move after the GLB loads. */
  const trackGroup = new THREE.Group();
  trackGroup.position.set(0, -0.5, 0);
  scene.add(trackGroup);

  // 1) Glossy "wet asphalt" — a real planar reflection of the scene,
  //    darkened so it reads as night asphalt sheen, not a mirror.
  const reflector = new Reflector(new THREE.PlaneGeometry(8, 24), {
    textureWidth:  isMobile ? 512 : 1024,
    textureHeight: isMobile ? 256 : 512,
    color: 0x151015,
    clipBias: 0.003,
  });
  reflector.rotation.x = -Math.PI / 2;
  reflector.position.set(0, 0, -8);
  trackGroup.add(reflector);

  // 2) Markings overlay — translucent shader plane slightly above the
  //    reflector. Mostly see-through dark tint (reflection ghosts
  //    through), opaque where lane lines / kerbs / shadow live.
  const trackUniforms = {
    uTime:  { value: 0 },
    uSpeed: { value: 1.0 },
  };
  const trackMat = new THREE.ShaderMaterial({
    uniforms: trackUniforms,
    transparent: true,
    depthWrite: false,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uSpeed;
      varying vec2 vUv;

      // After rotation.x = -PI/2, vUv.y = 1 is FAR from camera,
      // the model sits around vUv.y = 0.5. Animated patterns add
      // uTime so their phase drifts toward the camera.

      void main() {
        // Dark translucent asphalt tint — lets the reflection below
        // ghost through like a wet night surface.
        vec3 color = vec3(0.05, 0.032, 0.038);
        float alpha = 0.62;

        float grain = fract(sin(dot(vUv * 640.0, vec2(12.9898, 78.233))) * 43758.5453);
        color += vec3(grain * 0.012);

        // ===== LANE EDGES (continuous thin white) =====
        float edgeT = 0.009;
        float leftEdge  = step(0.06, vUv.x) * step(vUv.x, 0.06 + edgeT);
        float rightEdge = step(0.94 - edgeT, vUv.x) * step(vUv.x, 0.94);

        // ===== F1 KERBS (red/white alternating, flowing) =====
        float kerbCycle = mod(vUv.y * 20.0 + uTime * uSpeed * 5.0, 2.0);
        float kerbBand  = (step(0.075, vUv.x) * step(vUv.x, 0.105)) +
                          (step(0.895, vUv.x) * step(vUv.x, 0.925));
        float kerbRed   = kerbBand * step(kerbCycle, 1.0);
        float kerbWhite = kerbBand * step(1.0, kerbCycle);

        // ===== INNER RACING-LINE DASHES (red, faster cycle) =====
        float racingDash = 0.0;
        if ((vUv.x > 0.22 && vUv.x < 0.235) || (vUv.x > 0.765 && vUv.x < 0.78)) {
          float cyc = mod(vUv.y * 28.0 + uTime * uSpeed * 7.0, 3.0);
          racingDash = step(cyc, 0.4);
        }

        vec3 lineCol = vec3(0.92);
        vec3 redCol  = vec3(1.0, 0.14, 0.26);

        float whiteMask = max(leftEdge, max(rightEdge, kerbWhite));
        float redMask   = max(kerbRed, racingDash);
        color = mix(color, lineCol, whiteMask);
        color = mix(color, redCol,  redMask);
        alpha = max(alpha, max(whiteMask, redMask) * 0.96);

        // ===== DISTANCE FALLOFF + opaque horizon (hides plane seam) =====
        float distFade = 1.0 - smoothstep(0.35, 0.98, vUv.y) * 0.85;
        color *= distFade;
        alpha = max(alpha, smoothstep(0.72, 0.95, vUv.y));

        // ===== RED HORIZON GLOW =====
        float glow = smoothstep(0.6, 1.0, vUv.y) * 0.55;
        color += vec3(0.55, 0.08, 0.16) * glow;

        // ===== CONTACT SHADOW under the car (vUv ~ (0.5, 0.5)) =====
        vec2 sp = (vUv - vec2(0.5, 0.5)) / vec2(0.09, 0.06);
        float carShadow = 1.0 - smoothstep(0.0, 1.0, length(sp));
        color *= (1.0 - carShadow * 0.7);
        alpha = max(alpha, carShadow * 0.85);

        // ===== TIRE SKID MARKS in front of the car =====
        float skidL = smoothstep(0.004, 0.0, abs(vUv.x - 0.41));
        float skidR = smoothstep(0.004, 0.0, abs(vUv.x - 0.59));
        float skidBand = smoothstep(0.5, 0.35, vUv.y);
        float skid = (skidL + skidR) * skidBand;
        color *= (1.0 - skid * 0.4);
        alpha = max(alpha, skid * 0.3);

        gl_FragColor = vec4(color, alpha);
      }
    `,
  });
  const track = new THREE.Mesh(new THREE.PlaneGeometry(8, 24, 1, 1), trackMat);
  track.rotation.x = -Math.PI / 2;
  track.position.set(0, 0.012, -8);
  track.renderOrder = 2;
  trackGroup.add(track);

  // 3) Trackside light streaks — thin additive planes rushing past
  //    on both shoulders. Speed + opacity follow the speed factor,
  //    so dragging the car makes the night lights blur faster.
  const streaks = [];
  const streakMatRed = new THREE.MeshBasicMaterial({
    color: 0xff2440, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const streakMatWhite = new THREE.MeshBasicMaterial({
    color: 0xfff1ec, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const streakGeo = new THREE.PlaneGeometry(0.045, 1);
  for (let i = 0; i < 22; i++) {
    const m = new THREE.Mesh(streakGeo, i % 3 === 0 ? streakMatWhite : streakMatRed);
    const side = i % 2 === 0 ? -1 : 1;
    m.position.set(
      side * (4.1 + ((i * 0.13) % 0.9)),
      0.35 + ((i * 0.37) % 1.1),
      -20 + ((i * 1.9) % 24)
    );
    m.rotation.y = side * 0.4;
    m.scale.y = 0.7 + ((i * 0.29) % 1.2);
    m.renderOrder = 3;
    trackGroup.add(m);
    streaks.push(m);
  }

  /* ---------- SIZE TO CONTAINER ---------- */
  const resize = () => {
    const r = stage.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height;
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener("resize", resize);

  /* ---------- LOAD THE GLB ---------- */
  const gltfLoader = new GLTFLoader();
  gltfLoader.setMeshoptDecoder(MeshoptDecoder);

  let modelReady = false;
  let mixer = null;

  gltfLoader.load(
    "assets/models/model.glb?v=20260531a",
    (gltf) => {
      const model = gltf.scene;

      // Auto-fit + center the model into a unit box
      const box = new THREE.Box3().setFromObject(model);
      const size   = new THREE.Vector3(); box.getSize(size);
      const center = new THREE.Vector3(); box.getCenter(center);
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const fitScale = 2.0 / maxDim;
      model.position.sub(center.multiplyScalar(fitScale));
      model.scale.setScalar(fitScale);

      model.traverse((o) => {
        if (o.isMesh && o.material) {
          o.material.envMapIntensity = 0.9;
          o.castShadow = false;
          o.receiveShadow = false;
        }
      });

      root.add(model);

      // Drop the whole track environment so its surface sits flush
      // with the model's lowest point.
      const fittedBox = new THREE.Box3().setFromObject(model);
      trackGroup.position.y = fittedBox.min.y - 0.005;

      // Play any embedded animations on loop (Meshy idle rigs etc.)
      if (gltf.animations?.length) {
        mixer = new THREE.AnimationMixer(model);
        gltf.animations.forEach((clip) => mixer.clipAction(clip).play());
      }

      modelReady = true;
      stage.classList.add("is-loaded");
    },
    (xhr) => {
      if (loaderBar && xhr.total) {
        const pct = (xhr.loaded / xhr.total) * 100;
        loaderBar.style.width = pct.toFixed(1) + "%";
      }
    },
    (err) => {
      console.error("[model] load failed:", err);
      if (loader) {
        const label = loader.querySelector(".mono");
        if (label) {
          label.textContent = "// LOAD ERROR — see console";
          label.style.color = "var(--red)";
        }
      }
    }
  );

  /* ---------- INTERACTION: drag-to-orbit + mouse parallax ---------- */
  let dragging = false;
  let lastX = 0, lastY = 0;
  let userYaw = 0, userPitch = 0;
  let targetYaw = 0, targetPitch = 0;
  let parallaxX = 0, parallaxY = 0;
  let parallaxTX = 0, parallaxTY = 0;
  let dragBoost = 0;   // feeds the track speed — drag = throttle

  const onDown = (e) => {
    dragging = true;
    stage.style.cursor = "grabbing";
    const p = e.touches ? e.touches[0] : e;
    lastX = p.clientX; lastY = p.clientY;
  };
  const onMove = (e) => {
    const p = e.touches ? e.touches[0] : e;
    if (dragging) {
      const dx = p.clientX - lastX;
      const dy = p.clientY - lastY;
      targetYaw   += dx * 0.006;
      targetPitch += dy * 0.004;
      targetPitch = clamp(targetPitch, -0.6, 0.6);
      dragBoost = Math.min(dragBoost + Math.abs(dx) * 0.006, 2.2);
      lastX = p.clientX; lastY = p.clientY;
    } else {
      const r = stage.getBoundingClientRect();
      const px = ((p.clientX - r.left) / r.width  - 0.5) * 2;
      const py = ((p.clientY - r.top)  / r.height - 0.5) * 2;
      parallaxTX = px;
      parallaxTY = py;
    }
  };
  const onUp = () => { dragging = false; stage.style.cursor = "grab"; };

  stage.addEventListener("pointerdown",   onDown);
  window.addEventListener("pointermove",  onMove);
  window.addEventListener("pointerup",    onUp);
  window.addEventListener("pointercancel",onUp);

  /* ---------- SCROLL PROGRESS ---------- */
  let scrollProg = 0;
  const updateScroll = () => {
    const r = stage.getBoundingClientRect();
    const total = r.height + window.innerHeight;
    scrollProg = clamp((window.innerHeight - r.top) / total, 0, 1);
  };
  window.addEventListener("scroll", updateScroll, { passive: true });
  updateScroll();

  /* ---------- VISIBILITY-GATED RENDER LOOP ---------- */
  let visible = false;
  const visIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => { visible = e.isIntersecting; });
  }, { threshold: 0.05 });
  visIO.observe(stage);

  const clock = new THREE.Clock();
  let bobT = 0;
  const render = () => {
    requestAnimationFrame(render);
    if (!visible) return;

    const dt = Math.min(clock.getDelta(), 0.05);
    mixer?.update(dt);

    // Shared speed factor: scroll = cruising, drag = throttle.
    dragBoost *= 0.97;
    const speedFactor = reduce ? 0 : 0.6 + scrollProg * 1.4 + dragBoost;

    if (!reduce) {
      trackUniforms.uTime.value += dt;
      trackUniforms.uSpeed.value = speedFactor;

      // Trackside streaks rush past; brightness rises with speed
      const streakSpeed = 5 + speedFactor * 16;
      for (const s of streaks) {
        s.position.z += dt * streakSpeed;
        if (s.position.z > 4) s.position.z = -20 - Math.random() * 4;
      }
      const sOp = clamp((speedFactor - 0.5) * 0.5, 0.04, 0.8);
      streakMatRed.opacity   = sOp;
      streakMatWhite.opacity = sOp * 0.8;

      // The car vibrates subtly with speed — engine + asphalt
      if (modelReady) {
        bobT += dt * (8 + speedFactor * 14);
        root.position.y = Math.sin(bobT) * 0.0055 * speedFactor;
        root.rotation.z = Math.sin(bobT * 0.7) * 0.0032 * speedFactor;
      }
    }

    // Smooth user-drag rotation
    userYaw   = lerp(userYaw,   targetYaw,   0.12);
    userPitch = lerp(userPitch, targetPitch, 0.12);

    // Smooth parallax
    parallaxX = lerp(parallaxX, parallaxTX, 0.06);
    parallaxY = lerp(parallaxY, parallaxTY, 0.06);

    // Auto-spin if not dragging
    const autoSpin = reduce ? 0 : 0.25;
    if (!dragging) targetYaw += autoSpin * dt;

    root.rotation.y = userYaw + scrollProg * 0.6;
    root.rotation.x = userPitch + parallaxY * 0.18;

    camera.position.x = parallaxX * 0.35;
    camera.position.y = 0.4 + parallaxY * -0.25;
    camera.lookAt(0, 0, 0);

    if (rotMeter) rotMeter.textContent =
      String(Math.round((root.rotation.y * 180 / Math.PI) % 360 + 360) % 360).padStart(3, "0") + "°";
    if (scrMeter) scrMeter.textContent = Math.round(scrollProg * 100) + "%";
    if (velMeter) velMeter.textContent = speedFactor.toFixed(1) + "×";

    renderer.render(scene, camera);
  };
  requestAnimationFrame(render);
})();

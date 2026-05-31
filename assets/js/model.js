/* =========================================================
   APEX/THRUST MEDIA — 3D MODEL VIEWER (about.html)
   Loads a Meshy-generated GLB and presents it as an
   interactive piece on the About page:
   - Auto-rotate while idle
   - Drag (mouse / touch) to orbit
   - Scroll progress nudges the rotation
   - Mouse parallax on camera
   - Visibility-gated render loop (off-screen → 0 cost)
   ========================================================= */
import * as THREE from "three";
import { GLTFLoader }      from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder }  from "three/addons/libs/meshopt_decoder.module.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

(() => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const stage  = document.getElementById("modelStage");
  const canvas = document.getElementById("modelCanvas");
  const loader = document.getElementById("modelLoader");
  const loaderBar = loader?.querySelector(".model-stage__loader-bar span");
  const rotMeter  = document.getElementById("modelRot");
  const scrMeter  = document.getElementById("modelScr");
  if (!stage || !canvas) return;

  const lerp  = (a, b, n) => a + (b - a) * n;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ---------- RENDERER ---------- */
  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: true, alpha: true, powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  /* ---------- SCENE + CAMERA ---------- */
  const scene = new THREE.Scene();
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

      // Soft drop-shadow look by enabling depth + a touch of clearcoat
      model.traverse((o) => {
        if (o.isMesh && o.material) {
          o.material.envMapIntensity = 0.9;
          o.castShadow = false;
          o.receiveShadow = false;
        }
      });

      root.add(model);

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
      lastX = p.clientX; lastY = p.clientY;
    } else {
      // mouse parallax (only when hovering the stage)
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
  const render = () => {
    requestAnimationFrame(render);
    if (!visible) return;

    const dt = clock.getDelta();
    mixer?.update(dt);

    // Smooth user-drag rotation
    userYaw   = lerp(userYaw,   targetYaw,   0.12);
    userPitch = lerp(userPitch, targetPitch, 0.12);

    // Smooth parallax
    parallaxX = lerp(parallaxX, parallaxTX, 0.06);
    parallaxY = lerp(parallaxY, parallaxTY, 0.06);

    // Auto-spin if not dragging (slower the more the user has dragged)
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

    renderer.render(scene, camera);
  };
  requestAnimationFrame(render);
})();

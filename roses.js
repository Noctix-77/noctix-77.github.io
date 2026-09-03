(() => {
  const canvas = document.getElementById('roses-canvas');
  if (!canvas || !window.THREE || !window.WebGLRenderingContext) return;

  const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 100);
  camera.position.z = 12;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.04;

  /* Éclairage plus doux que l'ancienne version, pour éviter l'aspect plastique. */
  scene.add(new THREE.AmbientLight(0x1d2a54, 1.35));
  const violetLight = new THREE.PointLight(0x8a3cff, 4.6, 1600, 2);
  violetLight.position.set(-360, 260, 520);
  scene.add(violetLight);
  const cyanLight = new THREE.PointLight(0x32d9ff, 3.4, 1500, 2);
  cyanLight.position.set(390, -240, 480);
  scene.add(cyanLight);
  const rimLight = new THREE.DirectionalLight(0xd9e9ff, 1.15);
  rimLight.position.set(0, 1, 4);
  scene.add(rimLight);

  function smoothstep(a, b, value) {
    const x = Math.max(0, Math.min(1, (value - a) / (b - a)));
    return x * x * (3 - 2 * x);
  }

  /*
   * Surface de pétale incurvée : contrairement à l'ancienne extrusion plate,
   * la courbure est inscrite directement dans la géométrie.
   */
  function createPetalGeometry({ width = .72, height = 1, cup = .18, tipCurl = .13, twist = .05, ruffle = .025 } = {}) {
    const segmentsX = 10;
    const segmentsY = 18;
    const positions = [];
    const uvs = [];
    const indices = [];

    for (let yIndex = 0; yIndex <= segmentsY; yIndex++) {
      const v = yIndex / segmentsY;
      const baseEase = Math.pow(Math.sin(v * Math.PI * .5), .72);
      const shoulder = 1 - .08 * smoothstep(.72, 1, v);
      const halfWidth = width * .5 * baseEase * shoulder;

      for (let xIndex = 0; xIndex <= segmentsX; xIndex++) {
        const u01 = xIndex / segmentsX;
        const u = u01 * 2 - 1;
        let x = u * halfWidth;
        let y = v * height;

        const centerCup = cup * (1 - u * u) * Math.sin(v * Math.PI);
        const liftedTip = tipCurl * Math.pow(v, 2.7) * (1 - .22 * u * u);
        const softEdges = -.055 * Math.pow(Math.abs(u), 1.8) * Math.sin(v * Math.PI);
        const edgeRuffle = ruffle * Math.sin((u + 1) * Math.PI * 1.65 + v * 3.1) * Math.pow(v, 2.2) * Math.pow(Math.abs(u), 1.2);
        let z = centerCup + liftedTip + softEdges + edgeRuffle;

        /* Légère irrégularité de la lèvre supérieure pour casser la symétrie. */
        if (v > .86) {
          const lip = smoothstep(.86, 1, v);
          y -= Math.pow(Math.abs(u), 2.2) * .055 * height * lip;
          z += Math.cos(u * Math.PI * 1.7) * .018 * lip;
        }

        const twistAngle = twist * (v - .25);
        const cos = Math.cos(twistAngle);
        const sin = Math.sin(twistAngle);
        const twistedX = x * cos - z * sin;
        const twistedZ = x * sin + z * cos;
        x = twistedX;
        z = twistedZ;

        positions.push(x, y, z);
        uvs.push(u01, v);
      }
    }

    const row = segmentsX + 1;
    for (let yIndex = 0; yIndex < segmentsY; yIndex++) {
      for (let xIndex = 0; xIndex < segmentsX; xIndex++) {
        const a = yIndex * row + xIndex;
        const b = a + 1;
        const c = a + row;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    geometry.translate(0, -.02, 0);
    return geometry;
  }

  const petalGeometries = {
    core: createPetalGeometry({ width: .45, height: .68, cup: .25, tipCurl: .2, twist: .13, ruffle: .012 }),
    inner: createPetalGeometry({ width: .62, height: .9, cup: .23, tipCurl: .17, twist: .09, ruffle: .018 }),
    middle: createPetalGeometry({ width: .82, height: 1.12, cup: .19, tipCurl: .13, twist: .06, ruffle: .025 }),
    outer: createPetalGeometry({ width: 1.02, height: 1.28, cup: .14, tipCurl: .08, twist: .04, ruffle: .034 })
  };

  function petalMaterial(color, emissive, sheenColor) {
    return new THREE.MeshPhysicalMaterial({
      color,
      emissive,
      emissiveIntensity: .26,
      roughness: .46,
      metalness: .015,
      clearcoat: .26,
      clearcoatRoughness: .5,
      sheen: .7,
      sheenColor: new THREE.Color(sheenColor),
      sheenRoughness: .72,
      side: THREE.DoubleSide
    });
  }

  const petalMaterials = {
    core: petalMaterial(0x36105f, 0x19062f, 0xb66cff),
    inner: petalMaterial(0x35127d, 0x160535, 0x8f72ff),
    middle: petalMaterial(0x22388f, 0x071c4f, 0x5d9dff),
    outer: petalMaterial(0x174e86, 0x05284a, 0x65eaff)
  };

  function noise(index, ring, salt = 0) {
    const value = Math.sin(index * 12.9898 + ring * 78.233 + salt * 37.719) * 43758.5453;
    return value - Math.floor(value);
  }

  function addRing(group, { type, count, radius, scale, tilt, z, offset }) {
    const geometry = petalGeometries[type];
    const material = petalMaterials[type];

    for (let i = 0; i < count; i++) {
      const jitter = (noise(i, count, 1) - .5) * .09;
      const angle = (i / count) * Math.PI * 2 + offset + jitter;
      const petal = new THREE.Mesh(geometry, material);
      const radialJitter = (noise(i, count, 2) - .5) * .055;
      const scaleJitter = .92 + noise(i, count, 3) * .16;

      petal.position.set(
        Math.cos(angle) * (radius + radialJitter),
        Math.sin(angle) * (radius + radialJitter),
        z + (noise(i, count, 4) - .5) * .045
      );
      petal.scale.set(scale * scaleJitter, scale * (1 + (noise(i, count, 5) - .5) * .08), scale);
      petal.rotation.z = angle - Math.PI / 2 + (noise(i, count, 6) - .5) * .08;
      petal.rotation.x = tilt + (noise(i, count, 7) - .5) * .12;
      petal.rotation.y = (noise(i, count, 8) - .5) * .18;
      group.add(petal);
    }
  }

  function createRose() {
    const rose = new THREE.Group();

    addRing(rose, { type:'core', count:7, radius:.035, scale:.72, tilt:1.22, z:.23, offset:.18 });
    addRing(rose, { type:'inner', count:10, radius:.18, scale:.78, tilt:.93, z:.13, offset:.54 });
    addRing(rose, { type:'middle', count:13, radius:.39, scale:.78, tilt:.60, z:.04, offset:.26 });
    addRing(rose, { type:'middle', count:16, radius:.66, scale:.86, tilt:.38, z:-.05, offset:.63 });
    addRing(rose, { type:'outer', count:19, radius:.94, scale:.9, tilt:.18, z:-.12, offset:.35 });

    /* Quelques pétales de cœur supplémentaires forment une spirale, sans polyèdre central. */
    for (let i = 0; i < 5; i++) {
      const petal = new THREE.Mesh(petalGeometries.core, petalMaterials.core);
      const angle = i * 1.23;
      petal.position.set(Math.cos(angle) * .06, Math.sin(angle) * .06, .34 + i * .012);
      petal.scale.setScalar(.52 - i * .035);
      petal.rotation.z = angle - Math.PI / 2;
      petal.rotation.x = 1.38;
      petal.rotation.y = .18 * Math.sin(angle);
      rose.add(petal);
    }

    rose.rotation.x = -.16;
    return rose;
  }

  const roseLeft = createRose();
  const roseRight = createRose();
  scene.add(roseLeft, roseRight);

  let viewportWidth = 0;
  let viewportHeight = 0;
  let pointerX = 0;
  let pointerY = 0;
  let targetPointerX = 0;
  let targetPointerY = 0;
  let frameId = 0;
  const clock = new THREE.Clock();

  function layout() {
    const mobile = viewportWidth < 700;
    const baseSize = mobile
      ? Math.max(62, viewportWidth * .15)
      : Math.max(88, Math.min(viewportWidth, viewportHeight) * .135);
    const scrollShift = Math.min(90, window.scrollY * .045);

    roseLeft.scale.setScalar(baseSize);
    roseRight.scale.setScalar(baseSize * .94);

    roseLeft.position.set(
      -viewportWidth / 2 + baseSize * .68 - scrollShift,
      viewportHeight / 2 - baseSize * .7 - (mobile ? 66 : 38),
      0
    );
    roseRight.position.set(
      viewportWidth / 2 - baseSize * .68 + scrollShift,
      -viewportHeight / 2 + baseSize * .72 + (mobile ? 72 : 55),
      0
    );
  }

  function resize() {
    viewportWidth = window.innerWidth;
    viewportHeight = window.innerHeight;
    renderer.setSize(viewportWidth, viewportHeight, false);
    camera.left = -viewportWidth / 2;
    camera.right = viewportWidth / 2;
    camera.top = viewportHeight / 2;
    camera.bottom = -viewportHeight / 2;
    camera.updateProjectionMatrix();
    layout();
    if (reduceMotionQuery.matches) renderer.render(scene, camera);
  }

  function renderStatic() {
    roseLeft.rotation.z = -.52;
    roseRight.rotation.z = .62;
    roseLeft.rotation.y = 0;
    roseRight.rotation.y = 0;
    renderer.render(scene, camera);
  }

  function animate() {
    if (reduceMotionQuery.matches || document.hidden) {
      frameId = 0;
      renderStatic();
      return;
    }

    const time = clock.getElapsedTime();
    pointerX += (targetPointerX - pointerX) * .035;
    pointerY += (targetPointerY - pointerY) * .035;

    roseLeft.rotation.z = -.52 + Math.sin(time * .24) * .032;
    roseRight.rotation.z = .62 + Math.cos(time * .21) * .03;
    roseLeft.rotation.y = pointerX * .16 + Math.sin(time * .13) * .035;
    roseRight.rotation.y = pointerX * .13 - Math.sin(time * .12) * .032;
    roseLeft.rotation.x = -.16 + pointerY * .09;
    roseRight.rotation.x = -.16 + pointerY * .075;

    const breathe = 1 + Math.sin(time * .34) * .0035;
    roseLeft.children.forEach((child, index) => {
      if (index % 7 === 0) child.rotation.y += Math.sin(time * .17 + index) * .00022;
    });
    roseRight.children.forEach((child, index) => {
      if (index % 8 === 0) child.rotation.y -= Math.cos(time * .16 + index) * .0002;
    });
    roseLeft.scale.multiplyScalar(breathe);
    roseRight.scale.multiplyScalar(2 - breathe);

    renderer.render(scene, camera);
    layout(); /* rétablit l'échelle de base après la micro-respiration */
    frameId = requestAnimationFrame(animate);
  }

  function restartAnimation() {
    if (frameId) cancelAnimationFrame(frameId);
    frameId = 0;
    if (reduceMotionQuery.matches || document.hidden) {
      renderStatic();
    } else {
      clock.getDelta();
      animate();
    }
  }

  window.addEventListener('pointermove', event => {
    if (reduceMotionQuery.matches || !viewportWidth || !viewportHeight) return;
    targetPointerX = event.clientX / viewportWidth - .5;
    targetPointerY = event.clientY / viewportHeight - .5;
  }, { passive: true });
  window.addEventListener('scroll', layout, { passive: true });
  window.addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', restartAnimation);
  reduceMotionQuery.addEventListener?.('change', restartAnimation);

  resize();
  restartAnimation();
})();

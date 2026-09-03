const header = document.querySelector('[data-header]');
const menuToggle = document.querySelector('[data-menu-toggle]');
const menu = document.querySelector('[data-menu]');
const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');


/* Écran de chargement : sphère de points organique, légère et sans dépendance supplémentaire. */
const loader = document.querySelector('[data-loader]');
const loaderCanvas = document.querySelector('[data-loader-canvas]');
const loaderStatus = document.querySelector('[data-loader-status]');

if (loader && loaderCanvas) {
  const loaderCtx = loaderCanvas.getContext('2d');
  const points = [];
  const pointCount = 155;
  let loaderFrame = 0;
  let loaderStart = performance.now();

  for (let i = 0; i < pointCount; i++) {
    const phi = Math.acos(1 - 2 * (i + .5) / pointCount);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    points.push({ x: Math.sin(phi) * Math.cos(theta), y: Math.cos(phi), z: Math.sin(phi) * Math.sin(theta), seed: i * .71 });
  }

  function sizeLoaderCanvas() {
    const cssSize = Math.min(430, window.innerWidth * .82);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    loaderCanvas.width = cssSize * dpr;
    loaderCanvas.height = cssSize * dpr;
    loaderCanvas.style.width = `${cssSize}px`;
    loaderCanvas.style.height = `${cssSize}px`;
    loaderCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return cssSize;
  }

  let loaderSize = sizeLoaderCanvas();

  function drawLoader(now) {
    const t = (now - loaderStart) / 1000;
    loaderCtx.clearRect(0, 0, loaderSize, loaderSize);
    const cx = loaderSize / 2;
    const cy = loaderSize / 2;
    const radius = loaderSize * .27;
    const angleY = reduceMotionQuery.matches ? .55 : t * .58;
    const angleX = reduceMotionQuery.matches ? -.18 : Math.sin(t * .47) * .18;
    const projected = [];

    for (const p of points) {
      const organic = 1 + (reduceMotionQuery.matches ? 0 : Math.sin(t * 1.7 + p.seed) * .055 + Math.sin(t * .73 + p.seed * .43) * .025);
      let x = p.x * organic, y = p.y * organic, z = p.z * organic;
      const cyR = Math.cos(angleY), syR = Math.sin(angleY);
      [x, z] = [x * cyR - z * syR, x * syR + z * cyR];
      const cxR = Math.cos(angleX), sxR = Math.sin(angleX);
      [y, z] = [y * cxR - z * sxR, y * sxR + z * cxR];
      const depth = (z + 1.25) / 2.5;
      projected.push({ x: cx + x * radius, y: cy + y * radius, z, depth });
    }

    projected.sort((a,b)=>a.z-b.z);
    for (const p of projected) {
      const alpha = .16 + p.depth * .74;
      const size = .8 + p.depth * 2.15;
      loaderCtx.beginPath();
      loaderCtx.arc(p.x, p.y, size, 0, Math.PI * 2);
      loaderCtx.fillStyle = p.depth > .63 ? `rgba(84,230,255,${alpha})` : `rgba(151,96,255,${alpha})`;
      loaderCtx.shadowBlur = p.depth > .7 ? 10 : 3;
      loaderCtx.shadowColor = p.depth > .63 ? 'rgba(84,230,255,.65)' : 'rgba(122,0,255,.5)';
      loaderCtx.fill();
    }
    loaderCtx.shadowBlur = 0;

    if (!reduceMotionQuery.matches && !loader.classList.contains('is-hidden')) loaderFrame = requestAnimationFrame(drawLoader);
  }
  drawLoader(loaderStart);

  const statuses = ['Analyse de l’interface…', 'Synchronisation des composants…', 'Chargement du portfolio…'];
  let statusIndex = 0;
  const statusTimer = reduceMotionQuery.matches ? 0 : window.setInterval(() => {
    statusIndex = (statusIndex + 1) % statuses.length;
    if (loaderStatus) loaderStatus.textContent = statuses[statusIndex];
  }, 520);

  const hideLoader = () => {
    const elapsed = performance.now() - loaderStart;
    const wait = Math.max(0, (reduceMotionQuery.matches ? 150 : 1050) - elapsed);
    window.setTimeout(() => {
      loader.classList.add('is-hidden');
      document.body.classList.remove('is-loading');
      if (statusTimer) clearInterval(statusTimer);
      if (loaderFrame) cancelAnimationFrame(loaderFrame);
      window.setTimeout(() => loader.remove(), 720);
    }, wait);
  };

  if (document.readyState === 'complete') hideLoader();
  else window.addEventListener('load', hideLoader, { once: true });

  window.addEventListener('resize', () => { loaderSize = sizeLoaderCanvas(); }, { passive: true });
}

function updateHeader() {
  header?.classList.toggle('scrolled', window.scrollY > 28);
}
updateHeader();
window.addEventListener('scroll', updateHeader, { passive: true });

menuToggle?.addEventListener('click', () => {
  const open = menu?.classList.toggle('open') ?? false;
  menuToggle.setAttribute('aria-expanded', String(open));
});

menu?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  menu.classList.remove('open');
  menuToggle?.setAttribute('aria-expanded', 'false');
}));

/* Apparition progressive des éléments */
const revealElements = document.querySelectorAll('.reveal:not(.is-visible)');
if (reduceMotionQuery.matches || !('IntersectionObserver' in window)) {
  revealElements.forEach(el => el.classList.add('is-visible'));
} else {
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.14 });
  revealElements.forEach(el => revealObserver.observe(el));
}

/* Repère discret de section active dans la navigation */
const navLinks = [...(menu?.querySelectorAll('a[href^="#"]') ?? [])];
const navTargets = navLinks
  .map(link => document.querySelector(link.getAttribute('href')))
  .filter(Boolean);

if ('IntersectionObserver' in window && navTargets.length) {
  const navObserver = new IntersectionObserver(entries => {
    const visible = entries
      .filter(entry => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    navLinks.forEach(link => {
      link.classList.toggle('is-active', link.getAttribute('href') === `#${visible.target.id}`);
    });
  }, { rootMargin: '-35% 0px -55% 0px', threshold: [0, .25, .6] });
  navTargets.forEach(section => navObserver.observe(section));
}

/* Effet tilt des cartes, désactivé si l'utilisateur réduit les animations */
const tiltCards = document.querySelectorAll('[data-tilt]');
function bindTilt() {
  tiltCards.forEach(card => {
    if (card.dataset.tiltBound === 'true') return;
    card.dataset.tiltBound = 'true';

    card.addEventListener('pointermove', event => {
      if (reduceMotionQuery.matches || event.pointerType === 'touch') return;
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - .5;
      const y = (event.clientY - rect.top) / rect.height - .5;
      card.style.transform = `perspective(900px) rotateX(${y * -5}deg) rotateY(${x * 7}deg) translateY(-5px)`;
    });
    card.addEventListener('pointerleave', () => { card.style.transform = ''; });
  });
}
bindTilt();

reduceMotionQuery.addEventListener?.('change', () => {
  if (reduceMotionQuery.matches) tiltCards.forEach(card => { card.style.transform = ''; });
});

/* Filtres des réalisations */
const filterButtons = document.querySelectorAll('[data-project-filter]');
const projectCards = document.querySelectorAll('[data-project-grid] .project-card');
filterButtons.forEach(button => {
  button.addEventListener('click', () => {
    const filter = button.dataset.projectFilter;
    filterButtons.forEach(item => item.classList.toggle('is-active', item === button));
    projectCards.forEach(card => {
      const visible = filter === 'all' || card.dataset.category === filter;
      card.hidden = !visible;
      if (visible) card.style.transform = '';
    });
  });
});

/* Formulaire sans faux backend : ouvre le client mail avec le message prérempli */
const contactForm = document.querySelector('[data-contact-form]');
const formStatus = document.querySelector('[data-form-status]');
contactForm?.addEventListener('submit', event => {
  event.preventDefault();

  if (!contactForm.checkValidity()) {
    contactForm.reportValidity();
    if (formStatus) formStatus.textContent = 'Merci de compléter les champs requis.';
    return;
  }

  const data = new FormData(contactForm);
  const name = String(data.get('name') || '').trim();
  const email = String(data.get('email') || '').trim();
  const subject = String(data.get('subject') || '').trim();
  const message = String(data.get('message') || '').trim();
  const body = `Bonjour Sahad,\n\n${message}\n\n— ${name}\n${email}`;
  const mailto = `mailto:sahad.safeer23@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  if (formStatus) formStatus.textContent = 'Ouverture de votre application de messagerie…';
  window.location.href = mailto;
});

/* Pétales ambiants */
const ambientCanvas = document.getElementById('ambient-canvas');
const ctx = ambientCanvas?.getContext('2d');
let petals = [];
let canvasWidth = 0;
let canvasHeight = 0;
let ambientFrame = 0;

function resizeAmbient() {
  if (!ambientCanvas || !ctx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvasWidth = window.innerWidth;
  canvasHeight = window.innerHeight;
  ambientCanvas.width = canvasWidth * dpr;
  ambientCanvas.height = canvasHeight * dpr;
  ambientCanvas.style.width = `${canvasWidth}px`;
  ambientCanvas.style.height = `${canvasHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function createPetal(initial = false) {
  return {
    x: Math.random() * canvasWidth,
    y: initial ? Math.random() * canvasHeight : -30,
    size: 5 + Math.random() * 9,
    speed: .35 + Math.random() * .9,
    drift: (Math.random() - .5) * .6,
    rotation: Math.random() * Math.PI,
    rotationSpeed: (Math.random() - .5) * .025,
    opacity: .18 + Math.random() * .45
  };
}

function drawPetal(petal) {
  if (!ctx) return;
  ctx.save();
  ctx.translate(petal.x, petal.y);
  ctx.rotate(petal.rotation);
  ctx.globalAlpha = petal.opacity;
  const gradient = ctx.createRadialGradient(0, -petal.size * .2, 1, 0, 0, petal.size);
  gradient.addColorStop(0, '#8beaff');
  gradient.addColorStop(.55, '#187dff');
  gradient.addColorStop(1, '#6b00d8');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(0, -petal.size);
  ctx.bezierCurveTo(petal.size, -petal.size * .45, petal.size * .75, petal.size * .75, 0, petal.size);
  ctx.bezierCurveTo(-petal.size * .8, petal.size * .65, -petal.size, -petal.size * .4, 0, -petal.size);
  ctx.fill();
  ctx.restore();
}

function drawAmbientFrame(animate = true) {
  if (!ctx) return;
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  petals.forEach(petal => {
    if (animate) {
      petal.y += petal.speed;
      petal.x += Math.sin(petal.y * .012) * .28 + petal.drift;
      petal.rotation += petal.rotationSpeed;
      if (petal.y > canvasHeight + 30 || petal.x < -40 || petal.x > canvasWidth + 40) {
        Object.assign(petal, createPetal());
      }
    }
    drawPetal(petal);
  });
}

function animateAmbient() {
  if (!ctx || reduceMotionQuery.matches || document.hidden) {
    ambientFrame = 0;
    return;
  }
  drawAmbientFrame(true);
  ambientFrame = requestAnimationFrame(animateAmbient);
}

function resetAmbientMotion() {
  if (!ctx) return;
  if (ambientFrame) cancelAnimationFrame(ambientFrame);
  ambientFrame = 0;
  if (reduceMotionQuery.matches) {
    drawAmbientFrame(false);
  } else if (!document.hidden) {
    animateAmbient();
  }
}

if (ambientCanvas && ctx) {
  resizeAmbient();
  const petalCount = Math.min(34, Math.max(10, Math.floor(window.innerWidth / 34)));
  petals = Array.from({ length: petalCount }, () => createPetal(true));
  resetAmbientMotion();

  window.addEventListener('resize', () => {
    resizeAmbient();
    if (reduceMotionQuery.matches) drawAmbientFrame(false);
  }, { passive: true });
  document.addEventListener('visibilitychange', resetAmbientMotion);
  reduceMotionQuery.addEventListener?.('change', resetAmbientMotion);
}

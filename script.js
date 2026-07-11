(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const header = document.querySelector('.site-header');
  const navToggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.main-nav');

  const updateHeader = () => header?.classList.toggle('scrolled', window.scrollY > 20);
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  navToggle?.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(open));
  });
  nav?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    nav.classList.remove('open');
    navToggle?.setAttribute('aria-expanded', 'false');
  }));

  document.querySelectorAll('[data-delay]').forEach(el => {
    el.style.setProperty('--delay', `${el.dataset.delay}ms`);
  });

  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

  const tilt = document.querySelector('.tilt-card');
  const visual = document.querySelector('.hero-visual');
  if (tilt && visual && !reduceMotion && window.matchMedia('(pointer:fine)').matches) {
    visual.addEventListener('pointermove', event => {
      const rect = visual.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width - 0.5;
      const py = (event.clientY - rect.top) / rect.height - 0.5;
      tilt.style.transform = `rotateY(${px * 10 - 5}deg) rotateX(${-py * 8 + 2}deg) translateY(-3px)`;
    });
    visual.addEventListener('pointerleave', () => {
      tilt.style.transform = 'rotateY(-7deg) rotateX(3deg)';
    });
  }

  const modal = document.getElementById('imageModal');
  const modalImg = modal?.querySelector('img');
  const modalText = modal?.querySelector('p');
  document.querySelectorAll('.shot').forEach(shot => {
    shot.addEventListener('click', () => {
      if (!modal || !modalImg || !modalText) return;
      modalImg.src = shot.dataset.image;
      modalImg.alt = shot.dataset.title || 'IU Client preview';
      modalText.textContent = shot.dataset.title || 'IU Client preview';
      modal.showModal();
    });
  });
  modal?.querySelector('.modal-close')?.addEventListener('click', () => modal.close());
  modal?.addEventListener('click', event => {
    if (event.target === modal) modal.close();
  });

  if (!reduceMotion) startParticles();

  function startParticles() {
    const canvas = document.getElementById('particleCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let particles = [];
    let mouseX = -9999;
    let mouseY = -9999;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(95, Math.max(42, Math.floor(width / 17)));
      particles = Array.from({ length: count }, createParticle);
    }

    function createParticle() {
      const pink = Math.random() > 0.48;
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.55 + 0.45,
        vx: (Math.random() - 0.5) * 0.22,
        vy: Math.random() * -0.18 - 0.04,
        alpha: Math.random() * 0.42 + 0.1,
        color: pink ? '255,88,183' : '96,221,255'
      };
    }

    function frame() {
      ctx.clearRect(0, 0, width, height);
      for (const p of particles) {
        const dx = p.x - mouseX;
        const dy = p.y - mouseY;
        const dist = Math.hypot(dx, dy);
        if (dist < 130 && dist > 0) {
          p.x += (dx / dist) * 0.35;
          p.y += (dy / dist) * 0.35;
        }
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -8) { p.y = height + 8; p.x = Math.random() * width; }
        if (p.x < -8) p.x = width + 8;
        if (p.x > width + 8) p.x = -8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color},${p.alpha})`;
        ctx.shadowBlur = 9;
        ctx.shadowColor = `rgba(${p.color},.35)`;
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      requestAnimationFrame(frame);
    }

    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', event => { mouseX = event.clientX; mouseY = event.clientY; }, { passive: true });
    window.addEventListener('pointerleave', () => { mouseX = -9999; mouseY = -9999; });
    resize();
    frame();
  }
})();

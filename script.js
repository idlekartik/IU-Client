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
      const musicBeat = window.IU_MUSIC_BEAT || 0;
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
        ctx.arc(p.x, p.y, p.r * (1 + musicBeat * 0.65), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color},${p.alpha})`;
        ctx.shadowBlur = 9 + musicBeat * 17;
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

(() => {
  const root = document.documentElement;
  const body = document.body;
  const audio = document.getElementById('siteMusic');
  const dock = document.getElementById('musicDock');
  const toggle = document.getElementById('musicToggle');
  const volumeDown = document.getElementById('volumeDown');
  const volumeUp = document.getElementById('volumeUp');
  const volumeReadout = document.getElementById('volumeReadout');
  const seek = document.getElementById('musicSeek');
  const currentLabel = document.getElementById('musicCurrent');
  const durationLabel = document.getElementById('musicDuration');
  const soundGate = document.getElementById('soundGate');
  const enableSound = document.getElementById('enableSound');
  const dockCollapse = document.getElementById('dockCollapse');
  const visualizer = document.getElementById('musicVisualizer');
  const progress = document.getElementById('scrollProgress');
  const loader = document.getElementById('pageLoader');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let audioContext = null;
  let analyser = null;
  let mediaSource = null;
  let frequencyData = null;
  let smoothBeat = 0;
  let autoplayBlocked = false;
  let isSeeking = false;

  window.addEventListener('load', () => {
    window.setTimeout(() => loader?.classList.add('is-hidden'), 520);
  });
  window.setTimeout(() => loader?.classList.add('is-hidden'), 2600);

  const updateScrollProgress = () => {
    if (!progress) return;
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    progress.style.width = `${Math.min(100, Math.max(0, window.scrollY / max * 100))}%`;
  };
  updateScrollProgress();
  window.addEventListener('scroll', updateScrollProgress, { passive: true });
  window.addEventListener('resize', updateScrollProgress, { passive: true });

  if (window.matchMedia('(pointer:fine)').matches && !reduceMotion) {
    window.addEventListener('pointermove', event => {
      root.style.setProperty('--pointer-x', `${event.clientX}px`);
      root.style.setProperty('--pointer-y', `${event.clientY}px`);
    }, { passive: true });

    document.querySelectorAll('.feature-card, .install-card, .stats-strip, .final-cta').forEach(card => {
      card.addEventListener('pointermove', event => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--spot-x', `${event.clientX - rect.left}px`);
        card.style.setProperty('--spot-y', `${event.clientY - rect.top}px`);
      }, { passive: true });
    });
  }

  if (!audio || !dock) return;

  const savedVolume = Number.parseFloat(localStorage.getItem('iu-site-volume') || '0.35');
  audio.volume = Number.isFinite(savedVolume) ? Math.min(1, Math.max(0, savedVolume)) : 0.35;
  audio.loop = true;
  audio.preload = 'auto';

  if (localStorage.getItem('iu-music-collapsed') === 'true') {
    dock.classList.add('is-collapsed');
  }

  const formatTime = value => {
    if (!Number.isFinite(value) || value < 0) return '0:00';
    const minutes = Math.floor(value / 60);
    const seconds = Math.floor(value % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  const updateVolume = () => {
    const pct = Math.round(audio.volume * 100);
    if (volumeReadout) volumeReadout.textContent = `${pct}%`;
    localStorage.setItem('iu-site-volume', String(audio.volume));
  };

  const updatePlaybackState = () => {
    const playing = !audio.paused && !audio.ended;
    dock.classList.toggle('is-paused', !playing);
    body.classList.toggle('music-playing', playing);
    toggle?.setAttribute('aria-label', playing ? 'Pause music' : 'Play music');
  };

  const updateTimeline = () => {
    const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
    const current = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
    if (!isSeeking && seek) {
      const pct = duration > 0 ? (current / duration) * 100 : 0;
      seek.value = String(pct);
      seek.style.setProperty('--seek', `${pct}%`);
    }
    if (currentLabel) currentLabel.textContent = formatTime(current);
    if (durationLabel && duration > 0) durationLabel.textContent = formatTime(duration);
  };

  function ensureAudioGraph() {
    if (analyser || !window.AudioContext && !window.webkitAudioContext) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioContext = new AudioContextClass();
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.78;
      frequencyData = new Uint8Array(analyser.frequencyBinCount);
      mediaSource = audioContext.createMediaElementSource(audio);
      mediaSource.connect(analyser);
      analyser.connect(audioContext.destination);
    } catch (error) {
      analyser = null;
      frequencyData = null;
      console.warn('IU music visualizer could not initialize:', error);
    }
  }

  async function playMusic(fromGesture = false) {
    if (fromGesture) {
      ensureAudioGraph();
      if (audioContext?.state === 'suspended') {
        try { await audioContext.resume(); } catch (_) {}
      }
    }
    try {
      await audio.play();
      autoplayBlocked = false;
      if (soundGate) soundGate.hidden = true;
    } catch (_) {
      autoplayBlocked = true;
      if (soundGate) soundGate.hidden = false;
    }
    updatePlaybackState();
  }

  window.setTimeout(() => playMusic(false), 260);

  const firstInteraction = async () => {
    if (!autoplayBlocked) return;
    await playMusic(true);
  };
  document.addEventListener('pointerdown', firstInteraction, { once: true, passive: true });
  document.addEventListener('keydown', firstInteraction, { once: true });

  enableSound?.addEventListener('click', event => {
    event.stopPropagation();
    playMusic(true);
  });

  toggle?.addEventListener('click', async () => {
    ensureAudioGraph();
    if (audioContext?.state === 'suspended') {
      try { await audioContext.resume(); } catch (_) {}
    }
    if (audio.paused) await playMusic(true);
    else audio.pause();
    updatePlaybackState();
  });

  volumeDown?.addEventListener('click', () => {
    audio.volume = Math.max(0, Math.round((audio.volume - 0.1) * 10) / 10);
    updateVolume();
  });
  volumeUp?.addEventListener('click', () => {
    audio.volume = Math.min(1, Math.round((audio.volume + 0.1) * 10) / 10);
    updateVolume();
  });

  dockCollapse?.addEventListener('click', () => {
    const collapsed = dock.classList.toggle('is-collapsed');
    localStorage.setItem('iu-music-collapsed', String(collapsed));
    dockCollapse.setAttribute('aria-label', collapsed ? 'Expand music player' : 'Minimize music player');
  });

  seek?.addEventListener('pointerdown', () => { isSeeking = true; });
  seek?.addEventListener('input', () => {
    const pct = Number(seek.value);
    seek.style.setProperty('--seek', `${pct}%`);
    if (durationLabel && currentLabel && Number.isFinite(audio.duration)) {
      currentLabel.textContent = formatTime(audio.duration * pct / 100);
    }
  });
  seek?.addEventListener('change', () => {
    if (Number.isFinite(audio.duration)) audio.currentTime = audio.duration * Number(seek.value) / 100;
    isSeeking = false;
  });
  seek?.addEventListener('pointerup', () => { isSeeking = false; });

  audio.addEventListener('play', updatePlaybackState);
  audio.addEventListener('pause', updatePlaybackState);
  audio.addEventListener('ended', updatePlaybackState);
  audio.addEventListener('loadedmetadata', updateTimeline);
  audio.addEventListener('durationchange', updateTimeline);
  audio.addEventListener('timeupdate', updateTimeline);
  audio.addEventListener('volumechange', updateVolume);

  updateVolume();
  updatePlaybackState();
  updateTimeline();

  const canvasContext = visualizer?.getContext('2d');

  function resizeVisualizer() {
    if (!visualizer || !canvasContext) return;
    const rect = visualizer.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    visualizer.width = Math.max(1, Math.floor(rect.width * dpr));
    visualizer.height = Math.max(1, Math.floor(rect.height * dpr));
    canvasContext.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resizeVisualizer();
  window.addEventListener('resize', resizeVisualizer, { passive: true });

  function animateMusic() {
    const playing = !audio.paused && !audio.ended;
    let rawBeat = 0;
    let bars = null;

    if (playing && analyser && frequencyData) {
      analyser.getByteFrequencyData(frequencyData);
      let bass = 0;
      const bassBins = Math.min(12, frequencyData.length);
      for (let i = 0; i < bassBins; i++) bass += frequencyData[i];
      rawBeat = Math.max(0, Math.min(1, (bass / bassBins - 42) / 110));
      bars = frequencyData;
    } else if (playing) {
      const t = audio.currentTime || performance.now() / 1000;
      rawBeat = Math.max(0, Math.min(1, .22 + Math.sin(t * 5.7) * .13 + Math.sin(t * 11.4) * .08));
    }

    smoothBeat += (rawBeat - smoothBeat) * (rawBeat > smoothBeat ? .24 : .08);
    if (!playing) smoothBeat *= .92;
    window.IU_MUSIC_BEAT = reduceMotion ? 0 : smoothBeat;
    root.style.setProperty('--music-pulse', reduceMotion ? '0' : smoothBeat.toFixed(3));
    root.style.setProperty('--music-glow', reduceMotion ? '0' : Math.min(1, smoothBeat * 1.22).toFixed(3));

    if (visualizer && canvasContext) {
      const width = visualizer.clientWidth;
      const height = visualizer.clientHeight;
      canvasContext.clearRect(0, 0, width, height);
      const count = 30;
      const gap = 2.2;
      const barWidth = Math.max(1.4, (width - gap * (count - 1)) / count);
      const gradient = canvasContext.createLinearGradient(0, height, width, 0);
      gradient.addColorStop(0, 'rgba(255,88,183,.35)');
      gradient.addColorStop(.46, 'rgba(255,139,208,.95)');
      gradient.addColorStop(1, 'rgba(96,221,255,.82)');
      canvasContext.fillStyle = gradient;

      for (let i = 0; i < count; i++) {
        let value;
        if (bars) {
          const index = Math.min(bars.length - 1, Math.floor(i / count * bars.length * .72));
          value = bars[index] / 255;
        } else if (playing) {
          const t = audio.currentTime || performance.now() / 1000;
          value = .16 + Math.abs(Math.sin(t * 4.5 + i * .58)) * (.28 + smoothBeat * .55);
        } else {
          value = .08 + Math.abs(Math.sin(performance.now() / 850 + i * .45)) * .06;
        }
        const barHeight = Math.max(2, value * height * .94);
        const x = i * (barWidth + gap);
        const y = (height - barHeight) / 2;
        canvasContext.beginPath();
        canvasContext.roundRect(x, y, barWidth, barHeight, Math.min(3, barWidth / 2));
        canvasContext.fill();
      }
    }

    requestAnimationFrame(animateMusic);
  }
  requestAnimationFrame(animateMusic);
})();

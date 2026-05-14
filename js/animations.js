// ===== SCROLL-TRIGGERED HORIZONTAL PARALLAX =====
export function initParallaxScroll() {
  const sections = document.querySelectorAll('.h-scroll-section');
  if (!sections.length) return;
  let lastScrollY = window.scrollY;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const wrapper = entry.target.querySelector('.h-scroll-wrapper');
      if (!wrapper) return;
      const onScroll = () => {
        const delta = window.scrollY - lastScrollY;
        wrapper.scrollLeft += delta * 0.8;
        lastScrollY = window.scrollY;
      };
      window.addEventListener('scroll', onScroll, { passive: true });
    });
  }, { threshold: 0.1 });
  sections.forEach(s => observer.observe(s));
}

// ===== FLOATING CARDS =====
export function initFloatingCards() {
  document.querySelectorAll('.glass-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `perspective(1000px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg) translateY(-4px)`;
    });
    card.addEventListener('mouseleave', () => { card.style.transform = ''; });
  });
}

// ===== CHAR-BY-CHAR TEXT REVEAL =====
export function initCharReveal(selector = '.char-reveal') {
  const els = document.querySelectorAll(selector);
  if (!els.length) return;
  els.forEach(el => {
    if (el.dataset.charReady) return;
    el.dataset.charReady = '1';
    const text = el.textContent;
    el.textContent = '';
    [...text].forEach(ch => {
      const span = document.createElement('span');
      if (ch === ' ') { span.className = 'char char-space'; }
      else { span.className = 'char'; span.textContent = ch; }
      el.appendChild(span);
    });
  });
}

export function triggerCharReveal(el, baseDelay = 0) {
  if (!el) return;
  el.querySelectorAll('.char:not(.char-space)').forEach((ch, i) => {
    ch.style.transitionDelay = `${baseDelay + i * 40}ms`;
  });
  el.classList.add('visible');
}

// ===== ANIMATED WAVE BACKGROUND =====
// Optimized: throttled to ~24fps, paused when tab hidden, uses will-change
export function initWaveBackground() {
  let bg = document.querySelector('.wave-bg');
  if (!bg) {
    bg = document.createElement('div');
    bg.className = 'wave-bg';
    document.body.insertBefore(bg, document.body.firstChild);
  }

  let canvas = bg.querySelector('canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    bg.appendChild(canvas);
  }

  // Promote to own compositor layer
  canvas.style.willChange = 'transform';

  const ctx = canvas.getContext('2d', { alpha: true });

  function resize() {
    // Cap resolution — no need for full DPR on background canvas
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width  = Math.round(window.innerWidth  * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    canvas.style.width  = window.innerWidth  + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.scale(dpr, dpr);
  }
  resize();

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 200);
  }, { passive: true });

  // Reduced to 6 waves (was 8) — fewer draw calls
  const waves = [
    { yBase:0.62, amp:50, freq:0.0016, spd:0.55, lw:2.0, op:0.35, bobSpd:0.28, bobAmp:16, colorL:'#1a6fff', colorR:'#00d4ff' },
    { yBase:0.68, amp:38, freq:0.0022, spd:0.80, lw:1.3, op:0.20, bobSpd:0.40, bobAmp:10, colorL:'#0099ff', colorR:'#00eeff' },
    { yBase:0.74, amp:60, freq:0.0012, spd:0.38, lw:2.6, op:0.16, bobSpd:0.18, bobAmp:20, colorL:'#0055cc', colorR:'#00bbff' },
    { yBase:0.70, amp:48, freq:0.0018, spd:0.65, lw:1.8, op:0.32, bobSpd:0.32, bobAmp:14, colorL:'#ff6600', colorR:'#ffcc00' },
    { yBase:0.76, amp:36, freq:0.0025, spd:0.90, lw:1.2, op:0.18, bobSpd:0.45, bobAmp: 9, colorL:'#ff4400', colorR:'#ffee44' },
    { yBase:0.65, amp:55, freq:0.0014, spd:0.42, lw:2.3, op:0.14, bobSpd:0.22, bobAmp:18, colorL:'#cc3300', colorR:'#ffaa00' },
  ];

  let t = 0;
  let raf;
  let lastFrame = 0;
  const TARGET_FPS = 24;
  const FRAME_MS   = 1000 / TARGET_FPS;

  function draw(now) {
    raf = requestAnimationFrame(draw);

    // Throttle to TARGET_FPS
    if (now - lastFrame < FRAME_MS) return;
    lastFrame = now;

    const W = window.innerWidth;
    const H = window.innerHeight;

    ctx.clearRect(0, 0, W, H);

    waves.forEach(w => {
      const bob     = Math.sin(t * w.bobSpd * 0.04) * w.bobAmp;
      const yCenter = H * w.yBase + bob;

      const grad = ctx.createLinearGradient(0, 0, W, 0);
      grad.addColorStop(0,   hexAlpha(w.colorL, w.op));
      grad.addColorStop(0.5, hexAlpha(blend(w.colorL, w.colorR, 0.5), w.op * 0.7));
      grad.addColorStop(1,   hexAlpha(w.colorR, w.op));

      ctx.beginPath();
      ctx.strokeStyle = grad;
      ctx.lineWidth   = w.lw;
      ctx.lineCap     = 'round';

      // Step 4px instead of 2px — half the path points
      for (let x = 0; x <= W; x += 4) {
        const y = yCenter
          + Math.sin(x * w.freq + t * w.spd * 0.05) * w.amp
          + Math.sin(x * w.freq * 1.8 + t * w.spd * 0.03 + 1.2) * (w.amp * 0.35);
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    });

    t++;
  }

  raf = requestAnimationFrame(draw);

  // Pause when tab is hidden — saves CPU/GPU entirely
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
    } else {
      lastFrame = 0;
      raf = requestAnimationFrame(draw);
    }
  });

  return () => cancelAnimationFrame(raf);
}

// Hex color → rgba string with alpha
function hexAlpha(hex, a) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${a})`;
}

// Blend two hex colors at ratio t (0=A, 1=B)
function blend(hexA, hexB, t) {
  const lerp = (a,b) => Math.round(a + (b-a)*t);
  const rA=parseInt(hexA.slice(1,3),16), gA=parseInt(hexA.slice(3,5),16), bA=parseInt(hexA.slice(5,7),16);
  const rB=parseInt(hexB.slice(1,3),16), gB=parseInt(hexB.slice(3,5),16), bB=parseInt(hexB.slice(5,7),16);
  return `#${lerp(rA,rB).toString(16).padStart(2,'0')}${lerp(gA,gB).toString(16).padStart(2,'0')}${lerp(bA,bB).toString(16).padStart(2,'0')}`;
}

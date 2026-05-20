(() => {
  // Year stamp
  document.querySelectorAll('#year').forEach(el => el.textContent = new Date().getFullYear());

  // ============================================
  // Scroll-driven hero canvas
  // Frames are pre-extracted as WebP images in /frames/. As the user
  // scrolls past the hero, the canvas draws the corresponding frame.
  // The hero stays a normal 100vh-ish section — no sticky pin, no
  // 220vh trap. The canvas lives inside the hero so it scrolls away
  // naturally once the user is into the next section.
  //
  // Approach is the SKILL.md frame-canvas pattern: two-phase image
  // preload (first 12 frames fast for first paint, rest in background),
  // devicePixelRatio-correct canvas, cover-style draw, rAF + lerp for
  // buttery scrub.
  // ============================================
  (function initHeroCanvas() {
    const canvas = document.getElementById('heroCanvas');
    if (!canvas) return;
    const hero = canvas.closest('.hero');
    if (!hero) return;
    // Prefer the scroll-track wrapper if present (sticky-scrub variant);
    // fall back to the hero itself for the older flat layout.
    const track = canvas.closest('.hero-scroll-track') || hero;

    const FRAME_COUNT = parseInt(hero.dataset.frameCount, 10) || 192;
    const framePath = (i) => `frames/frame_${String(i + 1).padStart(4, '0')}.webp`;
    const ctx = canvas.getContext('2d');
    const frames = new Array(FRAME_COUNT);

    function loadFrame(i) {
      return new Promise((resolve) => {
        if (frames[i]) return resolve(frames[i]);
        const img = new Image();
        img.decoding = 'async';
        img.onload = () => { frames[i] = img; resolve(img); };
        img.onerror = () => { resolve(null); };
        img.src = framePath(i);
      });
    }

    // ---- Canvas sizing (DPR-aware) ----
    let cssW = 0, cssH = 0;
    function resize() {
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      cssW = canvas.offsetWidth || hero.offsetWidth || window.innerWidth;
      cssH = canvas.offsetHeight || hero.offsetHeight || window.innerHeight;
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(Math.round(currentFrame));
    }

    // ---- Draw a frame, cover-mode ----
    function draw(i) {
      const img = frames[Math.max(0, Math.min(FRAME_COUNT - 1, i))];
      if (!img) return;
      const iw = img.naturalWidth || img.width;
      const ih = img.naturalHeight || img.height;
      if (!iw || !ih || !cssW || !cssH) return;
      const scale = Math.max(cssW / iw, cssH / ih);
      const dw = iw * scale;
      const dh = ih * scale;
      const dx = (cssW - dw) / 2;
      const dy = (cssH - dh) / 2;
      ctx.clearRect(0, 0, cssW, cssH);
      ctx.drawImage(img, dx, dy, dw, dh);
    }

    // ---- Scroll → frame mapping ----
    let currentFrame = 0;
    let targetFrame = 0;
    let running = false;

    function read() {
      // Map scroll position through the scroll-track to a frame index.
      // The sticky viewport pins for (trackHeight - viewportHeight) of
      // scroll — that's the scrub range. Outside that, frames clamp.
      const rect = track.getBoundingClientRect();
      const scrubRange = (track.offsetHeight || 1) - window.innerHeight;
      if (scrubRange <= 0) {
        // Track is shorter than viewport — fall back to whole-hero mapping
        const r2 = hero.getBoundingClientRect();
        const h = hero.offsetHeight || 1;
        targetFrame = Math.max(0, Math.min(1, -r2.top / h)) * (FRAME_COUNT - 1);
        return;
      }
      const progress = Math.max(0, Math.min(1, -rect.top / scrubRange));
      targetFrame = progress * (FRAME_COUNT - 1);
    }

    function tick() {
      // Lerp toward target for smoothness
      const diff = targetFrame - currentFrame;
      currentFrame += diff * 0.22;
      const idx = Math.round(currentFrame);
      draw(idx);
      if (Math.abs(diff) > 0.05) {
        requestAnimationFrame(tick);
      } else {
        currentFrame = targetFrame;
        draw(Math.round(currentFrame));
        running = false;
      }
    }

    function onScroll() {
      read();
      if (!running) {
        running = true;
        requestAnimationFrame(tick);
      }
    }

    // ---- Two-phase preload ----
    const FIRST_BATCH = Math.min(12, FRAME_COUNT);
    const priority = [];
    for (let i = 0; i < FIRST_BATCH; i++) priority.push(loadFrame(i));

    Promise.all(priority).then(() => {
      resize();
      read();
      draw(Math.round(currentFrame));
      canvas.classList.add('ready');
      // Background-load the rest, with mild concurrency
      let i = FIRST_BATCH;
      const PARALLEL = 6;
      function pump() {
        const batch = [];
        for (let k = 0; k < PARALLEL && i < FRAME_COUNT; k++, i++) batch.push(loadFrame(i));
        if (batch.length) Promise.all(batch).then(pump);
      }
      pump();
    });

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', () => { resize(); onScroll(); });
  })();

  // Sticky nav shadow on scroll
  const nav = document.getElementById('nav');
  if (nav) {
    const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // Mobile menu
  const toggle = document.getElementById('navToggle');
  if (toggle && nav) {
    toggle.addEventListener('click', () => nav.classList.toggle('open'));
    nav.querySelectorAll('.nav-links a').forEach(a =>
      a.addEventListener('click', () => nav.classList.remove('open'))
    );
  }

  // Reveal on scroll
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && reveals.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    // threshold 0 (any visibility triggers) — a positive threshold
    // can fail to fire on elements taller than the viewport (the
    // suite-galleries section on Sonna is ~7000px tall)
    }, { threshold: 0, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(el => io.observe(el));
  } else {
    reveals.forEach(el => el.classList.add('in'));
  }

  // Prefill contact form from URL params (?building=, ?suite=)
  const params = new URLSearchParams(window.location.search);
  const buildingParam = params.get('building');
  const suiteParam = params.get('suite');
  if (buildingParam) {
    const sel = document.getElementById('building');
    if (sel) {
      [...sel.options].forEach(o => { if (o.value.toLowerCase() === buildingParam.toLowerCase()) sel.value = o.value; });
    }
  }
  if (suiteParam) {
    const suiteField = document.getElementById('suite');
    const buildingSel = document.getElementById('building');
    const parts = suiteParam.split(' ');
    if (parts.length >= 2 && buildingSel) {
      const maybeBuilding = parts[0];
      [...buildingSel.options].forEach(o => { if (o.value.toLowerCase() === maybeBuilding.toLowerCase()) buildingSel.value = o.value; });
      if (suiteField) suiteField.value = parts.slice(1).join(' ');
    } else if (suiteField) {
      suiteField.value = suiteParam;
    }
  }

  // Form submit (client-side only — wire up to email or backend later)
  const form = document.getElementById('contactForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const status = document.getElementById('formStatus');
      const name = form.name.value.trim();
      const email = form.email.value.trim();
      if (!name || !email) {
        if (status) { status.style.color = 'var(--terracotta)'; status.textContent = 'Please add your name and email.'; }
        return;
      }
      const data = Object.fromEntries(new FormData(form).entries());
      const subject = encodeURIComponent(`Tour request${data.building ? ' · ' + data.building : ''}${data.suite ? ' suite ' + data.suite : ''}`);
      const body = encodeURIComponent(
        `Name: ${data.name}\nCompany: ${data.company || '—'}\nEmail: ${data.email}\nPhone: ${data.phone || '—'}\nPrefer: ${data.prefer || '—'}\nBuilding: ${data.building || '—'}\nSuite: ${data.suite || '—'}\nBest time to call: ${data.callTime || '—'}\n\n${data.message || ''}`
      );
      if (status) { status.style.color = 'var(--moss)'; status.textContent = 'Opening your email client…'; }
      window.location.href = `mailto:dayna-buckley@oppcos.com?subject=${subject}&body=${body}`;
    });
  }

  // ============================================
  // Available units across the three buildings.
  // Single source of truth used by both the qualification wizard
  // (for matching) and the per-building Suite Gallery section.
  // ============================================
  const ALL_UNITS = [
    // ----- Northrup -----
    { building: 'Northrup',   unit: '371',  sf: 1023, monthly: 1619.75, page: 'northrup.html' },
    { building: 'Northrup',   unit: '250',  sf: 2370, monthly: 3555.00, page: 'northrup.html' },

    // ----- Sonna -----
    { building: 'Sonna',      unit: '356',  sf:  279, monthly:  450.00, page: 'sonna.html' },
    { building: 'Sonna',      unit: '340',  sf:  869, monthly: 1375.92, page: 'sonna.html' },
    { building: 'Sonna',      unit: '322',  sf:  266, monthly:  399.00, page: 'sonna.html' },
    { building: 'Sonna',      unit: '316',  sf:  782, monthly: 1173.00, page: 'sonna.html' },
    { building: 'Sonna',      unit: '314',  sf:  682, monthly: 1079.83, page: 'sonna.html' },
    { building: 'Sonna',      unit: '310',  sf: 1010, monthly: 1599.17, page: 'sonna.html' },
    { building: 'Sonna',      unit: '306',  sf:  425, monthly:  637.50, page: 'sonna.html' },
    { building: 'Sonna',      unit: '305',  sf:  690, monthly:  600.00, page: 'sonna.html' },
    { building: 'Sonna',      unit: '300',  sf:  690, monthly: 1035.00, page: 'sonna.html' },
    { building: 'Sonna',      unit: '258',  sf: 1563, monthly: 2344.50, page: 'sonna.html' },
    { building: 'Sonna',      unit: '252',  sf:  597, monthly:  895.50, page: 'sonna.html' },
    { building: 'Sonna',      unit: '222',  sf:  876, monthly: 1314.00, page: 'sonna.html' },
    { building: 'Sonna',      unit: '214',  sf:  848, monthly: 1272.00, page: 'sonna.html' },
    { building: 'Sonna',      unit: '210',  sf:  479, monthly:  758.42, page: 'sonna.html' },
    { building: 'Sonna',      unit: '200',  sf: 1426, monthly: 2139.00, page: 'sonna.html' },

    // ----- Mercantile -----
    { building: 'Mercantile', unit: 'L120', sf: 7144, monthly: 5953.33, page: 'mercantile.html' },
    { building: 'Mercantile', unit: '166',  sf: 1593, monthly: 2787.75, page: 'mercantile.html' },
    { building: 'Mercantile', unit: '300B', sf: 2492, monthly: 4153.33, page: 'mercantile.html' },
    { building: 'Mercantile', unit: '203',  sf: 2145, monthly: 2860.00, page: 'mercantile.html' },
    { building: 'Mercantile', unit: '200',  sf: 2168, monthly: 3974.67, page: 'mercantile.html' },
    { building: 'Mercantile', unit: 'L138', sf: 1281, monthly: 1708.00, page: 'mercantile.html' }
  ];

  // ============================================
  // Per-suite photo galleries (and building hero images)
  // Keyed as "Building Suite" (case-sensitive). Empty array means the
  // unit has no photos yet — UI shows the "coming soon" placeholder.
  // ============================================
  const COMING_SOON = 'Brand%20Assets/image-coming-soon.svg';

  const BUILDING_HERO = {
    'Northrup':   'Brand%20Assets/Northrup/Hero%20Northrup.jpg',
    'Sonna':      'Brand%20Assets/Sonna/Hero%20Sonna.jpg',
    'Mercantile': 'Brand%20Assets/Mercantile/Hero%20Mercantile.jpg'
  };

  const SUITE_PHOTOS = {
    // ----- Northrup -----
    'Northrup 250': [
      'Brand%20Assets/Northrup/Suite%20250/250721_8thStreetMarketplace-62-1536x1024.avif',
      'Brand%20Assets/Northrup/Suite%20250/250721_8thStreetMarketplace-63-1536x1024.avif',
      'Brand%20Assets/Northrup/Suite%20250/250721_8thStreetMarketplace-64-1536x1024.avif',
      'Brand%20Assets/Northrup/Suite%20250/250721_8thStreetMarketplace-65-1536x1024.avif',
      'Brand%20Assets/Northrup/Suite%20250/250721_8thStreetMarketplace-66-1536x1024.avif',
      'Brand%20Assets/Northrup/Suite%20250/250721_8thStreetMarketplace-67-1536x1024.avif',
      'Brand%20Assets/Northrup/Suite%20250/250721_8thStreetMarketplace-68-1536x1065.avif',
      'Brand%20Assets/Northrup/Suite%20250/250721_8thStreetMarketplace-69-1536x1060.avif'
    ],
    'Northrup 371': [
      'Brand%20Assets/Northrup/Suite%20371/250721_8thStreetMarketplace-70-1536x1024.jpg',
      'Brand%20Assets/Northrup/Suite%20371/250721_8thStreetMarketplace-71-1536x1062.jpg',
      'Brand%20Assets/Northrup/Suite%20371/250721_8thStreetMarketplace-72-1536x1024.jpg',
      'Brand%20Assets/Northrup/Suite%20371/floorplan.png'
    ],

    // ----- Sonna -----
    'Sonna 200': [
      'Brand%20Assets/Sonna/Suite%20200/DowntownBoiseOffices-84-1536x1024.jpg',
      'Brand%20Assets/Sonna/Suite%20200/DowntownBoiseOffices-85-1536x1024.jpg',
      'Brand%20Assets/Sonna/Suite%20200/DowntownBoiseOffices-88-1536x1024.jpg',
      'Brand%20Assets/Sonna/Suite%20200/DowntownBoiseOffices-118-1536x1024.jpg'
    ],
    'Sonna 210': [
      'Brand%20Assets/Sonna/Suite%20210/DowntownBoiseOffices-91-1536x1050.avif',
      'Brand%20Assets/Sonna/Suite%20210/DowntownBoiseOffices-92-1536x1024.avif',
      'Brand%20Assets/Sonna/Suite%20210/DowntownBoiseOffices-93-1536x1024.avif'
    ],
    'Sonna 214': [
      'Brand%20Assets/Sonna/Suite%20214/DowntownBoiseOffices-96-1536x1024.jpg',
      'Brand%20Assets/Sonna/Suite%20214/DowntownBoiseOffices-97-1536x1024.jpg',
      'Brand%20Assets/Sonna/Suite%20214/DowntownBoiseOffices-98-1536x1024.jpg'
    ],
    'Sonna 222': [
      'Brand%20Assets/Sonna/Suite%20222/DowntownBoiseOffices-99-1536x1024.jpg',
      'Brand%20Assets/Sonna/Suite%20222/DowntownBoiseOffices-103-1536x1024.jpg'
    ],
    'Sonna 252': [
      'Brand%20Assets/Sonna/Suite%20252/DowntownBoiseOffices-113-1536x1024.jpg',
      'Brand%20Assets/Sonna/Suite%20252/DowntownBoiseOffices-114-1536x1024.jpg'
    ],
    'Sonna 258': [
      'Brand%20Assets/Sonna/Suite%20258/DowntownBoiseOffices-122-1536x1024.jpg',
      'Brand%20Assets/Sonna/Suite%20258/DowntownBoiseOffices-123-1536x1024.jpg'
    ],
    'Sonna 300': [
      'Brand%20Assets/Sonna/Suite%20300/DowntownBoiseOffices-127-1536x1024.jpg',
      'Brand%20Assets/Sonna/Suite%20300/DowntownBoiseOffices-130-1536x1024.jpg',
      'Brand%20Assets/Sonna/Suite%20300/DowntownBoiseOffices-132-1536x1024.jpg'
    ],
    'Sonna 310': [
      'Brand%20Assets/Sonna/Suite%20310/DowntownBoiseOffices-133-1536x1024.jpg',
      'Brand%20Assets/Sonna/Suite%20310/DowntownBoiseOffices-135-1536x1024.jpg',
      'Brand%20Assets/Sonna/Suite%20310/DowntownBoiseOffices-136-1536x1024.jpg',
      'Brand%20Assets/Sonna/Suite%20310/DowntownBoiseOffices-139-1536x1024.jpg',
      'Brand%20Assets/Sonna/Suite%20310/DowntownBoiseOffices-140-1536x1024.jpg',
      'Brand%20Assets/Sonna/Suite%20310/DowntownBoiseOffices-145-1536x1024.jpg'
    ],
    'Sonna 322': [
      'Brand%20Assets/Sonna/Suite%20322/DowntownBoiseOffices-147-1536x1024.jpg',
      'Brand%20Assets/Sonna/Suite%20322/DowntownBoiseOffices-148-1536x1024.jpg',
      'Brand%20Assets/Sonna/Suite%20322/DowntownBoiseOffices-149-1536x1024.jpg',
      'Brand%20Assets/Sonna/Suite%20322/DowntownBoiseOffices-150-1536x1024.jpg'
    ],
    'Sonna 356': [
      'Brand%20Assets/Sonna/Suite%20356/DowntownBoiseOffices-154-1536x1024.avif',
      'Brand%20Assets/Sonna/Suite%20356/DowntownBoiseOffices-155-1536x1024.avif',
      'Brand%20Assets/Sonna/Suite%20356/DowntownBoiseOffices-157-1536x1024.avif'
    ],

    // ----- Mercantile -----
    'Mercantile 200': [
      'Brand%20Assets/Mercantile/Suite%20200/DowntownBoiseOffices-33-1536x1024.avif',
      'Brand%20Assets/Mercantile/Suite%20200/DowntownBoiseOffices-34-1536x1024.avif',
      'Brand%20Assets/Mercantile/Suite%20200/DowntownBoiseOffices-35-1536x1030.avif',
      'Brand%20Assets/Mercantile/Suite%20200/DowntownBoiseOffices-36-1536x1024.avif',
      'Brand%20Assets/Mercantile/Suite%20200/DowntownBoiseOffices-37-1536x1024.avif',
      'Brand%20Assets/Mercantile/Suite%20200/DowntownBoiseOffices-38-1536x1024.avif',
      'Brand%20Assets/Mercantile/Suite%20200/DowntownBoiseOffices-39-1536x1024.avif',
      'Brand%20Assets/Mercantile/Suite%20200/DowntownBoiseOffices-40-1536x1024.avif'
    ],
    'Mercantile 203': [
      'Brand%20Assets/Mercantile/Suite%20203/DowntownBoiseOffices-47-1536x1024.avif',
      'Brand%20Assets/Mercantile/Suite%20203/DowntownBoiseOffices-48-1536x1024.avif',
      'Brand%20Assets/Mercantile/Suite%20203/DowntownBoiseOffices-49-1536x1024.avif',
      'Brand%20Assets/Mercantile/Suite%20203/DowntownBoiseOffices-50-1536x1024.avif',
      'Brand%20Assets/Mercantile/Suite%20203/DowntownBoiseOffices-51-1536x1024.avif',
      'Brand%20Assets/Mercantile/Suite%20203/DowntownBoiseOffices-52-1536x1024.avif',
      'Brand%20Assets/Mercantile/Suite%20203/DowntownBoiseOffices-53-1536x1024.avif',
      'Brand%20Assets/Mercantile/Suite%20203/DowntownBoiseOffices-54-1536x1024.avif'
    ],
    'Mercantile 300B': [
      'Brand%20Assets/Mercantile/Suite%20300B/DowntownBoiseOffices-55-1536x1024.avif',
      'Brand%20Assets/Mercantile/Suite%20300B/DowntownBoiseOffices-56-1536x1024.avif',
      'Brand%20Assets/Mercantile/Suite%20300B/DowntownBoiseOffices-57-1536x1024.avif',
      'Brand%20Assets/Mercantile/Suite%20300B/DowntownBoiseOffices-58-1536x1025.avif',
      'Brand%20Assets/Mercantile/Suite%20300B/DowntownBoiseOffices-59-1536x1024.avif',
      'Brand%20Assets/Mercantile/Suite%20300B/DowntownBoiseOffices-60-1536x1024.avif',
      'Brand%20Assets/Mercantile/Suite%20300B/DowntownBoiseOffices-61-1536x1024.avif'
    ]
  };

  function suiteThumb(building, unit) {
    const arr = SUITE_PHOTOS[building + ' ' + unit];
    if (arr && arr.length) return arr[0];
    return BUILDING_HERO[building] || COMING_SOON;
  }

  function unitHasPhotos(building, unit) {
    const arr = SUITE_PHOTOS[building + ' ' + unit];
    return !!(arr && arr.length);
  }

  // ============================================
  // Amenities & Building Scores — shared data
  // Edit this array to update copy, scores, amenities, or best-fit
  // text everywhere on the site (homepage comparison + per-building
  // scorecards).
  // ============================================
  const BUILDINGS_COMPARE = [
    {
      id: 'northrup',
      name: 'Northrup Building',
      address: '405 South 8th Street',
      page: 'northrup.html',
      heroImage: 'Brand%20Assets/Northrup/Hero%20Northrup.jpg',
      positioning: 'The most amenity-rich block in BoDo — food, coffee, and nightlife at your door.',
      amenityScore: 9.3,
      parkingScore: 8.2,
      reasoning: 'Strong on-site food, coffee, and nightlife inside the 8th Street Marketplace, with nearby public garages and metered street parking on every side.',
      parkingReasoning: 'Public garages on the 9th and Broad blocks plus metered street parking ringing the marketplace — most tours walk in from less than two blocks away.',
      amenities: [
        'Slow By Slow Coffee',
        'Solid Grill & Bar',
        'Liquid Lounge',
        'BoDo district',
        'Boise Greenbelt',
        'Hotels',
        'Warehouse Food Hall',
        'Restaurants & nightlife'
      ],
      bestFit: 'Creative teams, startups, client-facing firms, and companies that value walkability.'
    },
    {
      id: 'sonna',
      name: 'Sonna Building',
      address: '906–910 Main Street',
      page: 'sonna.html',
      heroImage: 'Brand%20Assets/Sonna/Hero%20Sonna.jpg',
      positioning: 'Main Street frontage with a polished, professional downtown address.',
      amenityScore: 8.7,
      parkingScore: 8.0,
      reasoning: 'Main Street frontage with cafés, salons, financial services, and restaurants; public garages on adjacent blocks; strong downtown visibility for client-facing work.',
      parkingReasoning: 'Public garages on the 9th and 10th Street blocks plus metered street parking on Bannock, Idaho, and Main.',
      amenities: [
        'Alias Coffee House',
        'Charles Schwab',
        'Fête Style Bar',
        'Downtown restaurants',
        'Retail',
        'Hotels',
        'Transit access',
        'BoDo nearby'
      ],
      bestFit: 'Professional services, finance, legal, consulting, and teams wanting a polished downtown address.'
    },
    {
      id: 'mercantile',
      name: 'Mercantile Building',
      address: '404 South 8th Street',
      page: 'mercantile.html',
      heroImage: 'Brand%20Assets/Mercantile/Hero%20Mercantile.jpg',
      positioning: 'Historic 8th Street Marketplace with creative office energy and Greenbelt access.',
      amenityScore: 9.1,
      parkingScore: 8.3,
      reasoning: 'Historic 8th Street Marketplace setting with restaurants, salon services, boutique retail, and easy Greenbelt access, plus several nearby public parking options.',
      parkingReasoning: 'Multiple public garages and surface lots ring the marketplace block — Front Street, Broad Street, and 9th all within a short walk.',
      amenities: [
        'NATURALLY Salon',
        'Slow By Slow Coffee',
        'Restaurants',
        'Boutique retail',
        'Art & galleries',
        'Warehouse Food Hall',
        'Boise Greenbelt',
        'Entertainment venues'
      ],
      bestFit: 'Design firms, tech teams, wellness brands, boutique agencies, and creative professionals.'
    }
  ];

  const TOP_AMENITY_SCORE = Math.max(...BUILDINGS_COMPARE.map(b => b.amenityScore));
  const TOP_PARKING_SCORE = Math.max(...BUILDINGS_COMPARE.map(b => b.parkingScore));

  const escapeHtml = (s) => String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  function animateScoreBars(root) {
    const fills = root.querySelectorAll('.fill[data-fill]');
    if (!fills.length) return;
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.style.width = e.target.dataset.fill + '%';
            io.unobserve(e.target);
          }
        });
      }, { threshold: 0.25 });
      fills.forEach(f => io.observe(f));
    } else {
      fills.forEach(f => f.style.width = f.dataset.fill + '%');
    }
  }

  initCompare();
  initBuildingScorecard();

  // ---- Homepage comparison grid ----
  function initCompare() {
    const grid = document.getElementById('compareGrid');
    if (!grid) return;
    const topAmenity = TOP_AMENITY_SCORE;
    const topParking = TOP_PARKING_SCORE;

    grid.innerHTML = BUILDINGS_COMPARE.map(b => {
      const isTopA = b.amenityScore === topAmenity;
      const isTopP = b.parkingScore === topParking;
      const aPct = Math.max(0, Math.min(100, (b.amenityScore / 10) * 100));
      const pPct = Math.max(0, Math.min(100, (b.parkingScore / 10) * 100));
      const headingId = `compare-${b.id}-h`;
      return `
        <article class="compare-card" role="listitem" aria-labelledby="${headingId}">
          <div class="badges" aria-hidden="${!(isTopA || isTopP)}">
            ${isTopA ? '<span class="compare-badge amenity" title="Highest amenity score">Top amenities</span>' : ''}
            ${isTopP ? '<span class="compare-badge parking" title="Highest parking score">Top parking</span>' : ''}
          </div>
          <p class="address">${escapeHtml(b.address)}</p>
          <h3 id="${headingId}">${escapeHtml(b.name)}</h3>
          <p class="position">${escapeHtml(b.positioning)}</p>

          <div class="score-block">
            <div class="score-pair">
              <div class="score-row">
                <span class="score-label">Amenity score</span>
                <span class="score-value">${b.amenityScore.toFixed(1)}<span class="max">/10</span></span>
              </div>
              <div class="score-bar${isTopA ? ' top' : ''}" role="progressbar" aria-valuenow="${b.amenityScore}" aria-valuemin="0" aria-valuemax="10" aria-label="Amenity score">
                <span class="fill" data-fill="${aPct}"></span>
              </div>
            </div>

            <div class="score-pair">
              <div class="score-row">
                <span class="score-label">Parking score</span>
                <span class="score-value">${b.parkingScore.toFixed(1)}<span class="max">/10</span></span>
              </div>
              <div class="score-bar${isTopP ? ' top' : ''}" role="progressbar" aria-valuenow="${b.parkingScore}" aria-valuemin="0" aria-valuemax="10" aria-label="Parking score">
                <span class="fill" data-fill="${pPct}"></span>
              </div>
            </div>
          </div>

          <p class="reasoning">${escapeHtml(b.reasoning)}</p>

          <ul class="amenity-list" aria-label="On-site and nearby amenities">
            ${b.amenities.map(a => `<li>${escapeHtml(a)}</li>`).join('')}
          </ul>

          <div class="best-fit">
            <p class="best-fit-label">Best fit</p>
            <p class="best-fit-text">${escapeHtml(b.bestFit)}</p>
            <a class="card-link" href="${b.page}">Explore the ${escapeHtml(b.name.replace(' Building',''))} →</a>
          </div>
        </article>
      `;
    }).join('');

    animateScoreBars(grid);
  }

  // ---- Per-building focused scorecard ----
  function initBuildingScorecard() {
    const slot = document.querySelector('[data-building-scorecard]');
    if (!slot) return;
    const id = slot.dataset.buildingId;
    const b = BUILDINGS_COMPARE.find(x => x.id === id);
    if (!b) { slot.remove(); return; }

    const isTopA = b.amenityScore === TOP_AMENITY_SCORE;
    const isTopP = b.parkingScore === TOP_PARKING_SCORE;
    const aPct = (b.amenityScore / 10) * 100;
    const pPct = (b.parkingScore / 10) * 100;

    slot.innerHTML = `
      <div class="scorecard-scores">
        <div class="score-tile${isTopA ? ' is-top' : ''}">
          <div class="score-tile-head">
            <span class="score-tile-label">Amenity score</span>
            ${isTopA ? '<span class="compare-badge amenity">Top of portfolio</span>' : ''}
          </div>
          <div class="score-tile-value">${b.amenityScore.toFixed(1)}<span class="max">/10</span></div>
          <div class="score-bar${isTopA ? ' top' : ''}" role="progressbar" aria-valuenow="${b.amenityScore}" aria-valuemin="0" aria-valuemax="10" aria-label="Amenity score">
            <span class="fill" data-fill="${aPct}"></span>
          </div>
          <p class="score-tile-note">${escapeHtml(b.reasoning)}</p>
        </div>

        <div class="score-tile${isTopP ? ' is-top' : ''}">
          <div class="score-tile-head">
            <span class="score-tile-label">Parking score</span>
            ${isTopP ? '<span class="compare-badge parking">Top of portfolio</span>' : ''}
          </div>
          <div class="score-tile-value">${b.parkingScore.toFixed(1)}<span class="max">/10</span></div>
          <div class="score-bar${isTopP ? ' top' : ''}" role="progressbar" aria-valuenow="${b.parkingScore}" aria-valuemin="0" aria-valuemax="10" aria-label="Parking score">
            <span class="fill" data-fill="${pPct}"></span>
          </div>
          <p class="score-tile-note">${escapeHtml(b.parkingReasoning || b.reasoning)}</p>
        </div>
      </div>

      <div class="scorecard-side">
        <p class="scorecard-eyebrow">Around the building</p>
        <h3>${escapeHtml(b.positioning)}</h3>
        <ul class="amenity-list" aria-label="On-site and nearby amenities">
          ${b.amenities.map(a => `<li>${escapeHtml(a)}</li>`).join('')}
        </ul>
        <div class="scorecard-bestfit">
          <p class="best-fit-label">Best fit</p>
          <p class="best-fit-text">${escapeHtml(b.bestFit)}</p>
        </div>
        <a class="scorecard-compare-link" href="index.html#amenities">See all three buildings compared <span class="arrow">→</span></a>
      </div>
    `;

    animateScoreBars(slot);
  }

  // ============================================
  // Per-building Suite Galleries
  // Renders a section listing every suite for a given building. Each
  // suite gets a card showing a horizontal photo strip; suites with
  // no photos show the "coming soon" placeholder.
  // ============================================
  initSuiteGalleries();

  function initSuiteGalleries() {
    const slot = document.querySelector('[data-suite-galleries]');
    if (!slot) return;
    const building = slot.dataset.building;
    if (!building) return;

    // Suites in inventory for this building
    const inventory = ALL_UNITS.filter(u => u.building === building);

    // Any extra suites that have photo folders but aren't in inventory
    const inventoryKeys = new Set(inventory.map(u => u.building + ' ' + u.unit));
    const extras = Object.keys(SUITE_PHOTOS)
      .filter(k => k.startsWith(building + ' ') && !inventoryKeys.has(k))
      .map(k => {
        const unit = k.slice(building.length + 1);
        return { building, unit, sf: 0, monthly: 0, specsTBD: true };
      });

    const list = inventory.concat(extras).sort((a, b) => {
      // Sort suites with photos first, then by unit number
      const aHas = unitHasPhotos(a.building, a.unit) ? 0 : 1;
      const bHas = unitHasPhotos(b.building, b.unit) ? 0 : 1;
      if (aHas !== bHas) return aHas - bHas;
      return String(a.unit).localeCompare(String(b.unit), undefined, { numeric: true });
    });

    slot.innerHTML = list.map(u => renderSuiteCard(u)).join('');
    wireGalleryNav(slot);
    // Belt-and-suspenders: ensure the slot is visible even if the
    // global reveal IntersectionObserver missed it (tall container).
    slot.classList.add('in');
  }

  function renderSuiteCard(u) {
    const key = u.building + ' ' + u.unit;
    const photos = SUITE_PHOTOS[key] || [];
    const has = photos.length > 0;
    const id = `suite-${u.building.toLowerCase()}-${String(u.unit).toLowerCase()}`;
    const specs = u.specsTBD
      ? '<span class="suite-card-spec specs-tbd">Specs available on request</span>'
      : `<span class="suite-card-spec"><strong>${formatNum(u.sf)}</strong> sq ft</span>
         <span class="suite-card-spec"><strong>$${formatNum(u.monthly)}</strong>/mo</span>`;

    const gallery = has
      ? `
        <div class="suite-card-strip" data-strip>
          <div class="suite-card-track" data-track>
            ${photos.map((p, i) => `
              <a class="suite-card-shot" href="${p}" target="_blank" rel="noopener" aria-label="Open photo ${i + 1} for Suite ${u.unit}">
                <img src="${p}" alt="Suite ${u.unit} photo ${i + 1}" loading="lazy" />
              </a>
            `).join('')}
          </div>
          ${photos.length > 1
            ? `<button type="button" class="strip-nav prev" data-dir="-1" aria-label="Previous photo">‹</button>
               <button type="button" class="strip-nav next" data-dir="1"  aria-label="Next photo">›</button>
               <span class="strip-count">${photos.length} photos</span>`
            : ''}
        </div>`
      : `
        <div class="suite-card-coming-soon" role="img" aria-label="Photos coming soon">
          <img src="${COMING_SOON}" alt="" />
        </div>`;

    return `
      <article class="suite-card" id="${id}">
        <header class="suite-card-head">
          <div>
            <p class="suite-card-eyebrow">${u.building} Building</p>
            <h3>Suite ${u.unit}</h3>
          </div>
          <div class="suite-card-meta">
            ${specs}
            <a class="btn btn-ghost btn-sm" href="contact.html?suite=${encodeURIComponent(key)}">Inquire <span class="arrow">→</span></a>
          </div>
        </header>
        ${gallery}
      </article>
    `;
  }

  function wireGalleryNav(root) {
    root.querySelectorAll('[data-strip]').forEach(strip => {
      const track = strip.querySelector('[data-track]');
      strip.querySelectorAll('.strip-nav').forEach(btn => {
        btn.addEventListener('click', () => {
          const dir = parseInt(btn.dataset.dir, 10) || 1;
          const w = strip.clientWidth * 0.8;
          track.scrollBy({ left: dir * w, behavior: 'smooth' });
        });
      });
    });
  }

  function formatNum(n) {
    return Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
  }

  // ============================================
  // Map tabs (Building / Nearby parking)
  // ============================================
  document.querySelectorAll('[data-map-module]').forEach(mod => {
    const frame = mod.querySelector('[data-map-frame]');
    const tabs = mod.querySelectorAll('[data-map-tab]');
    if (!frame || !tabs.length) return;
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        if (tab.classList.contains('active')) return;
        tabs.forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
        const key = tab.dataset.mapTab; // "location" | "parking"
        const datasetKey = 'src' + key.charAt(0).toUpperCase() + key.slice(1);
        const newSrc = frame.dataset[datasetKey];
        if (newSrc && frame.src !== newSrc) frame.src = newSrc;
        const titles = {
          location: 'Map · building location',
          parking:  'Map · nearby parking'
        };
        if (titles[key]) frame.title = titles[key];
      });
    });
  });

  // ============================================
  // Qualification wizard
  // ============================================
  initWizard();

  function initWizard() {
    const wizard = document.getElementById('wizard');
    const form = document.getElementById('qualifyForm');
    if (!wizard || !form) return;

    const UNITS = ALL_UNITS;

    // ---- State ----
    const state = {
      current: 1,
      total: 4,
      data: {
        name: '', company: '', email: '', phone: '',
        website: '', linkedin: '',
        industry: '', employees: '',
        moveIn: '', budget: '', size: '',
        experience: '', readyToSign: '',
        priorities: []
      }
    };

    // ---- Helpers ----
    const $ = (sel, root = wizard) => root.querySelector(sel);
    const $$ = (sel, root = wizard) => Array.from(root.querySelectorAll(sel));

    function showStep(n) {
      state.current = n;
      wizard.dataset.current = n;
      $$('.panel').forEach(p => p.classList.toggle('active', Number(p.dataset.panel) === n));
      $$('.wizard-progress .step').forEach(s => {
        const step = Number(s.dataset.step);
        s.classList.toggle('active', step === n);
        s.classList.toggle('done', step < n);
      });
      // Scroll the wizard into view (not the page top)
      const top = wizard.getBoundingClientRect().top + window.scrollY - 90;
      window.scrollTo({ top, behavior: 'smooth' });
    }

    function setError(name, msg) {
      const err = wizard.querySelector(`[data-err-for="${name}"]`);
      const field = wizard.querySelector(`[name="${name}"]`)?.closest('.field');
      if (err) err.textContent = msg || '';
      if (field) field.classList.toggle('invalid', Boolean(msg));
    }

    function clearErrors() {
      $$('.err').forEach(e => e.textContent = '');
      $$('.field.invalid').forEach(f => f.classList.remove('invalid'));
    }

    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    const PHONE_RE = /^[\d\s().+\-]{7,}$/;

    function validateStep(n) {
      clearErrors();
      let ok = true;
      const fail = (name, msg) => { setError(name, msg); ok = false; };

      const d = state.data;
      if (n === 1) {
        if (!d.name.trim()) fail('name', 'Required');
        if (!d.company.trim()) fail('company', 'Required');
        if (!d.email.trim()) fail('email', 'Required');
        else if (!EMAIL_RE.test(d.email)) fail('email', 'Use a valid email like name@company.com');
        if (!d.phone.trim()) fail('phone', 'Required');
        else if (!PHONE_RE.test(d.phone)) fail('phone', 'Use a valid phone number');
      } else if (n === 2) {
        if (!d.industry) fail('industry', 'Choose one');
        if (!d.employees || Number(d.employees) < 1) fail('employees', 'Enter a number');
        if (!d.moveIn) fail('moveIn', 'Pick a timeline');
        if (!d.budget) fail('budget', 'Pick a range');
        if (!d.experience) fail('experience', 'Pick one');
        if (!d.readyToSign) fail('readyToSign', 'Pick one');
      }
      // Step 3 has no required fields
      return ok;
    }

    function readInputs() {
      // Pull text/select/number values into state
      ['name','company','email','phone','website','linkedin','industry','employees'].forEach(k => {
        const el = form.elements[k];
        if (el) state.data[k] = el.value.trim();
      });
    }

    // ---- Chip groups ----
    $$('[data-chips]').forEach(group => {
      const key = group.dataset.chips;
      const hidden = wizard.querySelector(`input[name="${key}"]`);
      group.addEventListener('click', (e) => {
        const chip = e.target.closest('.chip');
        if (!chip) return;
        $$('.chip', group).forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        if (hidden) hidden.value = chip.dataset.value;
        state.data[key] = chip.dataset.value;
        if (key === 'budget') state.data.budgetMax = Number(chip.dataset.max || 0);
        setError(key, '');
      });
    });

    // ---- Priority checkboxes ----
    $$('input[name="priorities"]').forEach(cb => {
      cb.addEventListener('change', () => {
        state.data.priorities = $$('input[name="priorities"]:checked').map(i => i.value);
      });
    });

    // ---- Nav ----
    $$('[data-next]').forEach(btn => btn.addEventListener('click', () => {
      readInputs();
      if (!validateStep(state.current)) return;
      showStep(state.current + 1);
    }));
    $$('[data-prev]').forEach(btn => btn.addEventListener('click', () => {
      readInputs();
      showStep(state.current - 1);
    }));

    // Live re-validate on field change once the user has seen an error
    form.addEventListener('input', (e) => {
      const el = e.target;
      if (!el.name || !el.closest('.field.invalid')) return;
      readInputs();
      setError(el.name, '');
    });

    // ---- Submit ----
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      readInputs();
      // Honeypot — silently abort if filled
      if ((form.elements.company_fax?.value || '').trim() !== '') return;
      // Validate all gated steps
      if (!validateStep(1)) { showStep(1); return; }
      if (!validateStep(2)) { showStep(2); return; }

      const matches = matchUnits(state.data);
      const score = computeScore(state.data);
      const status = leadStatus(score);

      const lead = {
        contact: {
          name: state.data.name,
          company: state.data.company,
          email: state.data.email,
          phone: state.data.phone,
          website: state.data.website || null,
          linkedin: state.data.linkedin || null
        },
        business: {
          industry: state.data.industry,
          employees: Number(state.data.employees),
          moveIn: state.data.moveIn,
          budget: state.data.budget,
          budgetMax: state.data.budgetMax || null,
          size: state.data.size || null,
          experience: state.data.experience,
          readyToSign: state.data.readyToSign
        },
        priorities: state.data.priorities,
        matches: matches.map(m => ({ building: m.building, unit: m.unit, sf: m.sf, monthly: m.monthly })),
        leadScore: score.total,
        scoreBreakdown: score.breakdown,
        leadStatus: status,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      };

      console.log('[Qualify] Lead captured:', lead);
      persistLead(lead);
      // Fire-and-forget POST to the Oppenheimer CRM backend (no auth,
      // public intake). Failure is non-blocking — the lead is already
      // in localStorage and the email CTAs on the results screen are
      // a safety net. Set window.OPPENHEIMER_API to a real URL once
      // the Worker is deployed (see Oppenheimer/docs/api.md).
      postLeadToOppenheimer(lead);
      renderResults(lead, matches);
      showStep(4);
    });

    async function postLeadToOppenheimer(lead) {
      const base = (typeof window !== 'undefined' && window.OPPENHEIMER_API) || '';
      if (!base) return; // Not configured yet — silently skip.
      try {
        const r = await fetch(base.replace(/\/$/, '') + '/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source: 'website-wizard',
            contact: lead.contact,
            business: lead.business,
            priorities: lead.priorities,
            matches: lead.matches,
            leadScore: lead.leadScore,
            leadStatus: lead.leadStatus,
            scoreBreakdown: lead.scoreBreakdown,
            timestamp: lead.timestamp,
            userAgent: lead.userAgent
          })
        });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const data = await r.json();
        console.log('[Qualify] Lead synced to CRM:', data.id);
      } catch (e) {
        console.warn('[Qualify] CRM sync failed (kept locally):', e.message);
      }
    }

    // ---- Restart ----
    document.getElementById('restartBtn')?.addEventListener('click', () => {
      form.reset();
      $$('.chip.active').forEach(c => c.classList.remove('active'));
      state.data = { name:'', company:'', email:'', phone:'', website:'', linkedin:'',
        industry:'', employees:'', moveIn:'', budget:'', size:'',
        experience:'', readyToSign:'', priorities: [] };
      clearErrors();
      showStep(1);
    });

    // ============================================
    // Matching
    // ============================================
    function matchUnits(d) {
      const budgetMax = d.budgetMax || 99999;
      const budgetTier = budgetTierOf(d.budget);
      let sfMin, sfMax;
      if (budgetTier === 'small') { sfMin = 0;    sfMax = 650;  }
      else if (budgetTier === 'mid') { sfMin = 700;  sfMax = 1800; }
      else { sfMin = 2000; sfMax = 20000; }

      // Hard filter: within budget (and exclude units with specs TBD)
      const withinBudget = UNITS.filter(u => !u.specsTBD && u.monthly <= budgetMax);

      // Primary: within SF tier
      let primary = withinBudget.filter(u => u.sf >= sfMin && u.sf <= sfMax);

      // If user gave a specific preferred size, intersect
      if (d.size && d.size !== 'flex') {
        const [sMin, sMax] = sizeRange(d.size);
        const refined = primary.filter(u => u.sf >= sMin && u.sf <= sMax);
        if (refined.length) primary = refined;
      }

      // If too few, widen with adjacent results from withinBudget
      if (primary.length < 3) {
        const idealMid = (sfMin + sfMax) / 2;
        const extras = withinBudget
          .filter(u => !primary.includes(u))
          .sort((a, b) => Math.abs(a.sf - idealMid) - Math.abs(b.sf - idealMid));
        primary = primary.concat(extras).slice(0, 6);
      }

      // Rank: closest to top of SF tier and closest to budget (best value)
      const idealSf = Math.min(sfMax, Math.max(sfMin, (sfMin + sfMax) / 2));
      primary.sort((a, b) => {
        const sfDelta = Math.abs(a.sf - idealSf) - Math.abs(b.sf - idealSf);
        if (sfDelta !== 0) return sfDelta;
        return a.monthly - b.monthly;
      });

      return primary.slice(0, 6);
    }

    function budgetTierOf(b) {
      if (b === 'under1000') return 'small';
      if (b === '1000-2000' || b === '2000-3000') return 'mid';
      return 'large'; // 3000-5000, 5000plus
    }

    function sizeRange(size) {
      switch (size) {
        case 'under500':   return [0, 499];
        case '500-1000':   return [500, 1000];
        case '1000-2000':  return [1000, 2000];
        case '2000plus':   return [2000, 20000];
        default:           return [0, 20000];
      }
    }

    // ============================================
    // Scoring
    // ============================================
    function computeScore(d) {
      const breakdown = {};
      let total = 0;

      const budgetMax = d.budgetMax || 0;
      if (budgetMax > 3000) { breakdown.budgetOver3k = 25; total += 25; }

      const moveInDays = parseInt(d.moveIn, 10);
      if (d.moveIn === 'asap' || (Number.isFinite(moveInDays) && moveInDays <= 90)) {
        breakdown.moveInWithin90 = 20; total += 20;
      }

      if (Number(d.employees) > 5) { breakdown.teamOver5 = 15; total += 15; }
      if (d.website && d.website.length > 4) { breakdown.websiteGiven = 10; total += 10; }
      if (d.experience === 'yes') { breakdown.priorLeasing = 10; total += 10; }
      if ((d.priorities || []).includes('downtown')) { breakdown.downtownPriority = 5; total += 5; }

      return { total, breakdown };
    }

    function leadStatus(score) {
      if (score.total >= 60) return 'Hot Lead';
      if (score.total >= 40) return 'Qualified Lead';
      return 'Nurture Lead';
    }

    // ============================================
    // Render results
    // ============================================
    function renderResults(lead, matches) {
      const grid = document.getElementById('matchGrid');
      const title = document.getElementById('resultsTitle');
      const sub = document.getElementById('resultsSub');
      const badge = document.getElementById('leadStatusBadge');
      const meta = document.getElementById('leadMeta');

      if (title) title.textContent = matches.length
        ? `Hi ${firstName(lead.contact.name)} — we found ${matches.length} suite${matches.length>1?'s':''} that fit.`
        : `Hi ${firstName(lead.contact.name)} — let's talk options.`;

      if (sub) sub.textContent = matches.length
        ? `Based on your budget, team size, and timeline. The top match is highlighted.`
        : `Nothing in our live inventory matches your exact range — DaYna can walk you through alternatives and upcoming availability.`;

      if (badge) {
        badge.hidden = false;
        const cls = lead.leadStatus.toLowerCase().includes('hot') ? 'hot'
                  : lead.leadStatus.toLowerCase().includes('qualified') ? 'qualified'
                  : 'nurture';
        badge.className = `lead-status ${cls}`;
        badge.textContent = `${lead.leadStatus} · score ${lead.leadScore}`;
      }

      if (meta) meta.textContent = `Reference ID · ${lead.timestamp.replace(/[-:.TZ]/g,'').slice(0,14)}`;

      // Grid
      if (!grid) return;
      grid.innerHTML = '';
      if (!matches.length) {
        grid.innerHTML = `
          <div class="match-empty">
            <strong>No live matches just now</strong>
            We're refreshing availability weekly. We'll reach out with the next suite that fits.
          </div>`;
      } else {
        matches.forEach((m, i) => {
          const isBest = i === 0;
          const hasPhotos = unitHasPhotos(m.building, m.unit);
          const img = suiteThumb(m.building, m.unit);
          const altText = hasPhotos ? `Suite ${m.unit} in the ${m.building} Building` : `${m.building} Building (photos coming soon)`;
          const card = document.createElement('article');
          card.className = 'match-card' + (isBest ? ' best-fit' : '');
          card.innerHTML = `
            <div class="match-thumb${hasPhotos ? '' : ' is-coming-soon'}">
              <img src="${img}" alt="${altText}" loading="lazy" />
              ${isBest ? '<span class="best-fit-tag">Best fit</span>' : ''}
              ${hasPhotos ? '' : '<span class="thumb-note">Photos coming soon</span>'}
            </div>
            <div class="match-body">
              <span class="building-pill">${m.building} Building</span>
              <h4>Suite ${m.unit}</h4>
              <div class="match-meta">
                <span><strong>${formatNum(m.sf)}</strong> sq ft</span>
                <span class="price">$${formatNum(m.monthly)}<small>/mo</small></span>
              </div>
              <a class="match-link" href="${m.page}?suite=${encodeURIComponent(m.building + ' ' + m.unit)}">
                View suite →
              </a>
            </div>
          `;
          grid.appendChild(card);
        });
      }

      // Wire CTAs to a mailto with full lead payload
      const subjBase = `${lead.leadStatus} · ${lead.contact.company || lead.contact.name}`;
      const matchLines = matches.map(m => `  - ${m.building} ${m.unit} · ${m.sf} sf · $${formatNum(m.monthly)}/mo`).join('\n') || '  (no live matches)';
      const bodyBase =
`Lead Status: ${lead.leadStatus} (score ${lead.leadScore})
Captured: ${lead.timestamp}

— Contact —
Name: ${lead.contact.name}
Company: ${lead.contact.company}
Email: ${lead.contact.email}
Phone: ${lead.contact.phone}
Website: ${lead.contact.website || '—'}
LinkedIn: ${lead.contact.linkedin || '—'}

— Business —
Industry: ${lead.business.industry}
Employees: ${lead.business.employees}
Move-in: ${lead.business.moveIn}
Budget: ${lead.business.budget}
Size pref: ${lead.business.size || '—'}
Prior leasing: ${lead.business.experience}
Ready in 90 days: ${lead.business.readyToSign}

— Priorities —
${(lead.priorities || []).join(', ') || '—'}

— Matched Suites —
${matchLines}
`;

      const tour = document.getElementById('ctaTour');
      const sheet = document.getElementById('ctaSheet');
      if (tour) tour.href = mailto(subjBase + ' · Tour request', 'Tour request from website lead\n\n' + bodyBase);
      if (sheet) sheet.href = mailto(subjBase + ' · Pricing sheet', 'Pricing-sheet request from website lead\n\n' + bodyBase);
    }

    function persistLead(lead) {
      try {
        const arr = JSON.parse(localStorage.getItem('dbos_leads') || '[]');
        arr.push(lead);
        localStorage.setItem('dbos_leads', JSON.stringify(arr));
      } catch (e) { /* private mode etc — ignore */ }
    }

    function mailto(subject, body) {
      return `mailto:dayna-buckley@oppcos.com,coby-barlow@oppcos.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }
    function formatNum(n) {
      return Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
    }
    function firstName(full) {
      return (full || '').trim().split(/\s+/)[0] || 'there';
    }
  }
})();

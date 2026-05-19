(() => {
  // Year stamp
  document.querySelectorAll('#year').forEach(el => el.textContent = new Date().getFullYear());

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
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
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
  // Amenities & Building Scores — comparison cards
  // Edit BUILDINGS_COMPARE below to update copy.
  // ============================================
  initCompare();

  function initCompare() {
    const grid = document.getElementById('compareGrid');
    if (!grid) return;

    const BUILDINGS_COMPARE = [
      {
        id: 'northrup',
        name: 'Northrup Building',
        address: '405 South 8th Street',
        page: 'northrup.html',
        positioning: 'The most amenity-rich block in BoDo — food, coffee, and nightlife at your door.',
        amenityScore: 9.3,
        parkingScore: 8.2,
        reasoning: 'Strong on-site food, coffee, and nightlife inside the 8th Street Marketplace, with nearby public garages and metered street parking on every side.',
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
        positioning: 'Main Street frontage with a polished, professional downtown address.',
        amenityScore: 8.7,
        parkingScore: 8.0,
        reasoning: 'Main Street frontage with cafés, salons, financial services, and restaurants; public garages on adjacent blocks; strong downtown visibility for client-facing work.',
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
        positioning: 'Historic 8th Street Marketplace with creative office energy and Greenbelt access.',
        amenityScore: 9.1,
        parkingScore: 8.3,
        reasoning: 'Historic 8th Street Marketplace setting with restaurants, salon services, boutique retail, and easy Greenbelt access, plus several nearby public parking options.',
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

    const topAmenity = Math.max(...BUILDINGS_COMPARE.map(b => b.amenityScore));
    const topParking = Math.max(...BUILDINGS_COMPARE.map(b => b.parkingScore));

    const escapeHtml = (s) => String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

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

    // Animate score bars on scroll
    const fills = grid.querySelectorAll('.fill');
    if ('IntersectionObserver' in window && fills.length) {
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

    // ---- Available units ----
    const UNITS = [
      { building: 'Northrup',   unit: '371', sf: 1023, monthly: 1619.75, page: 'northrup.html' },
      { building: 'Northrup',   unit: '250', sf: 2370, monthly: 3555.00, page: 'northrup.html' },
      { building: 'Sonna',      unit: '356', sf:  279, monthly:  450.00, page: 'sonna.html' },
      { building: 'Sonna',      unit: '340', sf:  869, monthly: 1375.92, page: 'sonna.html' },
      { building: 'Sonna',      unit: '322', sf:  266, monthly:  399.00, page: 'sonna.html' },
      { building: 'Sonna',      unit: '400', sf:  788, monthly: 1247.67, page: 'sonna.html' },
      { building: 'Sonna',      unit: '420', sf:  526, monthly:  832.83, page: 'sonna.html' },
      { building: 'Sonna',      unit: '426', sf: 1190, monthly: 1884.17, page: 'sonna.html' },
      { building: 'Sonna',      unit: '328', sf:  220, monthly:  330.00, page: 'sonna.html' },
      { building: 'Sonna',      unit: '215', sf: 2388, monthly: 3781.00, page: 'sonna.html' },
      { building: 'Sonna',      unit: '330', sf:  243, monthly:  364.50, page: 'sonna.html' },
      { building: 'Sonna',      unit: '210', sf:  615, monthly:  973.75, page: 'sonna.html' },
      { building: 'Sonna',      unit: '221', sf:  430, monthly:  680.83, page: 'sonna.html' },
      { building: 'Sonna',      unit: '101', sf: 4315, monthly: 6831.00, page: 'sonna.html' },
      { building: 'Sonna',      unit: '310', sf: 2088, monthly: 3306.00, page: 'sonna.html' },
      { building: 'Sonna',      unit: '214', sf: 1554, monthly: 2460.50, page: 'sonna.html' },
      { building: 'Sonna',      unit: '204', sf:  550, monthly:  870.83, page: 'sonna.html' },
      { building: 'Sonna',      unit: '109', sf: 1195, monthly: 1892.08, page: 'sonna.html' },
      { building: 'Sonna',      unit: '405', sf: 1795, monthly: 2842.08, page: 'sonna.html' },
      { building: 'Sonna',      unit: '417', sf: 1611, monthly: 2550.75, page: 'sonna.html' },
      { building: 'Sonna',      unit: '432', sf:  488, monthly:  772.67, page: 'sonna.html' },
      { building: 'Sonna',      unit: '300', sf: 4222, monthly: 6683.17, page: 'sonna.html' },
      { building: 'Sonna',      unit: '212', sf:  528, monthly:  836.00, page: 'sonna.html' }
    ];

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
      renderResults(lead, matches);
      showStep(4);
    });

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

      // Hard filter: within budget
      const withinBudget = UNITS.filter(u => u.monthly <= budgetMax);

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
          const card = document.createElement('article');
          card.className = 'match-card' + (isBest ? ' best-fit' : '');
          card.innerHTML = `
            ${isBest ? '<span class="best-fit-tag">Best fit</span>' : ''}
            <span class="building-pill">${m.building} Building</span>
            <h4>Suite ${m.unit}</h4>
            <div class="match-meta">
              <span><strong>${formatNum(m.sf)}</strong> sq ft</span>
              <span class="price">$${formatNum(m.monthly)}<small>/mo</small></span>
            </div>
            <a class="match-link" href="${m.page}?suite=${encodeURIComponent(m.building + ' ' + m.unit)}">
              View suite →
            </a>
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

// El Raminel — small, dependency-free behaviour for the one page.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  // Opening hours: Tuesday–Sunday, two services. Monday (1) closed.
  const SERVICES = [[7 * 60 + 30, 14 * 60 + 30], [18 * 60, 23 * 60]];
  const DAYS = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
  const fmt = (m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;

  // Time in Rovereto, whatever the visitor's clock says.
  function romeNow() {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
    const get = (t) => parts.find((p) => p.type === t).value;
    const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
    return { day, min: (+get('hour') % 24) * 60 + +get('minute') };
  }

  function statusLine() {
    const { day, min } = romeNow();
    if (day !== 1) {
      for (const [a, b] of SERVICES) if (min >= a && min < b) return { open: true, text: `Aperto ora, fino alle ${fmt(b)}` };
      const next = SERVICES.find(([a]) => min < a);
      if (next) return { open: false, text: `Chiuso ora, riapriamo alle ${fmt(next[0])}` };
    }
    // Next opening day
    let d = (day + 1) % 7;
    if (d === 1) d = 2;
    const when = d === (day + 1) % 7 ? 'domani' : DAYS[d];
    return { open: false, text: day === 1 ? `Il lunedì siamo chiusi, riapriamo ${when} alle 7:30` : `Chiuso ora, riapriamo ${when} alle 7:30` };
  }

  const status = document.querySelector('[data-status]');
  if (status) {
    const paint = () => {
      const s = statusLine();
      status.classList.toggle('is-open', s.open);
      status.querySelector('[data-status-text]').textContent = s.text;
    };
    paint();
    setInterval(paint, 60000);
  }

  // Bar: solid once the hero is behind, hides while reading down, returns on the way up.
  const bar = document.querySelector('[data-bar]');
  let lastY = scrollY;
  let ticking = false;
  const onScroll = () => {
    const y = scrollY;
    bar.classList.toggle('is-solid', y > 40);
    const drawerOpen = document.body.classList.contains('has-drawer');
    bar.classList.toggle('is-hidden', !drawerOpen && y > innerHeight * 0.8 && y > lastY + 4);
    if (y < lastY - 4) bar.classList.remove('is-hidden');
    lastY = y;
    turnPlates();
    ticking = false;
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });

  // Drawer on small screens
  const toggle = document.querySelector('[data-toggle]');
  const drawer = document.querySelector('[data-drawer]');
  const setDrawer = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.querySelector('span').textContent = open ? 'Chiudi' : 'Menu';
    drawer.hidden = !open;
    document.body.classList.toggle('has-drawer', open);
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) bar.classList.add('is-solid');
  };
  toggle.addEventListener('click', () => setDrawer(toggle.getAttribute('aria-expanded') !== 'true'));
  drawer.addEventListener('click', (e) => { if (e.target.closest('a')) setDrawer(false); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !drawer.hidden) { setDrawer(false); toggle.focus(); } });
  matchMedia('(min-width: 861px)').addEventListener('change', (e) => { if (e.matches) setDrawer(false); });

  // Current section in the bar
  const links = [...document.querySelectorAll('.bar__nav a')];
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) {
        if (!en.isIntersecting) continue;
        links.forEach((a) => {
          if (a.getAttribute('href') === '#' + en.target.id) a.setAttribute('aria-current', 'true');
          else a.removeAttribute('aria-current');
        });
      }
    }, { rootMargin: '-45% 0px -50% 0px' });
    links.forEach((a) => { const s = document.querySelector(a.getAttribute('href')); if (s) io.observe(s); });
  }

  // Reveal once
  const reveals = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
    reveals.forEach((el) => io.observe(el));
    addEventListener('load', () => setTimeout(() => reveals.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < innerHeight && r.bottom > 0) el.classList.add('is-in');
    }), 2500));
  } else reveals.forEach((el) => el.classList.add('is-in'));

  // Dough picker
  const picker = document.querySelector('[data-dough-picker]');
  if (picker) {
    const radios = [...picker.querySelectorAll('[role="radio"]')];
    const panels = [...document.querySelectorAll('[data-dough-panel]')];
    const photo = document.querySelector('.doughs__photo');
    const choose = (btn, focus) => {
      radios.forEach((r) => { const on = r === btn; r.setAttribute('aria-checked', String(on)); r.tabIndex = on ? 0 : -1; });
      panels.forEach((p) => {
        const on = p.dataset.doughPanel === btn.dataset.dough;
        p.hidden = !on;
        p.classList.toggle('is-entering', on);
      });
      if (photo) { photo.classList.toggle('is-nudged'); }
      if (focus) btn.focus();
    };
    radios.forEach((r, i) => {
      r.tabIndex = i === 0 ? 0 : -1;
      r.addEventListener('click', () => choose(r));
      r.addEventListener('keydown', (e) => {
        const k = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
        if (!k) return;
        e.preventDefault();
        choose(radios[(i + k + radios.length) % radios.length], true);
      });
    });
  }

  // Plates turn a little as their field slides up: the pot's spiral, set in motion.
  const turners = [...document.querySelectorAll('[data-turn]')];
  function turnPlates() {
    if (reduce.matches) return;
    const vh = innerHeight;
    for (const el of turners) {
      const r = el.closest('.dish').getBoundingClientRect();
      if (r.bottom < -vh || r.top > vh * 2) continue;
      const p = Math.max(-1, Math.min(1.5, (vh - r.top) / vh - 1)); // -1 entering .. 0 settled
      el.style.transform = `rotate(${(p * 38).toFixed(2)}deg) scale(${(1 + Math.min(0, p) * 0.08).toFixed(3)})`;
    }
  }
  turnPlates();
  addEventListener('resize', turnPlates);

  // Menu tabs
  const tablist = document.querySelector('[data-tabs]');
  if (tablist) {
    const tabs = [...tablist.querySelectorAll('[role="tab"]')];
    const select = (tab, focus) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        const p = document.getElementById(t.getAttribute('aria-controls'));
        p.hidden = !on;
        p.classList.toggle('is-entering', on);
      });
      if (focus) tab.focus();
      tab.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reduce.matches ? 'auto' : 'smooth' });
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(t));
      t.addEventListener('keydown', (e) => {
        let j = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
        if (j === undefined) return;
        e.preventDefault();
        select(tabs[(j + tabs.length) % tabs.length], true);
      });
    });
  }

  // Booking request: builds an email with the visitor's choices.
  const form = document.querySelector('[data-book]');
  if (form) {
    const date = form.querySelector('#f-data');
    const msg = form.querySelector('[data-msg]');
    const out = form.querySelector('#f-persone');
    const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const today = new Date();
    date.min = iso(today);
    const first = new Date(today);
    if (first.getDay() === 1) first.setDate(first.getDate() + 1);
    date.value = iso(first);
    let people = 2;
    form.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => {
      people = Math.max(1, Math.min(30, people + +b.dataset.step));
      out.textContent = people;
    }));
    const say = (text, warn) => { msg.textContent = text; msg.classList.toggle('is-warn', !!warn); };
    const parseDay = () => { const [y, m, d] = date.value.split('-').map(Number); return new Date(y, m - 1, d); };
    date.addEventListener('change', () => {
      if (!date.value) return say('');
      if (parseDay().getDay() === 1) say('Il lunedì siamo chiusi: scegli un altro giorno.', true);
      else say('');
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = form.nome.value.trim();
      const tel = form.telefono.value.trim();
      form.nome.setAttribute('aria-invalid', String(!name));
      form.telefono.setAttribute('aria-invalid', String(!tel));
      if (!name || !tel) return say('Servono il tuo nome e un numero per richiamarti.', true);
      if (!date.value) return say('Scegli il giorno.', true);
      const day = parseDay();
      if (day.getDay() === 1) return say('Il lunedì siamo chiusi: scegli un altro giorno.', true);
      const label = day.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
      const ora = form.ora.value;
      const who = people === 1 ? '1 persona' : `${people} persone`;
      const subject = `Prenotazione: ${label}, ${ora}, ${who}`;
      const body = [
        'Buongiorno,',
        `vorrei prenotare un tavolo per ${who} ${label} alle ${ora}.`,
        '',
        `Nome: ${name}`,
        `Telefono: ${tel}`,
        form.note.value.trim() ? `Note: ${form.note.value.trim()}` : '',
        '',
        'Grazie.'
      ].filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n');
      location.href = `mailto:larosa15@outlook.it?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      say('Si è aperta la tua email con la richiesta pronta: inviala e ti richiamiamo per confermare. Per oggi stesso è meglio telefonare.');
    });
  }
})();

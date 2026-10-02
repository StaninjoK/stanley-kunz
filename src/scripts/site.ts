/**
 * The only client-side script of the site (bundled, ~5 KB). Everything is progressive enhancement:
 * without JavaScript all content is visible and every link works.
 */
import { track } from './analytics';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
const lowData = Boolean(connection?.saveData) || /(^|-)2g$/.test(connection?.effectiveType ?? '');

/* ---------------- header: solid after scrolling, hides while reading downwards ---------------- */
function initHeader() {
  const header = document.querySelector<HTMLElement>('[data-header]');
  if (!header) return;
  let lastY = window.scrollY;
  let ticking = false;
  const update = () => {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 24);
    const goingDown = y > lastY;
    header.classList.toggle('is-hidden', goingDown && y > 480 && !document.body.classList.contains('menu-open'));
    lastY = y;
    ticking = false;
  };
  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    },
    { passive: true },
  );
  update();
}

/* ---------------- mobile menu ---------------- */
function initMenu() {
  const menu = document.querySelector<HTMLElement>('[data-menu]');
  const openBtn = document.querySelector<HTMLButtonElement>('[data-menu-open]');
  const closeBtn = document.querySelector<HTMLButtonElement>('[data-menu-close]');
  if (!menu || !openBtn || !closeBtn) return;

  const focusables = () => [...menu.querySelectorAll<HTMLElement>('a, button')];
  const close = () => {
    menu.hidden = true;
    openBtn.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-open');
    document.body.style.overflow = '';
    openBtn.focus();
  };
  const open = () => {
    menu.hidden = false;
    openBtn.setAttribute('aria-expanded', 'true');
    document.body.classList.add('menu-open');
    document.body.style.overflow = 'hidden';
    closeBtn.focus();
  };
  openBtn.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  menu.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
    if (e.key !== 'Tab') return;
    const items = focusables();
    const first = items[0];
    const last = items[items.length - 1];
    if (!first || !last) return;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });
  menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => (document.body.style.overflow = '')));
}

/* ---------------- reveal on scroll ---------------- */
function initReveal() {
  const els = document.querySelectorAll<HTMLElement>('[data-reveal]');
  if (!('IntersectionObserver' in window) || reducedMotion.matches) {
    els.forEach((el) => el.classList.add('is-visible'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
  );
  els.forEach((el) => io.observe(el));
}

/* ---------------- ambient video loops: only play while visible, never with reduced motion / save-data ---------------- */
function initLoops() {
  const loops = document.querySelectorAll<HTMLVideoElement>('video[data-loop]');
  if (!loops.length || reducedMotion.matches || lowData) return;
  const start = (video: HTMLVideoElement) => {
    if (!video.dataset.loaded) {
      for (const source of video.querySelectorAll<HTMLSourceElement>('source[data-src]')) {
        source.src = source.dataset.src ?? '';
      }
      video.load();
      video.dataset.loaded = 'true';
      video.addEventListener('playing', () => video.classList.add('is-playing'), { once: true });
    }
    void video.play().catch(() => undefined);
  };
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const video = entry.target as HTMLVideoElement;
        if (entry.isIntersecting) start(video);
        else if (video.dataset.loaded) video.pause();
      }
    },
    { threshold: 0.25 },
  );
  const begin = () => loops.forEach((v) => io.observe(v));
  // Loops never compete with the page's first paint.
  if (document.readyState === 'complete') setTimeout(begin, 300);
  else window.addEventListener('load', () => setTimeout(begin, 300), { once: true });
}

/* ---------------- YouTube facade: the iframe (and YouTube itself) loads only after a click ---------------- */
function initVideoFacades() {
  document.querySelectorAll<HTMLButtonElement>('[data-yt-play]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.ytPlay;
      const wrap = btn.closest<HTMLElement>('[data-yt]');
      if (!id || !wrap) return;
      const start = btn.dataset.start ? `&start=${btn.dataset.start}` : '';
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1${start}`;
      iframe.title = btn.dataset.title ?? 'YouTube-Video';
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      iframe.allowFullscreen = true;
      iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      wrap.classList.add('is-playing');
      wrap.append(iframe);
      iframe.focus();
      track(`video-play-${id}`, btn.dataset.title ?? id);
    });
  });
}

/* ---------------- moments: fresh order on every visit, "neu" badges computed from today's date ---------------- */
function initMoments() {
  const now = Date.now();
  document.querySelectorAll<HTMLElement>('[data-date]').forEach((el) => {
    const date = Date.parse(el.dataset.date ?? '');
    const days = (now - date) / 864e5;
    if (days >= 0 && days < Number(el.dataset.newDays ?? 21)) el.classList.add('is-new');
  });
  document.querySelectorAll<HTMLElement>('[data-shuffle]').forEach((list) => {
    const keep = Number(list.dataset.shuffleKeep ?? 1);
    const items = [...list.children].filter((el) => !(el as HTMLElement).dataset.fixed);
    const fixed = [...list.children].filter((el) => (el as HTMLElement).dataset.fixed);
    const head = items.slice(0, keep);
    const rest = items.slice(keep);
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rest[i], rest[j]] = [rest[j]!, rest[i]!];
    }
    list.replaceChildren(...head, ...rest, ...fixed);
  });
}

/* ---------------- rail controls (horizontal scrollers) ---------------- */
function initRails() {
  document.querySelectorAll<HTMLElement>('[data-rail]').forEach((rail) => {
    const track = rail.querySelector<HTMLElement>('[data-rail-track]');
    const prev = rail.querySelector<HTMLButtonElement>('[data-rail-prev]');
    const next = rail.querySelector<HTMLButtonElement>('[data-rail-next]');
    if (!track || !prev || !next) return;
    const step = () => Math.max(260, track.clientWidth * 0.8);
    prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: reducedMotion.matches ? 'auto' : 'smooth' }));
    next.addEventListener('click', () => track.scrollBy({ left: step(), behavior: reducedMotion.matches ? 'auto' : 'smooth' }));
    const sync = () => {
      prev.disabled = track.scrollLeft < 8;
      next.disabled = track.scrollLeft + track.clientWidth > track.scrollWidth - 8;
    };
    track.addEventListener('scroll', sync, { passive: true });
    sync();
  });
}

/* ---------------- project list: floating image preview that follows the pointer ---------------- */
function initProjectPreview() {
  const list = document.querySelector<HTMLElement>('[data-preview-list]');
  const preview = document.querySelector<HTMLElement>('[data-preview]');
  if (!list || !preview || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  let raf = 0;
  let x = 0;
  let y = 0;
  const move = () => {
    preview.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    raf = 0;
  };
  list.querySelectorAll<HTMLElement>('[data-preview-key]').forEach((row) => {
    row.addEventListener('mouseenter', () => {
      preview.querySelectorAll<HTMLElement>('[data-preview-item]').forEach((img) => {
        img.classList.toggle('is-active', img.dataset.previewItem === row.dataset.previewKey);
      });
      preview.classList.add('is-visible');
    });
    row.addEventListener('mouseleave', () => preview.classList.remove('is-visible'));
  });
  list.addEventListener('mousemove', (e) => {
    const box = list.getBoundingClientRect();
    x = e.clientX - box.left + 24;
    y = e.clientY - box.top - 110;
    if (!raf) raf = requestAnimationFrame(move);
  });
}

/* ---------------- topic filter on listing pages (works on top of server-rendered lists) ---------------- */
function initFilters() {
  document.querySelectorAll<HTMLElement>('[data-filter]').forEach((bar) => {
    const target = document.querySelector<HTMLElement>(bar.dataset.filter ?? '');
    if (!target) return;
    const buttons = [...bar.querySelectorAll<HTMLButtonElement>('button[data-topic]')];
    const empty = document.querySelector<HTMLElement>(bar.dataset.filterEmpty ?? '');
    bar.hidden = false;
    buttons.forEach((btn) =>
      btn.addEventListener('click', () => {
        const topic = btn.dataset.topic ?? '';
        buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
        let shown = 0;
        target.querySelectorAll<HTMLElement>('[data-topics]').forEach((card) => {
          const match = !topic || (card.dataset.topics ?? '').split(' ').includes(topic);
          card.hidden = !match;
          if (match) shown++;
        });
        if (empty) empty.hidden = shown > 0;
      }),
    );
  });
}

/* ---------------- share: copy link + native share sheet ---------------- */
function initShare() {
  document.querySelectorAll<HTMLButtonElement>('[data-copy-link]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const url = btn.dataset.copyLink ?? location.href;
      try {
        if (navigator.share && window.matchMedia('(pointer: coarse)').matches) {
          await navigator.share({ title: document.title, url });
        } else {
          await navigator.clipboard.writeText(url);
          const label = btn.querySelector<HTMLElement>('[data-copy-label]');
          if (label) {
            const before = label.textContent;
            label.textContent = 'Link kopiert';
            setTimeout(() => (label.textContent = before), 2200);
          }
        }
        track('share-copy', url);
      } catch {
        /* user cancelled */
      }
    });
  });
}

/* ---------------- outbound click tracking (only if analytics is configured) ---------------- */
function initTracking() {
  document.addEventListener('click', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-track]');
    if (el) track(el.dataset.track ?? 'click', el.getAttribute('href') ?? '');
  });
}

initHeader();
initMenu();
initReveal();
initLoops();
initVideoFacades();
initMoments();
initRails();
initProjectPreview();
initFilters();
initShare();
initTracking();

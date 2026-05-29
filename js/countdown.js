// Act 2 — "The Live-Fight Scoreboard": the countdown digits punch on each real tick.
// main.js owns the clock (setInterval + textContent). This module is a pure observer —
// it never touches main.js, never patches the timer. It watches the digits and, when a
// value genuinely changes, gives it a scale-punch + a gold flash that restores to green.
import { animate, utils, createSpring } from './vendor/anime.esm.min.js';

(function () {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const featured = document.getElementById('featured-event');
    if (!featured) return;

    const IDS = ['countdown-days', 'countdown-hours', 'countdown-minutes', 'countdown-seconds'];
    const REST = '#006937';  // var(--pe-green) — digits MUST end here, never white
    const FLASH = '#ffd700';  // var(--pe-gold)
    const state = new Map();  // id -> { last, primed }

    // Battery: the clock keeps ticking off-screen but we only animate while it's in view.
    let inView = true;
    if ('IntersectionObserver' in window) {
        new IntersectionObserver((entries) => {
            entries.forEach((e) => { inView = e.isIntersecting; });
        }, { threshold: 0 }).observe(featured);
    }

    function punch(el) {
        if (el.__peBusy) return;     // never stack tweens on one digit
        el.__peBusy = true;
        utils.set(el, { display: 'inline-block' });  // inline span won't scale otherwise
        animate(el, {
            scale: [1, 1.16, 1],
            duration: 220,
            ease: createSpring({ stiffness: 700, damping: 15 }),
            onComplete: () => { el.__peBusy = false; },
        });
        animate(el, { color: [FLASH, REST], duration: 260, ease: 'outQuad' });
    }

    function check() {
        IDS.forEach((id) => {
            const el = document.getElementById(id);
            if (!el) return;
            const val = el.textContent;
            let s = state.get(id);
            if (!s) { s = { last: null, primed: false }; state.set(id, s); }

            if (val === '--') { s.last = val; return; }       // placeholder, never punch
            if (!s.primed) { s.primed = true; s.last = val; return; } // suppress first real paint
            if (val === s.last) return;

            const prev = parseInt(s.last, 10);
            const cur = parseInt(val, 10);
            const jumped = !isNaN(prev) && !isNaN(cur) && Math.abs(prev - cur) > 1;
            s.last = val;
            if (inView && !jumped) punch(el);  // skip the slam on tab-backgrounding catch-up
        });
    }

    // One observer covers both the per-tick textContent swaps and renderFeatured()
    // tearing down + rebuilding the whole .countdown-timer on event rollover.
    new MutationObserver(check).observe(featured, { childList: true, subtree: true, characterData: true });
    check();
})();

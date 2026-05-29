// Act 1 — "The Body-Slam Entrance": the Bangers wordmark performs its own move.
// Letters collapse inward from above on a hard spring; "Elbow" lands heavier with a
// shudder; h2/tagline/subtitle/buttons follow through; gold Ben-Day dots ink in.
// Pure progressive enhancement: if this module never runs, the hero is the static page.
import { animate, createTimeline, createSpring, stagger, splitText, utils } from './vendor/anime.esm.min.js';

(function () {
    const hero = document.querySelector('.hero');
    const h1 = hero && hero.querySelector('.hero-content h1');
    if (!hero || !h1) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Ben-Day ink: a tiny rAF tween on a CSS var the ::before reads. No anime CSS-var
    // dependency, no extra DOM. Static CSS fallback (var default) covers reduced/failed.
    function inkRamp() {
        const start = performance.now ? performance.now() : 0;
        const dur = 600;
        function frame(now) {
            const t = Math.min(1, ((now || 0) - start) / dur);
            const eased = 1 - Math.pow(1 - t, 3); // outCubic
            hero.style.setProperty('--ink', (eased * 0.18).toFixed(3));
            if (t < 1) requestAnimationFrame(frame);
        }
        hero.style.setProperty('--ink', '0');
        requestAnimationFrame(frame);
    }

    if (reduce) return; // static visible hero; ::before keeps its CSS-default ink

    let fired = false;
    function run() {
        if (fired) return;
        fired = true;

        const content = hero.querySelector('.hero-content');
        const h2 = content.querySelector('h2');
        const tagline = content.querySelector('.tagline');
        const subtitle = content.querySelector('.hero-subtitle');
        const btns = Array.from(content.querySelectorAll('.hero-buttons > a.btn'));

        // Keep the wordmark readable to AT / copy-paste after splitText rewrites the DOM.
        h1.setAttribute('aria-label', h1.textContent.trim());
        // includeSpaces keeps the inter-word spaces in the DOM; we then animate only the
        // visible glyphs and leave the space spans as plain inline, so the wordmark still
        // wraps between words on a narrow phone instead of overflowing on one line.
        const split = splitText(h1, { words: true, chars: true, includeSpaces: true });
        const glyphs = (split.chars || []).filter((c) => c.textContent.trim().length);
        if (!glyphs.length) return;
        glyphs.forEach((c) => c.setAttribute('aria-hidden', 'true'));

        const isMobile = window.matchMedia('(max-width: 768px)').matches;
        const lift = isMobile ? '-60%' : '-110%';

        // Seed + animate happen in the same frame, so there is no hidden flash.
        utils.set(glyphs, { display: 'inline-block', opacity: 0, translateY: lift, scale: 1.45, rotate: -5 });
        const followers = [h2, tagline, subtitle].filter(Boolean);
        followers.forEach((el) => utils.set(el, { opacity: 0 }));
        btns.forEach((b) => utils.set(b, { opacity: 0 }));

        inkRamp();

        const tl = createTimeline({
            defaults: { ease: createSpring({ stiffness: 640, damping: 17, mass: 1.05 }) },
        });

        // The slam: glyphs collapse inward toward center and settle on a hard spring.
        // (No separate per-word shudder — an isolated wobble after settle reads as a bug.)
        tl.add(glyphs, {
            opacity: [0, 1], translateY: 0, scale: 1, rotate: 0,
            delay: stagger(26, { from: 'center' }),
        });

        // Follow-through: subtitle stack rises, then the CTAs pop in (finite ease so they
        // always land at full opacity).
        if (followers.length) {
            tl.add(followers, {
                opacity: [0, 1], translateY: ['12px', 0],
                duration: 420, ease: 'outExpo', delay: stagger(80),
            }, '-=150');
        }
        if (btns.length) {
            tl.add(btns, {
                opacity: [0, 1], scale: [0.94, 1],
                duration: 420, ease: 'outBack', delay: stagger(70),
            }, '-=220');
        }
    }

    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => requestAnimationFrame(run));
    } else {
        requestAnimationFrame(run);
    }
})();

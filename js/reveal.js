// Acts 3 & 4 — scroll-triggered moments that speak the same gold-ink grammar.
//   Act 3 "Tag-Team Card Deal": the 3 mission value-items get thrown in left-to-right
//          like a finisher combo, each card springing past flat then rocking back,
//          with a gold icon stamp landing a beat later.
//   Act 4 "Turnbuckle Underline": a hand-inked gold slash draws itself under each
//          section title, replacing the static gold bar.
// Triggered by IntersectionObserver (one-shot, never reverses). Pure progressive
// enhancement: reduced motion or a failed load leaves today's static page intact.
import { animate, createTimeline, createSpring, stagger, svg, utils, steps } from './vendor/anime.esm.min.js';

(function () {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');

    // Fire cb once, the first time `el` is comfortably in view. The -28% bottom margin
    // means the element has to climb past the lower quarter of the screen before firing,
    // so you actually catch the draw-in instead of arriving mid-animation.
    function onceInView(el, cb) {
        if (!('IntersectionObserver' in window)) { cb(); return; }
        const io = new IntersectionObserver((entries, obs) => {
            entries.forEach((e) => {
                if (e.isIntersecting) { obs.unobserve(e.target); cb(); }
            });
        }, { rootMargin: '0px 0px -28% 0px', threshold: 0 });
        io.observe(el);
    }

    // ---------- Act 3: Tag-Team Card Deal ----------
    function setupCards() {
        const values = document.querySelector('#mission .values');
        if (!values) return;
        const cards = Array.from(values.querySelectorAll('.value-item'));
        if (!cards.length) return;
        const icons = cards.map((c) => c.querySelector('i')).filter(Boolean);
        const texts = cards.flatMap((c) => Array.from(c.querySelectorAll('h3, p')));

        // Seed hidden at load (cards are below the fold) so the deal-in never pops.
        utils.set(cards, { opacity: 0, translateX: '-60px', rotate: -8 });
        if (icons.length) utils.set(icons, { scale: 0.4 });
        if (texts.length) utils.set(texts, { opacity: 0, translateY: '10px' });

        onceInView(values, () => {
            const tl = createTimeline();
            tl.add(cards, {
                opacity: [0, 1], translateX: ['-60px', 0], rotate: [-8, 3, 0],
                ease: createSpring({ stiffness: 120, damping: 14 }), delay: stagger(110),
            });
            if (icons.length) {
                tl.add(icons, {
                    scale: [0.4, 1.15, 1],
                    ease: createSpring({ stiffness: 300, damping: 12 }), duration: 300, delay: stagger(110),
                }, '-=380');
            }
            if (texts.length) {
                tl.add(texts, {
                    opacity: [0, 1], translateY: ['10px', 0],
                    ease: 'outQuad', duration: 300, delay: stagger(40),
                }, '-=420');
            }
        });
    }

    // ---------- Act 4: Turnbuckle Underline ----------
    const NS = 'http://www.w3.org/2000/svg';
    function inkTitle(h2) {
        const svgEl = document.createElementNS(NS, 'svg');
        svgEl.setAttribute('class', 'pe-title-stroke');
        svgEl.setAttribute('viewBox', '0 0 120 16');
        svgEl.setAttribute('width', '120');
        svgEl.setAttribute('height', '16');
        svgEl.setAttribute('aria-hidden', 'true');
        // A rough referee-chalk baseline with an upward hook, plus a flicked cross-tick.
        const base = document.createElementNS(NS, 'path');
        base.setAttribute('d', 'M4 11 C 26 6, 50 13, 74 8 C 93 4.5, 106 10, 116 4');
        const tick = document.createElementNS(NS, 'path');
        tick.setAttribute('d', 'M109 1 L119 9');
        svgEl.appendChild(base);
        svgEl.appendChild(tick);
        h2.appendChild(svgEl);
        h2.classList.add('pe-inked');  // only now (after successful inject) hide the ::after bar

        const drawables = svg.createDrawable([base, tick]);
        utils.set(drawables, { draw: '0 0' });
        onceInView(h2, () => {
            const tl = createTimeline();
            tl.add(drawables[0], { draw: ['0 0', '0 1'], duration: 420, ease: 'outExpo' });
            if (drawables[1]) tl.add(drawables[1], { draw: ['0 0', '0 1'], duration: 160, ease: steps(3) });
        });
    }

    function setupTitles() {
        document.querySelectorAll('h2.section-title').forEach(inkTitle);
    }

    function arm() {
        if (mq.matches) return;  // reduced motion: leave the static page alone
        setupCards();
        setupTitles();
    }

    // Wait for Bangers so heading metrics are final before anchoring the SVGs.
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(arm);
    else arm();

    // Respect a mid-session switch to reduced motion by un-hiding seeded cards.
    if (mq.addEventListener) {
        mq.addEventListener('change', (e) => {
            if (!e.matches) return;
            utils.set('#mission .value-item', { opacity: 1, translateX: 0, rotate: 0 });
            utils.set('#mission .value-item i', { scale: 1 });
            utils.set('#mission .value-item h3, #mission .value-item p', { opacity: 1, translateY: 0 });
        });
    }
})();

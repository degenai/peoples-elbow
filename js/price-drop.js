// Steal-page signature beat: when the closing CTA scrolls into view, a gold slash
// strikes through "$200" and "$10" stamps in, in the same hand-inked grammar as the
// turnbuckle underlines. Pure progressive enhancement: reduced-motion / no-JS readers
// get the plain, fully legible sentence (both numbers are real text in the DOM).
import { animate, createTimeline, createSpring, svg, utils } from './vendor/anime.esm.min.js';

(function () {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // The one paragraph where $200 and $10 appear together (the cause-and-effect line).
    const target = Array.from(document.querySelectorAll('p'))
        .find((p) => /\$200\b/.test(p.textContent) && /\$10\b/.test(p.textContent));
    if (!target) return;

    // Wrap a literal token in a span without disturbing the surrounding text or reading order.
    function wrapToken(root, token, className) {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
        let node;
        while ((node = walker.nextNode())) {
            const idx = node.nodeValue.indexOf(token);
            if (idx === -1) continue;
            const after = node.splitText(idx);
            after.nodeValue = after.nodeValue.slice(token.length);
            const span = document.createElement('span');
            span.className = className;
            span.textContent = token;
            node.parentNode.insertBefore(span, after);
            return span;
        }
        return null;
    }

    const priceOld = wrapToken(target, '$200', 'pe-price-old');
    const priceNew = wrapToken(target, '$10', 'pe-price-new');
    if (!priceOld || !priceNew) return;

    utils.set(priceOld, { display: 'inline-block', position: 'relative' });
    utils.set(priceNew, { display: 'inline-block' });

    // Strike SVG sized to the "$200" box (inline-block, so it never splits across a wrap).
    const NS = 'http://www.w3.org/2000/svg';
    const svgEl = document.createElementNS(NS, 'svg');
    svgEl.setAttribute('class', 'pe-price-strike');
    svgEl.setAttribute('viewBox', '0 0 100 40');
    svgEl.setAttribute('preserveAspectRatio', 'none');
    svgEl.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', 'M3 27 C 28 19, 62 25, 97 13');
    svgEl.appendChild(path);
    priceOld.appendChild(svgEl);

    const draw = svg.createDrawable(path);
    utils.set(draw, { draw: '0 0' });

    let fired = false;
    function go() {
        if (fired) return;
        fired = true;
        const tl = createTimeline();
        tl.add(draw, { draw: ['0 0', '0 1'], duration: 380, ease: 'outExpo' });
        tl.add(priceNew, {
            scale: [0.4, 1.15, 1],
            ease: createSpring({ stiffness: 300, damping: 12 }), duration: 320,
        }, '-=120');
    }

    if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver((entries, obs) => {
            entries.forEach((e) => {
                if (!e.isIntersecting) return;
                obs.unobserve(e.target);
                if (document.fonts && document.fonts.ready) document.fonts.ready.then(go);
                else go();
            });
        }, { rootMargin: '0px 0px -28% 0px', threshold: 0 });
        io.observe(target);
    } else {
        go();
    }
})();

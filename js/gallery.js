// Past-events photo lightbox with anime.js v4 (Facets vendor build).
// Tap a thumbnail: it zooms from its grid position into a full-screen view (FLIP).
import { animate, utils } from './vendor/anime.esm.min.js';

(function () {
    const thumbs = Array.from(document.querySelectorAll('.past-event-gallery img'));
    if (!thumbs.length) return;

    // Build the lightbox once.
    const overlay = document.createElement('div');
    overlay.className = 'pe-lightbox';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Photo viewer');
    overlay.innerHTML =
        '<div class="pe-lightbox-backdrop"></div>' +
        '<button class="pe-lightbox-close" aria-label="Close">&times;</button>' +
        '<button class="pe-lightbox-prev" aria-label="Previous photo">&#8249;</button>' +
        '<img class="pe-lightbox-img" alt="">' +
        '<button class="pe-lightbox-next" aria-label="Next photo">&#8250;</button>' +
        '<div class="pe-lightbox-counter"></div>';
    document.body.appendChild(overlay);

    const backdrop = overlay.querySelector('.pe-lightbox-backdrop');
    const lbImg = overlay.querySelector('.pe-lightbox-img');
    const counter = overlay.querySelector('.pe-lightbox-counter');
    const btnClose = overlay.querySelector('.pe-lightbox-close');
    const btnPrev = overlay.querySelector('.pe-lightbox-prev');
    const btnNext = overlay.querySelector('.pe-lightbox-next');

    let group = [];
    let index = 0;
    let lastThumb = null;
    let isOpen = false;

    // Background containers made inert while the lightbox is open (so the aria-modal contract holds).
    const bgEls = ['#header-placeholder', 'main', '#footer-placeholder']
        .map((s) => document.querySelector(s)).filter(Boolean);
    function setBackgroundInert(on) {
        bgEls.forEach((el) => { if (on) el.setAttribute('inert', ''); else el.removeAttribute('inert'); });
    }
    function focusables() {
        return [btnClose, btnPrev, btnNext].filter((b) => b.style.display !== 'none');
    }

    // Group thumbnails by their gallery so prev/next stays within one event.
    thumbs.forEach((img) => {
        img.addEventListener('click', () => {
            const gallery = img.closest('.past-event-gallery');
            group = Array.from(gallery.querySelectorAll('img'));
            index = group.indexOf(img);
            open(img);
        });
    });

    function flip(fromRect, opts) {
        // Map the lightbox image (at its final centered layout) back onto fromRect, then animate to identity.
        const last = lbImg.getBoundingClientRect();
        if (!last.width || !last.height) { utils.set(lbImg, { opacity: 1 }); return; }
        const dx = (fromRect.left + fromRect.width / 2) - (last.left + last.width / 2);
        const dy = (fromRect.top + fromRect.height / 2) - (last.top + last.height / 2);
        const s = Math.max(fromRect.width / last.width, fromRect.height / last.height);
        if (opts.reverse) {
            animate(lbImg, { x: dx, y: dy, scale: s, opacity: 0.2, duration: 300, ease: 'inQuad', onComplete: opts.onComplete });
        } else {
            utils.set(lbImg, { x: dx, y: dy, scale: s, opacity: 1 });
            animate(lbImg, { x: 0, y: 0, scale: 1, duration: 460, ease: 'outExpo' });
        }
    }

    function whenReady(fn) {
        if (lbImg.complete && lbImg.naturalWidth) requestAnimationFrame(fn);
        else lbImg.addEventListener('load', () => requestAnimationFrame(fn), { once: true });
    }

    function render() {
        const img = group[index];
        lbImg.src = img.currentSrc || img.src;
        lbImg.alt = img.alt || '';
        counter.textContent = group.length > 1 ? (index + 1) + ' / ' + group.length : '';
        const multi = group.length > 1;
        btnPrev.style.display = multi ? '' : 'none';
        btnNext.style.display = multi ? '' : 'none';
    }

    function open(thumb) {
        lastThumb = thumb;
        isOpen = true;
        render();
        overlay.classList.add('is-open');
        document.body.style.overflow = 'hidden';
        setBackgroundInert(true);
        utils.set(lbImg, { opacity: 0 });
        utils.set(backdrop, { opacity: 0 });
        animate(backdrop, { opacity: 1, duration: 300, ease: 'outQuad' });
        whenReady(() => flip(thumb.getBoundingClientRect(), { reverse: false }));
        btnClose.focus();
    }

    function close() {
        if (!isOpen) return;
        isOpen = false;
        document.body.style.overflow = '';
        const finish = () => {
            overlay.classList.remove('is-open');
            setBackgroundInert(false);
            utils.set(lbImg, { x: 0, y: 0, scale: 1, opacity: 1 });
            if (lastThumb && typeof lastThumb.focus === 'function') lastThumb.focus();
        };
        animate(backdrop, { opacity: 0, duration: 300, ease: 'outQuad' });
        if (lastThumb) flip(lastThumb.getBoundingClientRect(), { reverse: true, onComplete: finish });
        else finish();
    }

    function step(dir) {
        if (group.length < 2) return;
        index = (index + dir + group.length) % group.length;
        render();
        whenReady(() => {
            utils.set(lbImg, { x: 0, y: 0, opacity: 0, scale: 0.96 });
            animate(lbImg, { opacity: 1, scale: 1, duration: 280, ease: 'outQuad' });
        });
    }

    btnClose.addEventListener('click', close);
    backdrop.addEventListener('click', close);
    btnPrev.addEventListener('click', (e) => { e.stopPropagation(); step(-1); });
    btnNext.addEventListener('click', (e) => { e.stopPropagation(); step(1); });
    document.addEventListener('keydown', (e) => {
        if (!isOpen) return;
        if (e.key === 'Escape') { close(); return; }
        if (e.key === 'ArrowLeft') { step(-1); return; }
        if (e.key === 'ArrowRight') { step(1); return; }
        if (e.key === 'Tab') {
            const f = focusables();
            if (!f.length) return;
            e.preventDefault();
            const i = f.indexOf(document.activeElement);
            const next = e.shiftKey
                ? (i <= 0 ? f.length - 1 : i - 1)
                : (i >= f.length - 1 ? 0 : i + 1);
            f[next].focus();
        }
    });
})();

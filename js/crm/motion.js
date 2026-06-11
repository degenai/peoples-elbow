// motion.js — the CRM's optional flourish layer.
//
// Same grammar as hero.js / reveal.js out on the marketing site: anime v4, house
// idioms, pure progressive enhancement. Nothing here is load-bearing. If this file
// fails to import, throws, or the user prefers reduced motion, the CRM is exactly
// the static page — every list, sheet, and button is fully usable without it.
//
// Three rules every method below obeys (this is the whole contract):
//   1. Bail immediately on prefers-reduced-motion OR a missing element. Never throw.
//   2. Seed any hidden start state with utils.set() in the SAME frame we animate it,
//      so there's no flash of hidden content before the tween catches up.
//   3. Never leave content hidden. If the animation can't run, content stays visible
//      as it was — we only ever animate FROM hidden TO shown, never the reverse.
import { animate, stagger, utils } from '../vendor/anime.esm.min.js';

// One shared check. matchMedia is read live each call so a mid-session switch to
// reduced motion is respected (the user toggled it in their OS — honor it now).
function reduced() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export const motion = {
    // listIn — a subtle staggered rise + fade of the lead cards after a (re)render.
    // Called by app.js right after render.js fills #lead-list. `listEl` is that <ul>.
    listIn(listEl) {
        if (reduced() || !listEl) return; // static list is already correct — leave it
        const cards = listEl.querySelectorAll('.crm-lead-card');
        if (!cards.length) return; // empty list / empty-state: nothing to animate

        // Seed + animate in the same frame so the cards never visibly start hidden.
        // The cards are already in the DOM at full opacity; we knock them down here and
        // the tween below immediately brings them back — no FOUC, no layout shift (we
        // only move on the Y axis, which doesn't reflow neighbors).
        utils.set(cards, { opacity: 0, translateY: 8 });
        animate(cards, {
            opacity: [0, 1],
            translateY: [8, 0],
            duration: 360,
            ease: 'outQuad',          // finite ease: always lands at full opacity
            delay: stagger(28),       // each card a beat behind the last — the "rise"
        });
    },

    // sheetIn — the quick pop a bottom sheet / dialog panel makes when it opens.
    // `panelEl` is the .crm-sheet-panel inside whichever #*-sheet app.js just unhid.
    sheetIn(panelEl) {
        if (reduced() || !panelEl) return; // panel just appears, no entrance — fine
        // Spring-flavored scale + fade. outBack overshoots a hair past 1 then settles,
        // which reads as a light "snap" without an isolated wobble. Seed-then-animate
        // in one frame as always. translateY gives it a small upward settle.
        utils.set(panelEl, { opacity: 0, scale: 0.96, translateY: 12 });
        animate(panelEl, {
            opacity: [0, 1],
            scale: [0.96, 1],
            translateY: [12, 0],
            duration: 320,
            ease: 'outBack',
        });
    },

    // pulse — a brief scale pop, for confirming a save/add (e.g. flash the FAB or a
    // freshly-saved card). Doesn't seed a hidden state: the element is already visible,
    // we just punch its scale up and let it spring back to 1.
    pulse(el) {
        if (reduced() || !el) return; // no confirmation animation; the data still saved
        animate(el, {
            scale: [1, 1.12, 1],
            duration: 320,
            ease: 'outExpo',
        });
    },
};

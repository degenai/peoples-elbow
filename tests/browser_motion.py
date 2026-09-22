"""Reduced-motion controls against real inline particles and rendered content."""
import unittest
from browser_support import BrowserFixture

class MotionChecks(BrowserFixture):
    def particle_animations(self, page):
        return page.locator('#particles div').evaluate_all("es => es.filter(e => getComputedStyle(e).animationName !== 'none').length")

    def test_parallax_stops_and_cleans_up_on_preference_changes(self):
        page = self.new_page(reduced_motion='reduce')
        page.add_init_script("""window.activeScrollListeners = new Set();
            const add = window.addEventListener.bind(window);
            const remove = window.removeEventListener.bind(window);
            window.addEventListener = (type, fn, options) => { if (type === 'scroll') activeScrollListeners.add(fn); return add(type, fn, options); };
            window.removeEventListener = (type, fn, options) => { if (type === 'scroll') activeScrollListeners.delete(fn); return remove(type, fn, options); };
        """)
        page.goto(self.origin + '/index.html', wait_until='networkidle')
        page.locator('#hero-photo-container').scroll_into_view_if_needed()
        page.evaluate("() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))")
        transform = lambda: page.locator('#parallax-photo').evaluate('e => e.style.transform')
        self.assertEqual(transform(), '', 'initial reduced motion must not translate the foreground photo')
        def scroll_listeners():
            return page.evaluate('window.activeScrollListeners.size')
        reduced_count = scroll_listeners()
        for _ in range(2):
            page.emulate_media(reduced_motion='no-preference')
            page.wait_for_function("document.getElementById('parallax-photo').style.transform !== ''")
            self.assertEqual(scroll_listeners(), reduced_count + 1)
            page.evaluate("window.dispatchEvent(new Event('scroll'))")
            page.emulate_media(reduced_motion='reduce')
            page.wait_for_function("document.getElementById('parallax-photo').style.transform === ''")
            page.evaluate("() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))")
            self.assertEqual(scroll_listeners(), reduced_count)
            self.assertEqual(transform(), '')
        page.close()

    def test_particles_stop_for_initial_and_runtime_reduced_motion(self):
        page = self.new_page(reduced_motion='reduce')
        page.goto(self.origin + '/index.html', wait_until='networkidle')
        self.assertGreater(page.locator('#particles div').count(), 0)
        self.assertEqual(self.particle_animations(page), 0)
        page.emulate_media(reduced_motion='no-preference')
        page.wait_for_function("[...document.querySelectorAll('#particles div')].some(e => getComputedStyle(e).animationName !== 'none')")
        page.emulate_media(reduced_motion='reduce')
        page.wait_for_function("[...document.querySelectorAll('#particles div')].every(e => getComputedStyle(e).animationName === 'none')")
        self.assertTrue(page.locator('#parallax-photo img').is_visible())
        page.locator('#mission .values').scroll_into_view_if_needed()
        page.wait_for_function("[...document.querySelectorAll('#mission .value-item,#mission .value-item h3,#mission .value-item p')].every(e => Number(getComputedStyle(e).opacity) > .98)")
        self.assertFalse(self.submissions)
        page.close()

if __name__ == '__main__':
    unittest.main(verbosity=2)

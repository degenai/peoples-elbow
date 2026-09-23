"""Real component assets; fixture markup stays in intercepted test routes.
PE_SITE_DIR is honored unchanged, including assembled-artifact CI runs.
"""
import unittest
from browser_support import BrowserFixture

NORMAL_PAGE = """<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>navigation fixture</title></head><body><div id="header-placeholder"></div><main><p>Fixture content</p></main><div id="footer-placeholder"></div><script src="js/components.js"></script></body></html>"""
HEADER_ONLY_PAGE = NORMAL_PAGE.replace('<div id="footer-placeholder"></div>', '')

class NavigationFixture(BrowserFixture):
    def setUp(self):
        super().setUp()
        self.pending_routes = []

    def hold_route(self, route):
        self.pending_routes.append(route)

    def tearDown(self):
        for route in self.pending_routes:
            route.abort()
        super().tearDown()

    def new_page(self, **options):
        options.setdefault('viewport', {'width':390, 'height':844})
        page = super().new_page(**options)
        page.route(self.origin + '/normal.html', lambda r: r.fulfill(status=200, content_type='text/html', body=NORMAL_PAGE))
        page.route(self.origin + '/header-only.html', lambda r: r.fulfill(status=200, content_type='text/html', body=HEADER_ONLY_PAGE))
        return page

NAV_READY_JS = "document.querySelectorAll('nav ul li').length > 0"


class NavigationIndependenceTests(NavigationFixture):
    """P1-F1: header/menu init must not wait on footer success/completion."""

    def test_normal_page_menu_toggle_and_footer_render(self):
        page = self.new_page()
        page.goto(self.origin + '/normal.html')
        page.wait_for_function(NAV_READY_JS, timeout=5000)
        # Real header markup present
        self.assertTrue(page.locator('.menu-toggle').count() > 0)
        # Real footer markup present (footer isn't broken by our changes)
        page.wait_for_selector('footer .footer-info', timeout=5000)
        self.assertIn("The People's Elbow", page.locator('.footer-info').inner_text())

        toggle = page.locator('.menu-toggle')
        nav_ul = page.locator('nav ul')
        self.assertNotIn('mobile-menu-active', nav_ul.get_attribute('class') or '')
        toggle.click()
        self.assertIn('mobile-menu-active', nav_ul.get_attribute('class') or '')
        self.assertEqual(toggle.get_attribute('aria-expanded'), 'true')

    def test_footer_failure_does_not_block_menu(self):
        page = self.new_page()
        page.route('**/components/footer.html', lambda route: route.fulfill(status=500, body='boom'))
        page.goto(self.origin + '/normal.html')
        page.wait_for_function(NAV_READY_JS, timeout=5000)
        toggle = page.locator('.menu-toggle')
        nav_ul = page.locator('nav ul')
        toggle.click()
        self.assertIn('mobile-menu-active', nav_ul.get_attribute('class') or '')
        # Footer placeholder stayed empty since the fetch failed
        self.assertEqual(page.locator('#footer-placeholder').inner_html().strip(), '')

    def test_footer_indefinitely_pending_does_not_block_menu(self):
        page = self.new_page()
        # Never call route.fulfill/continue/abort - request hangs forever.
        page.route('**/components/footer.html', self.hold_route)
        page.goto(self.origin + '/normal.html')
        page.wait_for_function(NAV_READY_JS, timeout=5000)
        toggle = page.locator('.menu-toggle')
        nav_ul = page.locator('nav ul')
        toggle.click()
        self.assertIn('mobile-menu-active', nav_ul.get_attribute('class') or '')

    def test_header_only_fixture_menu_works(self):
        page = self.new_page()
        page.goto(self.origin + '/header-only.html')
        page.wait_for_function(NAV_READY_JS, timeout=5000)
        toggle = page.locator('.menu-toggle')
        nav_ul = page.locator('nav ul')
        toggle.click()
        self.assertIn('mobile-menu-active', nav_ul.get_attribute('class') or '')

    def test_listeners_initialized_once_and_resize_handler_replaced(self):
        page = self.new_page()
        # Instrument window.addEventListener/removeEventListener from before
        # any script runs, so the very first (auto) header load is counted
        # along with two manual re-loads triggered below.
        page.add_init_script(
            """
            window.__resizeAdds = 0;
            window.__resizeRemoves = 0;
            const origAdd = window.addEventListener.bind(window);
            const origRemove = window.removeEventListener.bind(window);
            window.addEventListener = (type, ...rest) => {
                if (type === 'resize') window.__resizeAdds++;
                return origAdd(type, ...rest);
            };
            window.removeEventListener = (type, ...rest) => {
                if (type === 'resize') window.__resizeRemoves++;
                return origRemove(type, ...rest);
            };
            """
        )
        page.goto(self.origin + '/normal.html')
        page.wait_for_function(NAV_READY_JS, timeout=5000)

        page.evaluate("() => window.componentLoader.loadHeader()")
        page.wait_for_function(NAV_READY_JS, timeout=5000)
        page.evaluate("() => window.componentLoader.loadHeader()")
        page.wait_for_function(NAV_READY_JS, timeout=5000)

        adds, removes = page.evaluate("() => [window.__resizeAdds, window.__resizeRemoves]")
        # Three total menu inits (1 auto-load + 2 manual reloads); each
        # reload after the first must remove the prior resize handler
        # before adding its own, so adds - removes === 1 (one live listener).
        self.assertEqual(adds - removes, 1)

        # Menu still only reacts once per click after re-init.
        toggle = page.locator('.menu-toggle')
        nav_ul = page.locator('nav ul')
        toggle.click()
        self.assertEqual(nav_ul.get_attribute('class') or '', 'mobile-menu-active')


class SanitizerFallbackTests(NavigationFixture):
    """P1-P1: an unavailable/hanging optional sanitizer import must never
    freeze navigation; the local fallback must be used immediately."""

    def test_pending_dompurify_style_import_does_not_freeze_header(self):
        page = self.new_page()
        # Simulate a CDN dependency that would hang forever if ever awaited.
        page.route('https://cdn.jsdelivr.net/**', self.hold_route)
        page.goto(self.origin + '/normal.html')
        page.wait_for_function(NAV_READY_JS, timeout=3000)
        toggle = page.locator('.menu-toggle')
        nav_ul = page.locator('nav ul')
        toggle.click()
        self.assertIn('mobile-menu-active', nav_ul.get_attribute('class') or '')

    def test_recursive_sanitizer_cleans_nested_unknown_ancestor(self):
        page = self.new_page()
        page.goto(self.origin + '/normal.html')
        page.wait_for_function(NAV_READY_JS, timeout=5000)

        dirty = (
            '<custom-wrap>'
            '<weird-nest>'
            '<script>window.__pwned = true;</script>'
            '<a href="javascript:alert(1)" onclick="alert(2)" data-nav="mission">label</a>'
            '<img src="x" onerror="alert(3)">'
            '</weird-nest>'
            '</custom-wrap>'
        )
        cleaned = page.evaluate(
            "(html) => window.componentLoader.sanitizeTrustedComponentHTML(html)", dirty
        )
        self.assertNotIn('<script', cleaned.lower())
        self.assertNotIn('onclick', cleaned.lower())
        self.assertNotIn('onerror', cleaned.lower())
        self.assertNotIn('javascript:', cleaned.lower())
        # Descendants that are otherwise allowed survive the unwrap.
        self.assertIn('label', cleaned)
        self.assertIn('data-nav="mission"', cleaned)


class HashNavigationTests(NavigationFixture):
    def test_homepage_smooth_anchor_updates_selected_section(self):
        page = self.new_page(reduced_motion='reduce')
        page.goto(self.origin + '/index.html', wait_until='networkidle')
        page.locator('a[href="#host"]').first.click()
        self.assertEqual(page.evaluate('location.hash'), '#host')
        self.assertIn('active', page.locator('nav a[data-nav="host"]').get_attribute('class') or '')
        page.close()

    """R2-P5-F2 / P1-F2: hash-driven active-link refresh must not
    interpolate the raw hash into a CSS selector, and must not double-bind
    the hashchange listener across repeated header loads."""

    def test_malformed_hash_does_not_throw(self):
        page = self.new_page()
        errors = []
        page.on('pageerror', lambda exc: errors.append(str(exc)))
        page.goto(self.origin + '/normal.html')
        page.wait_for_function(NAV_READY_JS, timeout=5000)

        # Force currentPage to 'home' so the hash branch runs, then fire a
        # hash that would break naive selector interpolation.
        page.evaluate(
            """
            () => {
                window.componentLoader.currentPage = 'home';
                window.location.hash = '';
                history.replaceState(null, '', '#\\"]:not(');
                window.dispatchEvent(new HashChangeEvent('hashchange'));
            }
            """
        )
        page.wait_for_timeout(100)
        self.assertEqual(errors, [])

    def test_hashchange_listener_not_duplicated_across_header_reloads(self):
        page = self.new_page()
        page.goto(self.origin + '/normal.html')
        page.wait_for_function(NAV_READY_JS, timeout=5000)

        page.evaluate("() => window.componentLoader.loadHeader()")
        page.wait_for_function(NAV_READY_JS, timeout=5000)
        page.evaluate("() => window.componentLoader.loadHeader()")
        page.wait_for_function(NAV_READY_JS, timeout=5000)

        page.evaluate(
            """
            () => {
                window.__highlightCalls = 0;
                const orig = window.componentLoader.highlightCurrentPage.bind(window.componentLoader);
                window.componentLoader.highlightCurrentPage = () => {
                    window.__highlightCalls++;
                    return orig();
                };
                history.replaceState(null, '', '#mission');
                window.dispatchEvent(new HashChangeEvent('hashchange'));
            }
            """
        )
        page.wait_for_timeout(100)
        calls = page.evaluate("() => window.__highlightCalls")
        self.assertEqual(calls, 1)


if __name__ == '__main__':
    unittest.main(verbosity=2)

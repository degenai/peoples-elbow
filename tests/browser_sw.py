"""Real Chromium SW lifecycle on disposable localhost origins, never production."""
from urllib.parse import urlsplit
import unittest
from playwright.sync_api import Error
from browser_support import AssetServer, BrowserFixture, ROOT, SITE

class SWServer(AssetServer):
    def respond(self, code, body, mime='text/html'):
        self.send_response(code)
        self.send_header('Content-Type', mime)
        self.send_header('Cache-Control','no-store')
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        url = urlsplit(self.path)
        state = getattr(self.server, 'fixture_state', {})
        if url.path == '/__sw_probe__':
            return self.respond(200,b'<!doctype html><title>Isolated worker fixture</title><h1>Local fixture</h1>')
        if url.path == '/sw.js':
            source = ROOT/'tests/fixtures/sw-v2.0.2.js' if url.query == 'old' else SITE/'sw.js'
            return self.respond(200,source.read_bytes(),'text/javascript')
        if url.path == '/js/crm/app.js' and state.get('fail_app'):
            return self.respond(503,b'Synthetic essential-module failure','text/javascript')
        if url.path == '/crm.html' and state.get('crm_status',200) != 200:
            return self.respond(state['crm_status'],b'Synthetic navigation error')
        return super().do_GET()

class SWBrowser(BrowserFixture):
    handler_class = SWServer

    def setUp(self):
        super().setUp()
        self.server.fixture_state = {}

    def fixture_page(self):
        page = self.new_page(service_workers='allow',reduced_motion='reduce')
        page.goto(self.origin+'/__sw_probe__')
        return page

    def register(self, page, query):
        return page.evaluate("""async query => {
            const registration = await navigator.serviceWorker.register('/sw.js?'+query,{scope:'/'});
            const worker = registration.installing || registration.waiting || registration.active;
            if (!worker || !worker.scriptURL.endsWith('?'+query)) throw Error('Candidate worker missing');
            return new Promise((resolve,reject) => {
                const timer=setTimeout(() => reject(Error('Worker lifecycle deadline')),12000);
                const check=() => {
                    if (['activated','redundant'].includes(worker.state)) {
                        clearTimeout(timer); resolve(worker.state);
                    }
                };
                worker.addEventListener('statechange',check); check();
            });
        }""",query)

    def test_atomic_upgrade_preserves_old_shell_then_claims_and_boots_offline(self):
        page = self.fixture_page()
        self.assertEqual(self.register(page,'old'),'activated')
        page.wait_for_function("navigator.serviceWorker.controller?.scriptURL.endsWith('?old')")
        page.evaluate("() => { window.fixtureTabToken='same-page'; return caches.open('unrelated-fixture-cache'); }")
        self.server.fixture_state['fail_app'] = True
        self.assertEqual(self.register(page,'failed'),'redundant')
        self.assertTrue(page.evaluate("navigator.serviceWorker.controller.scriptURL.endsWith('?old')"))
        self.assertIn('lot-v2.0.2',page.evaluate('caches.keys()'))
        self.server.fixture_state['fail_app'] = False
        self.assertEqual(self.register(page,'good'),'activated')
        page.wait_for_function("navigator.serviceWorker.controller?.scriptURL.endsWith('?good')")
        self.assertEqual(page.evaluate('window.fixtureTabToken'),'same-page')
        keys = page.evaluate('caches.keys()')
        self.assertNotIn('lot-v2.0.2',keys)
        self.assertIn('unrelated-fixture-cache',keys)
        page.context.set_offline(True)
        response = page.goto(self.origin+'/crm.html?fixture=offline',wait_until='domcontentloaded')
        self.assertEqual(response.status,200)
        page.locator('#settings-btn').wait_for(state='visible')
        page.locator('#settings-btn').click()
        page.locator('#paste-email-text').wait_for(state='visible')
        with self.assertRaises(Error):
            page.goto(self.origin+'/unseen-public-fixture.html',timeout=5000)
        self.assertFalse(self.submissions)
        page.close()

    def test_transient_navigation_error_cannot_poison_the_real_offline_cache(self):
        page = self.fixture_page()
        self.assertEqual(self.register(page,'navigation'),'activated')
        page.wait_for_function('navigator.serviceWorker.controller !== null')
        self.server.fixture_state['crm_status'] = 503
        response = page.goto(self.origin+'/crm.html',wait_until='domcontentloaded')
        self.assertEqual(response.status,503)
        page.context.set_offline(True)
        response = page.goto(self.origin+'/crm.html',wait_until='domcontentloaded')
        self.assertEqual(response.status,200)
        page.locator('#settings-btn').wait_for(state='visible')
        self.assertFalse(self.submissions)
        page.close()

if __name__ == '__main__':
    unittest.main(verbosity=2)

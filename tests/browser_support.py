"""Shared isolated Chromium fixture; outbound traffic is blocked by default."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import urlsplit
import json, os, unittest
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
SITE = Path(os.environ.get('PE_SITE_DIR', ROOT)).resolve()

class AssetServer(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass
    def do_POST(self):
        self.send_error(405, 'Tests never accept real submissions')

class BrowserFixture(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(('127.0.0.1', 0), partial(getattr(cls, 'handler_class', AssetServer), directory=str(SITE)))
        cls.thread = Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.origin = 'http://127.0.0.1:' + str(cls.server.server_port)
        cls.pw = sync_playwright().start()
        options = {'headless': True}
        if os.environ.get('PE_BROWSER_EXECUTABLE'):
            options['executable_path'] = os.environ['PE_BROWSER_EXECUTABLE']
        cls.browser = cls.pw.chromium.launch(**options)

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.pw.stop()
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=5)

    def setUp(self):
        self.contexts = []
        self.submissions = []
        self.simulated_reply = None
        self.block_main = False

    def tearDown(self):
        for context in self.contexts:
            context.close()

    def new_page(self, **options):
        options.setdefault('service_workers', 'block')
        context = self.browser.new_context(**options)
        self.contexts.append(context)
        def guard(route):
            request = route.request
            parsed = urlsplit(request.url)
            if request.method not in ('GET', 'HEAD', 'OPTIONS'):
                self.submissions.append({'url': request.url, 'method': request.method, 'data': request.post_data})
                if self.simulated_reply is not None:
                    route.fulfill(status=200, content_type='application/json', body=json.dumps(self.simulated_reply))
                else:
                    route.fulfill(status=409, content_type='text/plain', body='Synthetic test blocked submission')
                return
            if request.url.startswith(self.origin + '/'):
                if self.block_main and parsed.path == '/js/main.js':
                    route.abort()
                else:
                    route.continue_()
            else:
                route.abort()
        context.route('**/*', guard)
        return context.new_page()

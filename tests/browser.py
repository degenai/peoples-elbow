"""Real Chromium regressions. Local assets only; all external traffic is intercepted.

PE_SITE_DIR selects the exact assembled artifact. PE_BROWSER_EXECUTABLE is an
optional local installed-Chromium override; CI uses pinned Playwright Chromium.
Run: python tests/browser.py [BrowserChecks.test_name]
"""
from pathlib import Path
from urllib.parse import urlsplit
import base64, io, os, unittest
from pypdf import PdfReader
from browser_support import BrowserFixture, ROOT, SITE

class BrowserChecks(BrowserFixture):
    def test_native_forms_are_inert_until_handlers_ready(self):
        for js_enabled, block_main in ((False, False), (True, True)):
            self.block_main = block_main
            page = self.new_page(java_script_enabled=js_enabled)
            page.goto(self.origin + '/index.html', wait_until='domcontentloaded')
            for form_id in ('contact-form', 'host-interest-form'):
                with self.subTest(js_enabled=js_enabled, block_main=block_main, form=form_id):
                    form = page.locator('#' + form_id)
                    self.assertTrue(form.locator('input').first.is_disabled(), 'failed/missing JS must not collect entries for a native GET')
                    self.assertTrue(form.locator('button[type=submit]').is_disabled())
                    fallback = form.locator('.form-fallback')
                    self.assertTrue(fallback.is_visible())
                    self.assertEqual(fallback.locator('a').get_attribute('href'), 'mailto:info@peoples-elbow.com')
            self.assertFalse(self.submissions)
            self.assertFalse(urlsplit(page.url).query)
            page.close()

    def test_initialized_forms_submit_only_intercepted_post(self):
        self.simulated_reply = {'success': True, 'message': 'Synthetic acknowledgement; no email was sent.'}
        page = self.new_page()
        page.goto(self.origin + '/index.html', wait_until='domcontentloaded')
        for form_id in ('contact-form', 'host-interest-form'):
            with self.subTest(form=form_id):
                form = page.locator('#' + form_id)
                self.assertFalse(form.locator('input').first.is_disabled())
                self.assertFalse(form.locator('.form-fallback').is_visible())
                values = {'#name': 'Preview Fixture', '#email': 'fixture@example.invalid', '#contact-message': 'SYNTHETIC_ONLY'} if form_id == 'contact-form' else {'#venue-name': 'Fixture Venue', '#contact-name': 'Preview Fixture', '#contact-email': 'fixture@example.invalid', '#message': 'SYNTHETIC_ONLY'}
                for selector, value in values.items():
                    page.fill(selector, value)
                if form_id == 'host-interest-form':
                    page.select_option('#venue-type', 'card-shop')
                before = len(self.submissions)
                form.locator('button[type=submit]').click()
                form.locator('.form-message.success').wait_for()
                self.assertEqual(len(self.submissions), before + 1)
                self.assertEqual(self.submissions[-1]['method'], 'POST')
                self.assertIn('SYNTHETIC_ONLY', self.submissions[-1]['data'])
                self.assertEqual(form.locator('input').first.input_value(), '')
                self.assertFalse(urlsplit(page.url).query)
        page.close()

    def print_pdf(self, page):
        page.emulate_media(media='print')
        session = page.context.new_cdp_session(page)
        result = session.send('Page.printToPDF', {'transferMode': 'ReturnAsBase64', 'preferCSSPageSize': True, 'printBackground': True, 'displayHeaderFooter': False, 'paperWidth': 8.5, 'paperHeight': 11})
        session.detach()
        return base64.b64decode(result['data'])

    def test_intake_print_retains_sections_consent_and_writing_room(self):
        page = self.new_page()
        page.goto(self.origin + '/intake-print/index.html', wait_until='networkidle')
        pdf_bytes = self.print_pdf(page)
        pdf = PdfReader(io.BytesIO(pdf_bytes))
        self.assertEqual(len(pdf.pages), 2)
        text = ' '.join(' '.join(p.extract_text() or '' for p in pdf.pages).lower().split())
        for heading in ['client information', "today's visit", 'health history', 'please check anything you have or have had', 'areas of focus', 'massage history', 'informed consent', 'signature', 'print name', 'chiropractic provider name', 'print and complete by hand']:
            self.assertIn(heading, text)
        self.assertIn('voluntarily seeking massage', text)
        self.assertEqual(page.locator('input, textarea').count(), 0, 'paper form must not acquire electronic data collection')
        if os.environ.get('PE_EVIDENCE_DIR'):
            folder = Path(os.environ['PE_EVIDENCE_DIR'])
            folder.mkdir(parents=True, exist_ok=True)
            (folder / 'intake-blank.pdf').write_bytes(pdf_bytes)
        page.close()

    def test_intake_dictation_and_tap_targets_on_a_phone(self):
        stub = """delete window.SpeechRecognition;
        window.webkitSpeechRecognition = function () { window.__rec = this; this.start = function () {}; this.stop = function () { var s = this; setTimeout(function () { s.onend(); }, 0); }; this.abort = this.stop; };"""
        for api in (False, True):
            page = self.new_page(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
            page.add_init_script(stub if api else 'delete window.SpeechRecognition; delete window.webkitSpeechRecognition;')
            page.goto(self.origin + '/intake/index.html', wait_until='networkidle')
            with self.subTest(api=api):
                self.assertEqual(page.locator('.dict-btn').count(), 13 if api else 0)
                self.assertTrue(page.evaluate('document.documentElement.scrollWidth <= innerWidth'))
                small = page.evaluate("""[...document.querySelectorAll('.chk, .agree, .dict-btn, button.submit')]
                    .map(e => e.getBoundingClientRect()).filter(r => r.width && (r.width < 44 || r.height < 44)).length""")
                self.assertEqual(small, 0, 'every choice and button is at least 44 x 44')
                self.assertEqual(page.locator('#full_name ~ .dict, #email ~ .dict, #phone ~ .dict').count(), 0)
            if api:
                page.fill('#visit_reason', 'Neck')
                button = page.locator('#visit_reason ~ .dict .dict-btn')
                button.click()
                self.assertIn('Listening', button.inner_text())
                page.evaluate("""(() => { var r = [{ transcript: 'and shoulders' }]; r.isFinal = false;
                    __rec.onresult({ resultIndex: 0, results: [r] }); })()""")
                self.assertEqual(page.locator('#visit_reason ~ .dict .dict-live').inner_text(), 'and shoulders')
                page.evaluate("""(() => { var r = [{ transcript: 'and shoulders' }]; r.isFinal = true;
                    __rec.onresult({ resultIndex: 0, results: [r] }); })()""")
                self.assertEqual(page.input_value('#visit_reason'), 'Neck and shoulders')
                button.click()
                page.wait_for_function("document.querySelector('#visit_reason ~ .dict .dict-btn').getAttribute('aria-pressed') === 'false'")
            page.close()

    def test_site_chrome_text_clears_seven_to_one(self):
        # House rule for public pages: 7:1 light against dark, measured. The current
        # page in the nav also carries an underline, so it never rests on colour alone.
        measure = """() => {
            const lin = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
            const rgba = s => { const p = s.match(/[\\d.]+/g).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
            const lum = c => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
            const ground = el => { for (let e = el; e; e = e.parentElement) { const c = rgba(getComputedStyle(e).backgroundColor); if (c[3] === 1) return c; } return [255, 255, 255, 1]; };
            return [...document.querySelectorAll('nav a[data-nav], footer p, footer a')].filter(e => e.getClientRects().length && e.textContent.trim()).map(e => {
                const bg = ground(e), fg = rgba(getComputedStyle(e).color);
                const mix = fg.slice(0, 3).map((v, i) => fg[3] * v + (1 - fg[3]) * bg[i]);
                const a = lum(mix), b = lum(bg);
                return {text: e.textContent.trim().slice(0, 30), ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
                        active: e.classList.contains('active'), underline: getComputedStyle(e).textDecorationLine};
            });
        }"""
        for width in (1440, 390):
            with self.subTest(width=width):
                page = self.new_page(viewport={'width': width, 'height': 900}, reduced_motion='reduce')
                page.goto(self.origin + '/book.html', wait_until='networkidle')
                page.wait_for_selector('footer .site-disclaimer')
                if width == 390:
                    page.click('.menu-toggle')
                rows = page.evaluate(measure)
                self.assertGreater(len(rows), 10)
                for row in rows:
                    self.assertGreaterEqual(row['ratio'], 7, row['text'])
                active = [row for row in rows if row['active']]
                self.assertEqual([row['text'] for row in active], ['Book'])
                self.assertIn('underline', active[0]['underline'])
                page.close()

    def test_rates_pdf_matches_first_visit_copy(self):
        pdf = PdfReader(SITE / 'pe-session-rates.pdf')
        self.assertEqual(len(pdf.pages), 1)
        text = ' '.join((pdf.pages[0].extract_text() or '').lower().split())
        self.assertIn('first-visit intro', text)
        for rate in ('$45', '$85', '$125', '$165'):
            self.assertIn(rate, text)

    def test_promo_pdfs_match_the_current_sheets(self):
        # The shelf links these PDFs as the files to print or send to FedEx, so they must carry
        # the current copy: Elbow Room at Hustle House, Wed/Sat/Sun, never the retired days.
        for name, pages, cards in (('free-chair-flyer', 1, 1), ('green-card-fedex', 2, 1), ('green-cards-10up', 2, 10)):
            with self.subTest(pdf=name):
                pdf = PdfReader(SITE / 'promo' / (name + '.pdf'))
                self.assertEqual(len(pdf.pages), pages)
                text = ' '.join(' '.join((page.extract_text() or '').split()) for page in pdf.pages)
                self.assertNotRegex(text, r'(?i)\b(Sundays|Wednesdays)\b|BOOK: peoples-elbow\.com')
                self.assertEqual(text.lower().count('elbowroommassage.com/book'), cards)
                self.assertRegex(text, r'Hustle House')
                self.assertRegex(text, r'Wed, Sat,? (or )?Sun')

if __name__ == '__main__':
    unittest.main(verbosity=2)

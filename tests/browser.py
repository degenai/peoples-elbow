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
        page.goto(self.origin + '/intake/index.html', wait_until='networkidle')
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

    def test_rates_pdf_matches_first_visit_copy(self):
        pdf = PdfReader(SITE / 'pe-session-rates.pdf')
        self.assertEqual(len(pdf.pages), 1)
        text = ' '.join((pdf.pages[0].extract_text() or '').lower().split())
        self.assertIn('first-visit intro', text)
        for rate in ('$45', '$85', '$125', '$165'):
            self.assertIn(rate, text)

    def test_saturday_is_qualified_without_moving_residency_days(self):
        page = self.new_page()
        page.add_init_script('Date.prototype.getDay = () => 6;')
        page.goto(self.origin + '/book.html', wait_until='domcontentloaded')
        self.assertIn('select Saturdays', page.locator('#day-strip-note').inner_text())
        self.assertEqual(page.locator('.chip-ccc').get_attribute('data-days'), '2,4,5')
        self.assertEqual(page.locator('.chip-hh').get_attribute('data-days'), '3')
        self.assertEqual(page.locator('.chip-er').get_attribute('data-days'), '6,0')
        page.close()

if __name__ == '__main__':
    unittest.main(verbosity=2)

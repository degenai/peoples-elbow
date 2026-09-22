"""Square lifecycle controls: synthetic script only; no booking network."""
import unittest
from playwright.sync_api import expect
from browser_support import BrowserFixture

WIDGET = 'https://square.site/appointments/buyer/widget/**'
SCRIPT = "window.fixtureSquareLoads=(window.fixtureSquareLoads||0)+1; const frame=document.createElement('iframe');frame.id='fixture-square';frame.title='Synthetic booking calendar';document.querySelector('#book-widget-container').appendChild(frame);"

class BookingChecks(BrowserFixture):
    def test_failure_displays_an_accessible_retry_instruction(self):
        page = self.new_page()
        page.route(WIDGET, lambda route: route.abort())
        page.goto(self.origin + '/book.html', wait_until='networkidle')
        page.locator('#hh-reveal').click()
        expect(page.locator('#hh-widget-wrap [role="status"]')).to_contain_text('close and reopen', timeout=1500)
        page.close()

    def test_loading_toggles_never_inject_a_second_script(self):
        page = self.new_page()
        held = []
        page.route(WIDGET, lambda route: held.append(route))
        page.goto(self.origin + '/book.html', wait_until='networkidle')
        reveal = page.locator('#hh-reveal')
        reveal.click()
        for _ in range(3):
            reveal.click()
            reveal.click()
        self.assertEqual(len(held), 1)
        self.assertEqual(page.locator('#book-widget-container script').count(), 1)
        held[0].fulfill(status=200, content_type='text/javascript', body=SCRIPT)
        expect(page.locator('#fixture-square')).to_have_count(1, timeout=1500)
        reveal.focus()
        page.keyboard.press('Tab')
        self.assertEqual(page.evaluate('document.activeElement.href'), 'https://peoples-elbow.square.site/')
        self.assertFalse(self.submissions)
        page.close()

    def test_failed_script_can_retry_on_reopen_and_success_survives_toggle(self):
        page = self.new_page(viewport={'width':390,'height':844})
        attempts = []
        def widget(route):
            attempts.append(route.request.url)
            if len(attempts) == 1:
                route.abort()
            else:
                route.fulfill(status=200, content_type='text/javascript', body=SCRIPT)
        page.route(WIDGET, widget)
        page.goto(self.origin + '/book.html', wait_until='networkidle')
        reveal = page.locator('#hh-reveal')
        with page.expect_event('requestfailed', predicate=lambda r: 'square.site/appointments/buyer/widget/' in r.url):
            reveal.click()
        reveal.click()  # close failed widget
        reveal.click()  # explicit user retry, never automatic
        expect(page.locator('#fixture-square')).to_have_count(1, timeout=2000)
        self.assertEqual(len(attempts), 2)
        reveal.click()
        reveal.click()
        self.assertEqual(page.evaluate('window.fixtureSquareLoads'), 1)
        self.assertEqual(len(attempts), 2)
        self.assertEqual(page.locator('#book-widget-container script').count(), 1)
        self.assertEqual(page.locator('a[href="https://peoples-elbow.square.site"]').count(), 1)
        self.assertFalse(self.submissions)
        page.close()

if __name__ == '__main__':
    unittest.main(verbosity=2)

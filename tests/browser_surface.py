"""Whole-page integration controls, independent of component-only fixtures."""
from datetime import datetime, timezone
import unittest
from browser_support import BrowserFixture, SITE

class SurfaceChecks(BrowserFixture):
    def test_shared_navigation_on_real_pages_at_mobile_and_desktop_widths(self):
        routes = sorted(p.name for p in SITE.glob('*.html') if 'id="header-placeholder"' in p.read_text(encoding='utf-8'))
        self.assertGreaterEqual(len(routes),12)
        for width in (390,1440):
            page = self.new_page(viewport={'width':width,'height':900},reduced_motion='reduce')
            errors=[]
            page.on('pageerror',lambda error: errors.append(str(error)))
            for route in routes:
                with self.subTest(route=route,width=width):
                    errors.clear()
                    response = page.goto(self.origin+'/'+route,wait_until='networkidle')
                    self.assertEqual(response.status,200)
                    page.locator('header nav a[data-nav="book"]').wait_for(state='attached',timeout=5000)
                    self.assertEqual(page.evaluate('innerWidth'),width)
                    self.assertGreater(page.locator('footer a').count(),0)
                    if width == 390:
                        button = page.locator('.menu-toggle')
                        self.assertTrue(button.is_visible(),'actual mobile menu control must be visible')
                        bounds = button.bounding_box()
                        self.assertGreaterEqual(bounds['width'],44)
                        self.assertGreaterEqual(bounds['height'],44)
                        self.assertGreaterEqual(bounds['x'],0)
                        self.assertLessEqual(bounds['x']+bounds['width'],width)
                        button.click()
                        self.assertEqual(button.get_attribute('aria-expanded'),'true')
                        self.assertTrue(page.locator('nav a[data-nav="book"]').is_visible())
                        button.click()
                        self.assertEqual(button.get_attribute('aria-expanded'),'false')
                    self.assertEqual(errors,[])
            page.close()
        self.assertFalse(self.submissions)

    def test_tentative_date_is_listed_without_an_exact_countdown(self):
        page = self.new_page(reduced_motion='reduce',timezone_id='America/New_York')
        before = datetime(2026,8,21,12,0,tzinfo=timezone.utc)
        page.clock.install(time=before)
        page.clock.pause_at(before)
        page.goto(self.origin+'/calendar.html',wait_until='networkidle')
        self.assertIn('Golfing for Respite',page.locator('#featured-event').inner_text())
        self.assertIn('FlexFest',page.locator('#upcoming-events').inner_text())
        # Date-only listing survives its whole local calendar day, not a made-up start time.
        page.clock.fast_forward(30*60*60*1000)
        page.reload(wait_until='networkidle')
        self.assertIn('FlexFest',page.locator('#upcoming-events').inner_text())
        page.clock.fast_forward(10*60*60*1000)
        page.reload(wait_until='networkidle')
        self.assertNotIn('FlexFest',page.locator('#upcoming-events').inner_text())
        page.close()

    def test_calendar_current_listing_and_final_expiry(self):
        for route in ('index.html','calendar.html'):
            with self.subTest(route=route):
                page = self.new_page(reduced_motion='reduce',timezone_id='America/New_York')
                before = datetime(2026,10,5,12,29,59,tzinfo=timezone.utc)
                page.clock.install(time=before)
                page.clock.pause_at(before)
                page.goto(self.origin+'/'+route,wait_until='networkidle')
                self.assertIn('Golfing for Respite',page.locator('#featured-event').inner_text())
                self.assertNotIn('FlexFest',page.locator('#featured-event').inner_text())
                self.assertEqual(page.locator('#countdown-seconds').inner_text(),'01')
                page.clock.fast_forward(2000)
                self.assertIn('NO UPCOMING APPEARANCES',page.locator('#featured-event').inner_text())
                page.close()

if __name__ == '__main__':
    unittest.main(verbosity=2)

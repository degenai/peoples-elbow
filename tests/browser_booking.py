"""Booking page: two places, one button each, today's place lit. No booking network."""
import unittest
from browser_support import BrowserFixture

# Date#getDay -> the card that should light up (None: Monday, the day off).
PLACES = {0: 'venue-hh', 1: None, 2: 'venue-ccc', 3: 'venue-hh', 4: 'venue-ccc', 5: 'venue-ccc', 6: 'venue-hh'}
NOTES = {None: 'day off', 'venue-hh': 'Hustle House', 'venue-ccc': 'Cherokee Center for Change'}

class BookingChecks(BrowserFixture):
    def test_every_day_lights_its_own_place_and_monday_rests(self):
        for day, card in PLACES.items():
            with self.subTest(day=day):
                page = self.new_page(reduced_motion='reduce')
                errors = []
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.add_init_script('Date.prototype.getDay = () => %d;' % day)
                page.goto(self.origin + '/book.html', wait_until='domcontentloaded')
                lit = page.locator('.venue-card-today')
                if card:
                    self.assertEqual(lit.count(), 1)
                    self.assertEqual(lit.get_attribute('id'), card)
                    self.assertEqual(page.locator('.chip-today').get_attribute('data-place'), card)
                    self.assertEqual(page.locator('#' + card + ' .today-tag').inner_text().strip().lower(), 'today')
                else:
                    self.assertEqual(lit.count(), 0)
                    self.assertEqual(page.locator('.chip-off.chip-today-off').count(), 1)
                # The cue is printed, never color alone: one tag on the chip, one on the card.
                self.assertEqual(page.locator('.today-tag').count(), 2 if card else 1)
                note = page.locator('#day-strip-note')
                self.assertIn(NOTES[card], note.inner_text())
                if '(770) 928-7300' in note.inner_text():
                    self.assertEqual(note.locator('.nowrap').inner_text(), '(770) 928-7300', 'the phone number never breaks at its hyphen')
                self.assertEqual(errors, [])
                page.close()

    def test_one_working_button_per_place_and_no_embedded_calendar(self):
        page = self.new_page(viewport={'width': 390, 'height': 844}, reduced_motion='reduce')
        requested = []
        page.on('request', lambda request: requested.append(request.url))
        page.goto(self.origin + '/book.html', wait_until='networkidle')
        buttons = page.locator('.venue-card-cta')
        self.assertEqual(buttons.count(), 2)
        self.assertEqual(page.locator('#venue-ccc .venue-card-cta').get_attribute('href'), 'tel:+17709287300')
        online = page.locator('#venue-hh .venue-card-cta')
        self.assertEqual(online.get_attribute('href'), 'https://elbowroommassage.com/book')
        self.assertEqual(online.get_attribute('target'), '_blank')
        self.assertIn('noopener', online.get_attribute('rel'))
        for index in range(2):
            box = buttons.nth(index).bounding_box()
            self.assertGreaterEqual(box['height'], 44)
            self.assertGreaterEqual(box['x'], 0)
            self.assertLessEqual(box['x'] + box['width'], 390)
        self.assertEqual(page.evaluate('document.documentElement.scrollWidth'), 390, 'no sideways scroll on a phone')
        self.assertEqual(page.locator('iframe').count(), 0)
        self.assertFalse(any('square' in url for url in requested), 'Hustle House books on elbowroommassage.com, not an embed')
        page.locator('.book-hero-aside a[href="#about"]').click()
        page.wait_for_function("location.hash === '#about'")
        self.assertTrue(page.locator('#about').is_visible())
        self.assertFalse(self.submissions)
        page.close()

    def test_day_plates_arm_on_the_first_tap_and_go_on_the_second(self):
        page = self.new_page(viewport={'width': 390, 'height': 844}, reduced_motion='reduce')
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.add_init_script('Date.prototype.getDay = () => 3;')
        page.goto(self.origin + '/book.html', wait_until='domcontentloaded')
        hh, ccc, off = page.locator('.chip-hh'), page.locator('.chip-ccc'), page.locator('.chip-off')
        for chip in (hh, ccc, off):
            box, hit = chip.bounding_box(), chip.locator('.chip-hit')
            self.assertGreaterEqual(box['height'], 44)
            # the control covers the whole plate: the plate's own corner is the control
            self.assertTrue(page.evaluate('([x, y]) => !!document.elementFromPoint(x, y).closest(".chip-hit")', [box['x'] + 6, box['y'] + box['height'] - 6]))
            self.assertEqual(hit.count(), 1)
        # first tap: no navigation, the plate says what the next tap does
        hh.click()
        self.assertEqual(len(page.context.pages), 1)
        self.assertIn('chip-armed', hh.get_attribute('class'))
        self.assertEqual(hh.locator('.chip-venue').inner_text().strip(), 'TAP AGAIN TO BOOK')
        self.assertEqual(page.locator('#chip-status').text_content(), 'TAP AGAIN TO BOOK')
        # tapping the other plate moves the arm; only one is ever armed
        ccc.click()
        self.assertEqual(page.locator('.chip-armed').count(), 1)
        self.assertEqual(ccc.locator('.chip-venue').inner_text().strip(), 'TAP AGAIN TO CALL THE DESK')
        self.assertEqual(hh.locator('.chip-venue').inner_text().strip(), 'HUSTLE HOUSE')
        # tapping off the plates stands it down
        page.locator('.book-hero h1').click()
        self.assertEqual(page.locator('.chip-armed').count(), 0)
        self.assertEqual(ccc.locator('.chip-venue').inner_text().strip(), 'CHEROKEE CENTER FOR CHANGE')
        # two taps on Hustle House open Elbow Room's booking page in a new tab
        page.context.route('https://elbowroommassage.com/**', lambda route: route.fulfill(status=200, content_type='text/html', body='<title>stub</title>'))
        hh.click()
        with page.context.expect_page() as opened:
            hh.click()
        opened.value.wait_for_url('https://elbowroommassage.com/book', timeout=5000)
        opened.value.close()
        self.assertEqual(page.locator('.chip-armed').count(), 0)
        self.assertEqual(hh.locator('.chip-venue').inner_text().strip(), 'HUSTLE HOUSE')
        # the keyboard goes straight through on the first press
        hh.locator('.chip-hit').focus()
        with page.context.expect_page() as keyed:
            page.keyboard.press('Enter')
        keyed.value.wait_for_url('https://elbowroommassage.com/book', timeout=5000)
        keyed.value.close()
        # Monday opens nothing and says so, then goes back to its own line
        off.click()
        self.assertEqual(off.locator('.chip-venue').inner_text().strip(), 'NOTHING TO BOOK. BACK TUESDAY.')
        self.assertEqual(len(page.context.pages), 1)
        page.wait_for_function("document.querySelector('.chip-off .chip-venue').textContent === 'DAY OFF. THE ELBOW RESTS.'", timeout=5000)
        self.assertEqual(page.evaluate('document.documentElement.scrollWidth'), 390, 'no sideways scroll on a phone')
        self.assertEqual(errors, [])
        page.close()

if __name__ == '__main__':
    unittest.main(verbosity=2)

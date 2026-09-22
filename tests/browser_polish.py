"""Remaining conservative polish; all clocks and requests are local controls."""
import base64, io, unittest
from pypdf import PdfReader
from browser_support import BrowserFixture

class PolishChecks(BrowserFixture):
    def test_pr97_coupon_color_and_print_contract(self):
        page = self.new_page()
        page.goto(self.origin+'/promo/gift-certs.html',wait_until='networkidle')
        colors = page.locator('.pcoupon').evaluate_all('els => els.map(e => getComputedStyle(e).backgroundColor)')
        self.assertEqual(colors,['rgb(0, 105, 55)']*4)
        data = page.context.new_cdp_session(page).send('Page.printToPDF',{'printBackground':True,'preferCSSPageSize':True})
        pdf = PdfReader(io.BytesIO(base64.b64decode(data['data'])))
        self.assertEqual(len(pdf.pages),3)
        text = '\n'.join(p.extract_text() for p in pdf.pages)
        for label in ['60-Minute','30-Minute','HH-01','HH-04','January 31, 2027']:
            self.assertIn(label,text)
        self.assertFalse(self.submissions)
        page.close()

if __name__ == '__main__':
    unittest.main(verbosity=2)

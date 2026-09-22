"""Synthetic import rejection UI on a fresh disposable origin; never Drive."""
import json, unittest
from browser_support import BrowserFixture

class ParserUI(BrowserFixture):
    def test_ambiguous_paste_explains_selection_without_creating_a_lead(self):
        page = self.new_page(reduced_motion='reduce')
        page.goto(self.origin+'/crm.html',wait_until='networkidle')
        page.locator('#settings-btn').click()
        record = '--- LEAD JSON v1 ---\n'+json.dumps({'schema':'lead-v1','name':'SYNTHETIC_ONLY','message':'Fixture'})+'\n--- END LEAD JSON ---'
        text = record+'\n'+record
        page.locator('#paste-email-text').fill(text)
        # Enforce zero persistent writes during the refused import itself.
        page.evaluate("""() => { window.fixtureWrites=0;
            Storage.prototype.setItem = function() { window.fixtureWrites++; throw new Error('Synthetic import write guard'); }; }""")
        page.locator('#paste-email-btn').click()
        self.assertIn('Multiple lead records',page.locator('.crm-toast').last.inner_text())
        self.assertEqual(page.locator('#paste-email-text').input_value(),text)
        self.assertEqual(page.evaluate('window.fixtureWrites'),0)
        self.assertFalse(self.submissions)
        page.close()

if __name__ == '__main__':
    unittest.main(verbosity=2)

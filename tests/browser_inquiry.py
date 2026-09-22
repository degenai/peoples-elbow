"""Inquiry transport faults are injected locally; no Worker/email is contacted."""
import unittest
from browser_support import BrowserFixture

class InquiryChecks(BrowserFixture):
    def fill(self, page, form_id):
        values = {'#name':'Fixture Person','#email':'fixture@example.invalid','#contact-message':'SYNTHETIC_ONLY'} if form_id == 'contact-form' else {'#venue-name':'Fixture Venue','#contact-name':'Fixture Person','#contact-email':'fixture@example.invalid','#message':'SYNTHETIC_ONLY'}
        for selector,value in values.items():
            page.fill(selector,value)
        if form_id == 'host-interest-form':
            page.select_option('#venue-type','card-shop')
        return page.locator('#'+form_id)

    def transport_page(self, mode):
        page = self.new_page(reduced_motion='reduce')
        page.add_init_script("""window.fixtureCalls = 0; window.fixtureAborts = 0;
            const realFetch = window.fetch;
            window.fetch = (url, options) => {
                if (String(url) !== 'https://peoples-elbow.alex-adamczyk.workers.dev') return realFetch(url, options);
                window.fixtureCalls++;
                options?.signal?.addEventListener('abort', () => window.fixtureAborts++);
                if (window.fixtureMode === 'headers') return new Promise(() => {});
                if (window.fixtureMode === 'body') return Promise.resolve({ok:true,json:() => new Promise(resolve => window.lateReply=resolve)});
                if (window.fixtureMode === 'reject') return Promise.reject(new TypeError('Synthetic CORS/network rejection'));
                return Promise.resolve({ok:window.fixtureOK ?? true,json:() => Promise.resolve(window.fixtureReply)});
            };""")
        page.goto(self.origin+'/index.html',wait_until='networkidle')
        page.evaluate('(mode) => window.fixtureMode=mode',mode)
        page.clock.install()
        return page

    def test_pending_body_ignores_late_ack_and_allows_only_manual_retry(self):
        page = self.transport_page('body')
        for form_id in ('contact-form','host-interest-form'):
            with self.subTest(form=form_id):
                page.evaluate("window.fixtureMode='body'")
                form = self.fill(page,form_id)
                button = form.locator('button[type=submit]')
                button.click()
                page.clock.fast_forward(16000)
                self.assertFalse(button.is_disabled())
                self.assertIn('unconfirmed',form.locator('.form-message').inner_text().lower())
                page.evaluate("window.lateReply({success:true,message:'Late synthetic acknowledgement'})")
                self.assertNotEqual(form.locator('input').first.input_value(),'')
                self.assertEqual(form.locator('.form-message.success').count(),0)
                page.evaluate("window.fixtureMode='reply';window.fixtureReply={success:true,message:'Synthetic acknowledged retry'}")
                button.click()
                form.locator('.form-message.success').wait_for(timeout=1500)
                self.assertEqual(form.locator('input').first.input_value(),'')
        self.assertEqual(page.evaluate('window.fixtureCalls'),4)
        self.assertFalse(self.submissions)
        page.close()

    def test_invalid_acknowledgements_never_erase_inputs_or_show_success(self):
        page = self.transport_page('reply')
        for reply in ({'success':'yes','message':'bad flag'}, {'success':True}, {'success':True,'message':{}}, {}, None, []):
            page.evaluate('(reply) => window.fixtureReply=reply',reply)
            for form_id in ('contact-form','host-interest-form'):
                with self.subTest(reply=reply,form=form_id):
                    form = self.fill(page,form_id)
                    form.locator('button[type=submit]').click()
                    self.assertNotEqual(form.locator('input').first.input_value(),'')
                    self.assertEqual(form.locator('.form-message.success').count(),0)
                    self.assertIn('unconfirmed',form.locator('.form-message').inner_text().lower())
        self.assertFalse(self.submissions)
        page.close()

    def test_duplicate_submit_events_do_not_duplicate_a_pending_request(self):
        page = self.transport_page('headers')
        form = self.fill(page,'contact-form')
        form.evaluate("f => { f.dispatchEvent(new Event('submit',{cancelable:true})); f.dispatchEvent(new Event('submit',{cancelable:true})); }")
        self.assertEqual(page.evaluate('window.fixtureCalls'),1)
        page.clock.fast_forward(16000)
        page.close()

    def test_rejection_and_acknowledgement_controls_are_explicit_and_text_only(self):
        page = self.transport_page('reply')
        cases = [
            ('reject', True, None, 'unconfirmed', False),
            ('reply', False, {'success':True,'message':'Contradictory acknowledgement'}, 'unconfirmed', False),
            ('reply', False, {'success':False,'message':'Controlled rejection'}, 'Controlled rejection', False),
            ('reply', True, {'success':False}, 'unconfirmed', False),
            ('reply', True, {'success':True,'message':'<img src=x onerror=alert(1)> received'}, '<img', True),
        ]
        for mode, ok, reply, expected, success in cases:
            page.evaluate('v => {window.fixtureMode=v[0];window.fixtureOK=v[1];window.fixtureReply=v[2]}',[mode,ok,reply])
            for form_id in ('contact-form','host-interest-form'):
                with self.subTest(mode=mode,reply=reply,form=form_id):
                    form = self.fill(page,form_id)
                    button = form.locator('button[type=submit]')
                    button.click()
                    self.assertFalse(button.is_disabled())
                    self.assertIn(expected,form.locator('.form-message').inner_text())
                    self.assertEqual(form.locator('input').first.input_value() == '',success)
                    self.assertEqual(form.locator('.form-message img').count(),0)
        self.assertEqual(page.evaluate('window.fixtureCalls'),len(cases)*2)
        self.assertFalse(self.submissions)
        page.close()

    def test_pending_headers_have_a_finite_uncertain_result(self):
        page = self.transport_page('headers')
        for form_id in ('contact-form','host-interest-form'):
            with self.subTest(form=form_id):
                form = self.fill(page,form_id)
                button = form.locator('button[type=submit]')
                button.click()
                self.assertTrue(button.is_disabled())
                page.clock.fast_forward(16000)
                self.assertFalse(button.is_disabled(), 'stalled response must release the submit button')
                self.assertIn('unconfirmed',form.locator('.form-message').inner_text().lower())
                self.assertNotEqual(form.locator('input').first.input_value(),'')
        self.assertEqual(page.evaluate('window.fixtureCalls'),2)
        self.assertEqual(page.evaluate('window.fixtureAborts'),2)
        self.assertFalse(self.submissions)
        page.close()

if __name__ == '__main__':
    unittest.main(verbosity=2)

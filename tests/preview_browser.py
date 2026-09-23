"""Safe artifact browser controls use a plain static host: no Worker safety dependency."""
import unittest
from browser_support import BrowserFixture

class PreviewChecks(BrowserFixture):
    def test_preview_ready_event_reaches_window_listeners(self):
        page=self.new_page()
        page.add_init_script("window.fixtureReady=0;window.addEventListener('DOMContentLoaded',()=>window.fixtureReady++)")
        page.goto(self.origin+'/index.html',wait_until='networkidle')
        self.assertEqual(page.evaluate('window.fixtureReady'),2)
        page.close()

    def test_preview_fieldset_is_layout_neutral(self):
        page=self.new_page(viewport={'width':390,'height':900})
        page.goto(self.origin+'/index.html',wait_until='networkidle')
        actual=page.locator('#contact-form > [data-preview-fields]').evaluate("x=>({display:getComputedStyle(x).display,border:getComputedStyle(x).borderWidth})")
        self.assertEqual(actual,{'display':'contents','border':'0px'})
        self.assertLessEqual(page.evaluate('document.documentElement.scrollWidth'),390)
        page.close()

    def test_native_forms_stay_inert_with_javascript_off_or_bootstrap_blocked(self):
        for mode in ('off','blocked'):
            with self.subTest(mode=mode):
                page=self.new_page(java_script_enabled=mode!='off')
                if mode=='blocked': page.route('**/preview-client.js',lambda route:route.abort())
                calls=[]
                console=[]
                page.on('console',lambda message:console.append(message.text))
                page.on('request',lambda request:calls.append(request.url))
                page.goto(self.origin+'/index.html',wait_until='networkidle')
                self.assertTrue(page.locator('#name').is_disabled())
                self.assertTrue(page.locator('#venue-name').is_disabled())
                page.evaluate("""()=>{
                    for(const id of ['contact-form','host-interest-form']) {
                        const f=document.getElementById(id);f.querySelectorAll('fieldset').forEach(x=>x.disabled=false);
                        f.action='https://external.invalid/';f.querySelector('input').value='SYNTHETIC_ONLY';f.submit();
                    }
                }""")
                page.wait_for_timeout(100)
                self.assertTrue(any("form-action 'none'" in message for message in console),console)
                self.assertEqual(page.url,self.origin+'/index.html')
                self.assertFalse(self.submissions)
                self.assertFalse(any('SYNTHETIC_ONLY' in url or 'external.invalid' in url for url in calls))
                page.close()

    def test_dynamic_external_links_and_popups_cannot_leave_preview(self):
        page=self.new_page()
        page.goto(self.origin+'/book.html',wait_until='networkidle')
        page.evaluate("const a=document.createElement('a');a.id='fixture-link';a.href='https://external.invalid/';a.textContent='Synthetic';document.body.prepend(a)")
        page.click('#fixture-link')
        self.assertEqual(page.url,self.origin+'/book.html')
        self.assertTrue(page.evaluate("window.open('https://external.invalid/')===null"))
        self.assertEqual(len(page.context.pages),1)
        page.close()

    def test_redirecting_promo_stays_inside_preview(self):
        page = self.new_page(reduced_motion='reduce')
        page.goto(self.origin+'/promo/booking-sheet.html',wait_until='networkidle')
        self.assertEqual(page.url,self.origin+'/promo/booking-sheet.html')
        self.assertEqual(page.locator('meta[http-equiv="refresh"]').count(),0)
        self.assertTrue(page.locator('#preview-notice').is_visible())
        page.close()

    def test_persistent_storage_is_unavailable_even_on_crm(self):
        page = self.new_page(reduced_motion='reduce',service_workers='allow')
        page.goto(self.origin+'/crm.html',wait_until='networkidle')
        page.evaluate("localStorage.setItem('synthetic','fixture'); sessionStorage.setItem('synthetic','fixture'); localStorage.synthetic='fixture'")
        self.assertIsNone(page.evaluate("localStorage.getItem('synthetic')"))
        self.assertIsNone(page.evaluate("sessionStorage.getItem('synthetic')"))
        cdp = page.context.new_cdp_session(page)
        for local in (True,False):
            self.assertEqual(cdp.send('DOMStorage.getDOMStorageItems',{'storageId':{'securityOrigin':self.origin,'isLocalStorage':local}})['entries'],[])
        self.assertTrue(page.evaluate("async () => {try { indexedDB.open('synthetic'); return false; } catch { return true; }}"))
        self.assertEqual(page.evaluate('async () => await indexedDB.databases()'),[])
        self.assertEqual(page.evaluate('async () => (await navigator.serviceWorker.getRegistrations()).length'),0)
        page.close()

    def test_both_forms_simulate_without_a_network_submission(self):
        page = self.new_page(reduced_motion='reduce')
        page.set_default_timeout(4000)
        page.goto(self.origin+'/index.html',wait_until='networkidle')
        self.assertTrue(page.locator('#preview-notice').is_visible())
        for form_id,values in (
            ('contact-form',{'#name':'Fixture Person','#email':'fixture@example.invalid','#contact-message':'SYNTHETIC_ONLY'}),
            ('host-interest-form',{'#venue-name':'Fixture Venue','#contact-name':'Fixture Person','#contact-email':'fixture@example.invalid','#message':'SYNTHETIC_ONLY'})):
            with self.subTest(form=form_id):
                for selector,value in values.items(): page.fill(selector,value)
                if form_id=='host-interest-form': page.select_option('#venue-type','card-shop')
                form=page.locator('#'+form_id)
                form.locator('button[type=submit]').click()
                form.locator('.form-message.success').wait_for()
                self.assertIn('Preview',form.locator('.form-message.success').inner_text())
        self.assertFalse(self.submissions)
        page.close()

if __name__=='__main__': unittest.main(verbosity=2)

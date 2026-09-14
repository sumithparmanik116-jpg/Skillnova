import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false }); // opens visible browser so you can watch
  const page = await browser.newPage();

  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
  page.on('response', resp => {
    if (resp.status() >= 400) {
      console.log(`FAILED ENDPOINT [${resp.status()}]:`, resp.url());
    }
  });

  console.log('Navigating to Netlify app...');
  await page.goto('https://lovely-biscuit-d6f36d.netlify.app');
  
  // Select Super Admin and click sign in
  await page.click('text=Super Admin');
  await page.click('button:has-text("Sign In")');

  // Wait 5 seconds to capture all dashboard queries and socket events
  await page.waitForTimeout(5000);
  await browser.close();
})();
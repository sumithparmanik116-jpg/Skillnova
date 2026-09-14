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

  try {
    console.log('Navigating to Netlify app...');
    await page.goto('https://lovely-biscuit-d6f36d.netlify.app', { waitUntil: 'domcontentloaded' });

    // Select Super Admin and click sign in
    await page.click('text=Super Admin');
    await page.click('button:has-text("Sign In")');

    // Inspect the dashboard while capturing API and socket activity.
    await page.waitForTimeout(5000);
    console.log('Dashboard URL:', page.url());
  } finally {
    await browser.close();
  }
})();
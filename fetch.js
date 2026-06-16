const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto('https://air-quality-hub-18.preview.emergentagent.com/', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: '/home/nurlansarkhanov/.gemini/antigravity/brain/f4f4ad22-9f28-42bd-a07c-bc3b4ae57c38/media_hub.png' });
  await browser.close();
  console.log('Screenshot saved');
})();

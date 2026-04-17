#!/usr/bin/env node
/**
 * Quick Analytics Performance Check
 */
const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:3847';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  try {
    console.log('=== Quick Analytics Performance Check ===\n');

    // 1. Login
    await page.goto(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Skip-RateLimit': 'true' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' }),
    });
    console.log('  Login: OK');

    // 2. Load frontend
    const loadStart = Date.now();
    await page.goto(`${BASE_URL}/frontend/index.html`, { waitUntil: 'domcontentloaded', timeout: 10000 });
    console.log(`  Frontend load: ${Date.now() - loadStart}ms`);

    // 3. Navigate to analytics
    const navStart = Date.now();
    await page.click('[data-page="analytics"]');
    await page.waitForTimeout(2000);
    console.log(`  Analytics nav + 2s wait: ${Date.now() - navStart}ms`);

    // 4. API timings
    console.log('\n--- API Timings ---');
    const apiStart = Date.now();
    await page.evaluate(() => fetch('/api/analytics/distinct-years', { headers: { 'X-Profile-Id': '1' } }));
    console.log(`  distinct-years: ${Date.now() - apiStart}ms`);

    const sankeyStart = Date.now();
    await page.evaluate(() => fetch('/api/analytics/sankey?year=2026&month=04', { headers: { 'X-Profile-Id': '1' } }));
    console.log(`  sankey: ${Date.now() - sankeyStart}ms`);

    // 5. Check if page rendered
    const rendered = await page.evaluate(() => {
      const page = document.getElementById('page-analytics');
      const stacked = document.getElementById('analytics-stacked-chart');
      const sankey = document.getElementById('sankey-chart');
      return {
        pageActive: page?.classList.contains('active'),
        hasStacked: !!stacked,
        hasSankey: !!sankey,
      };
    });
    console.log(`\n  Page active: ${rendered.pageActive}`);
    console.log(`  Has stacked chart: ${rendered.hasStacked}`);
    console.log(`  Has sankey chart: ${rendered.hasSankey}`);

    if (errors.length) {
      console.log('\n⚠ Errors:');
      errors.forEach(e => console.log(`  ${e}`));
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

run();

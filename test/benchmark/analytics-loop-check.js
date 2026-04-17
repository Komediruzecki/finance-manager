#!/usr/bin/env node
/**
 * Analytics Infinite Loop Check
 * Monitors console for repeated errors and excessive API calls
 */
const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:3847';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const consoleMessages = [];
  const apiCalls = [];

  page.on('console', msg => {
    consoleMessages.push({ type: msg.type(), text: msg.text(), time: Date.now() });
  });

  // Track API requests
  page.on('request', req => {
    if (req.url().includes('/api/')) {
      apiCalls.push({ url: req.url(), time: Date.now() });
    }
  });

  try {
    console.log('=== Analytics Infinite Loop Check ===\n');

    // 1. Login
    await page.goto(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Skip-RateLimit': 'true' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' }),
    });
    console.log('  Login: OK');

    // 2. Load frontend
    await page.goto(`${BASE_URL}/frontend/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    // 3. Click analytics tab
    await page.click('[data-page="analytics"]');

    // 4. Monitor for 5 seconds
    console.log('\n--- Monitoring for 5 seconds ---');
    const startTime = Date.now();
    await page.waitForTimeout(5000);
    const duration = Date.now() - startTime;

    // 5. Analyze results
    console.log(`  Duration: ${duration}ms`);

    // Count API calls
    const analyticsApiCalls = apiCalls.filter(a => a.url.includes('analytics'));
    console.log(`  Total API calls: ${apiCalls.length}`);
    console.log(`  Analytics API calls: ${analyticsApiCalls.length}`);

    if (analyticsApiCalls.length > 5) {
      console.log(`  ⚠ EXCESSIVE API CALLS: ${analyticsApiCalls.length}`);
    }

    // Count console errors
    const errors = consoleMessages.filter(m => m.type === 'error');
    console.log(`  Console errors: ${errors.length}`);

    if (errors.length > 0) {
      console.log('\n--- Error Messages ---');
      errors.forEach(e => console.log(`  ${e.text}`));
    }

    // Count repeated console messages
    const messageCounts = {};
    consoleMessages.filter(m => m.type === 'log').forEach(m => {
      messageCounts[m.text] = (messageCounts[m.text] || 0) + 1;
    });

    const repeatedMessages = Object.entries(messageCounts)
      .filter(([msg, count]) => count > 2)
      .sort((a, b) => b[1] - a[1]);

    if (repeatedMessages.length > 0) {
      console.log('\n--- Repeated Console Messages ---');
      repeatedMessages.slice(0, 5).forEach(([msg, count]) => {
        console.log(`  x${count}: ${msg.slice(0, 80)}`);
      });
    }

    // Check DOM state
    const state = await page.evaluate(() => {
      const pageEl = document.getElementById('page-analytics');
      return {
        active: pageEl?.classList.contains('active'),
        stackedHasCanvas: !!document.getElementById('analytics-stacked-chart'),
        pieHasCanvas: !!document.getElementById('analytics-pie-chart'),
        sankeyHasSvg: !!document.getElementById('sankey-chart'),
      };
    });
    console.log('\n--- DOM State ---');
    console.log(`  Page active: ${state.active}`);
    console.log(`  Stacked canvas: ${state.stackedHasCanvas}`);
    console.log(`  Pie canvas: ${state.pieHasCanvas}`);
    console.log(`  Sankey SVG: ${state.sankeyHasSvg}`);

    // Summary
    console.log('\n=== Summary ===');
    if (errors.length > 0) {
      console.log('⚠ Console errors detected');
    }
    if (analyticsApiCalls.length > 5) {
      console.log(`⚠ Excessive API calls (${analyticsApiCalls.length})`);
    }
    if (repeatedMessages.length > 0) {
      console.log(`⚠ Repeated messages (potential loop)`);
    }
    if (errors.length === 0 && analyticsApiCalls.length <= 5 && repeatedMessages.length === 0) {
      console.log('✓ No issues detected');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

run();

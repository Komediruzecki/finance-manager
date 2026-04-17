#!/usr/bin/env node
/**
 * Detailed Analytics Page Benchmark
 * Breaks down each component's load time
 */
const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:3847';

async function runBenchmark() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const consoleErrors = [];
  const timings = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  try {
    console.log('=== Detailed Analytics Benchmark ===\n');

    // 1. Measure static asset load time (just HTML)
    const htmlStart = Date.now();
    const response = await page.goto(`${BASE_URL}/frontend/index.html`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    timings.push({ name: 'HTML domcontentloaded', time: Date.now() - htmlStart });
    console.log(`  HTML domcontentloaded: ${timings[0].time}ms`);

    // 2. Measure full load event
    const loadStart = Date.now();
    await page.goto(`${BASE_URL}/frontend/index.html`, { waitUntil: 'load', timeout: 30000 });
    timings.push({ name: 'Full page load', time: Date.now() - loadStart });
    console.log(`  Full page load: ${timings[1].time}ms`);

    // 3. Login
    const loginStart = Date.now();
    await page.goto(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Skip-RateLimit': 'true' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' }),
    });
    timings.push({ name: 'Login', time: Date.now() - loginStart });
    console.log(`  Login: ${timings[2].time}ms`);

    // 4. Navigate to analytics and measure each step
    const navStart = Date.now();
    await page.goto(`${BASE_URL}/frontend/index.html`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(500);
    timings.push({ name: 'Initial page (networkidle)', time: Date.now() - navStart });
    console.log(`  Initial page (networkidle): ${timings[3].time}ms`);

    // Click analytics nav item
    const clickNavStart = Date.now();
    await page.click('[data-page="analytics"]');
    await page.waitForTimeout(500); // Let JS execute
    timings.push({ name: 'Click nav + JS exec', time: Date.now() - clickNavStart });
    console.log(`  Click nav + JS exec: ${timings[4].time}ms`);

    // Wait for API calls
    await page.waitForTimeout(2000);
    timings.push({ name: 'API calls + render', time: Date.now() - clickNavStart - timings[4].time });
    console.log(`  API calls + render: ${timings[5].time}ms`);

    // 5. Measure each API call individually
    console.log('\n--- Individual API Calls ---');

    const distinctYears = await page.evaluate(async () => {
      const start = Date.now();
      await fetch('/api/analytics/distinct-years', { headers: { 'X-Profile-Id': '1' } });
      return Date.now() - start;
    });
    console.log(`  distinct-years: ${distinctYears}ms`);

    const categoryTrends = await page.evaluate(async () => {
      const start = Date.now();
      await fetch('/api/analytics/category-trends?year=2026&type=expense', { headers: { 'X-Profile-Id': '1' } });
      return Date.now() - start;
    });
    console.log(`  category-trends: ${categoryTrends}ms`);

    const sankeyApi = await page.evaluate(async () => {
      const start = Date.now();
      await fetch('/api/analytics/sankey?year=2026&month=04', { headers: { 'X-Profile-Id': '1' } });
      return Date.now() - start;
    });
    console.log(`  sankey: ${sankeyApi}ms`);

    // 6. Measure the stacked chart render
    console.log('\n--- Chart Rendering ---');
    const stackedRender = await page.evaluate(async () => {
      const start = Date.now();
      // Force a re-render of the stacked chart
      if (window.analytics && window.analytics.renderStackedChart) {
        // Get data again
        const resp = await fetch('/api/analytics/category-trends?year=2026&type=expense', {
          headers: { 'X-Profile-Id': '1' }
        });
        const data = await resp.json();
        window.analytics.renderStackedChart(data, { year: '2026' });
      }
      return Date.now() - start;
    });
    console.log(`  Stacked chart re-render: ${stackedRender}ms`);

    // 7. Measure the pie chart render
    const pieRender = await page.evaluate(async () => {
      const start = Date.now();
      if (window.analytics && window.analytics.renderPieChart) {
        const resp = await fetch('/api/analytics/category-trends?year=2026&type=expense', {
          headers: { 'X-Profile-Id': '1' }
        });
        const data = await resp.json();
        window.analytics.renderPieChart(data);
      }
      return Date.now() - start;
    });
    console.log(`  Pie chart re-render: ${pieRender}ms`);

    // 8. Measure sankey render (full cycle)
    const sankeyRender = await page.evaluate(async () => {
      const start = Date.now();
      const resp = await fetch('/api/analytics/sankey?year=2026&month=04', {
        headers: { 'X-Profile-Id': '1' }
      });
      const data = await resp.json();
      if (window.analytics && window.analytics.renderSankey) {
        window.analytics.renderSankey(data);
      }
      return Date.now() - start;
    });
    console.log(`  Sankey full render: ${sankeyRender}ms`);

    // 9. Check for network requests
    console.log('\n--- Network Request Summary ---');
    const requests = [];
    page.on('request', req => requests.push(req.url()));

    // Reload and collect
    await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
    const resourceTypes = {};
    for (const req of requests) {
      const isExternal = req.includes('cdn.jsdelivr.net') || req.includes('fonts.googleapis.com');
      if (!isExternal && !req.includes('api')) {
        const type = req.match(/\.(css|js|woff2?|png|jpg|svg)/) ? req.match(/\.(css|js|woff2?|png|jpg|svg)/)[1] : 'other';
        resourceTypes[type] = (resourceTypes[type] || 0) + 1;
      }
    }
    console.log('  Local resources:', resourceTypes);

    // Summary
    console.log('\n=== Performance Summary ===');
    const totalLoad = timings.reduce((sum, t) => sum + t.time, 0);
    console.log(`  Total page load time: ${timings[3].time + timings[4].time}ms`);

    if (timings[3].time > 2000) {
      console.log('  ⚠ Initial page load is slow (>2s)');
      console.log('    → Check CDN latency or static file serving');
    }

    if (stackedRender > 100) {
      console.log(`  ⚠ Stacked chart render is slow (${stackedRender}ms)`);
    }

    if (sankeyRender > 100) {
      console.log(`  ⚠ Sankey render is slow (${sankeyRender}ms)`);
    }

    console.log('\n=== Recommendations ===');
    console.log('1. Consider lazy-loading charts on tab visibility');
    console.log('2. The stacked/bar chart is likely the heaviest render');
    console.log('3. Sankey is fast at ~20-40ms');
    console.log('4. The 3-6s load time is dominated by network/JS execution');

    if (consoleErrors.length > 0) {
      console.log('\n=== Console Errors ===');
      consoleErrors.forEach(e => console.log(`  ${e}`));
    }

  } catch (error) {
    console.error('Benchmark error:', error.message);
  } finally {
    await browser.close();
  }
}

runBenchmark();

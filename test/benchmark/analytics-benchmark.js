#!/usr/bin/env node
/**
 * Analytics Page Benchmark
 * Measures load times for the analytics page, including the sankey chart.
 *
 * Usage: node test/benchmark/analytics-benchmark.js
 */
const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:3847';
const PROFILE_ID = 1;

async function runBenchmark() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Enable console monitoring
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  // Track failed requests
  const failedRequests = [];
  page.on('requestfailed', (req) => {
    failedRequests.push(`${req.method()} ${req.url()} - ${req.failure().errorText}`);
  });

  // Collect timings
  const timings = {};

  try {
    // Step 1: Login
    console.log('\n=== Analytics Page Benchmark ===\n');
    const loginStart = Date.now();
    await page.goto(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Skip-RateLimit': 'true' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' }),
    });
    await loginResponse(loginStart, page);

    // Step 2: Navigate to analytics page
    console.log('\n--- Page Navigation: Dashboard -> Analytics ---');
    const navStart = Date.now();
    await page.goto(`${BASE_URL}/frontend/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    // Click analytics nav
    await page.click('[data-page="analytics"]');
    await page.waitForTimeout(2000);
    timings.analyticsNav = Date.now() - navStart;
    console.log(`  Analytics nav + render: ${timings.analyticsNav}ms`);

    // Wait for charts to render
    await page.waitForTimeout(3000);
    timings.fullPageLoad = Date.now() - navStart;
    console.log(`  Full page load (with charts): ${timings.fullPageLoad}ms`);

    // Step 3: Measure distinct-years API call
    console.log('\n--- API Calls ---');
    const yearsStart = Date.now();
    await page.evaluate(async () => {
      await fetch('/api/analytics/distinct-years', { headers: { 'X-Profile-Id': '1' } });
    });
    timings.distinctYears = Date.now() - yearsStart;
    console.log(`  /api/analytics/distinct-years: ${timings.distinctYears}ms`);

    // Step 4: Measure category-trends API call
    const trendsStart = Date.now();
    await page.evaluate(async () => {
      await fetch('/api/analytics/category-trends?year=2026&type=expense', { headers: { 'X-Profile-Id': '1' } });
    });
    timings.categoryTrends = Date.now() - trendsStart;
    console.log(`  /api/analytics/category-trends: ${timings.categoryTrends}ms`);

    // Step 5: Measure sankey API call (no auto-load scenario)
    console.log('\n--- Sankey Chart Benchmark ---');
    const sankeyStart = Date.now();
    await page.evaluate(async () => {
      await fetch('/api/analytics/sankey?year=2026&month=04', { headers: { 'X-Profile-Id': '1' } });
    });
    timings.sankeyApi = Date.now() - sankeyStart;
    console.log(`  /api/analytics/sankey (API only): ${timings.sankeyApi}ms`);

    // Step 6: Measure sankey render time (with D3)
    const sankeyRenderStart = Date.now();
    await page.evaluate(async () => {
      // Simulate what loadSankey() does
      const response = await fetch('/api/analytics/sankey?year=2026&month=04', {
        headers: { 'X-Profile-Id': '1' }
      });
      const data = await response.json();
      // Trigger render by calling the analytics renderSankey
      if (typeof analytics !== 'undefined' && analytics.renderSankey) {
        analytics.renderSankey(data);
      }
    });
    timings.sankeyRender = Date.now() - sankeyRenderStart;
    console.log(`  Sankey full render (API + D3): ${timings.sankeyRender}ms`);

    // Step 7: Re-render sankey to check consistency
    const sankeyReRenderStart = Date.now();
    await page.evaluate(async () => {
      const response = await fetch('/api/analytics/sankey?year=2026&month=04', {
        headers: { 'X-Profile-Id': '1' }
      });
      const data = await response.json();
      if (typeof analytics !== 'undefined' && analytics.renderSankey) {
        analytics.renderSankey(data);
      }
    });
    timings.sankeyReRender = Date.now() - sankeyReRenderStart;
    console.log(`  Sankey re-render (cached): ${timings.sankeyReRender}ms`);

    // Summary
    console.log('\n=== Summary ===');
    console.log(`  Page nav + render:         ${timings.analyticsNav}ms`);
    console.log(`  Full load (with charts):   ${timings.fullPageLoad}ms`);
    console.log(`  Distinct years API:       ${timings.distinctYears}ms`);
    console.log(`  Category trends API:      ${timings.categoryTrends}ms`);
    console.log(`  Sankey API:               ${timings.sankeyApi}ms`);
    console.log(`  Sankey full render:       ${timings.sankeyRender}ms`);
    console.log(`  Sankey re-render:         ${timings.sankeyReRender}ms`);

    // Console errors
    if (consoleErrors.length > 0) {
      console.log('\n=== Console Errors ===');
      consoleErrors.forEach((e) => console.log(`  ERROR: ${e}`));
    } else {
      console.log('\n✓ No console errors');
    }

    // Failed requests
    if (failedRequests.length > 0) {
      console.log('\n=== Failed Requests ===');
      failedRequests.forEach((r) => console.log(`  FAIL: ${r}`));
    } else {
      console.log('✓ No failed requests');
    }

    // Recommendation
    console.log('\n=== Recommendations ===');
    if (timings.analyticsNav > 3000) {
      console.log('⚠ Page load > 3s - consider lazy loading charts');
    }
    if (timings.sankeyRender > 500) {
      console.log('⚠ Sankey render > 500ms - consider on-demand rendering');
    }

    // Check if auto-load is causing issues
    console.log('\n=== Auto-load Check ===');
    const autoLoaded = await page.evaluate(() => {
      const sankeyContainer = document.getElementById('sankey-chart-container');
      return sankeyContainer ? sankeyContainer.style.display !== 'none' : false;
    });
    console.log(`  Sankey auto-loaded on page entry: ${autoLoaded ? 'YES ⚠' : 'NO ✓'}`);
    if (autoLoaded) {
      console.log('  → Consider removing auto-load on populateYears()');
    }

  } catch (error) {
    console.error('Benchmark error:', error.message);
  } finally {
    await browser.close();
  }
}

async function loginResponse(start, page) {
  const loginTime = Date.now() - start;
  console.log(`  Login: ${loginTime}ms`);
}

runBenchmark();

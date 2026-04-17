#!/usr/bin/env node
/**
 * Analytics Performance Deep Dive (v2)
 * Fixed navigation handling
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
    console.log('=== Analytics Performance Deep Dive ===\n');

    // 1. Login
    const loginResp = await page.goto(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Skip-RateLimit': 'true' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' }),
    });
    const loginOk = loginResp.ok();
    console.log(`  Login: ${loginOk ? 'OK' : 'FAILED'}`);

    // 2. Go to frontend with full load
    await page.goto(`${BASE_URL}/frontend/index.html`, { waitUntil: 'domcontentloaded' });

    // Wait for sidebar to render
    await page.waitForSelector('#sidebar', { timeout: 5000 });
    console.log('  Frontend loaded');

    // 3. Instrument analytics object
    await page.evaluate(() => {
      window.__analyticsLoadCount = 0;
      window.__analyticsLoadSankeyCount = 0;
      window.__chartCreates = 0;

      // Wait for analytics to be defined
      return new Promise((resolve) => {
        const check = () => {
          if (window.analytics) {
            // Patch load
            const origLoad = window.analytics.load?.bind(window.analytics);
            if (origLoad) {
              window.analytics.load = async function(...args) {
                window.__analyticsLoadCount++;
                return origLoad(...args);
              };
            }

            // Patch loadSankey
            const origSankey = window.analytics.loadSankey?.bind(window.analytics);
            if (origSankey) {
              window.analytics.loadSankey = async function(...args) {
                window.__analyticsLoadSankeyCount++;
                return origSankey(...args);
              };
            }

            // Patch Chart
            if (window.Chart) {
              window.__OrigChart = window.Chart;
              window.Chart = function(ctx, config) {
                window.__chartCreates++;
                return new window.__OrigChart(ctx, config);
              };
              window.Chart.prototype = window.__OrigChart.prototype;
            }

            resolve();
          } else {
            setTimeout(check, 100);
          }
        };
        check();
      });
    });
    console.log('  Instrumentation complete');

    // 4. Click analytics tab
    console.log('\n--- Clicking Analytics Tab ---');
    const navStart = Date.now();

    // First, check if analytics tab exists
    const tabExists = await page.$('[data-page="analytics"]');
    console.log(`  Tab exists: ${!!tabExists}`);

    // Click directly
    await page.click('[data-page="analytics"]');

    // Wait a bit for the JS to execute
    await page.waitForTimeout(3000);

    const navTime = Date.now() - navStart;
    console.log(`  Navigation time: ${navTime}ms`);

    // 5. Get stats
    const stats = await page.evaluate(() => ({
      loadCount: window.__analyticsLoadCount || 0,
      sankeyCount: window.__analyticsLoadSankeyCount || 0,
      chartCreates: window.__chartCreates || 0,
      pageActive: document.getElementById('page-analytics')?.classList.contains('active'),
    }));
    console.log(`  analytics.load() calls: ${stats.loadCount}`);
    console.log(`  analytics.loadSankey() calls: ${stats.sankeyCount}`);
    console.log(`  Chart creates: ${stats.chartCreates}`);
    console.log(`  Page active: ${stats.pageActive}`);

    // 6. API call timings
    console.log('\n--- API Timings ---');
    const apiTimes = await page.evaluate(async () => {
      const headers = { 'X-Profile-Id': '1' };

      const time = async (url) => {
        const s = Date.now();
        await fetch(url, { headers });
        return Date.now() - s;
      };

      return {
        distinctYears: await time('/api/analytics/distinct-years'),
        categoryTrendsYear: await time('/api/analytics/category-trends?year=2026&type=expense'),
        categoryTrendsMonth: await time('/api/analytics/category-trends?year=2026&month=04&type=expense'),
        sankey: await time('/api/analytics/sankey?year=2026&month=04'),
      };
    });

    for (const [name, ms] of Object.entries(apiTimes)) {
      console.log(`  ${name}: ${ms}ms`);
    }

    // 7. Render timings
    console.log('\n--- Render Timings ---');
    const renderTimes = await page.evaluate(async () => {
      const headers = { 'X-Profile-Id': '1' };

      const t = async (fn) => {
        const s = Date.now();
        await fn();
        return Date.now() - s;
      };

      // Get data
      const trendsResp = await fetch('/api/analytics/category-trends?year=2026&type=expense', { headers });
      const trends = await trendsResp.json();

      const sankeyResp = await fetch('/api/analytics/sankey?year=2026&month=04', { headers });
      const sankey = await sankeyResp.json();

      // Re-render stacked chart
      const stacked = await t(async () => {
        if (analytics?.renderStackedChart) analytics.renderStackedChart(trends, { year: '2026' });
      });

      // Re-render pie chart
      const pie = await t(async () => {
        if (analytics?.renderPieChart) analytics.renderPieChart(trends);
      });

      // Render sankey
      const sankeyRender = await t(async () => {
        if (analytics?.renderSankey) analytics.renderSankey(sankey);
      });

      return { stacked, pie, sankey: sankeyRender };
    });

    for (const [name, ms] of Object.entries(renderTimes)) {
      console.log(`  ${name}: ${ms}ms`);
    }

    // Summary
    console.log('\n=== Summary ===');
    const totalRender = Object.values(renderTimes).reduce((a, b) => a + b, 0);
    console.log(`  Total render time: ${totalRender}ms`);

    if (stats.loadCount > 2) console.log(`  ⚠ analytics.load() called ${stats.loadCount} times`);
    if (stats.chartCreates > 4) console.log(`  ⚠ ${stats.chartCreates} charts created`);
    if (totalRender > 500) console.log(`  ⚠ Total render > 500ms`);

    if (errors.length) {
      console.log('\n--- Errors ---');
      errors.forEach(e => console.log(`  ${e}`));
    } else {
      console.log('\n✓ No console errors');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

run();

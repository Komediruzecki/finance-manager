#!/usr/bin/env node
/**
 * Render Loop Detection + Performance Profiler
 * Detects infinite render loops and measures frame times
 */
const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:3847';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const events = [];
  const errors = [];
  let requestAnimationFrameCount = 0;
  let chartCreateCount = 0;
  let chartDestroyCount = 0;

  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
    events.push({ type: msg.type(), text: msg.text(), time: Date.now() });
  });

  page.on('requestfailed', req => {
    errors.push(`REQUEST FAILED: ${req.url()}`);
  });

  try {
    console.log('=== Render Loop Detection ===\n');

    // Login and navigate to analytics
    await page.goto(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Skip-RateLimit': 'true' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' }),
    });

    await page.goto(`${BASE_URL}/frontend/index.html`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(500);

    // Instrument the page to detect render loops
    await page.evaluate(() => {
      window.__rafCount = 0;
      window.__renderCount = 0;
      window.__chartCreates = 0;
      window.__chartDestroys = 0;
      window.__analyticsLoadCalls = 0;

      // Patch requestAnimationFrame to count frames
      const origRaf = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (cb) => {
        window.__rafCount++;
        return origRaf(cb);
      };

      // Patch analytics.load to count calls
      if (window.analytics && window.analytics.load) {
        const origLoad = window.analytics.load.bind(window.analytics);
        window.analytics.load = async (...args) => {
          window.__analyticsLoadCalls++;
          console.log(`analytics.load() called (count: ${window.__analyticsLoadCalls})`);
          return origLoad(...args);
        };
      }

      // Patch Chart constructor to count creates/destroys
      if (window.Chart) {
        const origChart = window.Chart;
        window.Chart = function(...args) {
          window.__chartCreates++;
          const chart = new origChart(...args);
          chart.__createdAt = Date.now();
          chart.__id = window.__chartCreates;
          return chart;
        };
        Object.assign(window.Chart, origChart);

        // Patch destroy
        const origDestroy = window.Chart.prototype?.destroy;
        if (origDestroy) {
          window.Chart.prototype.destroy = function() {
            window.__chartDestroys++;
            return origDestroy.call(this);
          };
        }
      }
    });

    // Navigate to analytics
    const navStart = Date.now();
    await page.click('[data-page="analytics"]');
    await page.waitForTimeout(5000); // Wait 5s to catch any loops

    const elapsed = Date.now() - navStart;
    console.log(`\n--- After 5 seconds on Analytics page ---`);

    const stats = await page.evaluate(() => ({
      rafCount: window.__rafCount,
      renderCount: window.__renderCount,
      chartCreates: window.__chartCreates,
      chartDestroys: window.__chartDestroys,
      analyticsLoadCalls: window.__analyticsLoadCalls,
    }));
    console.log(`  requestAnimationFrame calls: ${stats.rafCount}`);
    console.log(`  analytics.load() calls: ${stats.analyticsLoadCalls}`);
    console.log(`  Chart instances created: ${stats.chartCreates}`);
    console.log(`  Chart instances destroyed: ${stats.chartDestroys}`);

    // Check for loops
    console.log('\n=== Loop Detection ===');
    if (stats.rafCount > 500) {
      console.log(`  ⚠ HIGH RAF COUNT: ${stats.rafCount} - possible animation loop`);
    } else {
      console.log(`  ✓ RAF count is normal: ${stats.rafCount}`);
    }

    if (stats.chartCreates > 10) {
      console.log(`  ⚠ EXCESSIVE CHART CREATION: ${stats.chartCreates} charts created`);
    }

    if (stats.analyticsLoadCalls > 5) {
      console.log(`  ⚠ EXCESSIVE analytics.load() CALLS: ${stats.analyticsLoadCalls}`);
    }

    // Console errors
    if (errors.length > 0) {
      console.log('\n=== Errors ===');
      errors.forEach(e => console.log(`  ${e}`));
    }

    // Now test the sankey specifically
    console.log('\n=== Sankey Load Test ===');
    const sankeyErrors = [];
    await page.evaluate(async () => {
      try {
        const start = Date.now();
        const resp = await fetch('/api/analytics/sankey?year=2026&month=04', {
          headers: { 'X-Profile-Id': '1' }
        });
        const data = await resp.json();
        const apiTime = Date.now() - start;
        console.log(`Sankey API response time: ${apiTime}ms, nodes: ${data.nodes?.length || 0}`);

        if (window.analytics && window.analytics.renderSankey) {
          const renderStart = Date.now();
          window.analytics.renderSankey(data);
          console.log(`Sankey render time: ${Date.now() - renderStart}ms`);
        }
      } catch (e) {
        console.error('Sankey error:', e.message);
        sankeyErrors.push(e.message);
      }
    });

    if (sankeyErrors.length > 0) {
      console.log('  ⚠ Sankey errors:', sankeyErrors);
    }

    // Check DOM state
    const domState = await page.evaluate(() => {
      const stacked = document.getElementById('analytics-stacked-chart');
      const pie = document.getElementById('analytics-pie-chart');
      const sankey = document.getElementById('sankey-chart-container');
      return {
        stackedExists: !!stacked,
        stackedVisible: stacked ? stacked.offsetParent !== null : false,
        pieExists: !!pie,
        sankeyExists: !!sankey,
        sankeyVisible: sankey ? sankey.style.display !== 'none' : false,
        pageActive: document.getElementById('page-analytics')?.classList.contains('active'),
      };
    });
    console.log('\n=== DOM State ===');
    console.log(`  Stacked chart: ${domState.stackedExists ? 'exists' : 'MISSING'}`);
    console.log(`  Pie chart: ${domState.pieExists ? 'exists' : 'MISSING'}`);
    console.log(`  Sankey container: ${domState.sankeyExists ? 'exists' : 'MISSING'}`);
    console.log(`  Sankey visible: ${domState.sankeyVisible}`);
    console.log(`  Page active: ${domState.pageActive}`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

run();

// ==================== RETIREMENT CALCULATOR ====================
const retirement = {
  chart: null,
  _debounceTimer: null,
  currentCurrency: 'EUR',
  scheduleUpdate() {
    // Debounce input changes - recalculate 400ms after last change
    if (this._debounceTimer) clearTimeout(this._debounceTimer);
    this._debounceTimer = setTimeout(() => this.calculate(), 400);
  },
  init() {
    this.currentCurrency = settings.local_currency || 'EUR';
    this.loadEmergencyFund();
    compoundInterest.calculate();
  },
  handleCountryChange() {
    const country = document.getElementById('ret-country').value;
    const expensesInput = document.getElementById('ret-expenses-retire');
    if (country) {
      expensesInput.disabled = true;
      expensesInput.placeholder = 'Disabled when country selected';
    } else {
      expensesInput.disabled = false;
      expensesInput.placeholder = 'Leave empty if using country';
    }
    this.scheduleUpdate();
  },
  async calculate() {
    const country = document.getElementById('ret-country').value;
    const expensesAtRetirement = country
      ? null
      : parseFloat(document.getElementById('ret-expenses-retire').value) || null;
    const payload = {
      currentAge: parseInt(document.getElementById('ret-age').value) || 30,
      retirementAge: parseInt(document.getElementById('ret-age-goal').value) || 65,
      currentSavings: parseFloat(document.getElementById('ret-savings').value) || 0,
      monthlyContribution: parseFloat(document.getElementById('ret-contrib').value) || 0,
      annualExpenses: parseFloat(document.getElementById('ret-expenses').value) || 30000,
      annualReturn: parseFloat(document.getElementById('ret-return').value) || 7,
      country: country,
      expensesAtRetirement: expensesAtRetirement,
    };
    try {
      const resp = await fetch(API + '/calculator/retire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Profile-Id': profile.currentId },
        body: JSON.stringify(payload),
      });
      const result = await resp.json();
      if (result.error) {
        toast(result.error, 'error');
        return;
      }
      this.renderResults(result);
    } catch (e) {
      toast('Calculation failed: ' + e.message, 'error');
    }
  },
  async loadEmergencyFund() {
    const section = document.getElementById('emergency-fund-section');
    if (!section) return;
    try {
      const data = await api('/calculator/emergency-fund');
      const currency = this.currentCurrency;

      document.getElementById('ef-fund-subtitle').textContent =
        `Based on last ${data.monthsWithData} months of transactions`;
      document.getElementById('ef-monthly-expenses').textContent =
        formatCurrency(data.avgMonthlyExpenses, currency);
      document.getElementById('ef-current-fund').textContent =
        formatCurrency(data.totalEmergencyFund, currency);

      const list = document.getElementById('ef-coverage-list');
      list.innerHTML = (data.coverage || [])
        .map((c) => {
          const statusColor =
            c.status === 'complete'
              ? 'var(--success)'
              : c.status === 'partial'
              ? '#f59e0b'
              : 'var(--error)';
          const statusBg =
            c.status === 'complete'
              ? 'rgba(16,185,129,0.08)'
              : c.status === 'partial'
              ? 'rgba(245,158,11,0.08)'
              : 'rgba(239,68,68,0.08)';
          const statusLabel =
            c.status === 'complete'
              ? 'Funded'
              : c.status === 'partial'
              ? 'In Progress'
              : 'Not Funded';
          return `<div style="margin-bottom:16px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
              <div>
                <span style="font-weight:600;">${c.label}</span>
                <span style="font-size:12px;color:var(--text-secondary);margin-left:8px;">${c.months} months</span>
              </div>
              <div style="text-align:right;">
                <span style="font-weight:600;">${formatCurrency(c.current, currency)}</span>
                <span style="color:var(--text-secondary);font-size:12px;"> / ${formatCurrency(c.required, currency)}</span>
              </div>
            </div>
            <div style="background:var(--bg-secondary);border-radius:4px;height:8px;overflow:hidden;">
              <div style="width:${c.coveragePct}%;height:100%;background:${statusColor};border-radius:4px;transition:width .3s;"></div>
            </div>
            <div style="display:flex;justify-content:space-between;margin-top:4px;">
              <span style="font-size:12px;color:${statusColor};font-weight:500;">${statusLabel}</span>
              <span style="font-size:12px;color:var(--text-secondary);">${c.coveragePct}%</span>
            </div>
          </div>`;
        })
        .join('');
    } catch (e) {
      document.getElementById('ef-fund-subtitle').textContent =
        'Connect accounts & transactions to track your emergency fund';
      document.getElementById('emergency-fund-content').innerHTML =
        '<p style="color:var(--text-secondary);text-align:center;padding:20px;">Add savings accounts and record transactions to see your emergency fund status.</p>';
    }
  },
  renderResults(result) {
    const r = result;
    const cc = chartColors();
    const currency = this.currentCurrency;

    const resultsEl = document.getElementById('retirement-results');
    if (!resultsEl) {
      toast('Retirement results container not found', 'error');
      return;
    }

    resultsEl.style.display = 'flex';
    resultsEl.style.flexDirection = 'column';

    document.getElementById('res-fire-age').textContent = r.fireAge || '-';
    document.getElementById('res-fire-number').textContent = formatCurrency(r.fireNumber, currency);
    document.getElementById('res-months-to-fire').textContent = r.monthsToFire
      ? `${r.monthsToFire} months`
      : '-';
    document.getElementById('res-current-nw').textContent = formatCurrency(
      r.currentNWAtFire,
      currency
    );
    document.getElementById('res-traditional-age').textContent = r.traditionalRetirementAge || '-';
    document.getElementById('res-savings-at-fire').textContent = formatCurrency(
      r.savingsAtRetirement,
      currency
    );

    // Scenarios at top of right panel
    const scenariosDiv = document.getElementById('res-scenarios');
    if (scenariosDiv) {
      scenariosDiv.innerHTML = (r.scenarios || [])
        .map((s) => {
          const isReached = s.reached;
          return `<div style="background:${isReached ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)'};border-left:3px solid ${isReached ? 'var(--success)' : 'var(--error)'};padding:12px;border-radius:6px;margin-bottom:8px;">
          <div style="font-weight:600;margin-bottom:4px;">${s.name} (${s.return}% return)</div>
          <div style="font-size:13px;color:var(--text-secondary);">
            FIRE Age: <span style="color:${isReached ? 'var(--success)' : 'var(--error)'};font-weight:600;">${s.fireAge ?? '-'}</span>
            &nbsp;&bull;&nbsp;At FIRE: ${formatCurrency(s.savingsAtFire, currency)}
            &nbsp;&bull;&nbsp;${isReached ? 'Target Reached!' : 'Target Missed by ' + formatCurrency(Math.abs(s.shortfall), currency)}
          </div>
        </div>`;
        })
        .join('');
    }

    // Timeline chart
    const timeline = r.timeline || [];
    const retChart = document.getElementById('ret-chart');
    if (timeline.length === 0 || !retChart) {
      retChart &&
        (retChart.parentElement.innerHTML =
          '<p style="text-align:center;color:var(--text-secondary);padding:20px;">No timeline data available</p>');
      return;
    }
    const labels = timeline.map((t) => `${t.year} (age ${t.age})`);
    const savingsData = timeline.map((t) => t.savings);
    const fireLineData = timeline.map(() => r.fireNumber);

    const ctx = document.getElementById('ret-chart').getContext('2d');
    if (this.chart) this.chart.destroy();
    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Savings Projection',
            data: savingsData,
            borderColor: cc.primary,
            backgroundColor: cc.primaryBg,
            fill: true,
            tension: 0.3,
            borderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 5,
          },
          {
            label: `FIRE Target (${formatCurrency(r.fireNumber, currency)})`,
            data: fireLineData,
            borderColor: '#10b981',
            borderDash: [5, 5],
            borderWidth: 2,
            fill: false,
            pointRadius: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { color: cc.legend } },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${formatCurrency(ctx.raw, currency)}`,
            },
          },
        },
        scales: {
          y: {
            ticks: { callback: (v) => formatCurrency(v, currency), color: cc.text },
            grid: { color: cc.grid },
          },
          x: {
            ticks: { color: cc.text, maxTicksLimit: 12 },
            grid: { color: cc.grid },
          },
        },
      },
    });
  },
};
window.retirement = retirement;

// ==================== COMPOUND INTEREST PROJECTOR ====================
const compoundInterest = {
  chart: null,
  _debounceTimer: null,
  scheduleUpdate() {
    if (this._debounceTimer) clearTimeout(this._debounceTimer);
    this._debounceTimer = setTimeout(() => this.calculate(), 400);
  },
  async calculate() {
    const payload = {
      principal: parseFloat(document.getElementById('ci-principal').value) || 0,
      monthlyContribution: parseFloat(document.getElementById('ci-contrib').value) || 0,
      annualReturn: parseFloat(document.getElementById('ci-return').value) || 7,
      years: parseInt(document.getElementById('ci-years').value) || 10,
    };
    try {
      const resp = await fetch(API + '/calculator/compound-interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Profile-Id': profile.currentId },
        body: JSON.stringify(payload),
      });
      const data = await resp.json();
      if (data.error) { toast(data.error, 'error'); return; }
      this.render(data);
    } catch (e) {
      toast('Calculation failed: ' + e.message, 'error');
    }
  },
  render(data) {
    const currency = retirement.currentCurrency;
    const cc = chartColors();

    document.getElementById('ci-final-balance').textContent = formatCurrency(data.finalBalance, currency);
    document.getElementById('ci-total-contrib').textContent = formatCurrency(data.totalContributions, currency);
    document.getElementById('ci-total-interest').textContent = formatCurrency(data.totalInterest, currency);
    document.getElementById('ci-export-btn').style.display = '';

    // Scenario cards
    const sc = document.getElementById('ci-scenarios');
    sc.innerHTML = (data.scenarios || []).map(s =>
      `<div style="background:rgba(${s.return === 4 ? '59,130,246' : s.return === 6 ? '16,185,129' : '139,92,246'},0.08);border-left:3px solid ${s.color};padding:10px 12px;border-radius:6px;margin-bottom:6px;font-size:13px;">
        <span style="font-weight:600;">${s.name} (${s.return}%)</span>
        <span style="color:var(--text-secondary);margin-left:8px;">${formatCurrency(s.finalBalance, currency)}</span>
      </div>`
    ).join('');

    // Chart: balance, contributions, interest
    const proj = data.projection || [];
    if (this.chart) this.chart.destroy();
    const ctx = document.getElementById('ci-chart').getContext('2d');
    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: proj.map(p => `Year ${p.year}`),
        datasets: [
          {
            label: 'Total Balance',
            data: proj.map(p => p.balance),
            borderColor: cc.primary,
            backgroundColor: cc.primaryBg,
            fill: true,
            tension: 0.3,
            borderWidth: 2,
            pointRadius: 3,
          },
          {
            label: 'Contributions',
            data: proj.map(p => p.contributions),
            borderColor: '#f59e0b',
            backgroundColor: 'transparent',
            fill: false,
            tension: 0,
            borderWidth: 2,
            borderDash: [4, 4],
            pointRadius: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { font: { size: 12 }, color: cc.legend } },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${formatCurrency(ctx.raw, currency)}`,
            },
          },
        },
        scales: {
          y: {
            ticks: { callback: v => formatCurrency(v, currency), color: cc.text },
            grid: { color: cc.grid },
          },
          x: {
            ticks: { color: cc.text, maxTicksLimit: 10 },
            grid: { color: cc.grid },
          },
        },
      },
    });
  },
  exportChart() {
    const canvas = document.getElementById('ci-chart');
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = 'compound-interest-projection.png';
    a.click();
  },
};
window.compoundInterest = compoundInterest;

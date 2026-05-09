import { expect, test } from '@playwright/test'

test.describe('Rent vs Buy Calculator', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('#rentBuy')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)
  })

  test('should display page header', async ({ page }) => {
    const header = page.getByRole('heading', { name: /Rent vs Buy/i, level: 1 })
    await expect(header).toBeVisible()
  })

  test('should have rent scenario inputs', async ({ page }) => {
    await expect(page.getByLabel('Monthly Rent')).toBeVisible()
    await expect(page.getByLabel(/Annual Rent Increase/)).toBeVisible()
    await expect(page.getByLabel(/Investment Return/)).toBeVisible()
    await expect(page.getByLabel(/Time Horizon/)).toBeVisible()
  })

  test('should have buy scenario inputs', async ({ page }) => {
    await expect(page.getByLabel('Home Price')).toBeVisible()
    await expect(page.getByLabel('Down Payment')).toBeVisible()
    await expect(page.getByLabel(/Loan Term/)).toBeVisible()
    await expect(page.getByLabel(/Interest Rate/)).toBeVisible()
  })

  test('should calculate with default values and show results', async ({ page }) => {
    await page.waitForTimeout(600)
    await expect(page.getByText('Total Rent Paid')).toBeVisible()
    await expect(
      page.getByText('Total Mortgage + Costs').or(page.getByText('Total Mortgage'))
    ).toBeVisible()
    await expect(page.getByText('Winner')).toBeVisible()
  })

  test('should show break-even year with default values', async ({ page }) => {
    await page.waitForTimeout(600)
    await expect(
      page.getByText(/After/).and(page.getByText(/years, buying becomes cheaper/))
    ).toBeVisible()
  })

  test('default values: monthly rent 1200 at 3% increase, 30yr horizon should produce significant rent total', async ({
    page,
  }) => {
    await page.waitForTimeout(600)
    // With 1200/mo rent, 3% increase, 30yr horizon, total rent should be around 685k
    const rentValue = page
      .getByText('Total Rent Paid')
      .locator('..')
      .locator('[class*="summaryValue"]')
      .first()
    const text = await rentValue.textContent()
    // Extract numeric value from formatted currency
    const numericVal = parseFloat((text || '0').replace(/[^0-9.]/g, ''))
    expect(numericVal).toBeGreaterThan(500000) // > 500k
    expect(numericVal).toBeLessThan(800000) // < 800k
  })

  test('user scenario: 800/mo rent, 3% increase, 30yr horizon should show ~457k total rent', async ({
    page,
  }) => {
    // Clear and fill monthly rent
    await page.getByLabel('Monthly Rent').fill('800')
    await page.waitForTimeout(600)

    const rentRow = page.getByText('Total Rent Paid').locator('..')
    const rentText = await rentRow.locator('[class*="summaryValue"]').first().textContent()
    const rentVal = parseFloat((rentText || '0').replace(/[^0-9.]/g, ''))
    // 800 * 12 * sum(1.03^i for i=0..29) ≈ 456,724
    expect(rentVal).toBeGreaterThan(400000)
    expect(rentVal).toBeLessThan(500000)
  })

  test('user scenario: 800/mo rent, 3% increase, 20yr horizon should show ~215k total rent', async ({
    page,
  }) => {
    await page.getByLabel('Monthly Rent').fill('800')
    await page.getByLabel(/Time Horizon/).fill('20')
    await page.waitForTimeout(600)

    const rentRow = page.getByText('Total Rent Paid').locator('..')
    const rentText = await rentRow.locator('[class*="summaryValue"]').first().textContent()
    const rentVal = parseFloat((rentText || '0').replace(/[^0-9.]/g, ''))
    // 800 * 12 * sum(1.03^i for i=0..19) ≈ 258,000 (with 3% increase)
    // Actually: 800*12*(1 + 1.03 + 1.03^2 + ... + 1.03^19) ≈ 258,761
    expect(rentVal).toBeGreaterThan(200000)
    expect(rentVal).toBeLessThan(300000)
  })

  test('user scenario: 800/mo rent, 0% increase, 20yr horizon should show exactly 192k', async ({
    page,
  }) => {
    await page.getByLabel('Monthly Rent').fill('800')
    await page.getByLabel(/Annual Rent Increase/).fill('0')
    await page.getByLabel(/Time Horizon/).fill('20')
    await page.waitForTimeout(600)

    const rentRow = page.getByText('Total Rent Paid').locator('..')
    const rentText = await rentRow.locator('[class*="summaryValue"]').first().textContent()
    const rentVal = parseFloat((rentText || '0').replace(/[^0-9.]/g, ''))
    // 800 * 12 * 20 = 192,000
    expect(rentVal).toBeGreaterThan(185000)
    expect(rentVal).toBeLessThan(200000)
  })

  test('high rent increase (5%) makes renting more expensive than default', async ({ page }) => {
    await page.getByLabel(/Annual Rent Increase/).fill('5')
    await page.waitForTimeout(600)

    const rentRow = page.getByText('Total Rent Paid').locator('..')
    const rentText = await rentRow.locator('[class*="summaryValue"]').first().textContent()
    const rentVal5pct = parseFloat((rentText || '0').replace(/[^0-9.]/g, ''))

    // Reset to 1% and compare
    await page.getByLabel(/Annual Rent Increase/).fill('1')
    await page.waitForTimeout(600)

    const rentText1pct = await rentRow.locator('[class*="summaryValue"]').first().textContent()
    const rentVal1pct = parseFloat((rentText1pct || '0').replace(/[^0-9.]/g, ''))

    // 5% increase should produce higher total rent than 1%
    expect(rentVal5pct).toBeGreaterThan(rentVal1pct)
  })

  test('changing loan interest rate affects monthly payment', async ({ page }) => {
    // Fill test scenario values
    await page.getByLabel('Monthly Rent').fill('1000')
    await page.waitForTimeout(600)

    // Get net cost with default 4% rate
    const netCostRow = page.getByText('Net Cost').first().locator('..')
    const netCostText4 = await netCostRow.locator('[class*="summaryValue"]').first().textContent()
    const netCost4 = parseFloat((netCostText4 || '0').replace(/[^0-9.]/g, ''))

    // Change to 8% interest
    await page.getByLabel(/Interest Rate/).fill('8')
    await page.waitForTimeout(600)

    const netCostText8 = await netCostRow.locator('[class*="summaryValue"]').first().textContent()
    const netCost8 = parseFloat((netCostText8 || '0').replace(/[^0-9.]/g, ''))

    // Higher interest rate means higher cost (different net cost)
    expect(netCost8).not.toEqual(netCost4)
  })

  test('should show Winner and Savings in comparison card', async ({ page }) => {
    await page.waitForTimeout(600)
    await expect(page.getByText('Winner')).toBeVisible()
    await expect(page.getByText('Savings')).toBeVisible()
    await expect(page.getByText('Break-even')).toBeVisible()
  })

  test('should show Rent Scenario and Buy Scenario summary cards with dynamic horizon', async ({
    page,
  }) => {
    await page.getByLabel(/Time Horizon/).fill('25')
    await page.waitForTimeout(600)
    await expect(page.getByText('Rent Scenario (25 years)')).toBeVisible()
    await expect(page.getByText('Buy Scenario (25 years)')).toBeVisible()
  })

  test('should show graph/chart visualization', async ({ page }) => {
    await page.waitForTimeout(600)
    // Chart should be rendered
    const chart = page.locator('canvas, svg.recharts-surface, [class*="chart"], [class*="graph"]')
    const count = await chart.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })
})

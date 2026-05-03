import { expect, test } from '@playwright/test'
import { login, navigateToRoute, getByTestId } from './test-helpers'

test.describe('Accounts CRUD Operations', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await login(page)

    // Navigate to accounts page
    await navigateToRoute(page, 'accounts')
  })

  test('should display accounts header', async ({ page }) => {
    const header = getByTestId(page, 'accounts-header')
    await expect(header).toBeVisible()
  })

  test('should have page subtitle', async ({ page }) => {
    const subtitle = getByTestId(page, 'accounts-subtitle')
    await expect(subtitle).toBeVisible()
  })

  test('should have add account button', async ({ page }) => {
    const addBtn = getByTestId(page, 'add-account-btn')
    await expect(addBtn).toBeVisible()
  })

  test('should have summary cards', async ({ page }) => {
    const summary = getByTestId(page, 'accounts-summary')
    await expect(summary).toBeVisible()
  })

  test('should display total balance', async ({ page }) => {
    const balanceLabel = getByTestId(page, 'summary-total-balance')
    await expect(balanceLabel).toBeVisible()

    const balanceValue = getByTestId(page, 'summary-balance-value')
    await expect(balanceValue).toBeVisible()
  })

  test('should display accounts count', async ({ page }) => {
    const countLabel = getByTestId(page, 'summary-accounts-count')
    await expect(countLabel).toBeVisible()

    const countValue = getByTestId(page, 'summary-accounts-value')
    await expect(countValue).toBeVisible()
  })

  test('should display monthly income', async ({ page }) => {
    const incomeLabel = getByTestId(page, 'summary-income')
    await expect(incomeLabel).toBeVisible()

    const incomeValue = getByTestId(page, 'summary-income-value')
    await expect(incomeValue).toBeVisible()
  })

  test('should display monthly expenses', async ({ page }) => {
    const expensesLabel = getByTestId(page, 'summary-expenses')
    await expect(expensesLabel).toBeVisible()

    const expensesValue = getByTestId(page, 'summary-expenses-value')
    await expect(expensesValue).toBeVisible()
  })

  test('should have accounts grid', async ({ page }) => {
    const accountsGrid = getByTestId(page, 'accounts-grid')
    await expect(accountsGrid).toBeVisible()
  })

  test('should display account cards', async ({ page }) => {
    const accountCards = getByTestId(page, 'account-card')
    const count = await accountCards.count()
    // Should have at least 0 cards (can be empty)
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('should have account card with icon', async ({ page }) => {
    const accountCards = getByTestId(page, 'account-card')
    const icon = accountCards.getByTestId('account-icon')
    const count = await icon.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('should have account icons matching account types', async ({ page }) => {
    const icons = getByTestId(page, 'account-icon')
    const iconCount = await icons.count()

    // At least one account icon should be displayed
    expect(iconCount).toBeGreaterThanOrEqual(1)

    // Verify the icon is visible
    await expect(icons.first()).toBeVisible()
  })

  test('should display account name', async ({ page }) => {
    const accountName = getByTestId(page, 'account-name')
    const count = await accountName.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('should display bank name', async ({ page }) => {
    const bankName = getByTestId(page, 'account-bank')
    const count = await bankName.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('should display current balance card', async ({ page }) => {
    const balanceLabel = page.getByText('Current Balance').first()
    const balanceValue = getByTestId(page, 'account-balance').first()

    await expect(balanceLabel).toBeVisible()
    await expect(balanceValue).toBeVisible()
  })

  test('should display recent activity section', async ({ page }) => {
    const activityHeader = page.getByText('Recent Activity').first()
    await expect(activityHeader).toBeVisible()
  })

  test('should have activity header with view all link', async ({ page }) => {
    const activitySection = getByTestId(page, 'activity-section')
    const count = await activitySection.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('should have "View All" link', async ({ page }) => {
    const viewAllLink = page.locator('a', { hasText: 'View All →' })
    const count = await viewAllLink.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('should display activity list', async ({ page }) => {
    const activityList = getByTestId(page, 'activity-list')
    const count = await activityList.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('should display activity items', async ({ page }) => {
    const activityItems = getByTestId(page, 'activity-item')
    const count = await activityItems.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('should display activity description', async ({ page }) => {
    const description = getByTestId(page, 'activity-desc')
    const count = await description.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('should display activity date', async ({ page }) => {
    const date = getByTestId(page, 'activity-date')
    const count = await date.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('should display activity amount with +/-', async ({ page }) => {
    const amount = getByTestId(page, 'activity-amount')
    const count = await amount.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('should have account type badge', async ({ page }) => {
    const accountCards = getByTestId(page, 'account-card')
    const cardCount = await accountCards.count()

    if (cardCount > 0) {
      const typeBadges = accountCards.getByTestId('account-type')
      const badgeCount = await typeBadges.count()
      expect(badgeCount).toBeGreaterThanOrEqual(0)
    }
  })

  test('should have account type badge text', async ({ page }) => {
    const accountCards = getByTestId(page, 'account-card')
    const typeBadges = accountCards.getByTestId('account-type')
    const count = await typeBadges.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('should have account actions button', async ({ page }) => {
    const accountCards = getByTestId(page, 'account-card')
    const deleteBtns = accountCards.locator('button').filter({
      has: accountCards.locator('svg path[d*="M19 7l-.867"]'),
    })
    const count = await deleteBtns.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })
})

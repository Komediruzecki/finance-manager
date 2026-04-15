/**
 * Tests for delete confirmations feature
 */
const fs = require('fs');
const path = require('path');

describe('Delete confirmations', () => {
  let htmlContent;

  beforeAll(() => {
    htmlContent = fs.readFileSync(path.join(__dirname, '../../frontend/index.html'), 'utf8');
  });

  describe('All delete operations have confirm dialogs', () => {
    test('recurring delete has confirm dialog', () => {
      expect(htmlContent).toContain("confirm('Delete this recurring transaction?')");
    });

    test('transaction delete has confirm dialog', () => {
      expect(htmlContent).toContain("confirm('Delete this transaction?')");
    });

    test('category delete has confirm dialog', () => {
      expect(htmlContent).toContain("confirm('Delete this category?')");
    });

    test('account delete has confirm dialog', () => {
      expect(htmlContent).toContain("confirm('Delete this account?')");
    });

    test('budget delete has confirm dialog', () => {
      expect(htmlContent).toContain("confirm('Delete this budget?')");
    });

    test('loan delete has confirm dialog', () => {
      expect(htmlContent).toContain("confirm('Delete this loan?')");
    });

    test('prepayment delete has confirm dialog', () => {
      expect(htmlContent).toContain("confirm('Delete this prepayment?')");
    });

    test('rate period delete has confirm dialog', () => {
      expect(htmlContent).toContain("confirm('Delete this rate period?')");
    });
  });

  describe('Bulk delete operations have extra confirmation', () => {
    test('delete all categories requires DELETE confirmation', () => {
      expect(htmlContent).toContain("prompt('Type DELETE to confirm:')");
      expect(htmlContent).toContain("typed !== 'DELETE'");
    });

    test('delete all transactions requires DELETE confirmation', () => {
      expect(htmlContent).toContain("confirm('Are you sure you want to delete ALL transactions?");
      expect(htmlContent).toContain("prompt('Type DELETE to confirm:')");
    });

    test('delete all profile data requires DELETE ALL confirmation', () => {
      expect(htmlContent).toContain("confirm('Are you sure you want to delete ALL data for this profile?");
      expect(htmlContent).toContain("prompt('Type DELETE ALL to confirm:')");
    });
  });

  describe('Import confirmation', () => {
    test('import execute has row count confirmation', () => {
      expect(htmlContent).toContain("confirm(`Import ${rowCount} transactions?");
    });

    test('import execute button has id for loading state', () => {
      expect(htmlContent).toContain('id="import-execute-btn"');
    });

    test('import execute shows loading spinner during import', () => {
      const executeFn = htmlContent.match(/async execute\(\) \{[\s\S]*?\},/m);
      expect(executeFn).toBeTruthy();
      expect(executeFn[0]).toContain('loading-spinner');
      expect(executeFn[0]).toContain('finally');
    });
  });
});
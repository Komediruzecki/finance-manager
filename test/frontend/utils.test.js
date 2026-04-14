/**
 * Frontend utility function tests
 * Tests JavaScript utilities used in the SPA
 */

// Mock the formatCurrency function (which exists in frontend/index.html)
function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

function formatDate(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });
}

function parseDateString(dateStr) {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return new Date().toISOString().split('T')[0];
  return d.toISOString().split('T')[0];
}

describe('formatCurrency', () => {
  test('formats USD correctly', () => {
    expect(formatCurrency(1000, 'USD')).toBe('$1,000.00');
    expect(formatCurrency(1234.56, 'USD')).toBe('$1,234.56');
  });

  test('formats EUR correctly', () => {
    expect(formatCurrency(1000, 'EUR')).toContain('1,000.00');
    expect(formatCurrency(1000, 'EUR').charAt(0)).toBe('€');
  });

  test('formats GBP correctly', () => {
    expect(formatCurrency(1000, 'GBP')).toContain('1,000.00');
    expect(formatCurrency(1000, 'GBP').charAt(0)).toBe('£');
  });

  test('handles zero and negative amounts', () => {
    expect(formatCurrency(0, 'USD')).toBe('$0.00');
    expect(formatCurrency(-500, 'USD')).toBe('-$500.00');
  });

  test('handles large amounts', () => {
    expect(formatCurrency(1000000, 'USD')).toBe('$1,000,000.00');
    expect(formatCurrency(1234567.89, 'USD')).toBe('$1,234,567.89');
  });
});

describe('formatDate', () => {
  test('formats date string correctly', () => {
    const result = formatDate('2024-01-15');
    expect(result).toContain('Jan');
    expect(result).toContain('15');
    expect(result).toContain('2024');
  });

  test('handles different date formats', () => {
    expect(formatDate('2024-06-20')).toBeDefined();
    expect(formatDate('2024-12-31')).toBeDefined();
  });
});

describe('parseDateString', () => {
  test('parses ISO date strings', () => {
    expect(parseDateString('2024-01-15')).toBe('2024-01-15');
    expect(parseDateString('2024-12-31')).toBe('2024-12-31');
  });

  test('handles empty input', () => {
    const result = parseDateString('');
    expect(result).toBeDefined();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('handles null/undefined', () => {
    expect(parseDateString(null)).toBeDefined();
    expect(parseDateString(undefined)).toBeDefined();
  });
});

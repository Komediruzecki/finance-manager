/**
 * Unit tests for loanCalculator.js
 */
const {
  calcMonthlyPayment,
  calculateSchedule,
  calculateScheduleNoPrepayments,
  totalInterest,
  totalPaid,
  payoffDate,
  interestSaved,
  monthsSaved,
  getSummary
} = require('../../backend/models/loanCalculator');

describe('loanCalculator', () => {
  describe('calcMonthlyPayment', () => {
    test('calculates correct monthly payment for standard loan', () => {
      const payment = calcMonthlyPayment(100000, 5, 360);
      expect(payment).toBeCloseTo(536.82, 1);
    });

    test('calculates correct monthly payment for short-term loan', () => {
      const payment = calcMonthlyPayment(10000, 6, 12);
      expect(payment).toBeCloseTo(860.66, 1);
    });

    test('handles zero interest rate', () => {
      const payment = calcMonthlyPayment(12000, 0, 12);
      expect(payment).toBeCloseTo(1000, 2);
    });

    test('handles high interest rate edge case', () => {
      const payment = calcMonthlyPayment(1000, 100, 12);
      expect(payment).toBeGreaterThan(0);
    });
  });

  describe('calculateSchedule', () => {
    test('generates correct number of payments for standard loan', () => {
      const schedule = calculateSchedule(
        10000, '2024-01-01', 12,
        [{ rate: 6, start_month: 1, end_month: null }],
        []
      );
      expect(schedule.length).toBe(12);
    });

    test('balance reaches zero at end of schedule', () => {
      const schedule = calculateSchedule(
        10000, '2024-01-01', 12,
        [{ rate: 6, start_month: 1, end_month: null }],
        []
      );
      const lastPayment = schedule[schedule.length - 1];
      expect(lastPayment.balance).toBeCloseTo(0, 1);
    });

    test('handles prepayment reducing total interest', () => {
      const scheduleNoPrepay = calculateSchedule(
        10000, '2024-01-01', 24,
        [{ rate: 5, start_month: 1, end_month: null }],
        []
      );
      const scheduleWithPrepay = calculateSchedule(
        10000, '2024-01-01', 24,
        [{ rate: 5, start_month: 1, end_month: null }],
        [{ month: 6, amount: 2000, note: 'Early payoff' }]
      );

      expect(totalInterest(scheduleWithPrepay)).toBeLessThan(totalInterest(scheduleNoPrepay));
    });

    test('handles variable rate periods', () => {
      const schedule = calculateSchedule(
        50000, '2024-01-01', 60,
        [
          { rate: 5, start_month: 1, end_month: 12 },
          { rate: 6, start_month: 13, end_month: 36 },
          { rate: 7, start_month: 37, end_month: null }
        ],
        []
      );

      expect(schedule.length).toBeGreaterThan(0);
      const period1 = schedule.find(r => r.month === 6);
      const period2 = schedule.find(r => r.month === 24);
      const period3 = schedule.find(r => r.month === 48);

      expect(period1.rate).toBe(5);
      expect(period2.rate).toBe(6);
      expect(period3.rate).toBe(7);
    });

    test('dates are calculated correctly', () => {
      const schedule = calculateSchedule(
        10000, '2024-01-15', 12,
        [{ rate: 6, start_month: 1, end_month: null }],
        []
      );
      expect(schedule[0].date).toBe('2024-01-15');
      expect(schedule[1].date).toBe('2024-02-15');
      expect(schedule[11].date).toBe('2024-12-15');
    });
  });

  describe('totalInterest', () => {
    test('calculates total interest correctly', () => {
      const schedule = calculateSchedule(
        10000, '2024-01-01', 12,
        [{ rate: 6, start_month: 1, end_month: null }],
        []
      );
      const interest = totalInterest(schedule);
      expect(interest).toBeGreaterThan(0);
      expect(interest).toBeLessThan(1000);
    });

    test('returns 0 for empty schedule', () => {
      expect(totalInterest([])).toBe(0);
    });
  });

  describe('payoffDate', () => {
    test('returns date of last payment', () => {
      const schedule = calculateSchedule(
        10000, '2024-01-01', 12,
        [{ rate: 6, start_month: 1, end_month: null }],
        []
      );
      expect(payoffDate(schedule)).toBe('2024-12-01');
    });

    test('returns null for empty schedule', () => {
      expect(payoffDate([])).toBeNull();
    });
  });

  describe('interestSaved', () => {
    test('calculates interest saved from prepayments', () => {
      const scheduleOriginal = calculateSchedule(
        10000, '2024-01-01', 24,
        [{ rate: 5, start_month: 1, end_month: null }],
        []
      );
      const schedulePrepaid = calculateSchedule(
        10000, '2024-01-01', 24,
        [{ rate: 5, start_month: 1, end_month: null }],
        [{ month: 6, amount: 2000, note: 'Prepayment' }]
      );

      const saved = interestSaved(scheduleOriginal, schedulePrepaid);
      expect(saved).toBeGreaterThan(0);
    });
  });

  describe('monthsSaved', () => {
    test('calculates months saved from prepayments', () => {
      const scheduleOriginal = calculateSchedule(
        10000, '2024-01-01', 24,
        [{ rate: 5, start_month: 1, end_month: null }],
        []
      );
      const schedulePrepaid = calculateSchedule(
        10000, '2024-01-01', 24,
        [{ rate: 5, start_month: 1, end_month: null }],
        [{ month: 6, amount: 3000, note: 'Large prepayment' }]
      );

      const saved = monthsSaved(scheduleOriginal, schedulePrepaid);
      expect(saved).toBeGreaterThan(0);
    });
  });

  describe('getSummary', () => {
    test('returns complete summary with all expected fields', () => {
      const schedule = calculateSchedule(
        10000, '2024-01-01', 12,
        [{ rate: 6, start_month: 1, end_month: null }],
        []
      );
      const summary = getSummary(schedule, schedule);

      expect(summary).toHaveProperty('totalPaid');
      expect(summary).toHaveProperty('totalInterest');
      expect(summary).toHaveProperty('interestSaved');
      expect(summary).toHaveProperty('monthsSaved');
      expect(summary).toHaveProperty('payoffDate');
      expect(summary).toHaveProperty('totalPayments');
      expect(summary).toHaveProperty('avgMonthlyPayment');
      expect(summary).toHaveProperty('maxBalance');
    });

    test('calculates interestSaved and monthsSaved correctly', () => {
      const scheduleNoPrepay = calculateSchedule(
        10000, '2024-01-01', 24,
        [{ rate: 5, start_month: 1, end_month: null }],
        []
      );
      const scheduleWithPrepay = calculateSchedule(
        10000, '2024-01-01', 24,
        [{ rate: 5, start_month: 1, end_month: null }],
        [{ month: 6, amount: 2000, note: 'Prepayment' }]
      );

      const summary = getSummary(scheduleWithPrepay, scheduleNoPrepay);
      expect(summary.interestSaved).toBeGreaterThan(0);
      expect(summary.monthsSaved).toBeGreaterThanOrEqual(0);
    });
  });
});

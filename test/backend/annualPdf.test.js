/**
 * Tests for Annual Financial Report PDF API
 */
const request = require('supertest');

const BASE_URL = 'http://localhost:3847';

describe('Annual Financial Report PDF API', () => {
  describe('POST /api/reports/annual-pdf', () => {
    test('returns PDF content-type with valid year', async () => {
      const resp = await request(BASE_URL)
        .post('/api/reports/annual-pdf')
        .send({ year: 2026 });

      expect(resp.status).toBe(200);
      expect(resp.headers['content-type']).toContain('application/pdf');
      expect(resp.headers['content-disposition']).toContain('attachment');
      expect(resp.headers['content-disposition']).toContain('annual-report-2026.pdf');
      expect(Buffer.isBuffer(resp.body)).toBe(true);
      expect(resp.body.length).toBeGreaterThan(0);
    });

    test('PDF starts with valid PDF header', async () => {
      const resp = await request(BASE_URL)
        .post('/api/reports/annual-pdf')
        .send({ year: 2026 });

      expect(resp.status).toBe(200);
      const header = resp.body.slice(0, 4).toString('utf8');
      expect(header).toBe('%PDF');
    });

    test('returns PDF even with no transactions for the year', async () => {
      const resp = await request(BASE_URL)
        .post('/api/reports/annual-pdf')
        .send({ year: 2020 });

      expect(resp.status).toBe(200);
      expect(resp.headers['content-type']).toContain('application/pdf');
      const header = resp.body.slice(0, 4).toString('utf8');
      expect(header).toBe('%PDF');
    });

    test('returns 400 when year is missing', async () => {
      const resp = await request(BASE_URL)
        .post('/api/reports/annual-pdf')
        .send({});

      expect(resp.status).toBe(400);
      expect(resp.body).toHaveProperty('error');
    });

    test('returns 400 when year is invalid format', async () => {
      const resp = await request(BASE_URL)
        .post('/api/reports/annual-pdf')
        .send({ year: 'abc' });

      expect(resp.status).toBe(400);
      expect(resp.body).toHaveProperty('error');
    });

    test('returns 400 when year is empty string', async () => {
      const resp = await request(BASE_URL)
        .post('/api/reports/annual-pdf')
        .send({ year: '' });

      expect(resp.status).toBe(400);
    });

    test('returns PDF when year is numeric', async () => {
      const resp = await request(BASE_URL)
        .post('/api/reports/annual-pdf')
        .send({ year: 2026 });

      expect(resp.status).toBe(200);
      expect(resp.headers['content-type']).toContain('application/pdf');
    });

    test('accepts chart data without crashing', async () => {
      const fakeChart = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const resp = await request(BASE_URL)
        .post('/api/reports/annual-pdf')
        .send({ year: 2026, charts: { category: fakeChart, monthly: fakeChart, cashflow: fakeChart } });

      expect(resp.status).toBe(200);
      expect(resp.headers['content-type']).toContain('application/pdf');
    });
  });
});

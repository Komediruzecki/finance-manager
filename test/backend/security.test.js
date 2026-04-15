/**
 * Tests for security improvements
 */
const fs = require('fs');
const path = require('path');

describe('Security', () => {
  let backendContent;

  beforeAll(() => {
    backendContent = fs.readFileSync(path.join(__dirname, '../../backend/index.js'), 'utf8');
  });

  describe('Session secret configuration', () => {
    test('session secret reads from SESSION_SECRET environment variable', () => {
      // Should use process.env.SESSION_SECRET
      expect(backendContent).toContain('process.env.SESSION_SECRET');
    });

    test('hardcoded fallback secret has been removed', () => {
      // The insecure fallback "finance-manager-secret-key-change-in-production" should be gone
      expect(backendContent).not.toContain('finance-manager-secret-key-change-in-production');
    });

    test('generates random fallback when SESSION_SECRET not set', () => {
      // Should have crypto.randomBytes fallback
      expect(backendContent).toContain("require('crypto').randomBytes(32).toString('hex')");
    });

    test('warns when using auto-generated secret', () => {
      // Should log a warning when using random secret (not env var)
      expect(backendContent).toContain("console.warn('WARNING:");
    });
  });
});
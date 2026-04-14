// Jest setup for finance-manager tests
// Suppress console output during tests unless there's a failure
if (process.env.NODE_ENV === 'test') {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}

// Set up test environment
process.env.NODE_ENV = 'test';

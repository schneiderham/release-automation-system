// Test setup file for Jest

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn()
};

// Mock @actions/core
jest.mock('@actions/core', () => ({
  setOutput: jest.fn(),
  setFailed: jest.fn(),
  info: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

// Mock googleapis
jest.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: jest.fn().mockImplementation(() => ({
        setCredentials: jest.fn(),
        getAccessToken: jest.fn().mockResolvedValue({ token: 'mock-token' })
      }))
    },
    gmail: jest.fn().mockReturnValue({
      users: {
        messages: {
          send: jest.fn().mockResolvedValue({
            data: {
              id: 'mock-message-id',
              threadId: 'mock-thread-id'
            }
          })
        },
        getProfile: jest.fn().mockResolvedValue({
          data: {
            emailAddress: 'test@pde.com'
          }
        })
      }
    }),
    drive: jest.fn().mockReturnValue({
      files: {
        get: jest.fn().mockResolvedValue({
          data: {
            id: 'mock-file-id',
            name: 'mock-file-name'
          }
        })
      }
    })
  }
}));

// Mock axios
jest.mock('axios', () => ({
  create: jest.fn().mockReturnValue({
    get: jest.fn().mockResolvedValue({
      data: {
        emailAddress: 'test@pde.com',
        displayName: 'Test User'
      }
    }),
    post: jest.fn().mockResolvedValue({
      data: {
        id: 'mock-comment-id',
        created: '2024-01-15T10:30:00.000+0000'
      }
    })
  }),
  post: jest.fn().mockResolvedValue({
    status: 200,
    data: {
      name: 'spaces/mock-space-id/messages/mock-message-id'
    }
  })
}));

// Mock other dependencies
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({
      messageId: 'mock-message-id'
    })
  })
}));

jest.mock('marked', () => ({
  parse: jest.fn().mockImplementation((text) => `<p>${text}</p>`),
  setOptions: jest.fn()
}));

jest.mock('cheerio', () => ({
  load: jest.fn().mockReturnValue({
    html: jest.fn().mockReturnValue('<mock-html>'),
    addClass: jest.fn().mockReturnThis(),
    replaceWith: jest.fn().mockReturnThis(),
    each: jest.fn().mockImplementation(function(callback) {
      callback.call(this);
      return this;
    })
  })
}));

// Set up test environment variables
process.env.NODE_ENV = 'test';

// Global test utilities
global.testUtils = {
  // Helper to create mock release data
  createMockRelease: (overrides = {}) => ({
    title: 'Test Release',
    body: '## Business Impact\nTest impact\n\n## Technical Changes\nTest changes',
    tag: 'v1.0.0',
    url: 'https://github.com/test/repo/releases/tag/v1.0.0',
    ...overrides
  }),
  
  // Helper to set environment variables for testing
  setTestEnv: (vars = {}) => {
    Object.entries(vars).forEach(([key, value]) => {
      process.env[key] = value;
    });
  },
  
  // Helper to clear environment variables
  clearTestEnv: (keys = []) => {
    keys.forEach(key => {
      delete process.env[key];
    });
  }
}; 
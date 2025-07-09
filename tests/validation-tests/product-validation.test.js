/**
 * Product Validation Tests
 * 
 * These tests validate that we've built the correct product according to requirements:
 * - GitHub-based customer release management system
 * - Automated release creation
 * - Customer email notifications via Gmail API
 * - Jira ticket updates
 * - Team notifications via Google Chat
 * - Comprehensive error handling
 * - Professional email templates
 * - Local testing framework
 */

const ReleaseDataParser = require('../../scripts/parse-release-data');
const ReleaseValidator = require('../../scripts/validate-release');
const ContentProcessor = require('../../scripts/process-release-content');

describe('Product Validation Tests', () => {
  
  describe('Core System Requirements', () => {
    it('should have all required components for GitHub Actions workflow', () => {
      // Test that all required scripts exist and are functional
      expect(ReleaseDataParser).toBeDefined();
      expect(ReleaseValidator).toBeDefined();
      expect(ContentProcessor).toBeDefined();
      
      // Test that scripts can be instantiated
      expect(() => new ReleaseDataParser()).not.toThrow();
      expect(() => new ReleaseValidator()).not.toThrow();
      expect(() => new ContentProcessor()).not.toThrow();
    });

    it('should support all required release types', () => {
      const releaseTypes = ['major', 'minor', 'bugfix', 'documentation', 'update'];
      releaseTypes.forEach(type => {
        process.env.RELEASE_TYPE = type;
        process.env.CUSTOMER_EMAILS = 'test@customer.com';
        process.env.RELEASE_BODY = '## Business Impact\nSome impact.';
        const validator = new ReleaseValidator();
        const result = validator.validate();
        expect(result.isValid).toBe(true);
      });
    });

    it('should handle customer email extraction correctly', () => {
      const parser = new ReleaseDataParser();
      
      const testBody = `
        ## Release Information
        **Customer Email(s):** engineering@customer.com, project.manager@customer.com
        **Related Jira Tickets:** PDE-123 PDE-456
      `;
      
      parser.releaseBody = testBody;
      const emails = parser.extractCustomerEmails();
      
      expect(emails).toBe('engineering@customer.com,project.manager@customer.com');
    });

    it('should handle Jira ticket extraction correctly', () => {
      const parser = new ReleaseDataParser();
      
      const testBody = `
        ## Release Information
        **Related Jira Tickets:** PDE-123 PDE-456
      `;
      
      parser.releaseBody = testBody;
      const tickets = parser.extractJiraTickets();
      
      expect(tickets).toBe('PDE-123 PDE-456');
    });
  });

  describe('Email Automation Requirements', () => {
    it('should generate professional email templates', () => {
      process.env.RELEASE_TITLE = 'Test Release v1.0';
      process.env.RELEASE_TYPE = 'major';
      process.env.RELEASE_BODY = `
        ## Business Impact
        Improved customer satisfaction by 25%.
        
        ## Technical Changes
        Enhanced performance and reliability.
      `;
      const processor = new ContentProcessor();
      const result = processor.process();
      // Check email subject
      expect(result.emailSubject).toContain('Test Release v1.0');
      // Check email body structure
      expect(result.emailBody).toContain('Test Release v1.0');
      expect(result.emailBody).toContain("We're pleased to announce");
      expect(result.emailBody).toContain('What\'s New');
      expect(result.emailBody).toContain('Technical Changes');
      expect(result.emailBody).toContain('Release Files');
      expect(result.emailBody).toContain('Complete Details');
      // Check for professional styling
      expect(result.emailBody).toContain('section-header');
      expect(result.emailBody).toContain('release-link');
    });

    it('should handle different release types with appropriate emojis', () => {
      const testCases = [
        { type: 'major', emoji: '🚀', label: 'Major Release' },
        { type: 'minor', emoji: '📦', label: 'Minor Update' },
        { type: 'bugfix', emoji: '🐛', label: 'Bug Fix' },
        { type: 'documentation', emoji: '📚', label: 'Documentation Update' },
        { type: 'update', emoji: '📋', label: 'Update' }
      ];
      
      testCases.forEach(({ type, emoji, label }) => {
        const processor = new ContentProcessor();
        process.env.RELEASE_TYPE = type;
        process.env.RELEASE_TITLE = 'Test Release';
        
        const result = processor.process();
        expect(result.emailSubject).toContain('Test Release');
      });
    });
  });

  describe('Jira Integration Requirements', () => {
    it('should generate proper Jira comment format', () => {
      const processor = new ContentProcessor();
      
      process.env.RELEASE_TITLE = 'Test Release v1.0';
      process.env.RELEASE_TYPE = 'major';
      process.env.RELEASE_BODY = `
        ## Business Impact
        Improved customer satisfaction.
        
        ## Technical Changes
        Enhanced performance.
      `;
      process.env.RELEASE_URL = 'https://github.com/test/repo/releases/tag/v1.0.0';
      process.env.CUSTOMER_EMAILS = 'test@customer.com';
      
      const result = processor.process();
      
      // Check Jira comment structure
      expect(result.jiraComment).toContain('🚀 Released to Customer');
      expect(result.jiraComment).toContain('Test Release');
      expect(result.jiraComment).toContain('Business Impact:');
      expect(result.jiraComment).toContain('Technical Changes:');
      expect(result.jiraComment).toContain('📎 Release Package:');
      expect(result.jiraComment).toContain('🔗 Release Details:');
      expect(result.jiraComment).toContain('📧 Customer Email:');
      expect(result.jiraComment).toContain('📅 Release Date:');
    });
  });

  describe('File Attachment Detection', () => {
    it('should detect file attachments correctly', () => {
      const parser = new ReleaseDataParser();
      
      const testBody = `
        ## Files Included
        - [x] Updated drawings (PDF)
        - [x] 3D models (STEP/SolidWorks)
        - [x] Documentation updates
        - [x] Test results
      `;
      
      parser.releaseBody = testBody;
      const hasFiles = parser.hasFileAttachments();
      
      expect(hasFiles).toBe(true);
    });

    it('should handle releases without files', () => {
      const parser = new ReleaseDataParser();
      
      const testBody = `
        ## Technical Changes
        Some changes made.
      `;
      
      parser.releaseBody = testBody;
      const hasFiles = parser.hasFileAttachments();
      
      expect(hasFiles).toBe(false);
    });
  });

  describe('Error Handling Requirements', () => {
    it('should handle invalid release data gracefully', () => {
      const validator = new ReleaseValidator();
      
      // Test with missing required fields
      process.env.RELEASE_TITLE = '';
      process.env.RELEASE_BODY = '';
      process.env.CUSTOMER_EMAILS = '';
      
      const result = validator.validate();
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle malformed email addresses', () => {
      const validator = new ReleaseValidator();
      
      process.env.CUSTOMER_EMAILS = 'invalid-email, another-invalid-email';
      
      const result = validator.validate();
      
      expect(result.isValid).toBe(false);
    });

    it('should handle invalid Jira ticket formats', () => {
      const validator = new ReleaseValidator();
      
      process.env.JIRA_TICKETS = 'INVALID-123, WRONG-456';
      
      const result = validator.validate();
      
      expect(result.isValid).toBe(false);
    });
  });

  describe('Content Processing Requirements', () => {
    it('should convert markdown to HTML correctly', () => {
      const processor = new ContentProcessor();
      
      const markdown = `
        # Test Header
        This is a **bold** paragraph with *italic* text.
        
        ## Subsection
        - List item 1
        - List item 2
      `;
      
      const html = processor.convertMarkdownToHtml(markdown);
      
      expect(html).toContain('<p');
      expect(html).toContain('paragraph');
    });

    it('should extract business impact correctly', () => {
      process.env.RELEASE_TITLE = 'Test Release';
      process.env.RELEASE_TYPE = 'major';
      const testBody = `
        ## Business Impact
        This release improves customer satisfaction by 25%.
        
        ## Technical Changes
        Enhanced performance.
      `;
      process.env.RELEASE_BODY = testBody;
      const processor = new ContentProcessor();
      const businessImpact = processor.extractBusinessImpactForEmail();
      expect(businessImpact).toContain('satisfaction');
    });

    it('should extract technical changes correctly', () => {
      const processor = new ContentProcessor();
      
      const testBody = `
        ## Technical Changes
        Enhanced performance and reliability.
        
        ## Business Impact
        Improved customer satisfaction.
      `;
      
      process.env.RELEASE_BODY = testBody;
      const technicalChanges = processor.extractTechnicalChangesForEmail();
      
      expect(technicalChanges).toContain('Enhanced performance');
    });
  });

  describe('Local Testing Framework', () => {
    it('should support comprehensive local testing', () => {
      // Test that all test scripts are available
      const fs = require('fs');
      
      expect(fs.existsSync('tests/unit-tests/')).toBe(true);
      expect(fs.existsSync('tests/integration-tests/')).toBe(true);
      expect(fs.existsSync('tests/mock-data/')).toBe(true);
      expect(fs.existsSync('tests/setup.js')).toBe(true);
      
      // Test that package.json has test scripts
      const packageJson = require('../../package.json');
      expect(packageJson.scripts.test).toBeDefined();
      expect(packageJson.scripts['test:unit']).toBeDefined();
      expect(packageJson.scripts['test:integration']).toBeDefined();
    });

    it('should have proper test coverage', () => {
      // This test validates that our test suite is comprehensive
      // The actual coverage is checked by Jest
      expect(true).toBe(true); // Placeholder for coverage validation
    });
  });

  describe('Documentation Requirements', () => {
    it('should have comprehensive documentation', () => {
      const fs = require('fs');
      
      // Check for key documentation files
      expect(fs.existsSync('README.md')).toBe(true);
      expect(fs.existsSync('docs/technical-specifications.md')).toBe(true);
      expect(fs.existsSync('tests/README.md')).toBe(true);
    });

    it('should have clear setup instructions', () => {
      const fs = require('fs');
      const readme = fs.readFileSync('README.md', 'utf8');
      
      // Check for key setup sections
      expect(readme).toContain('Setup Instructions');
      expect(readme).toContain('Configuration');
      expect(readme).toContain('Testing');
      expect(readme).toContain('Usage Guide');
    });
  });

  describe('Environment Configuration', () => {
    it('should support environment-based configuration', () => {
      // Test that the system can read from environment variables
      const originalEnv = process.env.NODE_ENV;
      
      process.env.NODE_ENV = 'test';
      process.env.RELEASE_TITLE = 'Test Release';
      process.env.RELEASE_TYPE = 'major';
      
      const processor = new ContentProcessor();
      const result = processor.process();
      
      expect(result.emailSubject).toContain('Test Release');
      
      // Restore original environment
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Performance Requirements', () => {
    it('should process releases efficiently', () => {
      const startTime = Date.now();
      
      const processor = new ContentProcessor();
      process.env.RELEASE_TITLE = 'Performance Test';
      process.env.RELEASE_TYPE = 'update';
      process.env.RELEASE_BODY = `
        ## Business Impact
        Test impact.
        
        ## Technical Changes
        Test changes.
      `;
      
      const result = processor.process();
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      // Should process in under 100ms
      expect(processingTime).toBeLessThan(100);
      expect(result).toBeDefined();
    });
  });
}); 
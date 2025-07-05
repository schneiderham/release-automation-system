const fs = require('fs');
const path = require('path');

// Mock @actions/core for local testing
const mockCore = {
  setOutput: jest.fn(),
  setFailed: jest.fn()
};
jest.mock('@actions/core', () => mockCore);

// Import the validator
const ReleaseValidator = require('../../scripts/validate-release');

describe('ReleaseValidator', () => {
  let validator;
  
  beforeEach(() => {
    // Reset environment variables
    process.env.CUSTOMER_EMAILS = '';
    process.env.JIRA_TICKETS = '';
    process.env.RELEASE_TYPE = '';
    process.env.RELEASE_BODY = '';
    
    // Reset mock calls
    jest.clearAllMocks();
  });

  describe('validateCustomerEmails', () => {
    it('should validate correct email format', () => {
      process.env.CUSTOMER_EMAILS = 'test@example.com, another@test.com';
      
      validator = new ReleaseValidator();
      const result = validator.validateCustomerEmails();
      
      expect(result.valid).toBe(true);
    });

    it('should fail for missing customer emails', () => {
      process.env.CUSTOMER_EMAILS = '';
      
      validator = new ReleaseValidator();
      const result = validator.validateCustomerEmails();
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('No customer emails found');
    });

    it('should fail for invalid email format', () => {
      process.env.CUSTOMER_EMAILS = 'invalid-email, test@example.com';
      
      validator = new ReleaseValidator();
      const result = validator.validateCustomerEmails();
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid email format');
    });

    it('should handle multiple valid emails', () => {
      process.env.CUSTOMER_EMAILS = 'email1@test.com, email2@test.com, email3@test.com';
      
      validator = new ReleaseValidator();
      const result = validator.validateCustomerEmails();
      
      expect(result.valid).toBe(true);
    });
  });

  describe('validateJiraTickets', () => {
    it('should validate correct Jira ticket format', () => {
      process.env.JIRA_TICKETS = 'PDE-123 PDE-456';
      
      validator = new ReleaseValidator();
      const result = validator.validateJiraTickets();
      
      expect(result.valid).toBe(true);
    });

    it('should skip validation when no tickets provided', () => {
      process.env.JIRA_TICKETS = '';
      
      validator = new ReleaseValidator();
      const result = validator.validateJiraTickets();
      
      expect(result.valid).toBe(true);
      expect(result.warning).toContain('No Jira tickets referenced');
    });

    it('should fail for invalid ticket format', () => {
      process.env.JIRA_TICKETS = 'PDE-123 INVALID-456 PDE-789';
      
      validator = new ReleaseValidator();
      const result = validator.validateJiraTickets();
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid Jira ticket format');
    });

    it('should handle single valid ticket', () => {
      process.env.JIRA_TICKETS = 'PDE-123';
      
      validator = new ReleaseValidator();
      const result = validator.validateJiraTickets();
      
      expect(result.valid).toBe(true);
    });
  });

  describe('validateReleaseType', () => {
    it('should validate major release type', () => {
      process.env.RELEASE_TYPE = 'major';
      
      validator = new ReleaseValidator();
      const result = validator.validateReleaseType();
      
      expect(result.valid).toBe(true);
    });

    it('should validate minor release type', () => {
      process.env.RELEASE_TYPE = 'minor';
      
      validator = new ReleaseValidator();
      const result = validator.validateReleaseType();
      
      expect(result.valid).toBe(true);
    });

    it('should validate bugfix release type', () => {
      process.env.RELEASE_TYPE = 'bugfix';
      
      validator = new ReleaseValidator();
      const result = validator.validateReleaseType();
      
      expect(result.valid).toBe(true);
    });

    it('should validate documentation release type', () => {
      process.env.RELEASE_TYPE = 'documentation';
      
      validator = new ReleaseValidator();
      const result = validator.validateReleaseType();
      
      expect(result.valid).toBe(true);
    });

    it('should validate update release type', () => {
      process.env.RELEASE_TYPE = 'update';
      
      validator = new ReleaseValidator();
      const result = validator.validateReleaseType();
      
      expect(result.valid).toBe(true);
    });

    it('should fail for missing release type', () => {
      process.env.RELEASE_TYPE = '';
      
      validator = new ReleaseValidator();
      const result = validator.validateReleaseType();
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Release type could not be determined');
    });

    it('should fail for invalid release type', () => {
      process.env.RELEASE_TYPE = 'invalid-type';
      
      validator = new ReleaseValidator();
      const result = validator.validateReleaseType();
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid release type');
    });
  });

  describe('validateReleaseContent', () => {
    it('should validate release with business impact', () => {
      process.env.RELEASE_BODY = `
        ## Business Impact
        This release improves efficiency.
        
        ## Technical Changes
        Some technical details
      `;
      
      validator = new ReleaseValidator();
      const result = validator.validateReleaseContent();
      
      expect(result.valid).toBe(true);
    });

    it('should validate release with technical changes', () => {
      process.env.RELEASE_BODY = `
        ## Technical Changes
        Some technical details
        
        ## Other Content
        More content
      `;
      
      validator = new ReleaseValidator();
      const result = validator.validateReleaseContent();
      
      expect(result.valid).toBe(true);
    });

    it('should validate release with alternative formats', () => {
      process.env.RELEASE_BODY = `
        Business Impact:
        Improved customer experience
        
        Changes Made:
        Some changes
      `;
      
      validator = new ReleaseValidator();
      const result = validator.validateReleaseContent();
      
      expect(result.valid).toBe(true);
    });

    it('should fail for empty release body', () => {
      process.env.RELEASE_BODY = '';
      
      validator = new ReleaseValidator();
      const result = validator.validateReleaseContent();
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Release body is empty');
    });

    it('should fail for release without required sections', () => {
      process.env.RELEASE_BODY = `
        ## Some Other Section
        Some content
        
        ## Another Section
        More content
      `;
      
      validator = new ReleaseValidator();
      const result = validator.validateReleaseContent();
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Release must contain either Business Impact or Technical Changes');
    });
  });

  describe('validate', () => {
    it('should pass validation for complete valid release', () => {
      const sampleRelease = fs.readFileSync(
        path.join(__dirname, '../mock-data/sample-releases/valid-release.md'),
        'utf8'
      );
      
      process.env.CUSTOMER_EMAILS = 'test@example.com';
      process.env.JIRA_TICKETS = 'PDE-123';
      process.env.RELEASE_TYPE = 'major';
      process.env.RELEASE_BODY = sampleRelease;
      
      validator = new ReleaseValidator();
      const result = validator.validate();
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation for invalid release', () => {
      const invalidRelease = fs.readFileSync(
        path.join(__dirname, '../mock-data/sample-releases/invalid-release.md'),
        'utf8'
      );
      
      process.env.CUSTOMER_EMAILS = '';
      process.env.JIRA_TICKETS = '';
      process.env.RELEASE_TYPE = 'bugfix';
      process.env.RELEASE_BODY = invalidRelease;
      
      validator = new ReleaseValidator();
      const result = validator.validate();
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should set GitHub Actions outputs', () => {
      process.env.CUSTOMER_EMAILS = 'test@example.com';
      process.env.JIRA_TICKETS = 'PDE-123';
      process.env.RELEASE_TYPE = 'major';
      process.env.RELEASE_BODY = `
        ## Business Impact
        Some impact
        
        ## Technical Changes
        Some changes
      `;
      
      validator = new ReleaseValidator();
      validator.validate();
      
      expect(mockCore.setOutput).toHaveBeenCalledWith('is_valid', 'true');
    });

    it('should call setFailed for invalid releases', () => {
      process.env.CUSTOMER_EMAILS = '';
      process.env.RELEASE_BODY = 'Some content';
      
      validator = new ReleaseValidator();
      validator.validate();
      
      expect(mockCore.setFailed).toHaveBeenCalled();
    });
  });

  describe('email validation', () => {
    it('should validate correct email format', () => {
      validator = new ReleaseValidator();
      
      expect(validator.isValidEmail('test@example.com')).toBe(true);
      expect(validator.isValidEmail('user.name@domain.co.uk')).toBe(true);
      expect(validator.isValidEmail('invalid-email')).toBe(false);
      expect(validator.isValidEmail('test@')).toBe(false);
      expect(validator.isValidEmail('@example.com')).toBe(false);
    });
  });

  describe('Jira ticket validation', () => {
    it('should validate correct Jira ticket format', () => {
      validator = new ReleaseValidator();
      
      expect(validator.isValidJiraTicket('PDE-123')).toBe(true);
      expect(validator.isValidJiraTicket('PDE-999')).toBe(true);
      expect(validator.isValidJiraTicket('INVALID-123')).toBe(false);
      expect(validator.isValidJiraTicket('PDE-')).toBe(false);
      expect(validator.isValidJiraTicket('-123')).toBe(false);
    });
  });
}); 
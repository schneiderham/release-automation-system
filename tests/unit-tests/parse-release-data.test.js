const fs = require('fs');
const path = require('path');

// Mock @actions/core for local testing
const mockCore = {
  setOutput: jest.fn(),
  setFailed: jest.fn()
};
jest.mock('@actions/core', () => mockCore);

// Import the parser
const ReleaseDataParser = require('../../scripts/parse-release-data');

describe('ReleaseDataParser', () => {
  let parser;
  
  beforeEach(() => {
    // Reset environment variables
    process.env.RELEASE_TITLE = '';
    process.env.RELEASE_BODY = '';
    process.env.RELEASE_TAG = '';
    process.env.RELEASE_URL = '';
    process.env.RELEASE_ID = '';
    
    // Reset mock calls
    jest.clearAllMocks();
  });

  describe('extractCustomerEmails', () => {
    it('should extract customer emails from valid format', () => {
      const releaseBody = `
        ## Business Impact
        Some impact text
        
        Customer Email(s): test1@example.com, test2@example.com
        
        ## Technical Changes
        Some changes
      `;
      
      parser = new ReleaseDataParser();
      parser.releaseBody = releaseBody;
      
      const result = parser.extractCustomerEmails();
      expect(result).toBe('test1@example.com,test2@example.com');
    });

    it('should handle multiple email formats', () => {
      const releaseBody = `
        Customer Emails: email1@test.com
        Emails: email2@test.com
        To: email3@test.com
      `;
      
      parser = new ReleaseDataParser();
      parser.releaseBody = releaseBody;
      
      const result = parser.extractCustomerEmails();
      expect(result).toBe('email1@test.com');
    });

    it('should return empty string when no emails found', () => {
      const releaseBody = `
        ## Business Impact
        Some impact text
        
        ## Technical Changes
        Some changes
      `;
      
      parser = new ReleaseDataParser();
      parser.releaseBody = releaseBody;
      
      const result = parser.extractCustomerEmails();
      expect(result).toBe('');
    });

    it('should filter invalid email addresses', () => {
      const releaseBody = `
        Customer Email(s): valid@example.com, invalid-email, another@test.com
      `;
      
      parser = new ReleaseDataParser();
      parser.releaseBody = releaseBody;
      
      const result = parser.extractCustomerEmails();
      expect(result).toBe('valid@example.com,another@test.com');
    });
  });

  describe('extractJiraTickets', () => {
    it('should extract Jira tickets from valid format', () => {
      const releaseBody = `
        ## Related Work
        Jira Tickets: PDE-123 PDE-456
        
        ## Technical Changes
        Some changes
      `;
      
      parser = new ReleaseDataParser();
      parser.releaseBody = releaseBody;
      
      const result = parser.extractJiraTickets();
      expect(result).toBe('PDE-123 PDE-456');
    });

    it('should extract inline ticket references', () => {
      const releaseBody = `
        ## Technical Changes
        Fixed issues mentioned in PDE-123 and PDE-456.
        Also addressed PDE-789 concerns.
      `;
      
      parser = new ReleaseDataParser();
      parser.releaseBody = releaseBody;
      
      const result = parser.extractJiraTickets();
      expect(result).toBe('PDE-123 PDE-456 PDE-789');
    });

    it('should filter invalid ticket formats', () => {
      const releaseBody = `
        Jira Tickets: PDE-123 INVALID-456 PDE-789
      `;
      
      parser = new ReleaseDataParser();
      parser.releaseBody = releaseBody;
      
      const result = parser.extractJiraTickets();
      expect(result).toBe('PDE-123 PDE-789');
    });
  });

  describe('determineReleaseType', () => {
    it('should identify major releases', () => {
      parser = new ReleaseDataParser();
      parser.releaseTitle = 'Major Release v2.0';
      parser.releaseBody = 'This is a major release';
      
      const result = parser.determineReleaseType();
      expect(result).toBe('major');
    });

    it('should identify bug fixes', () => {
      parser = new ReleaseDataParser();
      parser.releaseTitle = 'Bug Fix Release';
      parser.releaseBody = 'Fixed some bugs';
      
      const result = parser.determineReleaseType();
      expect(result).toBe('bugfix');
    });

    it('should default to update for unknown types', () => {
      parser = new ReleaseDataParser();
      parser.releaseTitle = 'Some Release';
      parser.releaseBody = 'Some content';
      
      const result = parser.determineReleaseType();
      expect(result).toBe('update');
    });
  });

  describe('extractBusinessImpact', () => {
    it('should extract business impact section', () => {
      const releaseBody = `
        ## Business Impact
        This release improves efficiency by 30%.
        
        ## Technical Changes
        Some technical details
      `;
      
      parser = new ReleaseDataParser();
      parser.releaseBody = releaseBody;
      
      const result = parser.extractBusinessImpact();
      expect(result).toContain('This release improves efficiency by 30%');
    });

    it('should handle alternative business impact formats', () => {
      const releaseBody = `
        Business Impact:
        Improved customer experience
        
        Technical Changes:
        Some changes
      `;
      
      parser = new ReleaseDataParser();
      parser.releaseBody = releaseBody;
      
      const result = parser.extractBusinessImpact();
      expect(result).toContain('Improved customer experience');
    });
  });

  describe('hasFileAttachments', () => {
    it('should detect file attachments', () => {
      const releaseBody = `
        ## Files Included
        - [x] Updated drawings (PDF)
        - [x] 3D models (STEP/SolidWorks)
      `;
      
      parser = new ReleaseDataParser();
      parser.releaseBody = releaseBody;
      
      const result = parser.hasFileAttachments();
      expect(result).toBe(true);
    });

    it('should return false when no files detected', () => {
      const releaseBody = `
        ## Technical Changes
        Some changes made
      `;
      
      parser = new ReleaseDataParser();
      parser.releaseBody = releaseBody;
      
      const result = parser.hasFileAttachments();
      expect(result).toBe(false);
    });
  });

  describe('parse', () => {
    it('should parse complete release data', () => {
      const sampleRelease = fs.readFileSync(
        path.join(__dirname, '../mock-data/sample-releases/valid-release.md'),
        'utf8'
      );
      
      process.env.RELEASE_TITLE = 'Enhanced Assembly Process v2.0';
      process.env.RELEASE_BODY = sampleRelease;
      process.env.RELEASE_TAG = 'v2.0.0';
      process.env.RELEASE_URL = 'https://github.com/test/repo/releases/tag/v2.0.0';
      
      parser = new ReleaseDataParser();
      const result = parser.parse();
      
      expect(result.customerEmails).toBe('engineering@customer.com,project.manager@customer.com');
      expect(result.jiraTickets).toBe('PDE-789 PDE-790');
      expect(result.releaseType).toBe('major');
      expect(result.hasFiles).toBe(true);
      expect(result.businessImpact).toContain('Enhanced assembly process');
      expect(result.technicalChanges).toContain('Comprehensive redesign');
    });

    it('should set GitHub Actions outputs', () => {
      const sampleRelease = fs.readFileSync(
        path.join(__dirname, '../mock-data/sample-releases/valid-release.md'),
        'utf8'
      );
      
      process.env.RELEASE_TITLE = 'Test Release';
      process.env.RELEASE_BODY = sampleRelease;
      process.env.RELEASE_TAG = 'v1.0.0';
      
      parser = new ReleaseDataParser();
      parser.parse();
      
      expect(mockCore.setOutput).toHaveBeenCalledWith('customer_emails', expect.any(String));
      expect(mockCore.setOutput).toHaveBeenCalledWith('jira_tickets', expect.any(String));
      expect(mockCore.setOutput).toHaveBeenCalledWith('release_type', expect.any(String));
      expect(mockCore.setOutput).toHaveBeenCalledWith('has_files', 'true');
    });
  });
}); 
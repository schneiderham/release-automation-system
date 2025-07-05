const fs = require('fs');
const path = require('path');

// Mock external dependencies
jest.mock('@actions/core');
jest.mock('googleapis');
jest.mock('axios');

// Import the modules to test
const ReleaseDataParser = require('../../scripts/parse-release-data');
const ReleaseValidator = require('../../scripts/validate-release');
const ContentProcessor = require('../../scripts/process-release-content');

describe('Workflow Integration Tests', () => {
  let sampleRelease;
  
  beforeAll(() => {
    // Load sample release data
    sampleRelease = fs.readFileSync(
      path.join(__dirname, '../mock-data/sample-releases/valid-release.md'),
      'utf8'
    );
  });

  beforeEach(() => {
    // Reset environment variables
    process.env.RELEASE_TITLE = '';
    process.env.RELEASE_BODY = '';
    process.env.RELEASE_TAG = '';
    process.env.RELEASE_URL = '';
    process.env.RELEASE_ID = '';
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('Complete Workflow Simulation', () => {
    it('should process a complete valid release workflow', async () => {
      // Step 1: Set up release data
      process.env.RELEASE_TITLE = 'Enhanced Assembly Process v2.0';
      process.env.RELEASE_BODY = sampleRelease;
      process.env.RELEASE_TAG = 'v2.0.0';
      process.env.RELEASE_URL = 'https://github.com/test/repo/releases/tag/v2.0.0';
      
      // Step 2: Parse release data
      const parser = new ReleaseDataParser();
      const parsedData = parser.parse();
      
      expect(parsedData.customerEmails).toBe('engineering@customer.com,project.manager@customer.com');
      expect(parsedData.jiraTickets).toBe('PDE-789 PDE-790');
      expect(parsedData.releaseType).toBe('major');
      expect(parsedData.hasFiles).toBe(true);
      
      // Step 3: Validate release data
      process.env.CUSTOMER_EMAILS = parsedData.customerEmails;
      process.env.JIRA_TICKETS = parsedData.jiraTickets;
      process.env.RELEASE_TYPE = parsedData.releaseType;
      
      const validator = new ReleaseValidator();
      const validationResult = validator.validate();
      
      expect(validationResult.isValid).toBe(true);
      expect(validationResult.errors).toHaveLength(0);
      
      // Step 4: Process content
      process.env.RELEASE_BODY = sampleRelease;
      process.env.RELEASE_TITLE = 'Enhanced Assembly Process v2.0';
      process.env.RELEASE_TYPE = 'major';
      
      const processor = new ContentProcessor();
      const processedContent = processor.process();
      
      expect(processedContent.emailSubject).toContain('🚀 Major Release');
      expect(processedContent.emailBody).toContain('Enhanced Assembly Process v2.0');
      expect(processedContent.jiraComment).toContain('🚀 Released to Customer');
      expect(processedContent.businessImpact).toContain('Enhanced assembly process');
      expect(processedContent.technicalChanges).toContain('Comprehensive redesign');
    });

    it('should handle invalid release data appropriately', async () => {
      const invalidRelease = fs.readFileSync(
        path.join(__dirname, '../mock-data/sample-releases/invalid-release.md'),
        'utf8'
      );
      
      // Step 1: Set up invalid release data
      process.env.RELEASE_TITLE = 'Bug Fix Release';
      process.env.RELEASE_BODY = invalidRelease;
      process.env.RELEASE_TAG = 'v1.0.1';
      
      // Step 2: Parse release data (should still work)
      const parser = new ReleaseDataParser();
      const parsedData = parser.parse();
      
      expect(parsedData.customerEmails).toBe(''); // No emails found
      expect(parsedData.jiraTickets).toBe(''); // No tickets found
      expect(parsedData.releaseType).toBe('bugfix');
      
      // Step 3: Validate release data (should fail)
      process.env.CUSTOMER_EMAILS = parsedData.customerEmails;
      process.env.JIRA_TICKETS = parsedData.jiraTickets;
      process.env.RELEASE_TYPE = parsedData.releaseType;
      
      const validator = new ReleaseValidator();
      const validationResult = validator.validate();
      
      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors.length).toBeGreaterThan(0);
      
      // Step 4: Process content (should still work for what's available)
      process.env.RELEASE_BODY = invalidRelease;
      process.env.RELEASE_TITLE = 'Bug Fix Release';
      process.env.RELEASE_TYPE = 'bugfix';
      
      const processor = new ContentProcessor();
      const processedContent = processor.process();
      
      expect(processedContent.emailSubject).toContain('🐛 Bug Fix');
      expect(processedContent.emailBody).toContain('Bug Fix Release');
      expect(processedContent.jiraComment).toContain('🚀 Released to Customer');
    });
  });

  describe('Email Template Generation', () => {
    it('should generate professional email template', async () => {
      process.env.RELEASE_BODY = sampleRelease;
      process.env.RELEASE_TITLE = 'Enhanced Assembly Process v2.0';
      process.env.RELEASE_TYPE = 'major';
      process.env.RELEASE_URL = 'https://github.com/test/repo/releases/tag/v2.0.0';
      
      const processor = new ContentProcessor();
      const processedContent = processor.process();
      
      // Check email subject
      expect(processedContent.emailSubject).toContain('🚀 Major Release');
      expect(processedContent.emailSubject).toContain('Enhanced Assembly Process v2.0');
      
      // Check email body structure
      expect(processedContent.emailBody).toContain('What\'s New');
      expect(processedContent.emailBody).toContain('Technical Changes');
      expect(processedContent.emailBody).toContain('Release Files');
      expect(processedContent.emailBody).toContain('Complete Details');
      expect(processedContent.emailBody).toContain('https://github.com/test/repo/releases/tag/v2.0.0');
      
      // Check for professional styling classes
      expect(processedContent.emailBody).toContain('section-header');
      expect(processedContent.emailBody).toContain('release-link');
      expect(processedContent.emailBody).toContain('file-list');
    });

    it('should handle different release types correctly', async () => {
      const testCases = [
        { type: 'major', expectedEmoji: '🚀', expectedLabel: 'Major Release' },
        { type: 'minor', expectedEmoji: '📦', expectedLabel: 'Minor Update' },
        { type: 'bugfix', expectedEmoji: '🐛', expectedLabel: 'Bug Fix' },
        { type: 'documentation', expectedEmoji: '📚', expectedLabel: 'Documentation Update' },
        { type: 'update', expectedEmoji: '📋', expectedLabel: 'Update' }
      ];
      
      for (const testCase of testCases) {
        process.env.RELEASE_BODY = sampleRelease;
        process.env.RELEASE_TITLE = 'Test Release';
        process.env.RELEASE_TYPE = testCase.type;
        
        const processor = new ContentProcessor();
        const processedContent = processor.process();
        
        expect(processedContent.emailSubject).toContain(testCase.expectedEmoji);
        expect(processedContent.emailSubject).toContain(testCase.expectedLabel);
      }
    });
  });

  describe('Jira Comment Generation', () => {
    it('should generate proper Jira comment format', async () => {
      process.env.RELEASE_BODY = sampleRelease;
      process.env.RELEASE_TITLE = 'Enhanced Assembly Process v2.0';
      process.env.RELEASE_TYPE = 'major';
      process.env.RELEASE_URL = 'https://github.com/test/repo/releases/tag/v2.0.0';
      
      const processor = new ContentProcessor();
      const processedContent = processor.process();
      
      // Check Jira comment structure
      expect(processedContent.jiraComment).toContain('🚀 Released to Customer');
      expect(processedContent.jiraComment).toContain('Enhanced Assembly Process v2.0');
      expect(processedContent.jiraComment).toContain('Business Impact:');
      expect(processedContent.jiraComment).toContain('Technical Changes:');
      expect(processedContent.jiraComment).toContain('📎 Release Package:');
      expect(processedContent.jiraComment).toContain('🔗 Release Details:');
      expect(processedContent.jiraComment).toContain('📧 Customer Email:');
      expect(processedContent.jiraComment).toContain('📅 Release Date:');
    });

    it('should handle releases without business impact', async () => {
      const minimalRelease = `
        ## Technical Changes
        Some technical changes made.
        
        ## Files Included
        - [x] Documentation updates
      `;
      
      process.env.RELEASE_BODY = minimalRelease;
      process.env.RELEASE_TITLE = 'Documentation Update';
      process.env.RELEASE_TYPE = 'documentation';
      
      const processor = new ContentProcessor();
      const processedContent = processor.process();
      
      expect(processedContent.jiraComment).toContain('🚀 Released to Customer');
      expect(processedContent.jiraComment).toContain('Documentation Update');
      expect(processedContent.jiraComment).toContain('Business Impact: Not specified');
      expect(processedContent.jiraComment).toContain('Technical Changes: Some technical changes made');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing content gracefully', async () => {
      const minimalRelease = `
        ## Some Section
        Some content
      `;
      
      process.env.RELEASE_BODY = minimalRelease;
      process.env.RELEASE_TITLE = 'Test Release';
      process.env.RELEASE_TYPE = 'update';
      
      const processor = new ContentProcessor();
      const processedContent = processor.process();
      
      // Should still generate basic content
      expect(processedContent.emailSubject).toContain('📋 Update');
      expect(processedContent.emailSubject).toContain('Test Release');
      expect(processedContent.emailBody).toContain('Test Release');
      expect(processedContent.jiraComment).toContain('🚀 Released to Customer');
    });

    it('should handle empty release body', async () => {
      process.env.RELEASE_BODY = '';
      process.env.RELEASE_TITLE = 'Empty Release';
      process.env.RELEASE_TYPE = 'update';
      
      const processor = new ContentProcessor();
      const processedContent = processor.process();
      
      // Should still generate basic structure
      expect(processedContent.emailSubject).toContain('📋 Update');
      expect(processedContent.emailSubject).toContain('Empty Release');
      expect(processedContent.emailBody).toContain('Empty Release');
      expect(processedContent.jiraComment).toContain('🚀 Released to Customer');
    });
  });

  describe('File Detection', () => {
    it('should detect file attachments correctly', async () => {
      const releaseWithFiles = `
        ## Files Included
        - [x] Updated drawings (PDF)
        - [x] 3D models (STEP/SolidWorks)
        - [x] Documentation updates
        - [x] Test results
      `;
      
      process.env.RELEASE_BODY = releaseWithFiles;
      process.env.RELEASE_TITLE = 'File Release';
      process.env.RELEASE_TYPE = 'update';
      
      const processor = new ContentProcessor();
      const processedContent = processor.process();
      
      // Check that file list is generated
      expect(processedContent.emailBody).toContain('Updated drawings (PDF)');
      expect(processedContent.emailBody).toContain('3D models (STEP/SolidWorks)');
      expect(processedContent.emailBody).toContain('Documentation updates');
      expect(processedContent.emailBody).toContain('Test results');
      
      // Check Jira comment includes file information
      expect(processedContent.jiraComment).toContain('Updated drawings (PDF)');
      expect(processedContent.jiraComment).toContain('3D models (STEP/SolidWorks)');
    });

    it('should handle releases without files', async () => {
      const releaseWithoutFiles = `
        ## Technical Changes
        Some changes made.
      `;
      
      process.env.RELEASE_BODY = releaseWithoutFiles;
      process.env.RELEASE_TITLE = 'No Files Release';
      process.env.RELEASE_TYPE = 'update';
      
      const processor = new ContentProcessor();
      const processedContent = processor.process();
      
      // Should indicate no specific files
      expect(processedContent.emailBody).toContain('No specific files included');
      expect(processedContent.jiraComment).toContain('No specific files');
    });
  });
}); 
#!/usr/bin/env node

/**
 * Local Test Runner for Release Automation System
 * 
 * This script simulates the full workflow without making real API calls.
 * It tests all the logic, parsing, validation, and content processing.
 */

const fs = require('fs');
const path = require('path');

// Import our modules
const ReleaseDataParser = require('./parse-release-data');
const ReleaseValidator = require('./validate-release');
const ContentProcessor = require('./process-release-content');

// Mock @actions/core for local testing
const mockCore = {
  setOutput: (name, value) => console.log(`📤 Output: ${name} = ${value}`),
  setFailed: (message) => console.error(`❌ Failed: ${message}`),
  info: (message) => console.log(`ℹ️  Info: ${message}`),
  warning: (message) => console.warn(`⚠️  Warning: ${message}`),
  error: (message) => console.error(`❌ Error: ${message}`)
};

// Replace the real core module with our mock
const originalCore = require('@actions/core');
Object.keys(mockCore).forEach(key => {
  originalCore[key] = mockCore[key];
});

class LocalTestRunner {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: []
    };
  }

  async runTests() {
    console.log('🚀 Starting Local Test Runner for Release Automation System\n');
    
    try {
      // Test 1: Valid Release Processing
      await this.testValidRelease();
      
      // Test 2: Invalid Release Handling
      await this.testInvalidRelease();
      
      // Test 3: Different Release Types
      await this.testReleaseTypes();
      
      // Test 4: Error Scenarios
      await this.testErrorScenarios();
      
      // Test 5: Content Processing
      await this.testContentProcessing();
      
      this.printResults();
      
    } catch (error) {
      console.error('❌ Test runner failed:', error.message);
      process.exit(1);
    }
  }

  async testValidRelease() {
    console.log('📋 Test 1: Valid Release Processing');
    
    try {
      // Load sample release
      const sampleRelease = fs.readFileSync(
        path.join(__dirname, '../tests/mock-data/sample-releases/valid-release.md'),
        'utf8'
      );
      
      // Set up environment
      process.env.RELEASE_TITLE = 'Enhanced Assembly Process v2.0';
      process.env.RELEASE_BODY = sampleRelease;
      process.env.RELEASE_TAG = 'v2.0.0';
      process.env.RELEASE_URL = 'https://github.com/test/repo/releases/tag/v2.0.0';
      
      // Step 1: Parse release data
      console.log('  🔍 Parsing release data...');
      const parser = new ReleaseDataParser();
      const parsedData = parser.parse();
      
      // Verify parsing results
      const expectedEmails = 'engineering@customer.com,project.manager@customer.com';
      const expectedTickets = 'PDE-789 PDE-790';
      
      if (parsedData.customerEmails !== expectedEmails) {
        throw new Error(`Expected emails "${expectedEmails}", got "${parsedData.customerEmails}"`);
      }
      
      if (parsedData.jiraTickets !== expectedTickets) {
        throw new Error(`Expected tickets "${expectedTickets}", got "${parsedData.jiraTickets}"`);
      }
      
      if (parsedData.releaseType !== 'major') {
        throw new Error(`Expected release type "major", got "${parsedData.releaseType}"`);
      }
      
      console.log('  ✅ Parsing successful');
      
      // Step 2: Validate release data
      console.log('  🔍 Validating release data...');
      process.env.CUSTOMER_EMAILS = parsedData.customerEmails;
      process.env.JIRA_TICKETS = parsedData.jiraTickets;
      process.env.RELEASE_TYPE = parsedData.releaseType;
      
      const validator = new ReleaseValidator();
      const validationResult = validator.validate();
      
      if (!validationResult.isValid) {
        throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
      }
      
      console.log('  ✅ Validation successful');
      
      // Step 3: Process content
      console.log('  🔍 Processing content...');
      const processor = new ContentProcessor();
      const processedContent = processor.process();
      
      // Verify content processing
      if (!processedContent.emailSubject.includes('🚀 Major Release')) {
        throw new Error('Email subject missing expected content');
      }
      
      if (!processedContent.emailBody.includes('Enhanced Assembly Process v2.0')) {
        throw new Error('Email body missing expected content');
      }
      
      if (!processedContent.jiraComment.includes('🚀 Released to Customer')) {
        throw new Error('Jira comment missing expected content');
      }
      
      console.log('  ✅ Content processing successful');
      
      this.testResults.passed++;
      console.log('  ✅ Test 1 PASSED\n');
      
    } catch (error) {
      this.testResults.failed++;
      this.testResults.errors.push(`Test 1: ${error.message}`);
      console.log(`  ❌ Test 1 FAILED: ${error.message}\n`);
    }
  }

  async testInvalidRelease() {
    console.log('📋 Test 2: Invalid Release Handling');
    
    try {
      // Load invalid release
      const invalidRelease = fs.readFileSync(
        path.join(__dirname, '../tests/mock-data/sample-releases/invalid-release.md'),
        'utf8'
      );
      
      // Set up environment
      process.env.RELEASE_TITLE = 'Bug Fix Release';
      process.env.RELEASE_BODY = invalidRelease;
      process.env.RELEASE_TAG = 'v1.0.1';
      
      // Step 1: Parse release data (should still work)
      console.log('  🔍 Parsing invalid release data...');
      const parser = new ReleaseDataParser();
      const parsedData = parser.parse();
      
      // Should not find emails or tickets
      if (parsedData.customerEmails !== '') {
        throw new Error(`Expected no emails, got "${parsedData.customerEmails}"`);
      }
      
      if (parsedData.jiraTickets !== '') {
        throw new Error(`Expected no tickets, got "${parsedData.jiraTickets}"`);
      }
      
      console.log('  ✅ Parsing handled missing data correctly');
      
      // Step 2: Validate release data (should fail)
      console.log('  🔍 Validating invalid release data...');
      process.env.CUSTOMER_EMAILS = parsedData.customerEmails;
      process.env.JIRA_TICKETS = parsedData.jiraTickets;
      process.env.RELEASE_TYPE = parsedData.releaseType;
      
      const validator = new ReleaseValidator();
      const validationResult = validator.validate();
      
      if (validationResult.isValid) {
        throw new Error('Expected validation to fail for invalid release');
      }
      
      if (validationResult.errors.length === 0) {
        throw new Error('Expected validation errors for invalid release');
      }
      
      console.log('  ✅ Validation correctly identified issues');
      
      this.testResults.passed++;
      console.log('  ✅ Test 2 PASSED\n');
      
    } catch (error) {
      this.testResults.failed++;
      this.testResults.errors.push(`Test 2: ${error.message}`);
      console.log(`  ❌ Test 2 FAILED: ${error.message}\n`);
    }
  }

  async testReleaseTypes() {
    console.log('📋 Test 3: Different Release Types');
    
    const testCases = [
      { type: 'major', title: 'Major Release v2.0', expectedEmoji: '🚀' },
      { type: 'minor', title: 'Minor Update v1.1', expectedEmoji: '📦' },
      { type: 'bugfix', title: 'Bug Fix v1.0.1', expectedEmoji: '🐛' },
      { type: 'documentation', title: 'Documentation Update', expectedEmoji: '📚' },
      { type: 'update', title: 'General Update', expectedEmoji: '📋' }
    ];
    
    let passed = 0;
    
    for (const testCase of testCases) {
      try {
        process.env.RELEASE_TITLE = testCase.title;
        process.env.RELEASE_TYPE = testCase.type;
        process.env.RELEASE_BODY = '## Technical Changes\nSome changes';
        
        const processor = new ContentProcessor();
        const processedContent = processor.process();
        
        if (!processedContent.emailSubject.includes(testCase.expectedEmoji)) {
          throw new Error(`Expected emoji ${testCase.expectedEmoji} for ${testCase.type} release`);
        }
        
        passed++;
        
      } catch (error) {
        this.testResults.errors.push(`Test 3 (${testCase.type}): ${error.message}`);
      }
    }
    
    if (passed === testCases.length) {
      this.testResults.passed++;
      console.log('  ✅ Test 3 PASSED\n');
    } else {
      this.testResults.failed++;
      console.log(`  ❌ Test 3 FAILED: ${testCases.length - passed}/${testCases.length} cases failed\n`);
    }
  }

  async testErrorScenarios() {
    console.log('📋 Test 4: Error Scenarios');
    
    try {
      // Test with empty release body
      process.env.RELEASE_BODY = '';
      process.env.RELEASE_TITLE = 'Empty Release';
      process.env.RELEASE_TYPE = 'update';
      
      const processor = new ContentProcessor();
      const processedContent = processor.process();
      
      // Should still generate basic content
      if (!processedContent.emailSubject.includes('Empty Release')) {
        throw new Error('Failed to handle empty release body');
      }
      
      console.log('  ✅ Handled empty release body correctly');
      
      // Test with missing environment variables
      delete process.env.RELEASE_TITLE;
      delete process.env.RELEASE_TYPE;
      
      const processor2 = new ContentProcessor();
      const processedContent2 = processor2.process();
      
      // Should handle missing variables gracefully
      if (!processedContent2.emailSubject) {
        throw new Error('Failed to handle missing environment variables');
      }
      
      console.log('  ✅ Handled missing environment variables correctly');
      
      this.testResults.passed++;
      console.log('  ✅ Test 4 PASSED\n');
      
    } catch (error) {
      this.testResults.failed++;
      this.testResults.errors.push(`Test 4: ${error.message}`);
      console.log(`  ❌ Test 4 FAILED: ${error.message}\n`);
    }
  }

  async testContentProcessing() {
    console.log('📋 Test 5: Content Processing');
    
    try {
      const sampleRelease = fs.readFileSync(
        path.join(__dirname, '../tests/mock-data/sample-releases/valid-release.md'),
        'utf8'
      );
      
      process.env.RELEASE_BODY = sampleRelease;
      process.env.RELEASE_TITLE = 'Enhanced Assembly Process v2.0';
      process.env.RELEASE_TYPE = 'major';
      process.env.RELEASE_URL = 'https://github.com/test/repo/releases/tag/v2.0.0';
      
      const processor = new ContentProcessor();
      const processedContent = processor.process();
      
      // Check email structure
      const emailChecks = [
        'What\'s New',
        'Technical Changes',
        'Release Files',
        'Complete Details',
        'https://github.com/test/repo/releases/tag/v2.0.0'
      ];
      
      for (const check of emailChecks) {
        if (!processedContent.emailBody.includes(check)) {
          throw new Error(`Email body missing: ${check}`);
        }
      }
      
      // Check Jira comment structure
      const jiraChecks = [
        '🚀 Released to Customer',
        'Enhanced Assembly Process v2.0',
        'Business Impact:',
        'Technical Changes:',
        '📎 Release Package:',
        '🔗 Release Details:'
      ];
      
      for (const check of jiraChecks) {
        if (!processedContent.jiraComment.includes(check)) {
          throw new Error(`Jira comment missing: ${check}`);
        }
      }
      
      console.log('  ✅ Email template generation successful');
      console.log('  ✅ Jira comment generation successful');
      
      this.testResults.passed++;
      console.log('  ✅ Test 5 PASSED\n');
      
    } catch (error) {
      this.testResults.failed++;
      this.testResults.errors.push(`Test 5: ${error.message}`);
      console.log(`  ❌ Test 5 FAILED: ${error.message}\n`);
    }
  }

  printResults() {
    console.log('📊 Test Results Summary');
    console.log('========================');
    console.log(`✅ Passed: ${this.testResults.passed}`);
    console.log(`❌ Failed: ${this.testResults.failed}`);
    console.log(`📈 Success Rate: ${((this.testResults.passed / (this.testResults.passed + this.testResults.failed)) * 100).toFixed(1)}%`);
    
    if (this.testResults.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.testResults.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }
    
    if (this.testResults.failed === 0) {
      console.log('\n🎉 All tests passed! The system is ready for deployment.');
    } else {
      console.log('\n⚠️  Some tests failed. Please review the errors before deployment.');
    }
  }
}

// Run the tests if this script is executed directly
if (require.main === module) {
  const runner = new LocalTestRunner();
  runner.runTests().catch(error => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = LocalTestRunner; 
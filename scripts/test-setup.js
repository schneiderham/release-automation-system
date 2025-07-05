#!/usr/bin/env node

const core = require('@actions/core');
const { google } = require('googleapis');
const axios = require('axios');

/**
 * Test script to validate all API connections and configurations
 * Helps verify setup before going live with the release automation system
 */
class SetupTester {
  constructor() {
    this.results = {
      gmail: { status: 'not_tested', message: '' },
      jira: { status: 'not_tested', message: '' },
      googleChat: { status: 'not_tested', message: '' },
      drive: { status: 'not_tested', message: '' }
    };
  }

  /**
   * Test Gmail API connection
   */
  async testGmailAPI() {
    console.log('🔍 Testing Gmail API...');
    
    try {
      const clientId = process.env.GMAIL_CLIENT_ID;
      const clientSecret = process.env.GMAIL_CLIENT_SECRET;
      const refreshToken = process.env.GMAIL_REFRESH_TOKEN;

      if (!clientId || !clientSecret || !refreshToken) {
        this.results.gmail = {
          status: 'failed',
          message: 'Missing Gmail API credentials'
        };
        return;
      }

      const oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        'urn:ietf:wg:oauth:2.0:oob'
      );

      oauth2Client.setCredentials({
        refresh_token: refreshToken
      });

      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      
      // Test by getting user profile
      const response = await gmail.users.getProfile({ userId: 'me' });
      
      this.results.gmail = {
        status: 'success',
        message: `Connected as ${response.data.emailAddress}`
      };
      
      console.log(`✅ Gmail API: Connected as ${response.data.emailAddress}`);
      
    } catch (error) {
      this.results.gmail = {
        status: 'failed',
        message: error.message
      };
      console.log(`❌ Gmail API: ${error.message}`);
    }
  }

  /**
   * Test Jira API connection
   */
  async testJiraAPI() {
    console.log('🔍 Testing Jira API...');
    
    try {
      const apiToken = process.env.JIRA_API_TOKEN;
      const userEmail = process.env.JIRA_USER_EMAIL;
      const baseUrl = process.env.JIRA_BASE_URL || 'https://pacificdesignengineering.atlassian.net';

      if (!apiToken || !userEmail) {
        this.results.jira = {
          status: 'failed',
          message: 'Missing Jira API credentials'
        };
        return;
      }

      const auth = Buffer.from(`${userEmail}:${apiToken}`).toString('base64');
      
      const response = await axios.get(`${baseUrl}/rest/api/3/myself`, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json'
        },
        timeout: 10000
      });

      this.results.jira = {
        status: 'success',
        message: `Connected as ${response.data.emailAddress}`
      };
      
      console.log(`✅ Jira API: Connected as ${response.data.emailAddress}`);
      
    } catch (error) {
      this.results.jira = {
        status: 'failed',
        message: error.response?.data?.errorMessages?.join(', ') || error.message
      };
      console.log(`❌ Jira API: ${error.message}`);
    }
  }

  /**
   * Test Google Chat webhook (optional)
   */
  async testGoogleChatWebhook() {
    console.log('🔍 Testing Google Chat webhook...');
    
    const webhookUrl = process.env.GOOGLE_CHAT_WEBHOOK_URL;
    
    if (!webhookUrl) {
      this.results.googleChat = {
        status: 'skipped',
        message: 'No Google Chat webhook URL configured'
      };
      console.log('⏭️ Google Chat: Not configured (optional)');
      return;
    }

    try {
      const testMessage = {
        text: '🧪 Release Automation System - Test Message\n\nThis is a test message from the Release Automation System setup verification.'
      };

      const response = await axios.post(webhookUrl, testMessage, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      if (response.status === 200) {
        this.results.googleChat = {
          status: 'success',
          message: 'Webhook test message sent successfully'
        };
        console.log('✅ Google Chat: Webhook test successful');
      } else {
        this.results.googleChat = {
          status: 'failed',
          message: `Unexpected status: ${response.status}`
        };
        console.log(`❌ Google Chat: Unexpected status ${response.status}`);
      }
      
    } catch (error) {
      this.results.googleChat = {
        status: 'failed',
        message: error.message
      };
      console.log(`❌ Google Chat: ${error.message}`);
    }
  }

  /**
   * Test Google Drive API (optional)
   */
  async testGoogleDriveAPI() {
    console.log('🔍 Testing Google Drive API...');
    
    const credentials = process.env.GOOGLE_DRIVE_CREDENTIALS;
    const folderId = process.env.DRIVE_FOLDER_ID;
    
    if (!credentials || !folderId) {
      this.results.drive = {
        status: 'skipped',
        message: 'No Drive credentials or folder ID configured'
      };
      console.log('⏭️ Google Drive: Not configured (optional)');
      return;
    }

    try {
      // Decode credentials
      const serviceAccountKey = Buffer.from(credentials, 'base64').toString();
      const serviceAccount = JSON.parse(serviceAccountKey);

      const auth = new google.auth.GoogleAuth({
        credentials: serviceAccount,
        scopes: ['https://www.googleapis.com/auth/drive.file']
      });

      const drive = google.drive({ version: 'v3', auth });
      
      // Test by getting folder info
      const response = await drive.files.get({
        fileId: folderId,
        fields: 'id,name,webViewLink'
      });

      this.results.drive = {
        status: 'success',
        message: `Connected to folder: ${response.data.name}`
      };
      
      console.log(`✅ Google Drive: Connected to folder "${response.data.name}"`);
      
    } catch (error) {
      this.results.drive = {
        status: 'failed',
        message: error.message
      };
      console.log(`❌ Google Drive: ${error.message}`);
    }
  }

  /**
   * Test release template parsing
   */
  testReleaseTemplate() {
    console.log('🔍 Testing release template parsing...');
    
    try {
      const fs = require('fs');
      const path = require('path');
      
      const templatePath = path.join(__dirname, '..', '.github', 'RELEASE_TEMPLATE.md');
      
      if (!fs.existsSync(templatePath)) {
        console.log('❌ Release template: Template file not found');
        return false;
      }
      
      const template = fs.readFileSync(templatePath, 'utf8');
      
      // Check for required sections
      const requiredSections = [
        'Business Impact',
        'Technical Changes',
        'Customer Email(s)',
        'Related Jira Tickets'
      ];
      
      const missingSections = requiredSections.filter(section => 
        !template.includes(section)
      );
      
      if (missingSections.length > 0) {
        console.log(`❌ Release template: Missing sections: ${missingSections.join(', ')}`);
        return false;
      }
      
      console.log('✅ Release template: All required sections found');
      return true;
      
    } catch (error) {
      console.log(`❌ Release template: ${error.message}`);
      return false;
    }
  }

  /**
   * Test GitHub Actions workflow
   */
  testGitHubWorkflow() {
    console.log('🔍 Testing GitHub Actions workflow...');
    
    try {
      const fs = require('fs');
      const path = require('path');
      
      const workflowPath = path.join(__dirname, '..', '.github', 'workflows', 'release-automation.yml');
      
      if (!fs.existsSync(workflowPath)) {
        console.log('❌ GitHub Actions: Workflow file not found');
        return false;
      }
      
      const workflow = fs.readFileSync(workflowPath, 'utf8');
      
      // Check for required workflow elements
      const requiredElements = [
        'on:',
        'release:',
        'types: [published]',
        'process-release:',
        'send-customer-emails:',
        'update-jira-tickets:'
      ];
      
      const missingElements = requiredElements.filter(element => 
        !workflow.includes(element)
      );
      
      if (missingElements.length > 0) {
        console.log(`❌ GitHub Actions: Missing elements: ${missingElements.join(', ')}`);
        return false;
      }
      
      console.log('✅ GitHub Actions: Workflow file is properly configured');
      return true;
      
    } catch (error) {
      console.log(`❌ GitHub Actions: ${error.message}`);
      return false;
    }
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('🚀 Release Automation System - Setup Verification');
    console.log('================================================');
    console.log('');

    // Test API connections
    await this.testGmailAPI();
    await this.testJiraAPI();
    await this.testGoogleChatWebhook();
    await this.testGoogleDriveAPI();
    
    console.log('');
    
    // Test configuration files
    this.testReleaseTemplate();
    this.testGitHubWorkflow();
    
    console.log('');
    console.log('📊 Test Results Summary');
    console.log('========================');
    
    Object.entries(this.results).forEach(([service, result]) => {
      const emoji = result.status === 'success' ? '✅' : 
                   result.status === 'failed' ? '❌' : '⏭️';
      console.log(`${emoji} ${service.toUpperCase()}: ${result.status} - ${result.message}`);
    });
    
    console.log('');
    
    // Overall status
    const failedTests = Object.values(this.results).filter(r => r.status === 'failed').length;
    const requiredTests = Object.values(this.results).filter(r => r.status !== 'skipped').length;
    const passedTests = Object.values(this.results).filter(r => r.status === 'success').length;
    
    if (failedTests === 0) {
      console.log('🎉 All tests passed! Your setup is ready for production.');
    } else {
      console.log(`⚠️  ${failedTests} test(s) failed. Please review the errors above.`);
    }
    
    console.log(`📈 Test Results: ${passedTests}/${requiredTests} passed`);
    
    // Set GitHub Actions outputs if running in Actions
    if (process.env.GITHUB_ACTIONS) {
      core.setOutput('gmail_status', this.results.gmail.status);
      core.setOutput('jira_status', this.results.jira.status);
      core.setOutput('google_chat_status', this.results.googleChat.status);
      core.setOutput('drive_status', this.results.drive.status);
      core.setOutput('tests_passed', passedTests.toString());
      core.setOutput('tests_total', requiredTests.toString());
    }
  }
}

// Main execution
if (require.main === module) {
  const tester = new SetupTester();
  tester.runAllTests().catch(error => {
    console.error('❌ Test execution failed:', error.message);
    process.exit(1);
  });
}

module.exports = SetupTester; 
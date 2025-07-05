#!/usr/bin/env node

const core = require('@actions/core');
const axios = require('axios');

/**
 * Team notifications for release automation status
 * Sends Slack notifications and provides comprehensive reporting
 */
class TeamNotifier {
  constructor() {
    this.releaseTitle = process.env.RELEASE_TITLE || '';
    this.releaseUrl = process.env.RELEASE_URL || '';
    this.releaseTag = process.env.RELEASE_TAG || '';
    this.emailStatus = process.env.EMAIL_STATUS || 'unknown';
    this.jiraStatus = process.env.JIRA_STATUS || 'unknown';
    this.driveStatus = process.env.DRIVE_STATUS || 'unknown';
    this.googleChatWebhookUrl = process.env.GOOGLE_CHAT_WEBHOOK_URL || '';
  }

  /**
   * Generate status emoji based on status
   */
  getStatusEmoji(status) {
    switch (status) {
      case 'success':
        return '✅';
      case 'partial':
        return '⚠️';
      case 'failed':
        return '❌';
      case 'skipped':
        return '⏭️';
      default:
        return '❓';
    }
  }

  /**
   * Generate Google Chat notification message
   */
  generateGoogleChatMessage() {
    const emailEmoji = this.getStatusEmoji(this.emailStatus);
    const jiraEmoji = this.getStatusEmoji(this.jiraStatus);
    const driveEmoji = this.getStatusEmoji(this.driveStatus);

    const message = {
      text: `🚀 Release Automation Complete: ${this.releaseTitle}

Release: ${this.releaseTitle}
Tag: ${this.releaseTag}

Automation Status:
${emailEmoji} Customer Emails: ${this.emailStatus}
${jiraEmoji} Jira Updates: ${this.jiraStatus}
${driveEmoji} Drive Sync: ${this.driveStatus}

Release Details: ${this.releaseUrl}

Automated by GitHub Actions • ${new Date().toISOString()}`
    };

    return message;
  }

  /**
   * Send Google Chat notification
   */
  async sendGoogleChatNotification() {
    if (!this.googleChatWebhookUrl) {
      console.log('No Google Chat webhook URL configured, skipping Google Chat notification');
      return;
    }

    try {
      const message = this.generateGoogleChatMessage();
      
      const response = await axios.post(this.googleChatWebhookUrl, message, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      if (response.status === 200) {
        console.log('✅ Google Chat notification sent successfully');
      } else {
        console.log(`⚠️ Google Chat notification returned status ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ Failed to send Google Chat notification: ${error.message}`);
    }
  }

  /**
   * Generate comprehensive status report
   */
  generateStatusReport() {
    const timestamp = new Date().toISOString();
    
    const report = {
      timestamp: timestamp,
      release: {
        title: this.releaseTitle,
        tag: this.releaseTag,
        url: this.releaseUrl
      },
      automation: {
        email: {
          status: this.emailStatus,
          emoji: this.getStatusEmoji(this.emailStatus)
        },
        jira: {
          status: this.jiraStatus,
          emoji: this.getStatusEmoji(this.jiraStatus)
        },
        drive: {
          status: this.driveStatus,
          emoji: this.getStatusEmoji(this.driveStatus)
        }
      },
      summary: {
        overall: this.getOverallStatus(),
        timestamp: timestamp
      }
    };

    return report;
  }

  /**
   * Determine overall automation status
   */
  getOverallStatus() {
    const statuses = [this.emailStatus, this.jiraStatus, this.driveStatus];
    const failedCount = statuses.filter(s => s === 'failed').length;
    const partialCount = statuses.filter(s => s === 'partial').length;
    const skippedCount = statuses.filter(s => s === 'skipped').length;
    const successCount = statuses.filter(s => s === 'success').length;

    if (failedCount > 0) {
      return 'failed';
    } else if (partialCount > 0) {
      return 'partial';
    } else if (successCount > 0) {
      return 'success';
    } else if (skippedCount === statuses.length) {
      return 'skipped';
    } else {
      return 'unknown';
    }
  }

  /**
   * Log status report to console
   */
  logStatusReport() {
    const report = this.generateStatusReport();
    
    console.log('📊 Release Automation Status Report');
    console.log('=====================================');
    console.log(`Release: ${report.release.title}`);
    console.log(`Tag: ${report.release.tag}`);
    console.log(`URL: ${report.release.url}`);
    console.log('');
    console.log('Automation Status:');
    console.log(`  ${report.automation.email.emoji} Customer Emails: ${report.automation.email.status}`);
    console.log(`  ${report.automation.jira.emoji} Jira Updates: ${report.automation.jira.status}`);
    console.log(`  ${report.automation.drive.emoji} Drive Sync: ${report.automation.drive.status}`);
    console.log('');
    console.log(`Overall Status: ${report.summary.overall.toUpperCase()}`);
    console.log(`Timestamp: ${report.summary.timestamp}`);
  }

  /**
   * Set GitHub Actions outputs
   */
  setOutputs() {
    const report = this.generateStatusReport();
    
    core.setOutput('overall_status', report.summary.overall);
    core.setOutput('email_status', report.automation.email.status);
    core.setOutput('jira_status', report.automation.jira.status);
    core.setOutput('drive_status', report.automation.drive.status);
    core.setOutput('timestamp', report.summary.timestamp);
  }

  /**
   * Send all team notifications
   */
  async sendNotifications() {
    try {
      // Log status report
      this.logStatusReport();
      
      // Send Google Chat notification
      await this.sendGoogleChatNotification();
      
      // Set GitHub Actions outputs
      this.setOutputs();
      
      console.log('✅ Team notifications completed successfully');
      
    } catch (error) {
      console.log(`❌ Team notifications failed: ${error.message}`);
      core.setFailed(`Team notifications failed: ${error.message}`);
    }
  }
}

// Main execution
if (require.main === module) {
  const notifier = new TeamNotifier();
  notifier.sendNotifications().catch(error => {
    core.setFailed(`Team notifications failed: ${error.message}`);
  });
}

module.exports = TeamNotifier; 
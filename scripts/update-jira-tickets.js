#!/usr/bin/env node

const core = require('@actions/core');
const axios = require('axios');
const retry = require('retry');

/**
 * Jira API integration for updating tickets with release information
 * Handles authentication, comment creation, and field updates
 */
class JiraTicketUpdater {
  constructor() {
    this.apiToken = process.env.JIRA_API_TOKEN;
    this.userEmail = process.env.JIRA_USER_EMAIL;
    this.baseUrl = process.env.JIRA_BASE_URL || 'https://pacificdesignengineering.atlassian.net';
    
    this.jiraTickets = process.env.JIRA_TICKETS || '';
    this.releaseTitle = process.env.RELEASE_TITLE || '';
    this.releaseUrl = process.env.RELEASE_URL || '';
    this.releaseTag = process.env.RELEASE_TAG || '';
    this.businessImpact = process.env.BUSINESS_IMPACT || '';
    this.technicalChanges = process.env.TECHNICAL_CHANGES || '';
    this.customerEmails = process.env.CUSTOMER_EMAILS || '';
  }

  /**
   * Create authenticated axios instance for Jira API
   */
  createJiraClient() {
    const auth = Buffer.from(`${this.userEmail}:${this.apiToken}`).toString('base64');
    
    return axios.create({
      baseURL: `${this.baseUrl}/rest/api/3`,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
  }

  /**
   * Generate Jira comment content
   */
  generateJiraComment() {
    const comment = {
      body: {
        type: "doc",
        version: 1,
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: `🚀 Released to Customer: ${this.releaseTitle}`,
                marks: [{ type: "strong" }]
              }
            ]
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: `\nBusiness Impact: ${this.businessImpact || 'Not specified'}`
              }
            ]
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: `\nTechnical Changes: ${this.technicalChanges || 'Not specified'}`
              }
            ]
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: `\n📎 Release Package: ${this.generateFileListText()}`
              }
            ]
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: `\n🔗 Release Details: `,
                marks: [{ type: "strong" }]
              },
              {
                type: "inlineCard",
                attrs: {
                  url: this.releaseUrl
                }
              }
            ]
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: `📧 Customer Email: Sent to ${this.customerEmails || 'No emails specified'}`
              }
            ]
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: `\n📅 Release Date: ${new Date().toISOString().split('T')[0]}`,
                marks: [{ type: "em" }]
              }
            ]
          }
        ]
      }
    };

    return comment;
  }

  /**
   * Generate file list text for Jira comment
   */
  generateFileListText() {
    const filePatterns = [
      { pattern: /\[ \] Updated drawings \(PDF\)/i, label: 'Updated drawings (PDF)' },
      { pattern: /\[ \] 3D models \(STEP\/SolidWorks\)/i, label: '3D models (STEP/SolidWorks)' },
      { pattern: /\[ \] Documentation updates/i, label: 'Documentation updates' },
      { pattern: /\[ \] Test results/i, label: 'Test results' }
    ];

    const files = [];
    for (const filePattern of filePatterns) {
      if (this.businessImpact.match(filePattern.pattern) || this.technicalChanges.match(filePattern.pattern)) {
        files.push(filePattern.label);
      }
    }

    return files.length > 0 ? files.join(', ') : 'No specific files';
  }

  /**
   * Add comment to Jira ticket
   */
  async addCommentToTicket(ticketId, comment) {
    const jiraClient = this.createJiraClient();
    
    try {
      const response = await jiraClient.post(`/issue/${ticketId}/comment`, comment);
      
      return {
        success: true,
        commentId: response.data.id,
        ticketId: ticketId
      };
    } catch (error) {
      if (error.response) {
        throw new Error(`Jira API error (${error.response.status}): ${error.response.data.errorMessages?.join(', ') || error.response.statusText}`);
      } else {
        throw new Error(`Network error: ${error.message}`);
      }
    }
  }

  /**
   * Update Jira ticket with retry logic
   */
  async updateTicketWithRetry(ticketId, comment, maxRetries = 3) {
    const operation = retry.operation({
      retries: maxRetries,
      factor: 2,
      minTimeout: 1000,
      maxTimeout: 10000
    });

    return new Promise((resolve, reject) => {
      operation.attempt(async (currentAttempt) => {
        try {
          const result = await this.addCommentToTicket(ticketId, comment);
          resolve(result);
        } catch (error) {
          console.log(`Attempt ${currentAttempt} failed for ticket ${ticketId}: ${error.message}`);
          
          if (operation.retry(error)) {
            console.log(`Retrying in ${operation.timeouts()[currentAttempt - 1]}ms...`);
            return;
          }
          
          reject(operation.mainError());
        }
      });
    });
  }

  /**
   * Validate Jira ticket format
   */
  isValidJiraTicket(ticket) {
    const ticketRegex = /^PDE-\d+$/;
    return ticketRegex.test(ticket);
  }

  /**
   * Check if ticket exists and is accessible
   */
  async validateTicket(ticketId) {
    const jiraClient = this.createJiraClient();
    
    try {
      await jiraClient.get(`/issue/${ticketId}?fields=summary,status`);
      return true;
    } catch (error) {
      if (error.response && error.response.status === 404) {
        throw new Error(`Ticket ${ticketId} not found`);
      } else if (error.response && error.response.status === 403) {
        throw new Error(`No permission to access ticket ${ticketId}`);
      } else {
        throw new Error(`Failed to validate ticket ${ticketId}: ${error.message}`);
      }
    }
  }

  /**
   * Update all Jira tickets with release information
   */
  async updateJiraTickets() {
    if (!this.jiraTickets) {
      console.log('No Jira tickets specified, skipping Jira updates');
      core.setOutput('status', 'skipped');
      core.setOutput('updated_count', '0');
      core.setOutput('failed_count', '0');
      return;
    }

    const tickets = this.jiraTickets.split(' ').map(ticket => ticket.trim());
    const validTickets = tickets.filter(ticket => this.isValidJiraTicket(ticket));
    
    if (validTickets.length === 0) {
      console.log('No valid Jira tickets found');
      core.setOutput('status', 'skipped');
      core.setOutput('updated_count', '0');
      core.setOutput('failed_count', '0');
      return;
    }

    const comment = this.generateJiraComment();
    const results = {
      updated: [],
      failed: []
    };

    console.log(`🔧 Updating ${validTickets.length} Jira ticket(s)...`);

    for (const ticketId of validTickets) {
      try {
        // Validate ticket exists and is accessible
        await this.validateTicket(ticketId);
        
        // Add comment to ticket
        const result = await this.updateTicketWithRetry(ticketId, comment);
        
        results.updated.push({
          ticketId: ticketId,
          commentId: result.commentId
        });
        
        console.log(`✅ Updated ticket ${ticketId} with release comment`);
        
        // Add delay between API calls to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        results.failed.push({
          ticketId: ticketId,
          error: error.message
        });
        
        console.log(`❌ Failed to update ticket ${ticketId}: ${error.message}`);
      }
    }

    // Set GitHub Actions outputs
    core.setOutput('status', results.failed.length === 0 ? 'success' : 'partial');
    core.setOutput('updated_count', results.updated.length.toString());
    core.setOutput('failed_count', results.failed.length.toString());
    core.setOutput('updated_tickets', results.updated.map(r => r.ticketId).join(','));
    core.setOutput('failed_tickets', results.failed.map(r => r.ticketId).join(','));

    // Log summary
    console.log(`📊 Jira Update Summary:`);
    console.log(`  ✅ Updated: ${results.updated.length}`);
    console.log(`  ❌ Failed: ${results.failed.length}`);
    
    if (results.failed.length > 0) {
      console.log(`  Failed tickets: ${results.failed.map(r => r.ticketId).join(', ')}`);
    }

    if (results.failed.length > 0) {
      throw new Error(`${results.failed.length} ticket(s) failed to update`);
    }
  }
}

// Main execution
if (require.main === module) {
  const updater = new JiraTicketUpdater();
  updater.updateJiraTickets().catch(error => {
    core.setFailed(`Jira update failed: ${error.message}`);
  });
}

module.exports = JiraTicketUpdater; 
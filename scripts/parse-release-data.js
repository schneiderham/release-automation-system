#!/usr/bin/env node

const core = require('@actions/core');
const yaml = require('js-yaml');

/**
 * Parse release data from GitHub release body
 * Extracts customer emails, Jira tickets, release type, and other structured data
 */
class ReleaseDataParser {
  constructor() {
    this.releaseTitle = process.env.RELEASE_TITLE || '';
    this.releaseBody = process.env.RELEASE_BODY || '';
    this.releaseTag = process.env.RELEASE_TAG || '';
    this.releaseUrl = process.env.RELEASE_URL || '';
    this.releaseId = process.env.RELEASE_ID || '';
  }

  /**
   * Extract customer emails from release body
   * Looks for patterns like "Customer Email(s): email1@domain.com, email2@domain.com"
   */
  extractCustomerEmails() {
    const emailPatterns = [
      /Customer Email\(s\):\s*([^\n]+)/i,
      /Customer Emails:\s*([^\n]+)/i,
      /Emails:\s*([^\n]+)/i,
      /To:\s*([^\n]+)/i
    ];

    for (const pattern of emailPatterns) {
      const match = this.releaseBody.match(pattern);
      if (match) {
        const emails = match[1]
          .split(/[,\s]+/)
          .map(email => email.trim())
          .filter(email => this.isValidEmail(email));
        
        if (emails.length > 0) {
          return emails.join(',');
        }
      }
    }

    return '';
  }

  /**
   * Extract Jira ticket references from release body
   * Looks for patterns like "Jira Tickets: PDE-123 PDE-456" or "Related Work: PDE-123"
   */
  extractJiraTickets() {
    const ticketPatterns = [
      /Jira Tickets?:\s*([^\n]+)/i,
      /Related Jira Tickets?:\s*([^\n]+)/i,
      /Related Work:\s*([^\n]+)/i,
      /Tickets?:\s*([^\n]+)/i
    ];

    for (const pattern of ticketPatterns) {
      const match = this.releaseBody.match(pattern);
      if (match) {
        const tickets = match[1]
          .split(/\s+/)
          .map(ticket => ticket.trim())
          .filter(ticket => this.isValidJiraTicket(ticket));
        
        if (tickets.length > 0) {
          return tickets.join(' ');
        }
      }
    }

    // Also look for inline ticket references in the body
    const inlineTicketPattern = /(PDE-\d+)/g;
    const inlineTickets = [...this.releaseBody.matchAll(inlineTicketPattern)]
      .map(match => match[1])
      .filter((ticket, index, arr) => arr.indexOf(ticket) === index); // Remove duplicates

    return inlineTickets.join(' ');
  }

  /**
   * Determine release type based on title and content
   */
  determineReleaseType() {
    const title = this.releaseTitle.toLowerCase();
    const body = this.releaseBody.toLowerCase();

    if (title.includes('major') || body.includes('major release')) {
      return 'major';
    } else if (title.includes('minor') || body.includes('minor update')) {
      return 'minor';
    } else if (title.includes('bug') || title.includes('fix') || body.includes('bug fix')) {
      return 'bugfix';
    } else if (title.includes('doc') || title.includes('documentation') || body.includes('documentation')) {
      return 'documentation';
    } else {
      return 'update';
    }
  }

  /**
   * Extract business impact section
   */
  extractBusinessImpact() {
    const patterns = [
      /## Business Impact\s*\n([\s\S]*?)(?=\n##|\n###|\n\n\n|$)/i,
      /Business Impact:\s*\n([\s\S]*?)(?=\n##|\n###|\n\n\n|$)/i,
      /What's New:\s*\n([\s\S]*?)(?=\n##|\n###|\n\n\n|$)/i
    ];

    for (const pattern of patterns) {
      const match = this.releaseBody.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return '';
  }

  /**
   * Extract technical changes section
   */
  extractTechnicalChanges() {
    const patterns = [
      /## Technical Changes\s*\n([\s\S]*?)(?=\n##|\n###|\n\n\n|$)/i,
      /Technical Changes:\s*\n([\s\S]*?)(?=\n##|\n###|\n\n\n|$)/i,
      /Changes Made:\s*\n([\s\S]*?)(?=\n##|\n###|\n\n\n|$)/i
    ];

    for (const pattern of patterns) {
      const match = this.releaseBody.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return '';
  }

  /**
   * Check if release has file attachments
   */
  hasFileAttachments() {
    const filePatterns = [
      /\[[ x]\] Updated drawings \(PDF\)/i,
      /\[[ x]\] 3D models \(STEP\/SolidWorks\)/i,
      /\[[ x]\] Documentation updates/i,
      /\[[ x]\] Test results/i,
      /Files Included:/i,
      /Attachments:/i
    ];

    return filePatterns.some(pattern => this.releaseBody.match(pattern));
  }

  /**
   * Validate email format
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate Jira ticket format (PDE-123)
   */
  isValidJiraTicket(ticket) {
    const ticketRegex = /^PDE-\d+$/;
    return ticketRegex.test(ticket);
  }

  /**
   * Parse all release data and set GitHub Actions outputs
   */
  parse() {
    try {
      const customerEmails = this.extractCustomerEmails();
      const jiraTickets = this.extractJiraTickets();
      const releaseType = this.determineReleaseType();
      const businessImpact = this.extractBusinessImpact();
      const technicalChanges = this.extractTechnicalChanges();
      const hasFiles = this.hasFileAttachments();

      // Set GitHub Actions outputs
      core.setOutput('customer_emails', customerEmails);
      core.setOutput('jira_tickets', jiraTickets);
      core.setOutput('release_type', releaseType);
      core.setOutput('business_impact', businessImpact);
      core.setOutput('technical_changes', technicalChanges);
      core.setOutput('has_files', hasFiles ? 'true' : 'false');

      // Log parsed data
      console.log('📋 Parsed Release Data:');
      console.log(`  Title: ${this.releaseTitle}`);
      console.log(`  Tag: ${this.releaseTag}`);
      console.log(`  Type: ${releaseType}`);
      console.log(`  Customer Emails: ${customerEmails || 'None'}`);
      console.log(`  Jira Tickets: ${jiraTickets || 'None'}`);
      console.log(`  Has Files: ${hasFiles ? 'Yes' : 'No'}`);
      console.log(`  Business Impact: ${businessImpact ? 'Found' : 'Not found'}`);
      console.log(`  Technical Changes: ${technicalChanges ? 'Found' : 'Not found'}`);

      return {
        customerEmails,
        jiraTickets,
        releaseType,
        businessImpact,
        technicalChanges,
        hasFiles
      };

    } catch (error) {
      core.setFailed(`Failed to parse release data: ${error.message}`);
      throw error;
    }
  }
}

// Main execution
if (require.main === module) {
  const parser = new ReleaseDataParser();
  parser.parse();
}

module.exports = ReleaseDataParser; 
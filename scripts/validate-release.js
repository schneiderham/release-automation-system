#!/usr/bin/env node

const core = require('@actions/core');

/**
 * Validate release data to ensure it meets requirements
 * Checks for required fields, proper formatting, and completeness
 */
class ReleaseValidator {
  constructor() {
    this.customerEmails = process.env.CUSTOMER_EMAILS || '';
    this.jiraTickets = process.env.JIRA_TICKETS || '';
    this.releaseType = process.env.RELEASE_TYPE || '';
  }

  /**
   * Validate customer emails format and presence
   */
  validateCustomerEmails() {
    if (!this.customerEmails) {
      return { valid: false, error: 'No customer emails found in release' };
    }

    const emails = this.customerEmails.split(',').map(email => email.trim());
    const invalidEmails = emails.filter(email => !this.isValidEmail(email));

    if (invalidEmails.length > 0) {
      return { 
        valid: false, 
        error: `Invalid email format(s): ${invalidEmails.join(', ')}` 
      };
    }

    return { valid: true };
  }

  /**
   * Validate Jira tickets format
   */
  validateJiraTickets() {
    if (!this.jiraTickets) {
      // Jira tickets are optional, so this is not an error
      return { valid: true, warning: 'No Jira tickets referenced' };
    }

    const tickets = this.jiraTickets.split(' ').map(ticket => ticket.trim());
    const invalidTickets = tickets.filter(ticket => !this.isValidJiraTicket(ticket));

    if (invalidTickets.length > 0) {
      return { 
        valid: false, 
        error: `Invalid Jira ticket format(s): ${invalidTickets.join(', ')}` 
      };
    }

    return { valid: true };
  }

  /**
   * Validate release type
   */
  validateReleaseType() {
    const validTypes = ['major', 'minor', 'bugfix', 'documentation', 'update'];
    
    if (!this.releaseType) {
      return { valid: false, error: 'Release type could not be determined' };
    }

    if (!validTypes.includes(this.releaseType)) {
      return { 
        valid: false, 
        error: `Invalid release type: ${this.releaseType}. Valid types: ${validTypes.join(', ')}` 
      };
    }

    return { valid: true };
  }

  /**
   * Check if release has minimum required content
   */
  validateReleaseContent() {
    const releaseBody = process.env.RELEASE_BODY || '';
    
    if (!releaseBody.trim()) {
      return { valid: false, error: 'Release body is empty' };
    }

    // Check for business impact or technical changes sections
    const hasBusinessImpact = /## Business Impact|Business Impact:|What's New:/i.test(releaseBody);
    const hasTechnicalChanges = /## Technical Changes|Technical Changes:|Changes Made:/i.test(releaseBody);

    if (!hasBusinessImpact && !hasTechnicalChanges) {
      return { 
        valid: false, 
        error: 'Release must contain either Business Impact or Technical Changes section' 
      };
    }

    return { valid: true };
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
   * Perform comprehensive validation
   */
  validate() {
    const validations = [
      this.validateCustomerEmails(),
      this.validateJiraTickets(),
      this.validateReleaseType(),
      this.validateReleaseContent()
    ];

    const errors = [];
    const warnings = [];
    let isValid = true;

    for (const validation of validations) {
      if (!validation.valid) {
        errors.push(validation.error);
        isValid = false;
      }
      if (validation.warning) {
        warnings.push(validation.warning);
      }
    }

    // Set GitHub Actions outputs
    core.setOutput('is_valid', isValid ? 'true' : 'false');
    
    if (errors.length > 0) {
      core.setOutput('validation_errors', errors.join('; '));
    }
    
    if (warnings.length > 0) {
      core.setOutput('validation_warnings', warnings.join('; '));
    }

    // Log validation results
    console.log('🔍 Release Validation Results:');
    console.log(`  Valid: ${isValid ? '✅ Yes' : '❌ No'}`);
    
    if (errors.length > 0) {
      console.log('  Errors:');
      errors.forEach(error => console.log(`    ❌ ${error}`));
    }
    
    if (warnings.length > 0) {
      console.log('  Warnings:');
      warnings.forEach(warning => console.log(`    ⚠️  ${warning}`));
    }

    if (!isValid) {
      core.setFailed(`Release validation failed: ${errors.join('; ')}`);
    }

    return {
      isValid,
      errors,
      warnings
    };
  }
}

// Main execution
if (require.main === module) {
  const validator = new ReleaseValidator();
  validator.validate();
}

module.exports = ReleaseValidator; 
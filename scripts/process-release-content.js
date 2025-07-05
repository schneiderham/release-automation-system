#!/usr/bin/env node

const core = require('@actions/core');
const marked = require('marked');
const cheerio = require('cheerio');

/**
 * Process release content for email and Jira integration
 * Converts markdown to HTML, generates email subjects, and formats content
 */
class ContentProcessor {
  constructor() {
    this.releaseBody = process.env.RELEASE_BODY || '';
    this.releaseTitle = process.env.RELEASE_TITLE || '';
    this.releaseType = process.env.RELEASE_TYPE || '';
  }

  /**
   * Convert markdown to HTML with custom styling
   */
  convertMarkdownToHtml(markdown) {
    // Configure marked options for better HTML output
    marked.setOptions({
      breaks: true,
      gfm: true,
      headerIds: false
    });

    // Convert markdown to HTML
    let html = marked.parse(markdown);

    // Load HTML into cheerio for manipulation
    const $ = cheerio.load(html);

    // Add custom styling to elements
    $('h1, h2, h3, h4, h5, h6').addClass('section-header');
    $('p').addClass('paragraph');
    $('ul, ol').addClass('list');
    $('li').addClass('list-item');
    $('code').addClass('inline-code');
    $('pre').addClass('code-block');
    $('blockquote').addClass('quote');

    // Convert inline code blocks to styled spans
    $('code').each((index, element) => {
      const text = $(element).text();
      $(element).replaceWith(`<span class="inline-code">${text}</span>`);
    });

    // Convert code blocks to styled pre elements
    $('pre').each((index, element) => {
      const code = $(element).find('code');
      if (code.length > 0) {
        const text = code.text();
        $(element).replaceWith(`<pre class="code-block"><code>${text}</code></pre>`);
      }
    });

    return $.html();
  }

  /**
   * Generate email subject line based on release type and title
   */
  generateEmailSubject() {
    const typeLabels = {
      'major': '🚀 Major Release',
      'minor': '📦 Minor Update', 
      'bugfix': '🐛 Bug Fix',
      'documentation': '📚 Documentation Update',
      'update': '📋 Update'
    };

    const typeLabel = typeLabels[this.releaseType] || '📋 Update';
    const shortTitle = this.releaseTitle.length > 50 
      ? this.releaseTitle.substring(0, 47) + '...'
      : this.releaseTitle;

    return `${typeLabel}: ${shortTitle}`;
  }

  /**
   * Extract and format business impact for email
   */
  extractBusinessImpactForEmail() {
    const patterns = [
      /## Business Impact\s*\n([\s\S]*?)(?=\n##|\n###|\n\n\n|$)/i,
      /Business Impact:\s*\n([\s\S]*?)(?=\n##|\n###|\n\n\n|$)/i,
      /What's New:\s*\n([\s\S]*?)(?=\n##|\n###|\n\n\n|$)/i
    ];

    for (const pattern of patterns) {
      const match = this.releaseBody.match(pattern);
      if (match) {
        return this.convertMarkdownToHtml(match[1].trim());
      }
    }

    return '';
  }

  /**
   * Extract and format technical changes for email
   */
  extractTechnicalChangesForEmail() {
    const patterns = [
      /## Technical Changes\s*\n([\s\S]*?)(?=\n##|\n###|\n\n\n|$)/i,
      /Technical Changes:\s*\n([\s\S]*?)(?=\n##|\n###|\n\n\n|$)/i,
      /Changes Made:\s*\n([\s\S]*?)(?=\n##|\n###|\n\n\n|$)/i
    ];

    for (const pattern of patterns) {
      const match = this.releaseBody.match(pattern);
      if (match) {
        return this.convertMarkdownToHtml(match[1].trim());
      }
    }

    return '';
  }

  /**
   * Generate file list for email
   */
  generateFileList() {
    const filePatterns = [
      { pattern: /\[[ x]\] Updated drawings \(PDF\)/i, label: 'Updated drawings (PDF)' },
      { pattern: /\[[ x]\] 3D models \(STEP\/SolidWorks\)/i, label: '3D models (STEP/SolidWorks)' },
      { pattern: /\[[ x]\] Documentation updates/i, label: 'Documentation updates' },
      { pattern: /\[[ x]\] Test results/i, label: 'Test results' }
    ];

    const files = [];
    for (const filePattern of filePatterns) {
      if (this.releaseBody.match(filePattern.pattern)) {
        files.push(filePattern.label);
      }
    }

    if (files.length === 0) {
      return '<p>No specific files included in this release.</p>';
    }

    const fileList = files.map(file => `<li>${file}</li>`).join('');
    return `<ul class="file-list">${fileList}</ul>`;
  }

  /**
   * Generate customer-appropriate email body
   */
  generateEmailBody() {
    const businessImpact = this.extractBusinessImpactForEmail();
    const technicalChanges = this.extractTechnicalChangesForEmail();
    const fileList = this.generateFileList();
    const releaseUrl = process.env.RELEASE_URL || '';
    const releaseTag = process.env.RELEASE_TAG || '';

    // Create customer-friendly email content
    let emailBody = `
      <div class="section">
        <h1 class="section-header">${this.releaseTitle}</h1>
        <div class="content">
          <p>We're pleased to announce the release of ${this.releaseTitle}.</p>
        </div>
      </div>
    `;

    if (businessImpact) {
      emailBody += `
        <div class="section">
          <h2 class="section-header">What's New</h2>
          <div class="content">
            ${businessImpact}
          </div>
        </div>
      `;
    }

    if (technicalChanges) {
      emailBody += `
        <div class="section">
          <h2 class="section-header">Technical Changes</h2>
          <div class="content">
            ${technicalChanges}
          </div>
        </div>
      `;
    }

    emailBody += `
      <div class="section">
        <h2 class="section-header">Release Files</h2>
        <div class="content">
          ${fileList}
        </div>
      </div>
      
      <div class="section">
        <h2 class="section-header">Complete Details</h2>
        <div class="content">
          <p>For complete documentation and file downloads, please visit:</p>
          <p><a href="${releaseUrl}" class="release-link">View full release documentation</a></p>
        </div>
      </div>
    `;

    return emailBody;
  }

  /**
   * Generate Jira comment content
   */
  generateJiraComment() {
    const businessImpact = this.extractBusinessImpactForEmail();
    const technicalChanges = this.extractTechnicalChangesForEmail();
    const releaseUrl = process.env.RELEASE_URL || '';
    const customerEmails = process.env.CUSTOMER_EMAILS || '';

    // Strip HTML tags for Jira text
    const stripHtml = (html) => {
      return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    };

    const businessImpactText = stripHtml(businessImpact);
    const technicalChangesText = stripHtml(technicalChanges);

    return `🚀 Released to Customer: ${this.releaseTitle}

Business Impact: ${businessImpactText || 'Not specified'}

Technical Changes: ${technicalChangesText || 'Not specified'}

📎 Release Package: ${this.generateFileListText()}

🔗 Release Details: ${releaseUrl}
📧 Customer Email: Sent to ${customerEmails || 'No emails specified'}`;
  }

  /**
   * Generate plain text file list for Jira
   */
  generateFileListText() {
    const filePatterns = [
      { pattern: /\[[ x]\] Updated drawings \(PDF\)/i, label: 'Updated drawings (PDF)' },
      { pattern: /\[[ x]\] 3D models \(STEP\/SolidWorks\)/i, label: '3D models (STEP/SolidWorks)' },
      { pattern: /\[[ x]\] Documentation updates/i, label: 'Documentation updates' },
      { pattern: /\[[ x]\] Test results/i, label: 'Test results' }
    ];

    const files = [];
    for (const filePattern of filePatterns) {
      if (this.releaseBody.match(filePattern.pattern)) {
        files.push(filePattern.label);
      }
    }

    return files.length > 0 ? files.join(', ') : 'No specific files';
  }

  /**
   * Process all content and set outputs
   */
  process() {
    try {
      const emailSubject = this.generateEmailSubject();
      const emailBody = this.generateEmailBody();
      const jiraComment = this.generateJiraComment();
      const businessImpact = this.extractBusinessImpactForEmail();
      const technicalChanges = this.extractTechnicalChangesForEmail();

      // Set GitHub Actions outputs
      core.setOutput('email_subject', emailSubject);
      core.setOutput('email_body', emailBody);
      core.setOutput('jira_comment', jiraComment);
      core.setOutput('business_impact', businessImpact);
      core.setOutput('technical_changes', technicalChanges);

      // Log processing results
      console.log('📝 Content Processing Results:');
      console.log(`  Email Subject: ${emailSubject}`);
      console.log(`  Business Impact: ${businessImpact ? 'Found' : 'Not found'}`);
      console.log(`  Technical Changes: ${technicalChanges ? 'Found' : 'Not found'}`);
      console.log(`  Release Type: ${this.releaseType}`);

      return {
        emailSubject,
        emailBody,
        jiraComment,
        businessImpact,
        technicalChanges
      };

    } catch (error) {
      core.setFailed(`Failed to process release content: ${error.message}`);
      throw error;
    }
  }
}

// Main execution
if (require.main === module) {
  const processor = new ContentProcessor();
  processor.process();
}

module.exports = ContentProcessor; 
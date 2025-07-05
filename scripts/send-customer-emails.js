#!/usr/bin/env node

const core = require('@actions/core');
const { google } = require('googleapis');
const nodemailer = require('nodemailer');
const retry = require('retry');

/**
 * Gmail API integration for sending customer release emails
 * Handles OAuth2 authentication and email delivery with retry logic
 */
class GmailEmailSender {
  constructor() {
    this.clientId = process.env.GMAIL_CLIENT_ID;
    this.clientSecret = process.env.GMAIL_CLIENT_SECRET;
    this.refreshToken = process.env.GMAIL_REFRESH_TOKEN;
    this.fromEmail = process.env.DEFAULT_FROM_EMAIL || 'releases@pde.com';
    
    this.customerEmails = process.env.CUSTOMER_EMAILS || '';
    this.emailSubject = process.env.EMAIL_SUBJECT || '';
    this.emailBody = process.env.EMAIL_BODY || '';
    this.releaseUrl = process.env.RELEASE_URL || '';
    this.releaseTag = process.env.RELEASE_TAG || '';
  }

  /**
   * Create OAuth2 client for Gmail API
   */
  createOAuth2Client() {
    return new google.auth.OAuth2(
      this.clientId,
      this.clientSecret,
      'urn:ietf:wg:oauth:2.0:oob'
    );
  }

  /**
   * Get Gmail API client with authentication
   */
  async getGmailClient() {
    const oauth2Client = this.createOAuth2Client();
    
    oauth2Client.setCredentials({
      refresh_token: this.refreshToken
    });

    return google.gmail({ version: 'v1', auth: oauth2Client });
  }

  /**
   * Create email template with professional styling
   */
  createEmailTemplate(toEmail, subject, body) {
    const htmlTemplate = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PDE Release Notification</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 20px;
        }
        .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            padding: 30px 20px; 
            text-align: center; 
            border-radius: 8px 8px 0 0;
        }
        .header h1 { 
            margin: 0; 
            font-size: 24px; 
            font-weight: 600;
        }
        .content { 
            background: #f9f9f9; 
            padding: 30px 20px; 
            border-radius: 0 0 8px 8px;
        }
        .section { 
            margin-bottom: 25px; 
            background: white; 
            padding: 20px; 
            border-radius: 6px; 
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .section-header { 
            color: #2c3e50; 
            font-size: 18px; 
            margin-bottom: 15px; 
            border-bottom: 2px solid #3498db; 
            padding-bottom: 8px;
        }
        .paragraph { 
            margin-bottom: 12px; 
            color: #555;
        }
        .list { 
            margin: 15px 0; 
            padding-left: 20px;
        }
        .list-item { 
            margin-bottom: 8px; 
            color: #555;
        }
        .inline-code { 
            background: #f4f4f4; 
            padding: 2px 6px; 
            border-radius: 3px; 
            font-family: 'Courier New', monospace; 
            font-size: 0.9em;
        }
        .code-block { 
            background: #f8f9fa; 
            border: 1px solid #e9ecef; 
            border-radius: 4px; 
            padding: 15px; 
            overflow-x: auto; 
            font-family: 'Courier New', monospace;
        }
        .file-list { 
            background: #e8f4fd; 
            border-left: 4px solid #3498db; 
            padding: 15px; 
            margin: 15px 0;
        }
        .release-link { 
            display: inline-block; 
            background: #3498db; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 6px; 
            font-weight: 600; 
            margin-top: 10px;
        }
        .release-link:hover { 
            background: #2980b9; 
            text-decoration: none;
        }
        .footer { 
            background: #34495e; 
            color: white; 
            padding: 20px; 
            text-align: center; 
            border-radius: 8px; 
            margin-top: 20px;
        }
        .footer p { 
            margin: 5px 0; 
            font-size: 14px;
        }
        .company-info { 
            font-size: 12px; 
            color: #bdc3c7;
        }
        @media only screen and (max-width: 600px) {
            body { padding: 10px; }
            .header h1 { font-size: 20px; }
            .content { padding: 20px 15px; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${subject}</h1>
    </div>
    
    <div class="content">
        ${body}
        
        <div class="footer">
            <p><strong>Pacific Design Engineering</strong></p>
            <p>Reference: ${this.releaseTag}</p>
            <p class="company-info">This is an automated notification from our release management system.</p>
        </div>
    </div>
</body>
</html>`;

    return {
      from: this.fromEmail,
      to: toEmail,
      subject: subject,
      html: htmlTemplate,
      text: this.convertHtmlToText(htmlTemplate)
    };
  }

  /**
   * Convert HTML to plain text for email clients that don't support HTML
   */
  convertHtmlToText(html) {
    // Simple HTML to text conversion
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Send email using Gmail API
   */
  async sendEmail(emailData) {
    const gmail = await this.getGmailClient();
    
    // Create email message
    const message = {
      to: emailData.to,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text
    };

    // Encode email for Gmail API
    const encodedMessage = Buffer.from(
      `From: ${emailData.from}\r\n` +
      `To: ${emailData.to}\r\n` +
      `Subject: ${emailData.subject}\r\n` +
      `MIME-Version: 1.0\r\n` +
      `Content-Type: text/html; charset=utf-8\r\n` +
      `\r\n` +
      `${emailData.html}`
    ).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    try {
      const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage
        }
      });

      return {
        success: true,
        messageId: response.data.id,
        threadId: response.data.threadId
      };
    } catch (error) {
      throw new Error(`Failed to send email to ${emailData.to}: ${error.message}`);
    }
  }

  /**
   * Send email with retry logic
   */
  async sendEmailWithRetry(emailData, maxRetries = 3) {
    const operation = retry.operation({
      retries: maxRetries,
      factor: 2,
      minTimeout: 1000,
      maxTimeout: 10000
    });

    return new Promise((resolve, reject) => {
      operation.attempt(async (currentAttempt) => {
        try {
          const result = await this.sendEmail(emailData);
          resolve(result);
        } catch (error) {
          console.log(`Attempt ${currentAttempt} failed: ${error.message}`);
          
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
   * Send emails to all customers
   */
  async sendCustomerEmails() {
    if (!this.customerEmails) {
      console.log('No customer emails specified, skipping email sending');
      core.setOutput('status', 'skipped');
      core.setOutput('sent_count', '0');
      core.setOutput('failed_count', '0');
      return;
    }

    const emails = this.customerEmails.split(',').map(email => email.trim());
    const results = {
      sent: [],
      failed: []
    };

    console.log(`📧 Sending emails to ${emails.length} customer(s)...`);

    for (const email of emails) {
      try {
        const emailData = this.createEmailTemplate(email, this.emailSubject, this.emailBody);
        const result = await this.sendEmailWithRetry(emailData);
        
        results.sent.push({
          email: email,
          messageId: result.messageId,
          threadId: result.threadId
        });
        
        console.log(`✅ Email sent successfully to ${email}`);
        
        // Add delay between emails to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        results.failed.push({
          email: email,
          error: error.message
        });
        
        console.log(`❌ Failed to send email to ${email}: ${error.message}`);
      }
    }

    // Set GitHub Actions outputs
    core.setOutput('status', results.failed.length === 0 ? 'success' : 'partial');
    core.setOutput('sent_count', results.sent.length.toString());
    core.setOutput('failed_count', results.failed.length.toString());
    core.setOutput('sent_emails', results.sent.map(r => r.email).join(','));
    core.setOutput('failed_emails', results.failed.map(r => r.email).join(','));

    // Log summary
    console.log(`📊 Email Summary:`);
    console.log(`  ✅ Sent: ${results.sent.length}`);
    console.log(`  ❌ Failed: ${results.failed.length}`);
    
    if (results.failed.length > 0) {
      console.log(`  Failed emails: ${results.failed.map(r => r.email).join(', ')}`);
    }

    if (results.failed.length > 0) {
      throw new Error(`${results.failed.length} email(s) failed to send`);
    }
  }
}

// Main execution
if (require.main === module) {
  const sender = new GmailEmailSender();
  sender.sendCustomerEmails().catch(error => {
    core.setFailed(`Email sending failed: ${error.message}`);
  });
}

module.exports = GmailEmailSender; 
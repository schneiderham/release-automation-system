// scripts/send_po_release_email.js
// Sends a release notification email to the Product Owner (PO) and CCs internal stakeholders

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { google } = require('googleapis');
const nodemailer = require('nodemailer');

// Load config
defaultConfigPath = path.resolve(__dirname, '../release_config.yml');
const config = yaml.load(fs.readFileSync(defaultConfigPath, 'utf8'));

// Environment variables
const {
  GMAIL_CLIENT_ID,
  GMAIL_CLIENT_SECRET,
  GMAIL_REFRESH_TOKEN,
  DEFAULT_FROM_EMAIL,
  RELEASE_TITLE,
  RELEASE_BODY,
  RELEASE_TAG,
  RELEASE_URL,
  RELEASE_TYPE,
  PROJECT_NAME // optional, for project-specific PO
} = process.env;

if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN) {
  console.error('Missing Gmail credentials in environment variables.');
  process.exit(1);
}

if (!RELEASE_TITLE || !RELEASE_BODY || !RELEASE_TAG || !RELEASE_URL) {
  console.error('Missing release data in environment variables.');
  process.exit(1);
}

// Check for PO opt-in toggle in release body
const notifyMatch = RELEASE_BODY.match(/\*\*Notify PO:\*\*\s*\[?(yes|no)\]?/i);
if (notifyMatch && notifyMatch[1].toLowerCase() === 'no') {
  console.log('PO notification is opted out for this release.');
  process.exit(0);
}

// Get PO contact(s) from config
let poEmail = config.product_owners?.default?.email;
let poName = config.product_owners?.default?.name || 'Product Owner';
if (PROJECT_NAME && config.product_owners?.projects?.[PROJECT_NAME]) {
  poEmail = config.product_owners.projects[PROJECT_NAME].email;
  poName = config.product_owners.projects[PROJECT_NAME].name;
}

// Get CC stakeholders from config (optional)
const ccEmails = config.email?.cc || [];

// Extract summary, files, and Jira tickets from release body
function extractSection(section) {
  const regex = new RegExp(`##? ${section}([\s\S]*?)(?:\n##|$)`, 'i');
  const match = RELEASE_BODY.match(regex);
  return match ? match[1].trim() : '';
}
const issueSummary = extractSection('Issue Summary');
const filesIncluded = extractSection('Files Included');
const jiraKeyPattern = new RegExp(config.jira?.ticket_pattern || '[A-Z]+-\\d+', 'g');
const jiraTickets = Array.from(new Set((RELEASE_BODY.match(jiraKeyPattern) || [])));

// Compose email subject and body
const subject = `[${PROJECT_NAME || 'Project'}] Release ${RELEASE_TAG} Published`;
let body = `Hello ${poName},\n\nA new release has been published.\n\n`;
body += `**Release:** ${RELEASE_TITLE} (${RELEASE_TAG})\n`;
body += `**URL:** ${RELEASE_URL}\n`;
if (issueSummary) body += `\n**Summary:**\n${issueSummary}\n`;
if (filesIncluded) body += `\n**Files Included:**\n${filesIncluded}\n`;
if (jiraTickets.length) body += `\n**Jira Tickets:** ${jiraTickets.join(', ')}\n`;
body += `\nBest regards,\nRelease Automation System`;

// Gmail OAuth2 setup
const oauth2Client = new google.auth.OAuth2(
  GMAIL_CLIENT_ID,
  GMAIL_CLIENT_SECRET,
  'urn:ietf:wg:oauth:2.0:oob'
);
oauth2Client.setCredentials({ refresh_token: GMAIL_REFRESH_TOKEN });

async function sendEmail() {
  const accessToken = await oauth2Client.getAccessToken();
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: DEFAULT_FROM_EMAIL,
      clientId: GMAIL_CLIENT_ID,
      clientSecret: GMAIL_CLIENT_SECRET,
      refreshToken: GMAIL_REFRESH_TOKEN,
      accessToken: accessToken.token
    }
  });

  const mailOptions = {
    from: DEFAULT_FROM_EMAIL,
    to: poEmail,
    cc: ccEmails,
    subject,
    text: body,
    html: body.replace(/\n/g, '<br>')
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`PO release email sent to ${poEmail}`);
  } catch (err) {
    console.error('Failed to send PO release email:', err.message);
    process.exit(1);
  }
}

sendEmail(); 
// scripts/jira_release_update.js
// Posts a comment to each referenced Jira ticket with release info after a GitHub release

const axios = require('axios');
const moment = require('moment');

// Environment variables
const {
  JIRA_API_TOKEN,
  JIRA_USER_EMAIL,
  JIRA_BASE_URL,
  RELEASE_TITLE,
  RELEASE_URL,
  RELEASE_BODY,
  RELEASE_TAG,
  RELEASE_AUTHOR,
  FILE_MANIFEST // comma-separated list or JSON
} = process.env;

if (!JIRA_API_TOKEN || !JIRA_USER_EMAIL || !JIRA_BASE_URL) {
  console.error('Missing Jira credentials in environment variables.');
  process.exit(1);
}

if (!RELEASE_TITLE || !RELEASE_URL || !RELEASE_BODY) {
  console.error('Missing release data in environment variables.');
  process.exit(1);
}

// Extract Jira issue keys (e.g., CAST-236)
const jiraKeyPattern = /[A-Z]+-\d+/g;
const jiraKeys = Array.from(new Set((RELEASE_BODY.match(jiraKeyPattern) || [])));

if (jiraKeys.length === 0) {
  console.log('No Jira keys found in release body.');
  process.exit(0);
}

// Extract Issue + Resolution summary from release body (simple heuristic)
function extractSection(section) {
  const regex = new RegExp(`##? ${section}([\s\S]*?)(?:\n##|$)`, 'i');
  const match = RELEASE_BODY.match(regex);
  return match ? match[1].trim() : '';
}
const issueSummary = extractSection('Issue Summary');
const resolution = extractSection('Resolution');

// Prepare file manifest
let fileList = '';
if (FILE_MANIFEST) {
  try {
    const files = JSON.parse(FILE_MANIFEST);
    fileList = files.map(f => `- ${f}`).join('\n');
  } catch {
    fileList = FILE_MANIFEST.split(',').map(f => `- ${f.trim()}`).join('\n');
  }
}

const releaseDate = moment().format('YYYY-MM-DD');
const author = RELEASE_AUTHOR || 'Unknown';

// Jira comment body
function buildJiraComment() {
  return (
    `**Release:** ${RELEASE_TITLE} (${RELEASE_TAG})\n` +
    `**Date:** ${releaseDate}\n` +
    `**Author:** ${author}\n` +
    `**Issue Summary:**\n${issueSummary}\n` +
    `**Resolution:**\n${resolution}\n` +
    (fileList ? `**Files Included:**\n${fileList}\n` : '') +
    `**Release Link:** [View on GitHub](${RELEASE_URL})`
  );
}

async function postJiraComment(issueKey, comment) {
  const url = `${JIRA_BASE_URL}/rest/api/3/issue/${issueKey}/comment`;
  try {
    const res = await axios.post(
      url,
      { body: comment },
      {
        auth: {
          username: JIRA_USER_EMAIL,
          password: JIRA_API_TOKEN
        },
        headers: { 'Accept': 'application/json' }
      }
    );
    console.log(`Comment posted to ${issueKey}`);
    return res.data;
  } catch (err) {
    console.error(`Failed to post comment to ${issueKey}:`, err.response?.data || err.message);
  }
}

// (Optional) Transition status from "In Review" to "Done" if applicable
async function transitionJiraIssue(issueKey) {
  // TODO: Implement status transition logic if required
  // This would require fetching available transitions and posting to the transition endpoint
}

(async () => {
  const comment = buildJiraComment();
  for (const key of jiraKeys) {
    await postJiraComment(key, comment);
    // await transitionJiraIssue(key); // Uncomment when implemented
  }
})(); 
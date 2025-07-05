# Release Automation System - Setup Guide

This guide walks you through the complete setup process for the GitHub Release Management System.

## Prerequisites

- GitHub repository with Actions enabled
- Google Workspace account for Gmail API
- Jira Cloud instance for ticket integration
- Node.js 18+ (for local testing)

## Step 1: Repository Setup

### 1.1 Enable GitHub Actions
1. Go to your repository on GitHub
2. Navigate to **Settings** → **Actions** → **General**
3. Enable **Actions** and **Workflow permissions**
4. Set **Workflow permissions** to "Read and write permissions"

### 1.2 Add Repository Secrets
Navigate to **Settings** → **Secrets and variables** → **Actions** and add the following secrets:

#### Required Secrets
```yaml
# Gmail API Configuration
GMAIL_CLIENT_ID: "your-gmail-client-id"
GMAIL_CLIENT_SECRET: "your-gmail-client-secret"
GMAIL_REFRESH_TOKEN: "your-gmail-refresh-token"
DEFAULT_FROM_EMAIL: "releases@pde.com"

# Jira API Configuration
JIRA_API_TOKEN: "your-jira-api-token"
JIRA_USER_EMAIL: "your-jira-email@pde.com"
JIRA_BASE_URL: "https://pacificdesignengineering.atlassian.net"
```

#### Optional Secrets
```yaml
# Google Drive Sync (Optional)
GOOGLE_DRIVE_CREDENTIALS: "base64-encoded-service-account-json"
DRIVE_FOLDER_ID: "your-google-drive-folder-id"

# Team Notifications (Optional)
GOOGLE_CHAT_WEBHOOK_URL: "your-google-chat-webhook-url"
ADMIN_EMAIL: "admin@pde.com"
```

## Step 2: Gmail API Setup

### 2.1 Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable billing (required for API usage)

### 2.2 Enable Gmail API
1. Go to **APIs & Services** → **Library**
2. Search for "Gmail API"
3. Click on "Gmail API" and enable it

### 2.3 Create OAuth 2.0 Credentials
1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Choose **Desktop application** as application type
4. Name it "Release Automation System"
5. Note the **Client ID** and **Client Secret**

### 2.4 Generate Refresh Token
1. Go to [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
2. Click the settings icon (⚙️) in the top right
3. Check "Use your own OAuth credentials"
4. Enter your **Client ID** and **Client Secret**
5. Close settings
6. In the left panel, find "Gmail API v1"
7. Select "https://mail.google.com/"
8. Click **Authorize APIs**
9. Sign in with your Google account
10. Click **Exchange authorization code for tokens**
11. Copy the **Refresh token**

### 2.5 Configure Gmail API Scopes
The system requires the following Gmail API scopes:
- `https://mail.google.com/` (Send emails)

## Step 3: Jira API Setup

### 3.1 Create API Token
1. Go to [Atlassian Account Settings](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Click **Create API token**
3. Name it "Release Automation System"
4. Copy the generated token

### 3.2 Verify Jira Access
1. Note your Jira email address
2. Verify your Jira instance URL (e.g., `https://pacificdesignengineering.atlassian.net`)
3. Ensure your account has permission to:
   - Read issues
   - Add comments to issues
   - Update issue fields (if using custom fields)

### 3.3 Test Jira API Access
You can test your Jira API access using curl:
```bash
curl -u "your-email@domain.com:your-api-token" \
  -H "Accept: application/json" \
  "https://your-domain.atlassian.net/rest/api/3/myself"
```

## Step 4: Google Drive Setup (Optional)

### 4.1 Create Service Account
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Click **Create Credentials** → **Service Account**
4. Name it "Release Automation Drive Service"
5. Grant "Editor" role
6. Create and download the JSON key file

### 4.2 Enable Google Drive API
1. Go to **APIs & Services** → **Library**
2. Search for "Google Drive API"
3. Enable the API

### 4.3 Configure Drive Folder
1. Create a folder in Google Drive for releases
2. Share the folder with the service account email
3. Note the folder ID from the URL

### 4.4 Encode Service Account JSON
```bash
# On macOS/Linux
base64 -i service-account.json

# On Windows PowerShell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("service-account.json"))
```

## Step 5: Google Chat Setup (Optional)

### 5.1 Create Google Chat Webhook
1. Go to your Google Chat room
2. Click the room name → **Manage webhooks**
3. Click **Add webhook**
4. Name it "Release Automation"
5. Copy the webhook URL

## Step 6: Testing the Setup

### 6.1 Test Gmail API
```bash
# Install dependencies
npm install

# Test Gmail authentication
node scripts/test-gmail-auth.js
```

### 6.2 Test Jira API
```bash
# Test Jira authentication
node scripts/test-jira-auth.js
```

### 6.3 Create Test Release
1. Create a test release using the template
2. Use test email addresses
3. Reference test Jira tickets
4. Publish the release
5. Monitor the workflow execution

## Step 7: Production Configuration

### 7.1 Security Review
- [ ] All API tokens are stored as GitHub secrets
- [ ] OAuth 2.0 refresh tokens are secure
- [ ] Service account permissions are minimal
- [ ] Webhook URLs are private

### 7.2 Monitoring Setup
- [ ] Enable GitHub Actions notifications
- [ ] Configure Google Chat notifications (if using)
- [ ] Set up email alerts for failures
- [ ] Review workflow logs regularly

### 7.3 Team Training
- [ ] Train engineers on release template usage
- [ ] Document troubleshooting procedures
- [ ] Establish escalation processes
- [ ] Create user documentation

## Troubleshooting

### Common Issues

#### Gmail API Errors
- **Error**: "invalid_grant"
- **Solution**: Regenerate refresh token
- **Error**: "quota_exceeded"
- **Solution**: Check Gmail API quotas

#### Jira API Errors
- **Error**: "401 Unauthorized"
- **Solution**: Verify API token and email
- **Error**: "403 Forbidden"
- **Solution**: Check issue permissions

#### GitHub Actions Errors
- **Error**: "Secret not found"
- **Solution**: Verify all secrets are set
- **Error**: "Permission denied"
- **Solution**: Check repository permissions

### Debug Commands

```bash
# Test Gmail API
node scripts/test-gmail-auth.js

# Test Jira API
node scripts/test-jira-auth.js

# Test release parsing
node scripts/parse-release-data.js

# Test email template
node scripts/test-email-template.js
```

## Maintenance

### Regular Tasks
- **Monthly**: Review API token expiration
- **Quarterly**: Update dependencies
- **Annually**: Security audit

### Monitoring
- Track workflow success rates
- Monitor API usage quotas
- Review error logs
- Update documentation

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review GitHub Actions logs
3. Test individual components
4. Contact system administrator

---

**Next Steps**: After completing this setup, proceed to the [Usage Guide](../README.md#usage-guide) to learn how to create releases. 
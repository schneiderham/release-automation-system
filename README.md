# GitHub Release Management System

A comprehensive automation system for Pacific Design Engineering that replaces ad-hoc customer release emails with a structured, professional process using GitHub Actions, Gmail API, and Jira integration.

## 🚀 Features

- **Automated Customer Communications**: Professional email notifications sent via Gmail API
- **Jira Integration**: Automatic ticket updates with release information and audit trails
- **Rich Content Support**: Handles images, formatted text, and file attachments
- **Professional Templates**: Branded email templates with responsive design
- **Error Handling**: Robust retry logic and failure notifications
- **Team Coordination**: Automated stakeholder notifications and status reporting

## 📋 System Overview

```
GitHub Release Creation → GitHub Actions Workflow → Automated Processing
    ↓
┌─ Customer Email (Gmail API) 
├─ Jira Ticket Updates
├─ Team Notifications  
└─ Google Drive Sync (Optional)
```

## 🛠️ Setup Instructions

### 1. Repository Configuration

1. **Enable GitHub Actions** in your repository settings
2. **Set up repository secrets** (see Configuration section below)
3. **Create release template** using `.github/RELEASE_TEMPLATE.md`

### 2. Required API Setup

#### Gmail API Configuration
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Gmail API
4. Create OAuth 2.0 credentials
5. Generate refresh token using OAuth 2.0 playground

#### Jira API Configuration
1. Go to [Atlassian Account Settings](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Create API token
3. Note your Jira email and base URL

### 3. GitHub Secrets Configuration

Add the following secrets to your repository:

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

# Optional: Google Drive Sync
GOOGLE_DRIVE_CREDENTIALS: "base64-encoded-service-account-json"
DRIVE_FOLDER_ID: "your-google-drive-folder-id"

# Optional: Team Notifications
GOOGLE_CHAT_WEBHOOK_URL: "your-google-chat-webhook-url"
ADMIN_EMAIL: "admin@pde.com"
```

## 📝 Usage Guide

### Creating a Release

1. **Navigate to Releases** in your GitHub repository
2. **Click "Create a new release"**
3. **Use the template** from `.github/RELEASE_TEMPLATE.md`
4. **Fill in required fields**:
   - Release title
   - Customer email(s)
   - Business impact
   - Technical changes
   - Related Jira tickets (optional)
5. **Attach files** if needed
6. **Publish the release**

### Release Template Fields

#### Required Fields
- **Release Title**: Clear, descriptive name
- **Customer Email(s)**: Comma-separated list of recipient emails
- **Business Impact**: Customer-focused explanation of value
- **Technical Changes**: Engineering details of modifications

#### Optional Fields
- **Related Jira Tickets**: Space-separated ticket IDs (PDE-123)
- **Files Included**: Check boxes for included file types
- **Customer Actions Required**: Any required customer steps

### Example Release

```markdown
## Business Impact

Enhanced assembly process reduces installation time by 30% and improves quality consistency.

### What's New for Customers
- Streamlined assembly sequence
- Updated tolerance specifications
- Improved quality control procedures

## Technical Changes

- Redesigned component interfaces for better fit
- Updated CAD models with new tolerances
- Implemented new quality control checkpoints

## Files Included

- [x] Updated drawings (PDF)
- [x] 3D models (STEP/SolidWorks)
- [x] Documentation updates

## Related Work

Jira Tickets: PDE-789 PDE-790
```

## 🔧 Workflow Process

### 1. Release Publication
- GitHub Actions workflow triggers on release publication
- Only processes non-draft, non-prerelease releases

### 2. Data Parsing
- Extracts customer emails, Jira tickets, and release content
- Validates data format and completeness
- Determines release type automatically

### 3. Content Processing
- Converts markdown to email-friendly HTML
- Generates professional email templates
- Creates Jira comment content

### 4. Automated Actions
- **Email Delivery**: Sends professional emails to customers via Gmail API
- **Jira Updates**: Adds comments to referenced tickets
- **Team Notifications**: Sends status updates to stakeholders
- **File Sync**: Optional Google Drive synchronization

### 5. Error Handling
- Retry logic for failed operations
- Comprehensive logging and monitoring
- Automatic issue creation for failures

## 🧪 Testing

### Local Test Framework
The system includes a complete local test framework that allows you to test all logic without real API credentials:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage report
npm run test:coverage

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run local test runner (simulates full workflow)
node scripts/test-local.js
```

### Test Framework Features
- **Unit Tests**: Test individual components in isolation
- **Integration Tests**: Test the complete workflow simulation
- **Mock Data**: Sample releases and API responses
- **Local Test Runner**: Full workflow simulation without real API calls
- **Comprehensive Coverage**: Tests parsing, validation, content processing, and error handling

### Test Setup Script
```bash
# Test API connections and configuration (requires real credentials)
node scripts/test-setup.js
```

This script validates:
- Gmail API authentication
- Jira API connectivity
- Google Drive API access (if enabled)
- Google Chat webhook connectivity (if enabled)
- Environment variable configuration

### Test Documentation
See `tests/README.md` for detailed information about the test framework, including:
- Test structure and organization
- Mock data documentation
- Troubleshooting guide
- Best practices for adding new tests

## 📊 Monitoring and Logs

### GitHub Actions Logs
- View workflow execution in Actions tab
- Detailed step-by-step logging
- Error messages and debugging information

### Email Delivery Status
- Track sent/failed emails in workflow outputs
- Monitor Gmail API quotas and limits
- Review delivery confirmations

### Jira Update Status
- Confirm successful ticket updates
- Verify comment creation and formatting
- Monitor API response times

## 🔒 Security Considerations

### API Credentials
- Store all credentials as GitHub secrets
- Use OAuth 2.0 for Gmail API access
- Implement proper token rotation

### Data Privacy
- Customer emails are processed securely
- No sensitive data stored in logs
- Encrypted API communications

### Access Control
- Repository permissions control who can create releases
- API tokens have minimal required permissions
- Regular security audits recommended

## 🚨 Troubleshooting

### Common Issues

#### Email Delivery Failures
- **Symptom**: Emails not sent to customers
- **Check**: Gmail API credentials and quotas
- **Solution**: Verify OAuth 2.0 setup and refresh token

#### Jira Update Failures
- **Symptom**: Tickets not updated with release info
- **Check**: Jira API token and permissions
- **Solution**: Verify API token and user permissions

#### Workflow Execution Failures
- **Symptom**: GitHub Actions workflow fails
- **Check**: Repository secrets configuration
- **Solution**: Verify all required secrets are set

### Debugging Steps

1. **Check GitHub Actions logs** for detailed error messages
2. **Verify repository secrets** are properly configured
3. **Test API credentials** independently
4. **Review release format** against template requirements
5. **Check rate limits** for Gmail and Jira APIs

## 📈 Performance Metrics

### Success Metrics
- **Email Delivery Rate**: >99% successful delivery
- **Jira Update Rate**: >99% successful ticket updates
- **Workflow Execution Time**: <5 minutes average
- **Error Recovery**: Failed operations retry successfully

### Monitoring Dashboard
- Track workflow execution times
- Monitor API usage and quotas
- Review customer email delivery rates
- Analyze Jira integration success rates

## 🔄 Maintenance

### Regular Tasks
- **Monthly**: Review API token expiration dates
- **Quarterly**: Update dependencies and security patches
- **Annually**: Review and optimize workflow performance

### Updates and Improvements
- Monitor GitHub Actions updates
- Review API version changes
- Update email templates as needed
- Enhance error handling and logging

## 📚 Documentation

### Technical Documentation
- [Technical Specifications](docs/technical-specifications.md)
- API integration details
- Workflow architecture overview

### User Guides
- Release creation process
- Template usage guidelines
- Troubleshooting procedures

### Administrator Guide
- System configuration
- Security best practices
- Maintenance procedures

## 🤝 Support

### Getting Help
- Check troubleshooting section above
- Review GitHub Actions logs
- Contact system administrator
- Create GitHub issue for bugs

### Contributing
- Follow existing code patterns
- Add comprehensive error handling
- Include appropriate logging
- Test changes thoroughly

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Pacific Design Engineering** - Professional Release Management System

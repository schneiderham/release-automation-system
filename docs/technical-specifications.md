# GitHub Release Management System - Technical Specifications

## System Overview

### Purpose
Automate customer release communications while maintaining audit trails in Jira and providing professional customer experience through structured GitHub releases.

### Core Requirements
- Replace ad-hoc customer release emails with structured process
- Automatically update Jira tickets with release information
- Send professional branded emails to customers (no GitHub accounts required)
- Maintain team coordination and approval workflows
- Support rich content (images, formatted text) in releases
- Optional: Sync release files to Google Drive

## Architecture

### Component Overview
```
GitHub Repository → GitHub Release Creation → GitHub Actions Workflow
    ↓
┌─ Customer Email (Gmail API) 
├─ Jira Ticket Updates
├─ Team Notifications  
└─ Google Drive Sync (Optional)
```

### Technology Stack
- **GitHub:** Repository hosting, release management, Actions workflows
- **GitHub Actions:** Automation workflows
- **Gmail API:** Customer email delivery
- **Jira API:** Ticket updates and integration
- **Google Drive API:** Optional file synchronization
- **Node.js/JavaScript:** Automation scripting language

## Detailed Requirements

### 1. GitHub Repository Structure
```
project-name/
├── .github/
│   ├── workflows/
│   │   └── release-automation.yml
│   └── RELEASE_TEMPLATE.md
├── releases/
│   └── (generated release assets)
├── mechanical/
│   ├── solidworks/
│   ├── pdfs/
│   └── step-files/
└── documentation/
```

### 2. Release Creation Workflow

#### Release Template Fields
- **Release Title:** Descriptive name for the release
- **Customer Email(s):** Comma-separated list of recipient emails
- **Business Impact:** Customer-facing explanation of changes
- **Technical Changes:** Engineering details of modifications
- **Release Type:** [Major Release, Minor Update, Bug Fix, Documentation]
- **Related Jira Tickets:** Space-separated ticket IDs (PDE-123 PDE-456)
- **Files:** Drag-and-drop file attachments

#### Release Description Template
```markdown
## Business Impact
[Explanation of why this release matters to the customer]

## Technical Changes
[Detailed list of modifications made]

## Visual Documentation
[Inline images with explanations]

## Files Included
- [ ] Updated drawings (PDF)
- [ ] 3D models (STEP/SolidWorks) 
- [ ] Documentation updates
- [ ] Test results

## Customer Actions Required
[Any steps the customer needs to take]

## Related Work
Jira Tickets: PDE-XXX PDE-YYY
```

### 3. GitHub Actions Workflow

#### Trigger Conditions
- **Event:** Release published
- **Conditions:** Release is not a draft, not a pre-release

#### Workflow Steps
1. **Parse Release Data**
   - Extract customer emails from release body
   - Parse Jira ticket references  
   - Validate required fields

2. **Process Release Content**
   - Convert markdown to email-friendly HTML
   - Generate customer-appropriate summary
   - Create file download links

3. **Send Customer Email**
   - Use Gmail API for delivery
   - Professional email template with branding
   - Include release summary and download links
   - Reference full GitHub release page

4. **Update Jira Tickets**
   - Add comments to referenced tickets
   - Include release information and links
   - Update custom fields if configured

5. **Team Notifications**
   - Notify project stakeholders
   - Send Google Chat message (optional)
   - Update internal tracking systems

6. **Google Drive Sync** (Optional)
   - Copy release files to designated Drive folder
   - Maintain version-controlled folder structure
   - Update shared project documentation

### 4. Email System Integration

#### Gmail API Configuration
- **Authentication:** OAuth 2.0 with service account
- **Sending Address:** releases@pde.com (or configured domain)
- **Rate Limits:** Respect Gmail API quotas (250-1000 emails/day)
- **Error Handling:** Retry logic for temporary failures

#### Email Template Structure
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>PDE Release Notification</title>
</head>
<body>
    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <header style="background: #company-color; padding: 20px;">
            <h1 style="color: white;">{{release_title}}</h1>
        </header>
        
        <main style="padding: 20px;">
            <h2>What's New</h2>
            <p>{{business_impact}}</p>
            
            <h2>Technical Changes</h2>
            <p>{{technical_changes}}</p>
            
            <h2>Release Files</h2>
            <ul>{{file_list}}</ul>
            
            <h2>Complete Details</h2>
            <p><a href="{{github_release_url}}">View full release documentation</a></p>
        </main>
        
        <footer style="background: #f5f5f5; padding: 15px;">
            <p>Reference: {{release_tag}}</p>
            <p>PDE Engineering Team</p>
        </footer>
    </div>
</body>
</html>
```

### 5. Jira Integration

#### API Endpoints
- **Authentication:** Basic auth or OAuth 2.0
- **Base URL:** `https://pacificdesignengineering.atlassian.net/rest/api/3/`
- **Required Permissions:** Read/write access to issues and comments

#### Jira Update Actions
1. **Add Release Comment**
   ```json
   {
     "body": {
       "type": "doc",
       "version": 1,
       "content": [
         {
           "type": "paragraph",
           "content": [
             {
               "type": "text",
               "text": "🚀 Released to Customer: {{release_title}}\n\nBusiness Impact: {{business_impact}}\nTechnical Changes: {{technical_changes}}\n\n📎 Release Package:\n{{file_list}}\n\n🔗 Release Details: {{github_url}}\n📧 Customer Email: Sent to {{customer_emails}}"
             }
           ]
         }
       ]
     }
   }
   ```

2. **Update Custom Fields** (if configured)
   - Release version
   - Customer notification status
   - Release date

### 6. Security and Configuration

#### Environment Variables
```yaml
# GitHub Secrets Configuration
GMAIL_CLIENT_ID: "gmail-oauth-client-id"
GMAIL_CLIENT_SECRET: "gmail-oauth-client-secret"  
GMAIL_REFRESH_TOKEN: "gmail-refresh-token"
JIRA_API_TOKEN: "jira-api-token"
JIRA_USER_EMAIL: "jira-user@pde.com"
GOOGLE_DRIVE_CREDENTIALS: "base64-encoded-service-account-json"
PDE_EMAIL_DOMAIN: "pde.com"
DEFAULT_FROM_EMAIL: "releases@pde.com"
```

#### Authentication Setup
1. **Gmail API:**
   - Create Google Cloud project
   - Enable Gmail API
   - Create OAuth 2.0 credentials
   - Generate refresh token

2. **Jira API:**
   - Create API token in Atlassian account
   - Configure user permissions for issue access

3. **Google Drive API:** (Optional)
   - Create service account
   - Generate JSON credentials
   - Share target Drive folders with service account

### 7. Error Handling and Monitoring

#### Error Scenarios
- **Email delivery failures:** Retry with exponential backoff
- **Jira API failures:** Log error, continue with other operations
- **File processing errors:** Notify user, provide manual fallback
- **Authentication failures:** Alert administrators

#### Monitoring and Logging
- **Workflow execution logs:** GitHub Actions built-in logging
- **Email delivery status:** Track sent/failed emails
- **Jira update status:** Confirm successful ticket updates
- **Performance metrics:** Execution time, success rates

#### Notifications for Failures
- **Google Chat alerts:** For critical failures
- **Email notifications:** To system administrators
- **GitHub Issues:** Auto-create for recurring problems

## Implementation Phases

### Phase 1: Core Release Process (2-3 days)
- [ ] GitHub repository setup with template structure
- [ ] Basic release template creation
- [ ] Simple GitHub Actions workflow for file processing
- [ ] Basic Jira integration (comments only)
- [ ] Manual email testing workflow

### Phase 2: Email Automation (2-3 days)  
- [ ] Gmail API integration and authentication
- [ ] Professional email template development
- [ ] Customer email automation workflow
- [ ] Email delivery error handling
- [ ] Template customization for different release types

### Phase 3: Enhanced Features (1-2 days)
- [ ] Google Drive synchronization (optional)
- [ ] Rich content processing (images, markdown)
- [ ] Advanced Jira field updates
- [ ] Team notification systems
- [ ] Performance optimization and monitoring

### Phase 4: Production Deployment (0.5-1 day)
- [ ] Security review and hardening
- [ ] Production environment configuration
- [ ] User training and documentation
- [ ] Rollback procedures and support documentation

## Testing Strategy

### Unit Testing
- Individual workflow step validation
- Email template rendering tests
- API integration tests with mock data

### Integration Testing  
- End-to-end release creation workflow
- Email delivery to test accounts
- Jira ticket update verification
- File synchronization testing

### User Acceptance Testing
- Engineer workflow validation
- Customer email review and approval
- PO approval process testing
- Error scenario handling

## Success Metrics

### Process Improvements
- **Consistency:** 100% of releases use standard template
- **Team Coordination:** 0 missed stakeholder notifications  
- **Documentation:** 100% of releases automatically documented in Jira
- **Customer Experience:** Professional email delivery within 5 minutes

### Technical Performance
- **Reliability:** >99% successful workflow execution
- **Speed:** Release processing completed within 5 minutes
- **Error Recovery:** Failed operations retry successfully within 15 minutes

## Maintenance and Support

### Regular Maintenance Tasks
- **Monthly:** Review API token expiration dates
- **Quarterly:** Update dependencies and security patches
- **Annually:** Review and optimize workflow performance

### Support Documentation
- User guide for release creation process
- Troubleshooting guide for common issues
- Administrator guide for system configuration
- Emergency procedures for workflow failures

### Knowledge Transfer
- Technical documentation for future developers
- Process documentation for team members
- Training materials for new engineer onboarding
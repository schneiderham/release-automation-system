# Test Framework for Release Automation System

This directory contains a comprehensive test framework for the release automation system that allows you to test all logic without real API credentials.

## Overview

The test framework includes:
- **Unit Tests**: Test individual components in isolation
- **Integration Tests**: Test the complete workflow simulation
- **Mock Data**: Sample releases and API responses
- **Local Test Runner**: Full workflow simulation without real API calls

## Directory Structure

```
tests/
├── README.md                    # This file
├── setup.js                     # Jest test setup and mocks
├── unit-tests/                  # Unit tests for individual components
│   ├── parse-release-data.test.js
│   └── validate-release.test.js
├── integration-tests/           # Integration tests for full workflow
│   └── workflow-simulation.test.js
└── mock-data/                  # Mock data for testing
    ├── sample-releases/         # Sample release files
    │   ├── valid-release.md
    │   └── invalid-release.md
    ├── api-responses/           # Mock API responses
    │   ├── gmail-success.json
    │   ├── jira-success.json
    │   └── google-chat-success.json
    └── error-scenarios/         # Mock error responses
        ├── gmail-error.json
        └── jira-error.json
```

## Running Tests

### Quick Start
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
```

### Local Test Runner
```bash
# Run the local test runner (simulates full workflow)
node scripts/test-local.js
```

## Test Types

### Unit Tests
Unit tests focus on individual components:
- **parse-release-data.test.js**: Tests release data parsing logic
- **validate-release.test.js**: Tests validation logic

### Integration Tests
Integration tests simulate the complete workflow:
- **workflow-simulation.test.js**: Tests the full workflow without real API calls

### Local Test Runner
The local test runner (`scripts/test-local.js`) provides:
- Complete workflow simulation
- No real API calls
- Detailed output and error reporting
- Success/failure metrics

## Mock Data

### Sample Releases
- **valid-release.md**: Complete release with all required fields
- **invalid-release.md**: Release missing required fields

### API Responses
- **gmail-success.json**: Mock Gmail API success response
- **jira-success.json**: Mock Jira API success response
- **google-chat-success.json**: Mock Google Chat webhook response

### Error Scenarios
- **gmail-error.json**: Mock Gmail API error response
- **jira-error.json**: Mock Jira API error response

## Test Scenarios

### Valid Release Processing
1. Parse release data (emails, tickets, type)
2. Validate parsed data
3. Process content (email templates, Jira comments)
4. Verify all outputs

### Invalid Release Handling
1. Parse release with missing data
2. Validate and expect failures
3. Test error handling

### Different Release Types
- Major releases
- Minor updates
- Bug fixes
- Documentation updates
- General updates

### Error Scenarios
- Empty release body
- Missing environment variables
- Invalid data formats

## Configuration

### Jest Configuration
The `jest.config.js` file configures:
- Test environment (Node.js)
- Coverage reporting
- Mock setup
- Test timeouts

### Test Setup
The `tests/setup.js` file provides:
- Mock implementations for external dependencies
- Environment configuration
- Global test utilities

## Adding New Tests

### Unit Tests
1. Create a new test file in `tests/unit-tests/`
2. Import the component to test
3. Write test cases using Jest
4. Use mock data from `tests/mock-data/`

### Integration Tests
1. Create a new test file in `tests/integration-tests/`
2. Test the complete workflow
3. Use mock API responses
4. Verify end-to-end functionality

### Mock Data
1. Add sample releases to `tests/mock-data/sample-releases/`
2. Add API responses to `tests/mock-data/api-responses/`
3. Add error scenarios to `tests/mock-data/error-scenarios/`

## Best Practices

### Test Organization
- Keep tests focused and specific
- Use descriptive test names
- Group related tests in describe blocks
- Clean up after each test

### Mock Data
- Use realistic sample data
- Include edge cases
- Maintain consistency across tests
- Document mock data structure

### Error Testing
- Test both success and failure scenarios
- Verify error messages are helpful
- Test retry logic
- Test graceful degradation

## Troubleshooting

### Common Issues

**Tests failing with module not found errors**
- Ensure all dependencies are installed: `npm install`
- Check that Jest configuration is correct
- Verify import paths are correct

**Mock data not loading**
- Check file paths in test files
- Ensure mock data files exist
- Verify file encoding (UTF-8)

**API mocks not working**
- Check mock setup in `tests/setup.js`
- Verify mock implementations match expected API
- Ensure mocks are properly configured

### Debugging Tests
```bash
# Run tests with verbose output
npm test -- --verbose

# Run specific test file
npm test -- tests/unit-tests/parse-release-data.test.js

# Run tests with debug output
DEBUG=* npm test
```

## Next Steps

After running tests successfully:

1. **Configure Real Credentials**: Set up real API credentials as GitHub secrets
2. **Test with Real APIs**: Use the test setup script with real credentials
3. **Deploy Workflow**: Deploy the GitHub Actions workflow
4. **Monitor Execution**: Monitor workflow runs and adjust as needed

## Contributing

When adding new features:
1. Write tests first (TDD approach)
2. Ensure all tests pass
3. Add appropriate mock data
4. Update documentation
5. Run full test suite before committing 
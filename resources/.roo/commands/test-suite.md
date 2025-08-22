---
description: Generate comprehensive test suite for a module or feature
argument-hint: <module-name> [test-type]
---

Create a comprehensive test suite including:

## Unit Tests
- Test individual functions/methods in isolation
- Mock external dependencies appropriately
- Cover all code paths including edge cases
- Use descriptive test names that explain behavior
- Follow AAA pattern (Arrange, Act, Assert)

## Integration Tests
- Test component interactions and data flow
- Verify API contract compliance
- Test database operations and transactions
- Validate error propagation between layers

## Test Data & Fixtures
- Create reusable test data fixtures
- Use factories or builders for complex objects
- Implement proper test data cleanup
- Avoid test interdependencies

## Test Configuration
- Set up appropriate test environment configuration
- Configure test database or mock services
- Implement test runners and CI/CD integration
- Add code coverage reporting

## Quality Checks
- Ensure tests are fast and reliable
- Avoid flaky tests with proper synchronization
- Make tests maintainable and readable
- Document complex test scenarios
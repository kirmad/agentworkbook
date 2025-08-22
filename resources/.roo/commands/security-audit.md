---
description: Perform comprehensive security audit of codebase or feature
argument-hint: [scope] [severity-level]
---

Conduct a thorough security audit covering:

## Vulnerability Assessment
- Scan for OWASP Top 10 vulnerabilities
- Check for SQL injection and XSS vulnerabilities
- Review authentication and session management
- Assess authorization and access control mechanisms
- Identify insecure direct object references

## Input Validation & Data Handling
- Review all user input validation points
- Check data sanitization and encoding practices
- Assess file upload security measures
- Review API parameter validation
- Check for injection attack vectors

## Infrastructure Security
- Review server and deployment configurations
- Check for exposed sensitive information
- Assess network security and encryption
- Review database security settings
- Check for insecure dependencies

## Code Security Practices
- Review secret management practices
- Check for hardcoded credentials or API keys
- Assess logging practices for sensitive data
- Review error handling for information disclosure
- Check cryptographic implementations

## Compliance & Reporting
- Generate security findings report
- Prioritize vulnerabilities by severity (Critical, High, Medium, Low)
- Provide remediation recommendations
- Document security best practices for the team
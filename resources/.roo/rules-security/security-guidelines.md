# Security Guidelines

## Security-First Mindset
- Assume all inputs are potentially malicious
- Implement defense in depth strategies
- Follow principle of least privilege
- Never store secrets in code or version control
- Use secure defaults for all configurations

## Input Validation & Sanitization
- Validate all user inputs on both client and server side
- Use parameterized queries to prevent SQL injection
- Sanitize data before displaying to prevent XSS
- Implement proper authentication and authorization checks

## Secure Coding Practices
- Use established cryptographic libraries, never roll your own
- Implement proper session management
- Use HTTPS for all data transmission
- Log security events for monitoring and incident response
- Regularly update dependencies to patch security vulnerabilities

## Compliance & Standards
- Follow OWASP security guidelines
- Implement security headers (CSP, HSTS, etc.)
- Conduct regular security reviews and threat modeling
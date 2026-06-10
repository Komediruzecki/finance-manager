# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Finance Manager, please report it by opening an issue on GitHub. Do not include sensitive details in public issues — instead, note that you found a potential security issue and a maintainer will provide a secure channel for details.

## Supported Versions

| Version | Supported |
|---------|-----------|
| 2.x (latest) | Yes |
| < 2.0 | No |

## Security Features

- Passwords hashed with bcrypt
- SQLite parameterized queries prevent SQL injection
- Helmet.js security headers on all responses
- Rate limiting on authentication endpoints
- CORS protection with configurable allowed origins
- Session-based authentication with httpOnly cookies

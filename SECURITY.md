# Security Notice

## Supported Use

The original frozen delivery was for local IT review. The current Git version
supports cloud development/testing and a fictional portfolio demonstration via
the Render configuration in `docs/18_Render部署与双仓库维护.md`. This does not
authorize production use with real minors or real student records.

Cloud startup disables built-in demo accounts, serves only browser assets,
uses Secure session cookies, and stores SQLite on a dedicated persistent disk.
The portfolio mode uses browser-local fictional data; the team test environment
uses authenticated server APIs. These are separate services and databases.

## Test Credentials

The shared credentials in `docs/04_运行部署与测试账号.md` are intentionally included for local inspection. They are compromised by definition and must never be reused.

## Reporting A Problem

Record the affected version, page or API, reproduction steps, expected result, observed result and whether data exposure may have occurred. Send the report privately to the project owner; do not place real student data in screenshots, email subjects or public issue trackers.

## Production Prerequisites

- HTTPS and production-grade cookie settings
- Secrets management and key rotation
- Tenant isolation and least-privilege administration
- Rate limiting, monitoring, audit export and incident response
- Encrypted backup and tested restoration
- Security review of dependencies, APIs and cloud configuration
- Personal-information rights and guardian-consent workflows
- China education, minor-protection, data and AI compliance review

See `docs/09_安全合规与数据治理.md` for the full preparation checklist.


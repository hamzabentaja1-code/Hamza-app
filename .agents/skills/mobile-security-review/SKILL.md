---
name: mobile-security-review
description: Review the HamZa Android application for mobile security and privacy risks using OWASP MASVS and MASTG guidance. Use before releases or when changing authentication, storage, networking, permissions, exports, or user data.
---

# Mobile security review

Use this skill only for authorized testing of the HamZa project and its own builds.

## Review workflow

1. Identify sensitive data stored locally or transmitted: customer/supplier details, invoices, payment records, backups, and credentials.
2. Review Android manifest permissions and exported activities, services, receivers, providers, deep links, and backup settings.
3. Check secrets are not hardcoded in source, APK resources, build logs, or committed configuration.
4. Review local persistence, backup/restore, file sharing, PDF exports, and temporary files for unintended disclosure.
5. Review network traffic configuration: HTTPS only for production endpoints, safe certificate validation, and no sensitive data in URLs or logs.
6. Check dependencies for known vulnerabilities and remove unused permissions/dependencies.
7. Inspect release build settings: debug disabled, signing handled securely, no test endpoints or debug menus.
8. Produce findings with severity, evidence, affected file, reproduction steps, and a concrete remediation. Do not claim a clean bill of health without running the relevant tests.

## Reference standard

Use OWASP MASVS and MASTG as the security baseline:
- https://mas.owasp.org/MASVS/
- https://mas.owasp.org/MASTG/

Use tools such as MobSF, JADX, apksigner, and dependency scanners only in an authorized environment. Static and dynamic scanners can produce false positives and false negatives; manually validate findings.

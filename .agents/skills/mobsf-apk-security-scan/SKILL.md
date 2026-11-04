---
name: mobsf-apk-security-scan
description: Run and interpret MobSF static security analysis for HamZa Android APK builds through GitHub Actions. Use after APK builds and before releases.
---

# MobSF APK security scan

## Scope
Only scan APKs built from this authorized HamZa repository. This workflow performs static analysis; it does not install or dynamically execute the app.

## Automated pipeline
The GitHub Actions workflow:
1. Builds the Android debug APK after Expo Doctor, Expo dependency compatibility, and TypeScript checks.
2. Starts the official `opensecurity/mobile-security-framework-mobsf` Docker image on the GitHub-hosted runner.
3. Uploads the APK to the local MobSF REST API and starts static analysis.
4. Exports the JSON report and uploads it as the `HamZa-MobSF-Report` workflow artifact.
5. Stops the MobSF container even if a previous step fails.

## Review procedure
- Retrieve the `HamZa-MobSF-Report` artifact from the same successful workflow run.
- Review package identity, manifest permissions, exported components, network configuration, storage, hardcoded secrets, trackers, and code findings.
- Prioritize findings by severity and exploitability; validate false positives manually.
- Record finding, evidence, affected file/component, impact, and remediation.
- Never claim the APK is secure merely because the scan completed. Static analysis does not replace dynamic testing on a controlled Android emulator/device.
- Never commit API keys, signing credentials, customer data, or MobSF reports containing sensitive data to the source repository.

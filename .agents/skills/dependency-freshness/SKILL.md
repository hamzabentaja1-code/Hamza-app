---
name: dependency-freshness
description: Check and safely maintain the HamZa Expo and React Native dependency stack, SDK compatibility, and build configuration. Use before upgrades or when builds fail due to dependency drift.
---

# Dependency freshness and compatibility

1. Read package.json, package-lock.json, app.json, eas.json, and Android workflow before proposing upgrades.
2. Run npm ci when a lockfile is present; do not silently regenerate or discard the lockfile.
3. Run npx expo-doctor and inspect its warnings.
4. Use npx expo install --check to identify Expo SDK version mismatches.
5. Inspect npm audit results; distinguish exploitable production issues from development-only findings and explain breaking changes.
6. Upgrade in small, compatible groups. Preserve the existing Expo SDK and React Native compatibility unless an SDK migration is explicitly planned.
7. Re-run TypeScript checks, Expo validation, Android prebuild, and the APK workflow after changes.
8. Never claim dependencies are current merely because npm install succeeds. Record the date, command, result, and unresolved warnings.

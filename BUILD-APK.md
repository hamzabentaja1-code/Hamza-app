# Build HamZa APK with GitHub Actions (no Expo login required)

1. Upload the complete contents of this folder to the root of your GitHub repository (keep `.github/workflows/android-apk.yml`).
2. Open the repository on GitHub, then select **Actions**.
3. Select **Build HamZa Android APK** and press **Run workflow** (or push a commit to `main`).
4. Wait for the workflow to finish successfully.
5. Open the completed workflow run, scroll to **Artifacts**, and download **HamZa-APK**. Extract the ZIP to get the APK.

This workflow uses Expo prebuild and Gradle on GitHub-hosted runners; it does not require Expo/EAS login. It does require the source to be uploaded to GitHub and GitHub Actions to be enabled. A successful workflow is still required before the APK can be called build-ready.

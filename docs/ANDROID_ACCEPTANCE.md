# HamZa Android acceptance and release gate

Do not dispatch an APK build until the agreed functional scope has been reviewed and accepted for device validation. The reference parity document contains candidates, not a promise to implement every proprietary workflow. An online account system, cloud sync, advanced tax rules and hardware integration are not prerequisites for the offline HamZa edition unless separately agreed.

## Before the first candidate build

- Confirm the exact candidate SHA on the completion branch. Run domain tests, TypeScript, the literal translation audit and Android JS bundling at that SHA. A JavaScript bundle is not an APK.
- Check the default-branch workflow is discoverable for a manual dispatch and that the dispatch chooses the completion branch. Do not merge to main solely to trigger a build.
- Fix the ABI mismatch in the current build configuration: `app.json` limits release binaries to ARM, while the workflow's acceptance emulator uses x86_64. Include x86_64 in the acceptance build or use a matching runner and verify APK ABIs rather than assuming translation support.
- Replace the per-run temporary signing key before handing out a new release. Treat the old APK's signer as unknown until compared with its certificate digest. Use a stable protected keystore, never a Git commit or build artifact for key material. Confirm package `com.hamza.app`, signer digest and a nondecreasing versionCode; test update without clearing state when the existing signer is available. A mismatched signer is not a reason to uninstall an app with unverified user data.

## Candidate checks on Android, with disposable business records

1. Install the exact candidate, launch with Metro off and network disabled, change French to Arabic and back, and relaunch. Review navigation, input order, mirroring, digits, line clipping and permission refusal. Test a Samsung/physical Android device for camera and local speech when available; an emulator with no compatible recognizer is not proof of recognition.
2. Add a photo and barcode to a product, import a UTF-8 CSV via the file picker, reject a duplicate, and check the selected warehouse. Run POS and standalone invoice, including quote → delivery → invoice and the inverse order; check warehouse quantities, paid/credited amounts and the ledger. Return a line and reconcile stock, credit and margin.
3. Record supplier receipt, partial payment, credit, a cash expense and a bank transfer. Verify stock count adjusts only the difference. Confirm sales, purchase, stock and cash reports respond to date/search; verify warehouse/direction and row counts. For debt reports confirm contact search changes current balances and changing the report date does not rewrite them into historical balances.
4. Open PDF, CSV and XLSX from Android share. Compare report exports to on-screen values, including Arabic labels, negative movements and no-results views. Print a sample PDF. Compare Arabic/French devis, facture, bon de sortie and avoir, with and without photos; inspect pagination, dates, references and totals.
5. Use fake local data for backup/restore and update tests. Relaunch after operations, export a backup externally, restore it on a separate installation, and compare stock, balances, dictionaries, projects/appointments and images. Exercise invalid backup/restore and app restart; do not target the user's live records.
6. Record exact APK SHA-256, certificate, version, automated and real-device checks, and any untested native paths. Deliver only after the verified candidate is accessible to the phone user; test the actual link or native attachment. An expiring CI artifact ZIP alone is not durable routing.

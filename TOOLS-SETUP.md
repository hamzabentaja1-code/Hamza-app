# أدوات التطوير لمشروع HamZa

هذا الدليل يوضح ما تم إعداده وما يحتاج إلى تشغيل داخل بيئة التطوير.

## إعداد Context7

ملف `.mcp.json` يعرّف خادم Context7 المحلي عبر npm:
```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"]
    }
  }
}
```
أعد تشغيل عميل Codex/المساعد بعد مزامنة المستودع، ثم تحقق من ظهور خادم Context7.

## تثبيت Superpowers وStrix skills وGraphify

من جذر المستودع داخل VM/Codespace:
```bash
bash tools/install-agent-tools.sh
```
السكريبت يثبت مهارات Superpowers ومهارات Strix الخاصة بالمساعد، ثم يثبت Graphify ويضيف مهارته لمشروع Codex. لا يقوم بتشغيل أي اختبار اختراق.

## تفعيل 21st MCP

يتطلب حساباً ومفتاح API شخصياً:
1. أنشئ مفتاحاً من https://21st.dev/mcp
2. شغّل داخل VM: `npx @21st-dev/cli@latest init --client codex`
3. أكمل تسجيل الدخول/إعداد المفتاح محلياً. لا تضع المفتاح في GitHub ولا ترسله داخل المحادثة.

## تشغيل Strix scanner

مهارات Strix تعلّم المساعد كيفية استخدام الأداة، لكنها لا تثبت ماسح Strix نفسه. تشغيل الماسح يتطلب Docker ومزود نموذج LLM مسجلاً أو مفتاح API. لا تفحص إلا تطبيقات أو أنظمة تملكها أو لديك إذن كتابي لاختبارها.

## الحدود الحالية

تحديث ملفات GitHub لا يعني أن البرامج نُفذت داخل VM. بعد مزامنة المستودع وتشغيل السكريبت، تحقق من المخرجات والأدوات المتاحة داخل بيئة التطوير. لم يتم بناء APK أو تشغيل فحص أمني في هذا التغيير.

## Phone Harness MCP — Android cloud testing

- Remote MCP endpoint: `https://mcp.phone-harness.com/mcp`.
- Configured alongside Context7 in `.mcp.json`; Codex project-level settings are in `.codex/config.toml`.
- After opening the trusted project in Codex, check available MCP tools. For a user-level Codex CLI setup, run:

```bash
codex mcp add phone-harness --url https://mcp.phone-harness.com/mcp
codex mcp login phone-harness
codex mcp list
```

- OAuth sign-in is personal. Never commit API keys, authentication tokens, or billing credentials.
- Phone Harness is not automatically activated merely because the configuration is committed. Confirm that `phone_list_available_devices` is available before testing.
- Starting cloud Android sessions may incur usage-based charges; ask before starting billable sessions.
- Test UI and flows only after the app under test is available; do not trigger an APK build until features and tests are complete.

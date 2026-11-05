from pathlib import Path
import re
root=Path(r"C:/Users/rezan/AndroidStudioProjects/ZPassManager")
base=root/'app/src/main/java/com/zpass'
p=base/'SystemDeepLinks.kt';s=p.read_text(encoding='utf-8');s=s.replace('import android.widget.Toast','import android.net.Uri\nimport java.util.Locale')
s=s.replace('"about", "account",','"cdn", "apps", "dashboard", "premium_sign_up", "premiumsignup", "about", "account",').replace('"camSoda"','"camsoda"')
a=s.index('    fun isProtectedBrand(')
s=s[:a]+"""
    private fun normalizeUsername(value: String): String {
        val raw = value.trim().removePrefix("@")
        val candidate = if (raw.contains("://")) Uri.parse(raw).pathSegments.firstOrNull().orEmpty()
            else raw.replace(Regex("^(?:www[.])?(?:zpas[.]org|zpass[.]org|zp[.]me)/", RegexOption.IGNORE_CASE), "")
        return candidate.trim('/').lowercase(Locale.ROOT).replace("-", "").replace("_", "")
    }

    private val reservedNames by lazy { SYSTEM_RESERVED_USERNAMES.map(::normalizeUsername).toSet() }
    private val protectedBrands by lazy { PROTECTED_BRAND_USERNAMES.map(::normalizeUsername).toSet() }

    fun isProtectedBrand(username: String): Boolean = normalizeUsername(username) in protectedBrands
    fun isReserved(username: String): Boolean = normalizeUsername(username) in reservedNames

    /** Old language URLs are consumed without changing device language or opening a profile. */
    @Suppress("UNUSED_PARAMETER")
    fun handleDeepLink(context: Context, url: String): Boolean {
        val raw = url.trim()
        val uri = Uri.parse(if (raw.contains("://")) raw else "https://$raw")
        val scheme = uri.scheme?.lowercase(Locale.ROOT)
        val host = uri.host?.lowercase(Locale.ROOT)
        val ownedHosts = setOf("zpas.org", "www.zpas.org", "web.zpas.org", "login.zpas.org",
            "zpass.org", "www.zpass.org", "web.zpass.org", "login.zpass.org")
        val route = when {
            scheme in setOf("http", "https") && host in ownedHosts -> uri.pathSegments.firstOrNull()
            scheme in setOf("zp", "zpass") -> host ?: uri.pathSegments.firstOrNull()
            else -> return false
        }
        return route?.lowercase(Locale.ROOT) in setOf("setlanguage", "language", "lang")
    }
}
"""
p.write_text(s,encoding='utf-8')
p=base/'MainActivity.kt';s=p.read_text(encoding='utf-8');s=re.sub(r'    private var pendingSetLanguageCode.*\n','',s);s=re.sub(r'    fun triggerSetLanguage\(langCode: String\) \{.*?\n    \}\n','',s,flags=re.S)
s=re.sub(r'            if \(segments.size >= 2 && segments\[0\].lowercase\(\) == "setlanguage"\) \{.*?\n            \}\n','',s,flags=re.S)
a=s.index('        if (uri.scheme.equals("zpass", true) || uri.scheme.equals("zp", true)) {');b=s.index('        when (uri.scheme?.lowercase())',a);s=s[:a]+s[b:];s=s.replace('!it.startsWith("+") }','!it.startsWith("+") && !SystemDeepLinks.isReserved(it) }');p.write_text(s,encoding='utf-8')
p=base/'LanguageManager.kt';s=p.read_text(encoding='utf-8');a=s.index('    fun selected(context: Context): String {');b=s.index('    private fun detect(',a);s=s[:a]+"""    @Suppress("UNUSED_PARAMETER")
    fun selected(context: Context): String = detect(context)

    @Suppress("UNUSED_PARAMETER")
    fun preference(context: Context): String = AUTO_DETECT

"""+s[b:];s=s.replace('Locale.forLanguageTag(languageCode)','Locale.forLanguageTag(selected(context))');a=s.index('    fun select(context: Context, languageCode: String) {');b=s.index('    private tailrec fun Context.findActivity()',a);s=s[:a]+"""    // Device language is authoritative. Retain these APIs for existing callers.
    @Suppress("UNUSED_PARAMETER")
    fun select(context: Context, languageCode: String) { apply(context) }

    @Suppress("UNUSED_PARAMETER")
    fun syncAccount(context: Context, user: FirebaseUser) { }

"""+s[b:];p.write_text(s,encoding='utf-8')
p=base/'chat/ChatRepository.kt';s=p.read_text(encoding='utf-8');s=s.replace('document(name).set(\n                        mapOf("requestedName"','document(name + "_" + uid).set(\n                        mapOf("requestedName"').replace('"requestedAt" to System.currentTimeMillis(), "status" to "pending"','"requestedAt" to com.google.firebase.firestore.FieldValue.serverTimestamp(), "status" to "pending"');s=s.replace('Verification request sent to @BotSecure. Use a backup link (e.g. $name-ZP_${uid.take(4).uppercase()}) or await admin approval.','Administrator approval is required for your account.');p.write_text(s,encoding='utf-8')
print('Updated Android deep links, name normalization, device language and brand requests.')

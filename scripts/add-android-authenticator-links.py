from pathlib import Path
r=Path('C:/Users/rezan/AndroidStudioProjects/ZPassManager/app/src')
p=r/'main/AndroidManifest.xml'
s=p.read_text(encoding='utf-8').replace('android:name=".MainActivity"','android:name=".MainActivity"\n            android:launchMode="singleTop"',1)
marker='            <!-- Backup File Import -->'
filter='''            <!-- Standard authenticator QR links opened by Android camera/Lens. -->
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="otpauth" android:host="totp" />
            </intent-filter>

'''
assert marker in s
p.write_text(s.replace(marker,filter+marker,1),encoding='utf-8')
p=r/'main/java/com/zpass/MainActivity.kt'
s=p.read_text(encoding='utf-8')
s=s.replace('    private var pendingZhcUri by mutableStateOf<Uri?>(null)','    private var pendingZhcUri by mutableStateOf<Uri?>(null)\n    private var pendingAuthenticatorUri by mutableStateOf<String?>(null)',1)
s=s.replace('            "http", "https" -> pendingEmailActionUri = uri','            "otpauth" -> if (uri.host.equals("totp", true) && uri.toString().length <= 16384) pendingAuthenticatorUri = uri.toString()\n            "http", "https" -> pendingEmailActionUri = uri',1)
old='                            initialRecoveryAction = if (autoRestoreTriggered) "restore" else null'
new=old+''',
                            incomingAuthenticatorUri = pendingAuthenticatorUri,
                            onAuthenticatorUriConsumed = {
                                pendingAuthenticatorUri = null
                                if (intent?.data?.scheme.equals("otpauth", true)) intent.data = null
                            }'''
assert old in s
s=s.replace(old,new,1)
old='    initialRecoveryAction: String? = null\n) {'
new='    initialRecoveryAction: String? = null,\n    incomingAuthenticatorUri: String? = null,\n    onAuthenticatorUriConsumed: () -> Unit = {}\n) {'
assert old in s
s=s.replace(old,new,1)
modern=s.index('fun ModernPassScreen(')
pos=s.index('    var tab by remember { mutableIntStateOf(0) }',modern)
end=pos+len('    var tab by remember { mutableIntStateOf(0) }')
s=s[:end]+ '\n    LaunchedEffect(incomingAuthenticatorUri) { if (incomingAuthenticatorUri != null) tab = 3 }'+s[end:]
old='                AuthenticatorScreen(user.id) { tab = 0 }'
new='                AuthenticatorScreen(userId = user.id, incomingUri = incomingAuthenticatorUri, onIncomingUriConsumed = onAuthenticatorUriConsumed, onDismiss = { tab = 0 })'
assert old in s
s=s.replace(old,new,1)
s=s.replace('private suspend fun triggerBackgroundCloudSync(', 'internal suspend fun triggerBackgroundCloudSync(',1)
p.write_text(s,encoding='utf-8')
p=r/'main/java/com/zpass/AuthenticatorScreen.kt'
s=p.read_text(encoding='utf-8').replace('fun AuthenticatorScreen(userId: Long, onDismiss: () -> Unit) {','fun AuthenticatorScreen(userId: Long, incomingUri: String? = null, onIncomingUriConsumed: () -> Unit = {}, onDismiss: () -> Unit) {',1)
s=s.replace('                    val count = dao.getAllSync(userId).size','''                    val existing = withContext(Dispatchers.IO) { dao.getAllSync(userId) }
                    if (existing.any { entry -> entry.algorithm.equals(parsed.algorithm, true) && entry.digits == parsed.digits && entry.period == parsed.period && runCatching { Security.decrypt(entry.encryptedSecret) == parsed.secret }.getOrDefault(false) }) {
                        Toast.makeText(context, context.getString(R.string.auth_account_added, parsed.issuer), Toast.LENGTH_SHORT).show()
                        return@withLock
                    }
                    val count = existing.size''',1)
needle='                    Toast.makeText(context, context.getString(R.string.auth_account_added, parsed.issuer), Toast.LENGTH_SHORT).show()\n                    }'
assert needle in s
s=s.replace(needle,'                    Toast.makeText(context, context.getString(R.string.auth_account_added, parsed.issuer), Toast.LENGTH_SHORT).show()\n                    withContext(Dispatchers.IO) { triggerBackgroundCloudSync(context, userId) }\n                    }',1)
marker='    val imagePicker = rememberLauncherForActivityResult'
assert marker in s
s=s.replace(marker,'''    LaunchedEffect(incomingUri) {
        incomingUri?.let { uri ->
            onIncomingUriConsumed()
            addParsed(uri)
        }
    }
''' + marker,1)
p.write_text(s,encoding='utf-8')
p=r/'main/java/com/zpass/security/TotpEngine.kt'
s=p.read_text(encoding='utf-8').replace('import android.net.Uri','import java.net.URI\nimport java.net.URLDecoder\nimport java.nio.charset.StandardCharsets')
start=s.index('        val uri = Uri.parse(uriText.trim())')
end=s.index('        return Parsed(',start)
s=s[:start]+'''        require(uriText.length <= 16384) { "QR code is too large" }
        val uri = URI(uriText.trim())
        require(uri.scheme.equals("otpauth", true) && uri.host.equals("totp", true)) { "Only TOTP QR codes are supported" }
        require(uri.userInfo == null && uri.port == -1 && uri.fragment == null) { "Invalid authenticator URI" }
        fun decode(value: String) = URLDecoder.decode(value.replace("+", "%2B"), StandardCharsets.UTF_8.name())
        val query = uri.rawQuery.orEmpty().split('&').filter { it.isNotEmpty() }.map {
            decode(it.substringBefore('=')) to decode(it.substringAfter('=', ""))
        }
        require(query.map { it.first }.distinct().size == query.size) { "Repeated authenticator parameter" }
        val params = query.toMap()
        val label = decode(uri.rawPath.orEmpty().trimStart('/'))
        val labelIssuer = label.substringBefore(':', "").trim()
        val account = label.substringAfter(':', label).trim()
        val issuer = params["issuer"]?.trim().orEmpty().ifBlank { labelIssuer.ifBlank { "Authenticator" } }
        val secret = params["secret"]?.filterNot(Char::isWhitespace)?.uppercase(java.util.Locale.ROOT).orEmpty().trimEnd('=')
        require(secret.length >= 16 && secret.all { it in "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567" }) { "Invalid Base32 secret" }
        val algorithm = params["algorithm"]?.uppercase(java.util.Locale.ROOT) ?: "SHA1"
        require(algorithm in setOf("SHA1", "SHA256", "SHA512")) { "Unsupported TOTP algorithm" }
        val digits = params["digits"]?.let { it.toIntOrNull() ?: error("Invalid digits") } ?: 6
        val period = params["period"]?.let { it.toIntOrNull() ?: error("Invalid period") } ?: 30
        require(digits in 6..8 && period in 15..120) { "Invalid TOTP settings" }
''' + s[end:]
p.write_text(s,encoding='utf-8')
p=r/'test/java/com/zpass/security/TotpLinkTest.kt'
p.write_text('''package com.zpass.security
import org.junit.Assert.*
import org.junit.Test
class TotpLinkTest {
    private val secret = "JBSWY3DPEHPK3PXP"
    @Test fun cameraLinkKeepsIssuerAccountAndDefaults() {
        val parsed=TotpEngine.parse("otpauth://totp/Google:alice%40example.com?secret=$secret&issuer=Google")
        assertEquals("Google",parsed.issuer);assertEquals("alice@example.com",parsed.account)
        assertEquals("SHA1",parsed.algorithm);assertEquals(6,parsed.digits);assertEquals(30,parsed.period)
    }
    @Test fun encodedLabelsAreDecodedOnlyOnceAndPlusIsPreserved() {
        val parsed=TotpEngine.parse("otpauth://totp/Test:alice+work%2540example.com?secret=$secret")
        assertEquals("alice+work%40example.com",parsed.account)
    }
    @Test fun customAlgorithmAndPeriodArePreserved() {
        val parsed=TotpEngine.parse("otpauth://totp/Work:alice?secret=$secret&algorithm=SHA256&digits=8&period=60")
        assertEquals("SHA256",parsed.algorithm);assertEquals(8,parsed.digits);assertEquals(60,parsed.period)
    }
    @Test fun malformedAndUnsupportedLinksAreRejected() {
        val invalid=listOf("https://example.com", "otpauth://hotp/Test?secret=$secret", "otpauth://totp/Test?secret=INVALID!SECRET123", "otpauth://totp/Test?secret=$secret&secret=$secret", "otpauth://totp/Test?secret=$secret&algorithm=MD5", "otpauth://totp/Test?secret=$secret&digits=0", "otpauth://totp/Test?secret=$secret&period=0")
        invalid.forEach { assertTrue(runCatching { TotpEngine.parse(it) }.isFailure) }
    }
}
''',encoding='utf-8')
print('Added Android Open-with authenticator handling, authenticated import, duplicate checks and TOTP link tests')

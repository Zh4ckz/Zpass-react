from pathlib import Path
import json,xml.sax.saxutils as xml
root=Path(r'C:\Users\rezan\AndroidStudioProjects\ZPassManager\app\src\main')
catalogs=json.loads(Path('Zpass/scripts/approval-translations.json').read_text(encoding='utf-8'))
names=['title_signin','title_card','notification_body','question','instruction','yes','no','cannot_see','help','expires','sending','device','location','unknown_location','device_region','expired','error','mismatch','pin','verify','cancelled','login_disabled','unavailable','retry','close','new_code','lifetime','confirm_phone']
for locale,catalog in catalogs.items():
 lang=locale.split('-')[0];folder=root/'res'/('values' if lang=='en' else 'values-'+lang);folder.mkdir(exist_ok=True)
 lines=['<resources>']
 for name,(key,value) in zip(names,catalog.items()):
  value=value.replace('{0}','%1$d' if name=='expires' else '%1$s').replace("'",r"\'")
  lines.append('    <string name="approval_'+name+'">'+xml.escape(value)+'</string>')
 lines.append('</resources>');(folder/'zpass_approval.xml').write_text('\n'.join(lines)+'\n',encoding='utf-8')
p=root/'java/com/zpass/LanguageManager.kt';s=p.read_text(encoding='utf-8');s=s.replace('        AppLanguage("ru",', '        AppLanguage("id", "Bahasa Indonesia", "🇮🇩"),\n        AppLanguage("ko", "한국어", "🇰🇷"),\n        AppLanguage("ku", "Kurdî", "🇹🇯"),\n        AppLanguage("ru",');p.write_text(s,encoding='utf-8')
p=root/'java/com/zpass/security/LoginApprovalPolicy.kt';s=p.read_text(encoding='utf-8');s=s.replace('fun expiresAt(explicitExpiry: Long?, createdAt: Long?): Long = explicitExpiry ?: createdAt?.plus(60_000L) ?: 0L','fun expiresAt(explicitExpiry: Long?, createdAt: Long?): Long {\n        val maximum = createdAt?.plus(60_000L) ?: return 0L\n        return explicitExpiry?.coerceAtMost(maximum) ?: maximum\n    }');p.write_text(s,encoding='utf-8')
p=root/'java/com/zpass/security/LoginApproval.kt';s=p.read_text(encoding='utf-8');s=s.replace('val locationLabel: String = ""','val locationLabel: String = "",\n    val locationKind: String = "unavailable"');s=s.replace('fun listenPendingRequest(uid: String):','fun listenPendingRequest(uid: String, preferredId: String? = null):');s=s.replace('val doc = snapshot?.documents?.filter { expiry(it) > now &&','val doc = snapshot?.documents?.filter { (preferredId == null || it.id == preferredId) && expiry(it) > now &&');s=s.replace('it.getString("locationLabel") ?: "")','it.getString("locationLabel") ?: "", it.getString("locationKind") ?: "unavailable")');p.write_text(s,encoding='utf-8')
(root/'java/com/zpass/security/ApprovalNavigation.kt').write_text('''package com.zpass.security

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow

object ApprovalNavigation {
    private val requested = MutableStateFlow<String?>(null)
    val requestId = requested.asStateFlow()
    fun open(id: String) { if (id.matches(Regex("[A-Za-z0-9_-]{1,128}"))) requested.value = id }
    fun clear(id: String? = null) { if (id == null || requested.value == id) requested.value = null }
}
''',encoding='utf-8')
p=root/'java/com/zpass/MainActivity.kt';s=p.read_text(encoding='utf-8');s=s.replace('    private fun routeIncomingIntent(intent: Intent?) {','''    private fun routeIncomingIntent(intent: Intent?) {
        if (intent?.getBooleanExtra("open_login_approval", false) == true) {
            intent.getStringExtra("approval_request_id")?.let { com.zpass.security.ApprovalNavigation.open(it) }
            intent.removeExtra("open_login_approval")
            return
        }''');s=s.replace('    if (vaultUnlocked) LoginApprovalHost()','    LoginApprovalHost()');p.write_text(s,encoding='utf-8')

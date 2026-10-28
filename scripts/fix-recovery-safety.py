from pathlib import Path
root=Path(r'C:/Users/rezan/AndroidStudioProjects/ZPassManager/app/src/main/java/com/zpass')
p=root/'security/Cloud.kt';s=p.read_text();start=s.index('    suspend fun resetPortableVault(');end=s.index('    /** Picks the encryption',start)
s=s[:start]+'''    /** A forgotten password must never delete an existing encrypted backup. */
    suspend fun resetPortableVault(passwords: List<PasswordEntity>, cards: List<CardEntity>, authenticators: List<TotpEntity>, newRecoveryPassword: CharArray, allowEmptyLocalVault: Boolean = false): CloudSyncResult {
        newRecoveryPassword.fill('\\u0000')
        return CloudSyncResult(0, false, "Your cloud backup was preserved. Unlock with its original vault password or restore a trusted backup from another device.")
    }

'''+s[end:]
s=s.replace('Tasks.await(vault.get())','Tasks.await(vault.get(com.google.firebase.firestore.Source.SERVER))')
s=s.replace('            val encrypt = cipher.encryptValue','            VaultPasswordSession.open(uid,recoveryPassword)\n            val encrypt = cipher.encryptValue')
s=s.replace('            val decrypt = cipher.decryptValue','            VaultPasswordSession.open(uid,recoveryPassword)\n            val decrypt = cipher.decryptValue')
for name,var in [('portableItems','snapshot'),('portableCards','cardSnapshot'),('portableAuthenticators','authenticatorSnapshot')]:
 s=s.replace(f'val {var} = Tasks.await(vault.collection("{name}").get())',f'val {var} = Tasks.await(vault.collection("{name}").get(com.google.firebase.firestore.Source.SERVER))')
for field in ['domainCipher','notesCipher','categoryCipher']:
 s=s.replace(f'decrypt(document.getString("{field}").orEmpty())',f'document.getString("{field}")?.takeIf {{ it.isNotBlank() }}?.let(decrypt).orEmpty()')
p.write_text(s)
(root/'security/VaultPasswordSession.kt').write_text('''package com.zpass.security
import com.google.firebase.auth.FirebaseAuth
/** Memory only, scoped to the signed-in account; never persisted. */
object VaultPasswordSession {
    private var owner: String? = null
    private var password: CharArray? = null
    init { FirebaseAuth.getInstance().addAuthStateListener { if(it.currentUser?.uid != owner) clear() } }
    @Synchronized fun open(uid: String, value: CharArray) { clear();owner=uid;password=value.copyOf() }
    @Synchronized fun get(uid: String): CharArray? = if(owner==uid)password?.copyOf() else null
    @Synchronized fun clear() { password?.fill('\\u0000');password=null;owner=null }
}
''')
p=root/'MainActivity.kt';s=p.read_text().replace('    EscapeHatchDialog()','    // No generated recovery code: the user chooses a vault password.')
s=s.replace('val webLoginSecret = runCatching { WebLoginAuth.fetchStatus(firebaseUser.uid) }\n                            .getOrNull()?.takeIf { it.enabled }?.secret','val webLoginSecret = com.zpass.security.VaultPasswordSession.get(firebaseUser.uid)?.concatToString()')
s=s.replace('val secret = WebLoginAuth.fetchStatus(firebaseUser.uid).takeIf { it.enabled }?.secret','val secret = com.zpass.security.VaultPasswordSession.get(firebaseUser.uid)?.concatToString()')
s=s.replace('val secret = runCatching { WebLoginAuth.fetchStatus(firebaseUser.uid) }\n                                    .getOrNull()?.takeIf { it.enabled }?.secret','val secret = com.zpass.security.VaultPasswordSession.get(firebaseUser.uid)?.concatToString()')
p.write_text(s)
p=root/'ProfileScreen.kt';s=p.read_text();a=s.index('    fun attemptWithWebLoginCode(');b=s.index('    recoveryAction?.let',a)
s=s[:a]+'''    fun attemptWithWebLoginCode(action: String) {
        recoveryPassword="";recoveryConfirmation="";recoveryAction=action
    }

'''+s[b:]
a=s.index('    if (showRecoveryReset) {');b=s.index('    if (showCloudLogin) {',a)
s=s[:a]+'''    if (showRecoveryReset) {
        AlertDialog(onDismissRequest={showRecoveryReset=false},
            title={Text("Your backup is protected")},
            text={Text("Use the original vault password or a trusted backup from another device. A forgotten password cannot decrypt existing records. Your cloud backup will not be deleted.")},
            confirmButton={TextButton(onClick={showRecoveryReset=false}){Text("Close")}})
    }

'''+s[b:]
s=s.replace('if (action == "backup") runBackup(passwordChars) else runRestore(passwordChars)\n                            recoveryPassword', 'val ok = if (action == "backup") runBackup(passwordChars) else runRestore(passwordChars)\n                            if (ok) recoveryAction = null\n                            recoveryPassword')
s=s.replace('                            recoveryAction = null\n                            isSyncing = false','                            isSyncing = false')
p.write_text(s)
p=root/'LoginApprovalDialog.kt';s=p.read_text();s=s.replace('status.secret?.takeIf { status.enabled && it.isNotBlank() }', 'VaultPasswordSession.get(uid)?.concatToString()?.takeIf { status.enabled && it.isNotBlank() }');s=s.replace('import com.zpass.security.WebLoginAuth','import com.zpass.security.VaultPasswordSession\nimport com.zpass.security.WebLoginAuth');p.write_text(s)

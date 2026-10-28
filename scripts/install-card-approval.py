from pathlib import Path
r=Path(r'C:\Users\rezan\AndroidStudioProjects\ZPassManager\app\src\main\java\com\zpass')
p=r/'security/LoginApproval.kt';s=p.read_text();s=s.replace('val expiresAtMillis: Long\n','val expiresAtMillis: Long,\n    val purpose: String = "LOGIN",\n    val locationLabel: String = ""\n');s=s.replace('candidates(it), expiry(it))','candidates(it), expiry(it), it.getString("purpose") ?: "LOGIN", it.getString("locationLabel") ?: "")');s=s.replace('tappedCode != displayCode || webLoginSecret.isBlank()','tappedCode != displayCode');needle='                val wrapKey = PortableCloudCrypto.decode';s=s.replace(needle,'''                if (snapshot.getString("purpose") == "CARD_VIEW") {
                    transaction.update(doc, mapOf("status" to "approved", "respondedAt" to FieldValue.serverTimestamp()))
                    return@runTransaction true
                }
                if (webLoginSecret.isBlank()) return@runTransaction false
'''+needle);p.write_text(s)
p=r/'LoginApprovalDialog.kt';s=p.read_text();needle='    fun approve(code: String) {';s=s.replace(needle,'''    val approvalContext = LocalContext.current
    var credentialCode by remember { mutableStateOf("") }
    val credentialLauncher = androidx.activity.compose.rememberLauncherForActivityResult(androidx.activity.result.contract.ActivityResultContracts.StartActivityForResult()) { result ->
        if (result.resultCode == android.app.Activity.RESULT_OK) {
            responding = true
            scope.launch {
                try {
                    if (LoginApproval.respond(pending.id, credentialCode, pending.displayCode, "")) onClosed()
                    else error = "This request expired or was already answered."
                } catch (_: Exception) { error = "Could not send approval. Try again." }
                finally { responding = false }
            }
        } else { responding = false; error = "Device verification was cancelled." }
    }
'''+needle);s=s.replace('        responding = true; error = null\n        scope.launch {\n            try {\n                val uid', '''        if (pending.purpose == "CARD_VIEW") {
            val keyguard = approvalContext.getSystemService(android.content.Context.KEYGUARD_SERVICE) as android.app.KeyguardManager
            val intent = keyguard.createConfirmDeviceCredentialIntent("Z Pass", "Verify your identity to view this card")
            if (intent == null) { error = "Set a device PIN in Android security settings first."; return }
            credentialCode = code; responding = true; error = null; credentialLauncher.launch(intent); return
        }
        responding = true; error = null
        scope.launch {
            try {
                val uid''');s=s.replace('Text("Approve sign-in?",','Text(if (pending.purpose == "CARD_VIEW") "View payment card?" else "Approve sign-in?",');s=s.replace('if (pending.accountEmail.isNotBlank()) Text', 'if (pending.locationLabel.isNotBlank()) Text(pending.locationLabel, style = MaterialTheme.typography.bodySmall)\n                        if (pending.accountEmail.isNotBlank()) Text');s=s.replace('Text("Deny sign-in")','Text("Deny request")');p.write_text(s)

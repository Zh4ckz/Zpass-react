from pathlib import Path
r=Path(r'C:\Users\rezan\AndroidStudioProjects\ZPassManager\app\src\main\java\com\zpass')
p=r/'LoginApprovalDialog.kt';s=p.read_text();needle='    val credentialLauncher = androidx.activity.compose.rememberLauncherForActivityResult';start=s.index(needle);end=s.index('    fun approve(code:',start);s=s[:start]+'''    fun completeCardApproval() {
        responding = true
        scope.launch {
            try {
                if (LoginApproval.respond(pending.id, credentialCode, pending.displayCode, "")) onClosed()
                else error = "This request expired or was already answered."
            } catch (_: Exception) { error = "Could not send approval. Try again." }
            finally { responding = false }
        }
    }
    val credentialLauncher = androidx.activity.compose.rememberLauncherForActivityResult(androidx.activity.result.contract.ActivityResultContracts.StartActivityForResult()) { result ->
        if (result.resultCode == android.app.Activity.RESULT_OK) completeCardApproval()
        else { responding = false; error = "Device verification was cancelled." }
    }
'''+s[end:];s=s.replace('            credentialCode = code; responding = true; error = null; credentialLauncher.launch(intent); return','''            credentialCode = code; responding = true; error = null
            val activity = approvalContext as? androidx.fragment.app.FragmentActivity
            if (android.os.Build.VERSION.SDK_INT >= 30 && activity != null) {
                com.zpass.security.BiometricPromptHelper(activity).showBiometricPrompt("Z Pass", "Verify your identity to view this card",
                    onSuccess = { completeCardApproval() }, onError = { _, _ -> responding = false; error = "Device verification was cancelled or unavailable." })
            } else credentialLauncher.launch(intent)
            return''');p.write_text(s)
p=r/'notifications/ZPassMessagingService.kt';s=p.read_text().replace('        val title = message.notification?.title ?:','        if (message.data["uid"] != null && message.data["uid"] != FirebaseAuth.getInstance().currentUser?.uid) return\n        val title = message.notification?.title ?: message.data["title"] ?:').replace('val body = message.notification?.body ?:','val body = message.notification?.body ?: message.data["body"] ?:');p.write_text(s)
p=Path('Zpass/scripts/zpass_security_push.py');s=p.read_text().replace("'title': title, 'body': body, 'requestId': doc.id,","'title': title, 'body': body, 'requestId': doc.id, 'uid': data['uid'],");p.write_text(s)

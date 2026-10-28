from pathlib import Path
root=Path(r'C:/Users/rezan/AndroidStudioProjects/ZPassManager/app/src/main/java/com/zpass')
p=root/'security/Cloud.kt';s=p.read_text(encoding='utf-8');point=s.index('    /** Picks the encryption')
s=s[:point]+'''    suspend fun vaultPasswordExists(): Boolean = withContext(Dispatchers.IO) {
        val uid=FirebaseAuth.getInstance().currentUser?.uid ?: error("Sign in first")
        val ref=FirebaseFirestore.getInstance().collection("vaults").document(uid)
        val metadata=Tasks.await(ref.get(com.google.firebase.firestore.Source.SERVER))
        if(metadata.getString("encryption")!=null || metadata.getString("recoveryKeyCheck")!=null) return@withContext true
        for(name in listOf("portableItems","portableCards","portableAuthenticators","items")) {
            if(!Tasks.await(ref.collection(name).limit(1).get(com.google.firebase.firestore.Source.SERVER)).isEmpty)
                return@withContext true
        }
        false
    }

    suspend fun createVaultPassword(password: CharArray): CloudSyncResult = withContext(Dispatchers.IO) {
        try {
            val uid=FirebaseAuth.getInstance().currentUser?.uid ?: error("Sign in first")
            if(vaultPasswordExists()) return@withContext CloudSyncResult(0,false,"An encrypted backup already exists. Use the original vault password.")
            val store=FirebaseFirestore.getInstance();val ref=store.collection("vaults").document(uid)
            val metadata=Tasks.await(ref.get(com.google.firebase.firestore.Source.SERVER))
            val cipher=resolveCipher(password,metadata) ?: error("Cannot initialize vault")
            Tasks.await(store.runTransaction { transaction ->
                val current=transaction.get(ref)
                check(current.getString("encryption")==null && current.getString("recoveryKeyCheck")==null) { "Vault already exists" }
                transaction.set(ref,cipher.metadataFields,SetOptions.merge())
            })
            VaultPasswordSession.open(uid,password)
            CloudLocationSync.open(cipher.encryptValue,cipher.decryptValue)
            CloudDataSync.open(cipher.encryptValue,cipher.decryptValue,cipher.documentIdKey)
            CloudSyncResult(0,true,"Vault password created. Cloud backup is ready.")
        } catch(_:Exception) { CloudSyncResult(0,false,"Could not create the vault password. Check your connection; existing backups were preserved.") }
        finally { password.fill('\\u0000') }
    }

'''+s[point:];p.write_text(s,encoding='utf-8')
p=root/'MainActivity.kt';s=p.read_text(encoding='utf-8');needle='    var recoveryConfirmation by remember { mutableStateOf("") }';pos=s.index(needle,s.index('fun ModernPassScreen('))+len(needle)
s=s[:pos]+'''
    var recoveryError by remember { mutableStateOf<String?>(null) }
    val cloudUid = FirebaseAuth.getInstance().currentUser?.uid
    LaunchedEffect(cloudUid) {
        if(cloudUid != null && com.zpass.security.VaultPasswordSession.get(cloudUid)==null) {
            try { recoveryAction=if(Cloud.vaultPasswordExists()) "restore" else "create" }
            catch(_:Exception) { recoveryError="Could not check your cloud backup. Connect to the internet and try Restore vault." }
        }
    }
'''+s[pos:]
start=s.index('    recoveryAction?.let { action ->',s.index('fun ModernPassScreen('));end=s.index('\n    }',start)+6
old=s[start:end]
new='''    recoveryAction?.let { action ->
        val creating=action=="create"
        AlertDialog(
            onDismissRequest={if(!isSyncing){recoveryAction=null;recoveryPassword="";recoveryConfirmation="";recoveryError=null}},
            icon={Icon(Icons.Default.Key,null,tint=MaterialTheme.colorScheme.primary)},
            title={Text(if(creating) "Create a vault password" else "Restore your vault")},
            text={Column(verticalArrangement=Arrangement.spacedBy(10.dp)) {
                Text(if(creating) "Choose a password to protect your backup. Keep it safe: you will need the same password after reinstalling." else "Enter the vault password you created before. Your account login password may be different.")
                OutlinedTextField(recoveryPassword,{recoveryPassword=it;recoveryError=null},label={Text("Vault password")},visualTransformation=PasswordVisualTransformation(),singleLine=true,enabled=!isSyncing)
                if(creating)OutlinedTextField(recoveryConfirmation,{recoveryConfirmation=it},label={Text("Confirm vault password")},visualTransformation=PasswordVisualTransformation(),singleLine=true,enabled=!isSyncing)
                recoveryError?.let{Text(it,color=MaterialTheme.colorScheme.error)}
            }},
            confirmButton={Button(enabled=!isSyncing && recoveryPassword.isNotEmpty() && (!creating || (recoveryPassword.length>=10 && recoveryPassword==recoveryConfirmation)),onClick={
                val chars=recoveryPassword.toCharArray();isSyncing=true;recoveryError=null
                modernScreenScope.launch {
                    try {
                        val ok=if(creating) {
                            val result=Cloud.createVaultPassword(chars);if(!result.success)recoveryError=result.message
                            if(result.success)autoBackupToCloud(context,user.id)
                            result.success
                        } else runRestore(chars)
                        if(ok){recoveryAction=null;recoveryPassword="";recoveryConfirmation=""}
                        else if(recoveryError==null) recoveryError="Could not restore. Check the original vault password; your cloud backup was preserved."
                    } catch(_:Exception) { recoveryError="Could not reach your backup. Try again." }
                    finally {chars.fill('\\u0000');isSyncing=false}
                }
            }){if(isSyncing)CircularProgressIndicator(Modifier.size(18.dp),strokeWidth=2.dp)else Text(if(creating)"Create password" else "Restore")}},
            dismissButton={TextButton(onClick={recoveryAction=null;recoveryPassword="";recoveryConfirmation=""},enabled=!isSyncing){Text("Cancel")}}
        )
    }'''
s=s[:start]+new+s[end:];p.write_text(s,encoding='utf-8')
print('Installed password setup/restore gate and blocked destructive reset')

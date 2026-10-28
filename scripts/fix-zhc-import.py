from pathlib import Path
root=Path(r'C:/Users/rezan/AndroidStudioProjects/ZPassManager/app/src/main/java/com/zpass')
p=root/'security/Backup.kt';s=p.read_text(encoding='utf-8');a=s.index('    fun importFromZhc(');b=s.index('    // Compatibility',a)
s=s[:a]+'''    data class ImportResult(val success:Boolean,val count:Int,val message:String)

    private fun readBackup(context:Context,uri:Uri):List<PasswordEntity> {
        val content=context.contentResolver.openInputStream(uri)?.use {
            val bytes=it.readNBytes(MAX_FILE_BYTES+1)
            require(bytes.size<=MAX_FILE_BYTES) { "The backup is larger than 20 MB." }
            String(bytes,StandardCharsets.UTF_8).removePrefix("\\uFEFF")
        } ?: error("Could not open this backup. Select the file again.")
        val parts=content.split('\\n',limit=3)
        require(parts.size==3 && parts[0].trim()==MAGIC) { "This file is not a valid Z Pass backup." }
        require(parts[1].trim().toIntOrNull()==VERSION) { "This backup format is not supported by this Android version." }
        val json=try {Security.decrypt(parts[2].trim())} catch(_:Exception) {
            error("This older backup is encrypted with the Android key from the installation that created it. The current installation cannot open it. A recovery password cannot replace that device key. Your backup file was not changed.")
        }
        val envelope=gson.fromJson(json,ZhcEnvelope::class.java)
        require(envelope.format==MAGIC && envelope.version==VERSION) { "Unsupported backup contents." }
        val entries=envelope.entries ?: error("Backup entries are missing.")
        for(entry in entries)try {Security.decrypt(entry.encryptedPass)} catch(_:Exception) {
            error("A record in this backup cannot be decrypted on this installation. Nothing was imported.")
        }
        return entries
    }

    fun importFromZhc(context:Context,uri:Uri):List<PasswordEntity>? = runCatching {readBackup(context,uri)}.getOrNull()

    suspend fun importForUser(context:Context,uri:Uri,userId:Long):ImportResult = kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.IO) {
        if(userId<=0)return@withContext ImportResult(false,0,"Sign in before importing a backup.")
        try {
            val entries=readBackup(context,uri)
            val db=com.zpass.data.AppDatabase.getDatabase(context)
            var added=0
            db.withTransaction {
                val known=db.passwordDao().getAllPasswordsSync(userId).map {Triple(it.platform,it.username,it.domain)}.toMutableSet()
                for(entry in entries) {
                    if(!known.add(Triple(entry.platform,entry.username,entry.domain)))continue
                    db.passwordDao().insertPassword(entry.copy(id=0,userId=userId,cloudId="",cloudLocationDirty=false))
                    if(entry.category.isNotBlank())db.vaultCategoryDao().insert(com.zpass.data.VaultCategoryEntity(userId=userId,name=entry.category))
                    added++
                }
            }
            ImportResult(true,added,"$added records imported; ${entries.size-added} existing records skipped.")
        } catch(error:Exception) {ImportResult(false,0,error.message ?: "Backup import failed. Nothing was changed.")}
    }

'''+s[b:];s=s.replace('import android.content.Context','import androidx.room.withTransaction\nimport android.content.Context');p.write_text(s,encoding='utf-8')
p=root/'MainActivity.kt';s=p.read_text(encoding='utf-8');a=s.index('                        val targetUserId = currentUser?.id ?: 999L');b=s.index('\n                    }',a)
s=s[:a]+'''                        val targetUserId = currentUser?.id ?: return@LaunchedEffect
                        val result=Backup.importForUser(context,backupUri,targetUserId)
                        pendingZhcUri=null
                        Toast.makeText(context,result.message,Toast.LENGTH_LONG).show()
                        if(result.success)triggerBackgroundCloudSync(context,targetUserId)'''+s[b:]
a=s.index('            val imported = Backup.importFromZhcz(context, it)');b=s.index('\n        }',a)
s=s[:a]+'''            scope.launch {
                val result=Backup.importForUser(context,it,user.id)
                Toast.makeText(context,result.message,Toast.LENGTH_LONG).show()
                if(result.success)triggerBackgroundCloudSync(context,user.id)
            }'''+s[b:]
a=s.index('            Backup.importFromZhc(context, it)?.let { imported ->');b=s.index('\n        }',a)
s=s[:a]+'''            modernScreenScope.launch {
                val result=Backup.importForUser(context,it,user.id)
                Toast.makeText(context,result.message,Toast.LENGTH_LONG).show()
                if(result.success)triggerBackgroundCloudSync(context,user.id)
            }'''+s[b:];p.write_text(s,encoding='utf-8')

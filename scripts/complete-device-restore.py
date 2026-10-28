from pathlib import Path
root=Path(r'C:/Users/rezan/AndroidStudioProjects/ZPassManager/app/src/main/java/com/zpass')
p=root/'security/Cloud.kt';s=p.read_text(encoding='utf-8').replace('\x00',r'\u0000')
s=s.replace('val authenticators: List<TotpEntity> = emptyList()','val authenticators: List<TotpEntity> = emptyList(),\n    val personalInfo: com.zpass.data.PersonalInfoEntity? = null')
start=s.index('    suspend fun restoreFromCloud(recoveryPassword: CharArray)');end=s.index('    /** Uploads only',start)
part=s[start:end]
part=part.replace('            CloudLocationSync.open(cipher.encryptValue, cipher.decryptValue)\n            CloudDataSync.open(cipher.encryptValue, cipher.decryptValue, cipher.documentIdKey)\n            VaultPasswordSession.open(uid,recoveryPassword)\n','')
part=part.replace('            var unreadable = 0','            val personalSnapshot=Tasks.await(vault.collection("portablePersonalInfo").document("profile").get(com.google.firebase.firestore.Source.SERVER))\n            var unreadable = 0')
part=part.replace('snapshot.documents.mapNotNull','snapshot.documents.filter { it.getBoolean("deleted") != true }.mapNotNull')
part=part.replace('authenticatorSnapshot.documents.mapNotNull','authenticatorSnapshot.documents.filter { it.getBoolean("deleted") != true }.mapNotNull')
part=part.replace('decrypt(document.getString("algorithmCipher").orEmpty()).ifBlank { "SHA1" }','document.getString("algorithmCipher")?.takeIf { it.isNotBlank() }?.let(decrypt).orEmpty().ifBlank { "SHA1" }')
a=part.index('            val total = restored.size');b=part.index('        } catch (error:',a)
part=part[:a]+'''            val personal=if(personalSnapshot.exists()) runCatching {
                fun field(name:String)=Security.encrypt(personalSnapshot.getString(name+"Cipher")?.takeIf { it.isNotBlank() }?.let(decrypt).orEmpty())
                com.zpass.data.PersonalInfoEntity(0,field("firstName"),field("lastName"),field("email"),field("phone"),field("company"),field("addressLine1"),field("addressLine2"),field("city"),field("state"),field("postalCode"),field("country"),cloudDirty=false,cloudModifiedAt=0)
            }.getOrElse { unreadable++;null } else null
            if(unreadable>0) return@withContext CloudRestoreResult(emptyList(),false,"$unreadable cloud record(s) could not be decrypted. Restore was not applied; your backup was preserved.")
            VaultPasswordSession.open(uid,recoveryPassword)
            CloudLocationSync.open(cipher.encryptValue,cipher.decryptValue)
            CloudDataSync.open(cipher.encryptValue,cipher.decryptValue,cipher.documentIdKey)
            val total=restored.size+restoredCards.size+restoredAuthenticators.size+(if(personal!=null)1 else 0)
            CloudRestoreResult(restored,true,if(total==0) "No records exist in this cloud backup. Nothing was restored." else "${restored.size} passwords, ${restoredCards.size} cards, ${restoredAuthenticators.size} authenticators and ${if(personal!=null)1 else 0} personal profile restored",restoredCards,restoredAuthenticators,personal)
'''+part[b:]
s=s[:start]+part+s[end:];p.write_text(s,encoding='utf-8')
(root/'security/VaultRestoreCoordinator.kt').write_text('''package com.zpass.security
import android.content.Context
import androidx.room.withTransaction
import com.zpass.data.*
import com.google.firebase.auth.FirebaseAuth
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/** Import all record types atomically, then enable background synchronization. Never deletes local data. */
object VaultRestoreCoordinator {
 suspend fun restore(context:Context,userId:Long,password:CharArray):CloudRestoreResult = withContext(Dispatchers.IO) {
  val uid=FirebaseAuth.getInstance().currentUser?.uid ?: return@withContext CloudRestoreResult(emptyList(),false,"Sign in first")
  val result=Cloud.restoreFromCloud(password)
  if(!result.success)return@withContext result
  if(FirebaseAuth.getInstance().currentUser?.uid!=uid)return@withContext result.copy(success=false,message="The signed-in account changed. Restore was cancelled.")
  val db=AppDatabase.getDatabase(context.applicationContext)
  try {
   db.withTransaction {
    val passwords=db.passwordDao().getAllPasswordsSync(userId)
    val knownIds=passwords.map{it.cloudId}.filter{it.isNotBlank()}.toMutableSet()
    val identities=passwords.map{Triple(it.platform,it.username,it.domain)}.toMutableSet()
    for(item in result.items) {
     if(item.cloudId in knownIds || Triple(item.platform,item.username,item.domain) in identities)continue
     db.passwordDao().insertPassword(item.copy(id=0,userId=userId));knownIds+=item.cloudId;identities+=Triple(item.platform,item.username,item.domain)
     if(item.category.isNotBlank())db.vaultCategoryDao().insert(VaultCategoryEntity(userId=userId,name=item.category))
    }
    val cards=db.cardDao().getIncludingDeleted(userId)
    val cardIds=cards.map{it.cloudId}.filter{it.isNotBlank()}.toMutableSet()
    val cardNumbers=cards.map{Security.decryptForDisplay(it.encryptedNumber).filter(Char::isDigit)}.toMutableSet()
    for(card in result.cards){val number=Security.decryptForDisplay(card.encryptedNumber).filter(Char::isDigit)
     if(card.cloudId in cardIds || number in cardNumbers)continue
     db.cardDao().insertFromCloud(card.copy(id=0,userId=userId,cloudDirty=false));cardIds+=card.cloudId;cardNumbers+=number
    }
    val tokens=db.totpDao().getAllSync(userId).map{Triple(it.issuer,it.accountName,Security.decryptForDisplay(it.encryptedSecret))}.toMutableSet()
    for(token in result.authenticators){val identity=Triple(token.issuer,token.accountName,Security.decryptForDisplay(token.encryptedSecret))
     if(tokens.add(identity))db.totpDao().insert(token.copy(id=0,userId=userId))
    }
    result.personalInfo?.let { remote ->
     val local=db.personalInfoDao().getForUserSync(userId)
     if(local==null || !local.cloudDirty)db.personalInfoDao().upsertFromCloud(remote.copy(userId=userId,cloudDirty=false))
    }
   }
   CloudLocationSync.start(context,userId)
   result
  } catch(_:Exception) {
   VaultPasswordSession.clear();CloudDataSync.stop()
   result.copy(success=false,message="Restore could not be saved. Local changes were rolled back; the cloud backup was preserved.")
  }
 }
}
''',encoding='utf-8')
for file,next_marker in [('ProfileScreen.kt','    fun attemptWithWebLoginCode('),('MainActivity.kt','    recoveryAction?.let { action ->')]:
 p=root/file;s=p.read_text(encoding='utf-8');a=s.index('    suspend fun runRestore(keyChars: CharArray): Boolean {');b=s.index(next_marker,a)
 extra='        syncStatus=result.message\n' if file=='ProfileScreen.kt' else ''
 s=s[:a]+'''    suspend fun runRestore(keyChars: CharArray): Boolean {
        val result=com.zpass.security.VaultRestoreCoordinator.restore(context,user.id,keyChars)
'''+extra+'''        Toast.makeText(context,result.message,Toast.LENGTH_LONG).show()
        return result.success
    }

'''+s[b:];p.write_text(s,encoding='utf-8')

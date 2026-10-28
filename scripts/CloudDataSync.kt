package com.zpass.security

import android.content.Context
import com.google.android.gms.tasks.Tasks
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.*
import com.zpass.data.*
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import javax.crypto.SecretKey

/** Portable encrypted cards and personal information. Local dirty rows survive reconnects. */
@OptIn(FlowPreview::class)
object CloudDataSync {
    private val scope=CoroutineScope(SupervisorJob()+Dispatchers.IO)
    private val gate=Mutex()
    private var uid:String?=null
    private var encrypt:((String)->String)?=null
    private var decrypt:((String)->String)?=null
    private var key:SecretKey?=null
    private var runningUser:Long?=null
    private val listeners=mutableListOf<ListenerRegistration>()
    private val jobs=mutableListOf<Job>()
    init { FirebaseAuth.getInstance().addAuthStateListener { if(it.currentUser?.uid!=uid) stop() } }
    @Synchronized fun stop(){listeners.forEach{it.remove()};listeners.clear();jobs.forEach{it.cancel()};jobs.clear();uid=null;encrypt=null;decrypt=null;key=null;runningUser=null}
    fun open(enc:(String)->String,dec:(String)->String,idKey:SecretKey){
        val current=FirebaseAuth.getInstance().currentUser?.uid ?: return
        if(uid!=current)stop()
        uid=current;encrypt=enc;decrypt=dec;key=idKey
    }
    private fun valid(owner:String)=uid==owner && FirebaseAuth.getInstance().currentUser?.uid==owner && encrypt!=null
    fun start(context:Context,userId:Long){
        val owner=uid ?: return
        if(!valid(owner)||runningUser==userId)return
        runningUser=userId
        val db=AppDatabase.getDatabase(context.applicationContext)
        var cardsReady=false
        var personalReady=false
        val vault=FirebaseFirestore.getInstance().collection("vaults").document(owner)
        listeners+=vault.collection("portableCards").addSnapshotListener { snap,error ->
            if(error!=null||snap==null||!valid(owner))return@addSnapshotListener
            scope.launch { gate.withLock {
                if(!valid(owner))return@withLock
                val decode=decrypt ?: return@withLock
                val dao=db.cardDao()
                for(doc in snap.documents)runCatching {
                    fun value(name:String)=doc.getString(name)?.takeIf{it.isNotBlank()}?.let(decode).orEmpty()
                    val number=value("numberCipher")
                    if(number.isBlank())return@runCatching
                    val local=dao.getIncludingDeleted(userId).firstOrNull{it.cloudId==doc.id}
                        ?: dao.getIncludingDeleted(userId).firstOrNull{it.cloudId.isBlank() && Security.decryptForDisplay(it.encryptedNumber)==number}
                    if(local?.cloudDirty==true && local.cloudModifiedAt>0){
                        if(local.cloudId.isBlank())dao.insertFromCloud(local.copy(cloudId=doc.id))
                        return@runCatching
                    }
                    val deleted=doc.getBoolean("deleted")==true
                    val item=CardEntity(id=local?.id ?: 0,userId=userId,encryptedNumber=Security.encrypt(number),
                        encryptedCardholder=Security.encrypt(value("cardholderCipher")),encryptedExpiry=Security.encrypt(value("expiryCipher")),
                        encryptedBrand=Security.encrypt(value("brandCipher")),encryptedBank=Security.encrypt(value("bankCipher")),
                        encryptedNickname=Security.encrypt(value("nicknameCipher")),encryptedCvv=Security.encrypt(value("cvvCipher")),
                        encryptedCvv2=Security.encrypt(value("cvv2Cipher")),category=value("categoryCipher"),
                        cloudId=doc.id,cloudDirty=false,cloudDeleted=deleted,cloudModifiedAt=doc.getTimestamp("updatedAt")?.toDate()?.time ?: 0)
                    dao.insertFromCloud(item)
                }
                cardsReady=true
            } }
        }
        listeners+=vault.collection("portablePersonalInfo").document("profile").addSnapshotListener { doc,error ->
            if(error!=null||doc==null||!valid(owner))return@addSnapshotListener
            scope.launch { gate.withLock {
                if(!valid(owner))return@withLock
                personalReady=true
                val local=db.personalInfoDao().getForUserSync(userId)
                if(!doc.exists() || (local?.cloudDirty==true && local.cloudModifiedAt>0))return@withLock
                val decode=decrypt ?: return@withLock
                fun field(name:String)=Security.encrypt(doc.getString(name+"Cipher")?.takeIf{it.isNotBlank()}?.let(decode).orEmpty())
                runCatching {db.personalInfoDao().upsertFromCloud(PersonalInfoEntity(userId,field("firstName"),field("lastName"),field("email"),field("phone"),field("company"),field("addressLine1"),field("addressLine2"),field("city"),field("state"),field("postalCode"),field("country"),cloudDirty=false))}
            } }
        }
        suspend fun flush(){gate.withLock {
            if(!valid(owner)||!cardsReady||!personalReady)return@withLock
            val encode=encrypt ?: return@withLock
            val idKey=key ?: return@withLock
            for(card in db.cardDao().getIncludingDeleted(userId).filter{it.cloudDirty}){
                if(!valid(owner))return@withLock
                runCatching {
                    fun field(raw:String)=encode(Security.decryptForDisplay(raw))
                    val id=card.cloudId.ifBlank{PortableCloudCrypto.documentId("card\u0000${Security.decryptForDisplay(card.encryptedNumber)}",idKey)}
                    val fields=mapOf("numberCipher" to field(card.encryptedNumber),"cardholderCipher" to field(card.encryptedCardholder),
                        "expiryCipher" to field(card.encryptedExpiry),"brandCipher" to field(card.encryptedBrand),"bankCipher" to field(card.encryptedBank),
                        "nicknameCipher" to field(card.encryptedNickname),"cvvCipher" to field(card.encryptedCvv),"cvv2Cipher" to field(card.encryptedCvv2),
                        "categoryCipher" to encode(card.category),"deleted" to card.cloudDeleted,"cryptoVersion" to 1,"updatedAt" to FieldValue.serverTimestamp())
                    Tasks.await(vault.collection("portableCards").document(id).set(fields,SetOptions.merge()))
                    if(valid(owner))db.cardDao().acknowledge(card.id,card.cloudModifiedAt,id)
                }
            }
            val info=db.personalInfoDao().getForUserSync(userId)
            if(info!=null && info.cloudDirty && valid(owner))runCatching {
                val values=mapOf("firstName" to info.encryptedFirstName,"lastName" to info.encryptedLastName,"email" to info.encryptedEmail,
                    "phone" to info.encryptedPhone,"company" to info.encryptedCompany,"addressLine1" to info.encryptedAddressLine1,
                    "addressLine2" to info.encryptedAddressLine2,"city" to info.encryptedCity,"state" to info.encryptedState,
                    "postalCode" to info.encryptedPostalCode,"country" to info.encryptedCountry)
                val fields=values.mapKeys{it.key+"Cipher"}.mapValues{encode(Security.decryptForDisplay(it.value))}.toMutableMap<String,Any>()
                fields["updatedAt"]=FieldValue.serverTimestamp();fields["cryptoVersion"]=1
                Tasks.await(vault.collection("portablePersonalInfo").document("profile").set(fields,SetOptions.merge()))
                if(valid(owner))db.personalInfoDao().acknowledge(userId,info.cloudModifiedAt)
            }
        }}
        jobs+=scope.launch{db.cardDao().observe(userId).debounce(700).collect{flush()}}
        jobs+=scope.launch{db.personalInfoDao().observe(userId).debounce(700).collect{flush()}}
        // Retry persisted pending writes after transient failures, including deleted card tombstones.
        jobs+=scope.launch{while(isActive && valid(owner)){runCatching{flush()};delay(10000)}}
    }
}

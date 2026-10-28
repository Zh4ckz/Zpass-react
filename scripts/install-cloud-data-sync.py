from pathlib import Path
root=Path(r'C:\Users\rezan\AndroidStudioProjects\ZPassManager\app\src\main\java\com\zpass')
p=root/'data/CardEntity.kt';s=p.read_text(encoding='utf-8').replace('val createdAt: Long = System.currentTimeMillis()','val cloudId: String = "",\n    val cloudDirty: Boolean = true,\n    val cloudDeleted: Boolean = false,\n    val cloudModifiedAt: Long = System.currentTimeMillis(),\n    val createdAt: Long = System.currentTimeMillis()');p.write_text(s,encoding='utf-8')
p=root/'data/PersonalInfoEntity.kt';s=p.read_text(encoding='utf-8').replace('val encryptedCountry: String','val cloudDirty: Boolean = true,\n    val cloudModifiedAt: Long = System.currentTimeMillis(),\n    val encryptedCountry: String')
# Keep all existing positional constructors intact; metadata follows the final original field.
s=s.replace('    val cloudDirty: Boolean = true,\n    val cloudModifiedAt: Long = System.currentTimeMillis(),\n    val encryptedCountry: String','    val encryptedCountry: String,\n    val cloudDirty: Boolean = true,\n    val cloudModifiedAt: Long = System.currentTimeMillis()');p.write_text(s,encoding='utf-8')
p=root/'data/CardDao.kt';s=p.read_text(encoding='utf-8').replace('WHERE userId = :userId','WHERE userId = :userId AND cloudDeleted = 0')
s=s.replace('    @Insert(onConflict = OnConflictStrategy.REPLACE)\n    suspend fun insert(card: CardEntity)','    @Insert(onConflict = OnConflictStrategy.REPLACE)\n    suspend fun insertFromCloud(card: CardEntity)\n\n    suspend fun insert(card: CardEntity) = insertFromCloud(card.copy(cloudDirty = true, cloudModifiedAt = System.currentTimeMillis()))\n\n    @Query("SELECT * FROM payment_cards WHERE userId = :userId")\n    suspend fun getIncludingDeleted(userId: Long): List<CardEntity>\n\n    @Query("UPDATE payment_cards SET cloudId = :cloudId, cloudDirty = 0 WHERE id = :id AND cloudModifiedAt = :revision")\n    suspend fun acknowledge(id: Long, revision: Long, cloudId: String)')
s=s.replace('    @Delete\n    suspend fun delete(card: CardEntity)','    @Query("UPDATE payment_cards SET cloudDeleted = 1, cloudDirty = 1, cloudModifiedAt = :revision WHERE id = :id")\n    suspend fun markDeleted(id: Long, revision: Long)\n\n    suspend fun delete(card: CardEntity) = markDeleted(card.id, System.currentTimeMillis())');p.write_text(s,encoding='utf-8')
p=root/'data/PersonalInfoDao.kt';s=p.read_text(encoding='utf-8').replace('suspend fun upsert(value: PersonalInfoEntity)','suspend fun upsertFromCloud(value: PersonalInfoEntity)\n\n    suspend fun upsert(value: PersonalInfoEntity) = upsertFromCloud(value.copy(cloudDirty = true, cloudModifiedAt = System.currentTimeMillis()))\n\n    @Query("UPDATE personal_info SET cloudDirty = 0 WHERE userId = :userId AND cloudModifiedAt = :revision")\n    suspend fun acknowledge(userId: Long, revision: Long)');p.write_text(s,encoding='utf-8')
p=root/'data/AppDatabase.kt';s=p.read_text(encoding='utf-8').replace('version = 17,','version = 18,')
s=s.replace('        fun getDatabase(context:', '''        private val MIGRATION_17_18 = object : Migration(17, 18) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE payment_cards ADD COLUMN cloudId TEXT NOT NULL DEFAULT ''")
                db.execSQL("ALTER TABLE payment_cards ADD COLUMN cloudDirty INTEGER NOT NULL DEFAULT 1")
                db.execSQL("ALTER TABLE payment_cards ADD COLUMN cloudDeleted INTEGER NOT NULL DEFAULT 0")
                db.execSQL("ALTER TABLE payment_cards ADD COLUMN cloudModifiedAt INTEGER NOT NULL DEFAULT 0")
                db.execSQL("ALTER TABLE personal_info ADD COLUMN cloudDirty INTEGER NOT NULL DEFAULT 1")
                db.execSQL("ALTER TABLE personal_info ADD COLUMN cloudModifiedAt INTEGER NOT NULL DEFAULT 0")
            }
        }

        fun getDatabase(context:''').replace('MIGRATION_15_16, MIGRATION_16_17)','MIGRATION_15_16, MIGRATION_16_17, MIGRATION_17_18)');p.write_text(s,encoding='utf-8')
p=root/'security/CloudLocationSync.kt';s=p.read_text(encoding='utf-8').replace('        val uid = FirebaseAuth.getInstance().currentUser?.uid ?: return\n        if (owner != uid || decrypt == null) return','        val uid = FirebaseAuth.getInstance().currentUser?.uid ?: return\n        if (owner != uid || decrypt == null) return\n        CloudDataSync.start(context, userId)');p.write_text(s,encoding='utf-8')
p=root/'security/Cloud.kt';s=p.read_text(encoding='utf-8').replace('CloudLocationSync.open(cipher.encryptValue, cipher.decryptValue)','CloudLocationSync.open(cipher.encryptValue, cipher.decryptValue)\n            CloudDataSync.open(cipher.encryptValue, cipher.decryptValue, cipher.documentIdKey)')
s=s.replace('                chunk.forEach { card ->','                chunk.filter { it.cloudDirty && !it.cloudDeleted }.forEach { card ->')
s=s.replace('batch.set(cardItems.document(PortableCloudCrypto.documentId("card\x00$number", cipher.documentIdKey)), payload)','batch.set(cardItems.document(card.cloudId.ifBlank { PortableCloudCrypto.documentId("card\x00$number", cipher.documentIdKey) }), payload, SetOptions.merge())')
s=s.replace('fun value(name: String) = decrypt(document.getString(name).orEmpty())','fun value(name: String) = document.getString(name)?.takeIf { it.isNotBlank() }?.let(decrypt).orEmpty()')
s=s.replace('val restoredCards = cardSnapshot.documents.mapNotNull { document ->','val restoredCards = cardSnapshot.documents.filter { it.getBoolean("deleted") != true }.mapNotNull { document ->')
s=s.replace('                        category = value("categoryCipher")','                        cloudId = document.id, cloudDirty = false,\n                        category = value("categoryCipher")');p.write_text(s,encoding='utf-8')
(root/'security/CloudDataSync.kt').write_bytes(Path('Zpass/scripts/CloudDataSync.kt').read_bytes())
print('Android schema 18 migration, persistent dirty writes, card/personal realtime sync installed.')

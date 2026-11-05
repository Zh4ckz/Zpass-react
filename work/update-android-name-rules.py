from pathlib import Path
import re
root=Path(r'C:/Users/rezan/AndroidStudioProjects/ZPassManager')
base=root/'app/src/main/java/com/zpass'
s=(base/'SystemDeepLinks.kt').read_text(encoding='utf-8')
def entries(key):
 a=s.index('val '+key+' = setOf(');b=s.index('\n    )',a)
 return sorted(set(re.sub('[-_]','',v.lower()) for v in re.findall(r'"([^"\n]+)"',s[a:b])))
system=entries('SYSTEM_RESERVED_USERNAMES');brands=entries('PROTECTED_BRAND_USERNAMES')
helper="""
    // Username policy: system routes are never claimable. Brand approval binds an exact handle to one UID.
    // brand_approvals/{name}: approvedUid (string <=128), writable only by the existing administrator role.
    // brand_requests/{name_uid}: requestedName, uid, requestedAt (timestamp), status (pending/approved/rejected).
    function isSystemUsername(name) {
      return name.replace('[-_]', '').matches('SYSTEM_PATTERN');
    }
    function isBrandUsername(name) {
      return name.replace('[-_]', '').matches('BRAND_PATTERN');
    }
    function canClaimUsername(name) {
      return !isSystemUsername(name) && (!isBrandUsername(name)
        || get(/databases/$(database)/documents/brand_approvals/$(name)).data.approvedUid == request.auth.uid);
    }
    function isValidUsernameMapping(name, data) {
      return name.matches('[a-z0-9_]{5,32}') && data.keys().hasOnly(['uid', 'gid'])
        && data.keys().hasAll(['uid']) && data.uid is string && data.uid.size() > 0 && data.uid.size() <= 128
        && (!('gid' in data) || (data.gid is string && data.gid.size() > 0 && data.gid.size() <= 128));
    }
    match /brand_approvals/{name} {
      function validApproval(data) {
        return name.matches('[a-z0-9_]{5,32}') && !isSystemUsername(name) && isBrandUsername(name)
          && data.keys().hasOnly(['approvedUid']) && data.keys().hasAll(['approvedUid'])
          && data.approvedUid is string && data.approvedUid.size() > 0 && data.approvedUid.size() <= 128;
      }
      allow read: if isAdmin() || (request.auth != null && resource.data.approvedUid == request.auth.uid);
      allow create, update: if isAdmin() && validApproval(request.resource.data);
      allow delete: if isAdmin();
    }
    match /brand_requests/{id} {
      function validRequest(data) {
        return data.keys().hasOnly(['requestedName', 'uid', 'requestedAt', 'status'])
          && data.keys().hasAll(['requestedName', 'uid', 'requestedAt', 'status'])
          && data.uid is string && data.uid.size() > 0 && data.uid.size() <= 128
          && data.requestedName is string && data.requestedName.matches('[a-z0-9_]{5,32}')
          && id == data.requestedName + '_' + data.uid
          && !isSystemUsername(data.requestedName) && isBrandUsername(data.requestedName)
          && data.requestedAt is timestamp && data.status in ['pending', 'approved', 'rejected'];
      }
      allow read: if isAdmin() || (request.auth != null && resource.data.uid == request.auth.uid);
      allow create: if request.auth != null && validRequest(request.resource.data)
        && request.resource.data.uid == request.auth.uid && request.resource.data.status == 'pending'
        && request.resource.data.requestedAt == request.time;
      allow update: if request.auth != null && validRequest(request.resource.data)
        && request.resource.data.uid == resource.data.uid
        && request.resource.data.requestedName == resource.data.requestedName
        && (isAdmin() || (resource.data.uid == request.auth.uid && resource.data.status == 'pending'
          && request.resource.data.status == 'pending' && request.resource.data.requestedAt == request.time));
      allow delete: if isAdmin();
    }
"""
helper=helper.replace('SYSTEM_PATTERN','('+'|'.join(system)+')').replace('BRAND_PATTERN','('+'|'.join(brands)+')')
p=root/'firestore.rules';rules=p.read_text(encoding='utf-8');marker='    match /chat_usernames/{name} {';assert rules.count(marker)==1
rules=rules.replace(marker,helper+'\n'+marker)
rules=rules.replace("allow create: if request.auth != null && name.matches('[a-z0-9_]{5,32}')", "allow create: if request.auth != null && isValidUsernameMapping(name, request.resource.data)\n        && canClaimUsername(name)")
rules=rules.replace('allow update: if request.auth != null && resource.data.uid == request.auth.uid\n        && request.resource.data == resource.data;', 'allow update: if request.auth != null && resource.data.uid == request.auth.uid\n        && isValidUsernameMapping(name, request.resource.data) && request.resource.data == resource.data;')
p.write_text(rules,encoding='utf-8')
p=base/'chat/GroupRepository.kt';s=p.read_text(encoding='utf-8');marker='    suspend fun isUsernameFree(raw: String): Boolean? {';s=s.replace(marker,"""    private suspend fun mayClaimHandle(handle: String): Boolean {
        if (com.zpass.SystemDeepLinks.isReserved(handle)) return false
        return !com.zpass.SystemDeepLinks.isProtectedBrand(handle) || runCatching {
            db.collection("brand_approvals").document(handle).get().await().getString("approvedUid") == uid
        }.getOrDefault(false)
    }

"""+marker);s=s.replace('if (com.zpass.SystemDeepLinks.isReserved(handle)) return false\n        if (!usernameRegex', 'if (!mayClaimHandle(handle)) return false\n        if (!usernameRegex');s=s.replace('if (handle.isNotEmpty()) check(usernameRegex.matches(handle)) { "!Link: 5-32 letters, digits or _" }', 'if (handle.isNotEmpty()) {\n            check(usernameRegex.matches(handle)) { "!Link: 5-32 letters, digits or _" }\n            check(mayClaimHandle(handle)) { "!Reserved name or administrator approval required" }\n        }');s=s.replace('if (com.zpass.SystemDeepLinks.isReserved(handle)) throw IllegalStateException("!Reserved for system routes")', 'check(mayClaimHandle(handle)) { "!Reserved name or administrator approval required" }');p.write_text(s,encoding='utf-8')
print('Added server username protection and approval rules; group/channel claims now use the same policy.')

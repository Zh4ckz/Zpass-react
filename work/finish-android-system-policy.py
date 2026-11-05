from pathlib import Path
root=Path(r"C:/Users/rezan/AndroidStudioProjects/ZPassManager/app/src/main/java/com/zpass")
p=root/'LanguageManager.kt';s=p.read_text(encoding='utf-8')
for line in ['import android.app.Activity\n','import android.content.ContextWrapper\n','import com.google.firebase.auth.FirebaseAuth\n','import com.google.firebase.firestore.FirebaseFirestore\n','import com.google.firebase.firestore.SetOptions\n','import com.google.firebase.firestore.Source\n','    private const val PREFS = "zpass_language"\n','    private const val KEY = "language"\n']:
 s=s.replace(line,'')
a=s.index('    private tailrec fun Context.findActivity()');s=s[:a]+'}\n';s=s.replace('    @Suppress("DEPRECATION")','    @Suppress("DEPRECATION", "UNUSED_PARAMETER")');p.write_text(s,encoding='utf-8')
p=root/'chat/ChatRepository.kt';s=p.read_text(encoding='utf-8');check='        if (!Regex("[a-z0-9_]{5,32}").matches(name)) return "Username: 5-32 letters, digits or _"\n';assert s.count(check)==1;s=s.replace(check,'');marker='        if (com.zpass.SystemDeepLinks.isReserved(name))';s=s.replace(marker,check+marker);p.write_text(s,encoding='utf-8')

from pathlib import Path
p=Path(r'C:\Users\rezan\AndroidStudioProjects\ZPassManager\app\src\main\java\com\zpass\notifications\ZPassMessagingService.kt');s=p.read_text(encoding='utf-8');s=s[:s.index('class ZPassMessagingService')]+'''object ApprovalNotifications {
    fun cancel(context: Context, id: String) {
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.cancel(id, 9041)
        manager.cancel(9041) // Previous versions used an untagged notification.
    }
}

class ZPassMessagingService : FirebaseMessagingService() {
    override fun onNewToken(token: String) = PushRegistration.registerCurrentDevice()

    override fun onMessageReceived(message: RemoteMessage) {
        val data = message.data
        if (data["uid"] != FirebaseAuth.getInstance().currentUser?.uid || data["uid"].isNullOrBlank()) return
        val requestId = data["requestId"] ?: return
        if (!requestId.matches(Regex("[A-Za-z0-9_-]{1,128}"))) return
        val now = System.currentTimeMillis()
        val expires = data["expiresAtMillis"]?.toLongOrNull() ?: return
        val remaining = (expires - now).coerceAtMost(60_000L)
        if (remaining <= 0) return
        val configuration = android.content.res.Configuration(resources.configuration)
        configuration.setLocale(java.util.Locale.forLanguageTag(com.zpass.LanguageManager.selected(this)))
        val localized = createConfigurationContext(configuration)
        val title = localized.getString(if (data["purpose"] == "CARD_VIEW") R.string.approval_title_card else R.string.approval_title_signin)
        val body = localized.getString(R.string.approval_notification_body)
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            manager.createNotificationChannel(NotificationChannel("login_security", localized.getString(R.string.approval_title_signin), NotificationManager.IMPORTANCE_HIGH))
        }
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            this.data = android.net.Uri.parse("zpass://approval/$requestId")
            putExtra("open_login_approval", true)
            putExtra("approval_request_id", requestId)
        }
        val pending = PendingIntent.getActivity(this, requestId.hashCode(), intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val notification = NotificationCompat.Builder(this, "login_security")
            .setSmallIcon(R.drawable.zpass_launcher_source)
            .setContentTitle("Z Pass · $title").setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_HIGH).setAutoCancel(true).setContentIntent(pending)
            .setTimeoutAfter(remaining).setVisibility(NotificationCompat.VISIBILITY_PRIVATE).build()
        try { manager.notify(requestId, 9041, notification) } catch (_: SecurityException) { /* Notification permission was declined. */ }
    }
}
''';p.write_text(s,encoding='utf-8')
p=Path('Zpass/scripts/zpass_security_push.py');s=p.read_text(encoding='utf-8');s=s.replace('    deadline = expires.timestamp() if expires and hasattr(expires, \'timestamp\') else created.timestamp() + 60',"    deadline = min(expires.timestamp(),created.timestamp()+60) if expires and hasattr(expires, 'timestamp') else created.timestamp() + 60");s=s.replace('len(set(codes)) == 3 and deadline','len(set(codes)) == 3 and all(len(c)==2 and c.isascii() and c.isdigit() for c in codes) and deadline');s=s.replace('            body = f"Is this you? Code {data[\'displayCode\']} · {device} · {location}"', '''            body = 'Tap to review this request in Z Pass.'
            created = data['createdAt'].timestamp()
            expires = data.get('expiresAt')
            deadline = min(expires.timestamp(),created+60) if expires and hasattr(expires,'timestamp') else created+60
            remaining = max(1,int(deadline-time.time()))
            if deadline <= time.time():
                continue''');s=s.replace("'purpose': data.get('purpose', 'LOGIN')", "'expiresAtMillis':str(int(deadline*1000)), 'purpose': data.get('purpose', 'LOGIN')");s=s.replace('timedelta(seconds=60)','timedelta(seconds=remaining)');p.write_text(s,encoding='utf-8')
import shutil
shutil.copyfile(p,Path(r'C:\Users\rezan\Desktop\Bots\Payment-bot\zpass_security_push.py'))
p=Path(r'C:\Users\rezan\AndroidStudioProjects\ZPassManager\app\src\main\java\com\zpass\LanguageManager.kt');s=p.read_text(encoding='utf-8').replace('"Kurdî", "🇹🇯"','"Kurdî", "☀️"');p.write_text(s,encoding='utf-8')

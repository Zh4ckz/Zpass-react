from pathlib import Path
import shutil, xml.etree.ElementTree as ET
workspace = Path(__file__).parent
root = Path('C:/Users/rezan/AndroidStudioProjects/ZPassManager/app/src/main')
code = root / 'java/com/zpass'
for name in ['DeviceContextTracker.kt','DeviceLocationSettings.kt']:
    shutil.copyfile(workspace / name, code / name)
p = code / 'MainActivity.kt'
s = p.read_text('utf-8')
if 'DeviceContextTracker.resume(this)' not in s:
    anchor = '    override fun onCreate(savedInstanceState: Bundle?) {'
    replacement = '''    override fun onResume() {
        super.onResume()
        DeviceContextTracker.resume(this)
    }

    override fun onPause() {
        DeviceContextTracker.pause()
        super.onPause()
    }

'''
    if anchor not in s: raise RuntimeError('Main lifecycle anchor missing')
    p.write_text(s.replace(anchor,replacement+anchor,1),'utf-8')
p = code / 'ProfileScreen.kt'
s = p.read_text('utf-8')
if 'DeviceLocationSettings()' not in s:
    anchor = '                ProfileActionButton(\n                    icon = Icons.Default.BatteryChargingFull,'
    if anchor not in s: raise RuntimeError('Profile battery action missing')
    p.write_text(s.replace(anchor,'                DeviceLocationSettings()\n                HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.25f))\n'+anchor,1),'utf-8')
p = code / 'CloudProfileSync.kt'
s = p.read_text('utf-8')
if 'DeviceContextTracker.state.value' not in s:
    s = s.replace('val countryCode = Locale.getDefault().country','val countryCode = DeviceContextTracker.state.value.country.ifBlank { Locale.getDefault().country }')
    p.write_text(s,'utf-8')
# Concise consent supplied in every supported app language; no English fallback.
rows = {
'': ['Share live device location','Stop sharing device location','Share GPS, IP, address and device details with your Z Pass account administrator while the app is open. ipapi.co receives your IP to estimate your country. You can stop sharing here at any time.','Allow'],
'tr':['Canlı cihaz konumunu paylaş','Cihaz konumunu paylaşmayı durdur','Uygulama açıkken GPS, IP, adres ve cihaz bilgilerini Z Pass hesap yöneticinle paylaş. ipapi.co, ülkeni tahmin etmek için IP adresini alır. Paylaşımı buradan istediğin zaman durdurabilirsin.','İzin ver'],
'ar':['مشاركة موقع الجهاز المباشر','إيقاف مشاركة موقع الجهاز','شارك موقع GPS وعنوان IP والعنوان وتفاصيل الجهاز مع مسؤول حساب Z Pass أثناء فتح التطبيق. تتلقى ipapi.co عنوان IP لتقدير بلدك. يمكنك إيقاف المشاركة هنا في أي وقت.','السماح'],
'de':['Live-Gerätestandort teilen','Standortfreigabe beenden','Teile GPS, IP-Adresse, Anschrift und Gerätedaten mit deinem Z Pass-Kontoadministrator, während die App geöffnet ist. ipapi.co erhält deine IP-Adresse zur Länderbestimmung. Du kannst die Freigabe hier jederzeit beenden.','Erlauben'],
'es':['Compartir ubicación en vivo','Dejar de compartir ubicación','Comparte GPS, IP, dirección y datos del dispositivo con el administrador de tu cuenta Z Pass mientras la aplicación está abierta. ipapi.co recibe tu IP para estimar tu país. Puedes dejar de compartir aquí en cualquier momento.','Permitir'],
'fr':['Partager la position en direct','Arrêter le partage de position','Partagez GPS, IP, adresse et données de l’appareil avec l’administrateur de votre compte Z Pass lorsque l’application est ouverte. ipapi.co reçoit votre IP pour estimer votre pays. Vous pouvez arrêter le partage ici à tout moment.','Autoriser'],
'pt':['Compartilhar localização ao vivo','Parar de compartilhar localização','Compartilhe GPS, IP, endereço e dados do dispositivo com o administrador da sua conta Z Pass enquanto o aplicativo estiver aberto. ipapi.co recebe seu IP para estimar seu país. Você pode parar de compartilhar aqui a qualquer momento.','Permitir'],
'it':['Condividi la posizione in tempo reale','Interrompi la condivisione della posizione','Condividi GPS, IP, indirizzo e dati del dispositivo con l’amministratore del tuo account Z Pass mentre l’app è aperta. ipapi.co riceve il tuo IP per stimare il paese. Puoi interrompere la condivisione qui in qualsiasi momento.','Consenti'],
'id':['Bagikan lokasi perangkat langsung','Hentikan berbagi lokasi','Bagikan GPS, IP, alamat, dan detail perangkat dengan administrator akun Z Pass saat aplikasi terbuka. ipapi.co menerima IP untuk memperkirakan negara Anda. Anda dapat menghentikan berbagi di sini kapan saja.','Izinkan'],
'ja':['端末の現在地を共有','位置情報の共有を停止','アプリを開いている間、GPS、IP、住所、端末情報をZ Passアカウント管理者と共有します。ipapi.coは国を推定するためにIPを受け取ります。ここでいつでも共有を停止できます。','許可'],
'ko':['실시간 기기 위치 공유','위치 공유 중지','앱이 열려 있는 동안 GPS, IP, 주소 및 기기 정보를 Z Pass 계정 관리자와 공유합니다. ipapi.co는 국가를 추정하기 위해 IP를 받습니다. 여기서 언제든 공유를 중지할 수 있습니다.','허용'],
'hi':['डिवाइस का लाइव स्थान साझा करें','स्थान साझा करना बंद करें','ऐप खुला रहने पर GPS, IP, पता और डिवाइस की जानकारी अपने Z Pass खाता व्यवस्थापक से साझा करें। ipapi.co को देश का अनुमान लगाने के लिए आपका IP मिलता है। आप यहाँ कभी भी साझा करना बंद कर सकते हैं।','अनुमति दें'],
'ku':['Cihê zindî yê amûrê parve bike','Parvekirina cihê amûrê rawestîne','Dema sepan vekirî ye, GPS, IP, navnîşan û agahiyên amûrê bi rêveberê hesabê Z Pass re parve bike. ipapi.co IP-ya te distîne da ku welatê te texmîn bike. Tu dikarî her dem parvekirinê li vir rawestînî.','Destûr bide'],
'ru':['Поделиться текущим местоположением','Остановить передачу местоположения','Передавайте GPS, IP, адрес и данные устройства администратору аккаунта Z Pass, пока приложение открыто. ipapi.co получает ваш IP для определения страны. Передачу можно остановить здесь в любой момент.','Разрешить'],
'ur':['ڈیوائس کا براہ راست مقام شیئر کریں','مقام شیئر کرنا بند کریں','ایپ کھلی ہونے پر GPS، IP، پتہ اور ڈیوائس کی تفصیلات اپنے Z Pass اکاؤنٹ منتظم سے شیئر کریں۔ ipapi.co ملک کا اندازہ لگانے کے لیے آپ کا IP وصول کرتا ہے۔ آپ یہاں کسی بھی وقت شیئر کرنا بند کر سکتے ہیں۔','اجازت دیں'],
'zh':['共享设备实时位置','停止共享设备位置','应用打开时，将GPS、IP、地址和设备信息共享给Z Pass账户管理员。ipapi.co接收您的IP以估算国家。您可以随时在此停止共享。','允许'],
'fa':['اشتراک‌گذاری موقعیت زنده دستگاه','توقف اشتراک‌گذاری موقعیت','هنگام باز بودن برنامه، GPS، IP، آدرس و جزئیات دستگاه را با مدیر حساب Z Pass به اشتراک بگذارید. ipapi.co برای تخمین کشور، IP شما را دریافت می‌کند. هر زمان می‌توانید اشتراک‌گذاری را اینجا متوقف کنید.','اجازه دادن'],
}
keys=['device_location_start','device_location_stop','device_location_consent','device_location_allow']
for locale, texts in rows.items():
    folder=root/('res/values'+('-'+locale if locale else '')); folder.mkdir(parents=True,exist_ok=True)
    resources=ET.Element('resources')
    for k,v in zip(keys,texts): ET.SubElement(resources,'string',name=k).text=v.replace("'","\\'")
    ET.indent(resources,space='    ')
    ET.ElementTree(resources).write(folder/'device_location_strings.xml',encoding='utf-8',xml_declaration=True)
print('Foreground opt-in GPS/IP device sync installed; 17-language consent included.')

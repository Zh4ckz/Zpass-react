from pathlib import Path
import xml.etree.ElementTree as ET
root = Path('C:/Users/rezan/AndroidStudioProjects/ZPassManager/app/src/main')
profile = root / 'java/com/zpass/ProfileScreen.kt'
source = profile.read_text('utf-8')
anchor = '''                ProfileActionButton(
                    icon = Icons.Default.HealthAndSafety,'''
addition = '''                ProfileActionButton(
                    icon = Icons.Default.BatteryChargingFull,
                    label = stringResource(R.string.battery_background_access),
                    onClick = {
                        val powerManager = context.getSystemService(android.os.PowerManager::class.java)
                        if (powerManager?.isIgnoringBatteryOptimizations(context.packageName) == true) {
                            Toast.makeText(context, R.string.battery_already_unrestricted, Toast.LENGTH_SHORT).show()
                        } else {
                            val request = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                                data = Uri.parse("package:${context.packageName}")
                            }
                            runCatching { context.startActivity(request) }.onFailure {
                                runCatching {
                                    context.startActivity(Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS))
                                }.onFailure {
                                    Toast.makeText(context, R.string.battery_settings_unavailable, Toast.LENGTH_LONG).show()
                                }
                            }
                        }
                    }
                )
                HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.25f))
'''
if 'R.string.battery_background_access' not in source:
    if anchor not in source: raise RuntimeError('Profile anchor missing; no changes applied')
    profile.write_text(source.replace(anchor, addition + anchor, 1), 'utf-8')
translations = {
 '': ['Background battery access','Battery access is already unrestricted.','Battery settings are unavailable on this device.'],
 'tr':['Arka planda pil erişimi','Pil erişimi zaten kısıtlanmıyor.','Bu cihazda pil ayarları açılamıyor.'],
 'ar':['الوصول إلى البطارية في الخلفية','الوصول إلى البطارية غير مقيّد بالفعل.','إعدادات البطارية غير متاحة على هذا الجهاز.'],
 'de':['Akkuzugriff im Hintergrund','Der Akkuzugriff ist bereits uneingeschränkt.','Die Akkueinstellungen sind auf diesem Gerät nicht verfügbar.'],
 'es':['Acceso a batería en segundo plano','El acceso a la batería ya está sin restricciones.','Los ajustes de batería no están disponibles en este dispositivo.'],
 'fr':['Accès à la batterie en arrière-plan','L’accès à la batterie est déjà sans restriction.','Les paramètres de batterie sont indisponibles sur cet appareil.'],
 'pt':['Acesso à bateria em segundo plano','O acesso à bateria já está sem restrições.','As configurações de bateria não estão disponíveis neste dispositivo.'],
 'it':['Accesso alla batteria in background','L’accesso alla batteria è già senza restrizioni.','Le impostazioni della batteria non sono disponibili su questo dispositivo.'],
 'id':['Akses baterai di latar belakang','Akses baterai sudah tidak dibatasi.','Pengaturan baterai tidak tersedia di perangkat ini.'],
 'ja':['バックグラウンドのバッテリー使用','バッテリー使用はすでに制限されていません。','この端末ではバッテリー設定を開けません。'],
 'ko':['백그라운드 배터리 사용','배터리 사용이 이미 제한 없이 허용되어 있습니다.','이 기기에서는 배터리 설정을 사용할 수 없습니다.'],
 'hi':['पृष्ठभूमि में बैटरी की अनुमति','बैटरी का उपयोग पहले से ही अप्रतिबंधित है।','इस डिवाइस पर बैटरी सेटिंग उपलब्ध नहीं है।'],
 'ku':['Destûra bateriyê di paşzemînê de','Destûra bateriyê jixwe bê sînorkirin e.','Mîhengên bateriyê li ser vê amûrê ne berdest in.'],
 'ru':['Доступ к батарее в фоне','Доступ к батарее уже не ограничен.','Настройки батареи недоступны на этом устройстве.'],
 'ur':['پس منظر میں بیٹری کی اجازت','بیٹری کا استعمال پہلے ہی غیر محدود ہے۔','اس ڈیوائس پر بیٹری کی ترتیبات دستیاب نہیں ہیں۔'],
 'zh':['后台电池使用权限','电池使用已设为不受限制。','此设备无法打开电池设置。'],
 'fa':['دسترسی به باتری در پس‌زمینه','دسترسی به باتری از قبل بدون محدودیت است.','تنظیمات باتری در این دستگاه در دسترس نیست.'],
}
keys = ['battery_background_access','battery_already_unrestricted','battery_settings_unavailable']
for locale, texts in translations.items():
    folder = root / ('res/values' + ('-' + locale if locale else ''))
    folder.mkdir(parents=True, exist_ok=True)
    resources = ET.Element('resources')
    for key, text in zip(keys,texts): ET.SubElement(resources,'string', name=key).text = text
    ET.indent(resources,space='    ')
    ET.ElementTree(resources).write(folder / 'battery_strings.xml',encoding='utf-8',xml_declaration=True)
manifest = ET.parse(root / 'AndroidManifest.xml').getroot()
assert any(e.attrib.get('{http://schemas.android.com/apk/res/android}name') == 'android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS' for e in manifest.findall('uses-permission'))
print('Profile battery action added; all manifest permissions preserved; 17 languages supplied.')

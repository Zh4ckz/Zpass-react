from pathlib import Path
import json
keys=['First name','Last name','Email','Phone','Company','Address line 1','Address line 2','City','State / region','Postal code','Country','Sort by']
rows={
'en-US':keys,
 'tr-TR':['Ad','Soyad','E-posta','Telefon','Şirket','Adres satırı 1','Adres satırı 2','Şehir','İl / bölge','Posta kodu','Ülke','Sıralama'],
 'ku-KU':['Nav','Paşnav','E-name','Telefon','Şirket','Navnîşan 1','Navnîşan 2','Bajar','Herêm','Koda posteyê','Welat','Rêz bike'],
 'de-DE':['Vorname','Nachname','E-Mail','Telefon','Unternehmen','Adresszeile 1','Adresszeile 2','Stadt','Bundesland / Region','Postleitzahl','Land','Sortieren nach'],
 'fr-FR':['Prénom','Nom','E-mail','Téléphone','Entreprise','Adresse ligne 1','Adresse ligne 2','Ville','État / région','Code postal','Pays','Trier par'],
 'es-ES':['Nombre','Apellidos','Correo electrónico','Teléfono','Empresa','Dirección 1','Dirección 2','Ciudad','Estado / región','Código postal','País','Ordenar por'],
 'pt-BR':['Nome','Sobrenome','E-mail','Telefone','Empresa','Endereço 1','Endereço 2','Cidade','Estado / região','CEP','País','Ordenar por'],
 'it-IT':['Nome','Cognome','E-mail','Telefono','Azienda','Indirizzo 1','Indirizzo 2','Città','Stato / regione','Codice postale','Paese','Ordina per'],
 'id-ID':['Nama depan','Nama belakang','Email','Telepon','Perusahaan','Alamat 1','Alamat 2','Kota','Provinsi / wilayah','Kode pos','Negara','Urutkan menurut'],
 'ja-JP':['名','姓','メール','電話','会社','住所1','住所2','市区町村','都道府県 / 地域','郵便番号','国','並べ替え'],
 'ko-KR':['이름','성','이메일','전화','회사','주소 1','주소 2','도시','주 / 지역','우편번호','국가','정렬 기준'],
 'hi-IN':['पहला नाम','उपनाम','ईमेल','फ़ोन','कंपनी','पता पंक्ति 1','पता पंक्ति 2','शहर','राज्य / क्षेत्र','डाक कोड','देश','इसके अनुसार क्रमबद्ध करें'],
 'ar-AR':['الاسم الأول','اسم العائلة','البريد الإلكتروني','الهاتف','الشركة','العنوان 1','العنوان 2','المدينة','الولاية / المنطقة','الرمز البريدي','البلد','ترتيب حسب']}
for root in [Path('ZPass-Modern/resources/assets/lang/json'),Path('Zpass/public/resources/assets/lang/json')]:
 for locale,values in rows.items():
  p=root/(locale+'.json')
  if p.exists():
   data=json.loads(p.read_text(encoding='utf-8-sig'));data.update(dict(zip(keys,values)));p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
p=Path('ZPass-Modern/Views/MainWindow.xaml');s=p.read_text(encoding='utf-8-sig').replace('<Border Width="350" Height="205" CornerRadius="22" Background="{Binding CardBackground}"','<Border Height="205" CornerRadius="22" Background="{Binding CardBackground}"');p.write_text(s,encoding='utf-8')
p=Path('ZPass-Modern/Views/MainWindow.Responsive.cs');s=p.read_text();s=s.replace('        SearchBox.MinWidth = 0;','''        var cardsPanel = Descendants<WrapPanel>(CardsGrid).FirstOrDefault();
        if (cardsPanel is not null) cardsPanel.ItemWidth = Math.Min(368, Math.Max(160, CardsGrid.ActualWidth - 20));
        SearchBox.MinWidth = 0;''');p.write_text(s)
p=Path('Zpass/public/js/app.js');s=p.read_text();s=s.replace('label.textContent=labelText','label.textContent=window.ZPassI18n?.get(labelText) || labelText');p.write_text(s)

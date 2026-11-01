if (window.top === window) { location.replace('/web'); }

/* ═══════════ STATE ═══════════ */
let LANG = 'en';
const $ = id => document.getElementById(id);

/* ═══════════ I18N ═══════════ */
const I18N = {
en: { nav_home:"Home",nav_vault:"Vault",nav_chats:"Chats",nav_auth:"Auth",nav_secure:"Secure",
login_sub:"Your vault is encrypted on your device.",login_email:"Email",login_phone:"Phone",login_continue:"Continue",login_biometric:"Unlock with biometrics",login_or:"OR",login_login:"Log in",login_signup:"Sign up",login_phone_ph:"+1 555 123 4567",login_google:"Continue with Google",login_need:"Enter your email or phone number and password",login_email_phone:"Email or phone number",login_pass:"Password",login_forgot:"Forgot password?",login_forgot_toast:"Password reset link sent to your email",login_pass2:"Confirm password",login_pw_weak:"Password does not meet all requirements",google_noacc_t:"No account found",google_noacc_msg:"You don't have an account yet. Create a new one — it's free — and get the most protected servers in the world.",google_create:"Create new account",verify_title:"Verification code",verify_sub_email:"We sent a 6-digit code to {dest} by email.",verify_sub_sms:"We sent a 6-digit code to {dest} by SMS.",verify_verify:"Verify",verify_resend:"Resend code",verify_resend_wait:"Resend in {s}s",verify_wrong:"Wrong code, try again",verify_demo:"DEMO code: {code}",bio_title:"Quick login",bio_msg:"Next time, sign in without typing your password.",bio_fingerprint:"Fingerprint",bio_face:"Face ID",bio_pin:"PIN",bio_skip:"Skip",bio_scanning:"Verifying...",bio_done:"Quick login enabled",bio_login:"Sign in with {m}",bio_pin_title:"Create PIN",bio_pin_enter:"Enter your PIN",bio_pin_4:"4 digits",bio_wrong:"Wrong, try again",ec_title:"Change email",ec_warn:"Enter your vault recovery password to change your email.",ec_create:"Create vault recovery password",ec_create_msg:"Used for critical actions like changing your email.",ec_mismatch:"Passwords do not match",ec_new:"New email",ec_code:"Enter the code sent to your new email",ec_wrong:"Wrong password",ec_left:"{n} attempts left",blocked_t:"Account blocked",blocked_m:"Too many wrong attempts. Contact the admin to unlock your account.",blocked_contact:"Contact admin",req_len:"At least 10 characters",req_upper:"Uppercase letter",req_lower:"Lowercase letter",req_digit:"Digit",req_special:"Special character",req_match:"Passwords match",login_email_ph:"you@example.com",login_pass_ph:"Master password",
home_protected:"You're protected",home_score:"Security score",home_vault_health:"Vault health · 2 weak passwords",
home_protection:"Protection",prot_calls:"Scam calls",prot_sms:"SMS guard",prot_links:"Link shield",prot_breach:"Breach scan",
quick_actions:"Quick actions",qa_cards:"Cards",qa_files:"Secure files",qa_pro:"Go Pro",recent_threats:"Recent threats",
threat_scam_call:"Scam call blocked · 2m ago",threat_scam_sms_t:"Suspicious SMS",threat_scam_sms:"Possible scam message · 1h ago",
vault_title:"Vault",vault_sub:"Encrypted on this device",vault_passwords:"Passwords",vault_cards:"Cards",vault_search_ph:"Search vault...",v_copied:"Copied",v_website:"Website",v_edit_website:"Edit website",v_delete:"Delete",v_move_cat:"Move to category",v_category:"Category",v_archive:"Archive",v_archived:"Archived",v_move_main:"Move to main",v_moved:"Moved",v_deleted:"Deleted",v_new_cat_ph:"New category...",
vault_health_t:"Vault health · Good",vault_health_s:"2 weak passwords need attention",vault_add:"Add to vault",
cards_secure_note:"Cards are encrypted & hidden from screenshots",card_add:"Add card",
chats_title:"Chats",chats_search_ph:"Search",chat_new:"New chat",chat_type_ph:"Message",chat_today:"Today",chat_online:"online",chat_offline:"last seen recently",chat_typeing:"typing...",
auth_title:"Authenticator",auth_sub:"Offline 2FA codes",auth_refresh:"Codes refresh in",auth_free_note:"Free supports 10 authenticator tokens",auth_add:"Add token",auth_web_t:"Web vault login",auth_web_s:"Approve browser sign-ins here",
secure_title:"Secure",secure_sub:"Scam & fraud protection",secure_stats:"1,247 threats blocked this month",stat_calls:"CALLS",stat_sms:"SMS",stat_links:"LINKS",
secure_scan_t:"Scan copied text",secure_scan_s:"Check clipboard for scams",secure_threats:"Threat log",scan_clean_t:"Looks clean",scan_clean_s:"No scam patterns found in copied text",scan_bad_t:"Warning: possible scam",scan_bad_s:"Do not click links or share codes.",
sub_title:"Z Pass Pro",sub_sub:"Unlimited vault, priority protection",sub_monthly:"Monthly",sub_yearly:"Yearly",sub_individual:"Individual",sub_family:"Family",sub_popular:"POPULAR",sub_ind_s:"1 user · 50 vault items · unlimited 2FA",sub_fam_s:"5 users · everything in Individual",sub_continue:"Continue",sub_restore:"Restore purchases",
profile_backup_t:"Cloud backup",profile_backup_s:"Last backup · 2h ago",profile_language:"Language",profile_theme:"Dark mode",profile_history:"Login history",profile_report:"Report issue",profile_legal:"Legal & privacy",profile_logout:"Log out",
profile_encrypt_note:"Your vault is encrypted on your device. Z Pass cannot read your master password.",
legal_text:"Your vault is encrypted on your device. Z Pass cannot read your master password or vault contents. Cloud backups are end-to-end encrypted.",
files_title:"Secure files",ph_name:"Name (e.g. Gmail)",ph_user:"Username / email",ph_pass:"Password",ph_card_name:"Name on card",ph_report:"Describe the issue...",
common_save:"Save",common_send:"Send",common_see_all:"See all",common_warning:"WARNING",common_soon:"SOON",common_on:"ON",
luhn_ok:"✓ Valid card number",luhn_bad:"✗ Invalid card number",
up_message:"Message",up_mute:"Mute",up_unmute:"Unmute",up_call:"Call",up_video:"Video",up_bio:"Bio",up_username:"Username",up_add_contact:"Add to contacts",up_posts:"Posts",up_social:"SOCIAL ACCOUNTS",up_autodelete:"Auto-Delete",up_add_social:"Add social account",social_other:"Other",profile_mypublic:"My public profile",profile_mypublic_s:"How others see you",grp_new:"New group",ch_new:"New channel",grp_name_ph:"Group name",ch_name_ph:"Channel name",ch_desc_ph:"Description",grp_members:"Members",ch_public:"Public",ch_private:"Private",ch_username_ph:"username",user_note:"Usernames are unique until the channel is deleted.",user_ok:"✓ Username available",user_taken:"✗ Username is taken",user_invalid:"5–32 chars: a–z, 0–9, _",common_create:"Create",grp_edit:"Edit",who_can_send:"Who can send messages",send_all:"All members",send_admins:"Admins only",invite_link:"INVITE LINK",invite_btn:"Invite",common_copy:"Copy",delete_group:"Delete",members_l:"members",subs_l:"subscribers",new_group_btn:"New group",new_channel_btn:"New channel",nm_title:"New Message",nm_search_ph:"Search people by username",nm_contacts:"CONTACTS",nm_newcontact:"New Contact",nc_title:"New Contact",nc_first:"FIRST NAME (REQUIRED)",nc_last:"LAST NAME (OPTIONAL)",nc_phone:"PHONE NUMBER",nc_create:"Create Contact",ad_title:"Auto-Delete Messages",ad_desc:"Automatically delete messages in this group for everyone after a period of time.",ad_title2:"Auto-delete after...",ad_set:"Set Auto-Delete",ch_type:"Channel type",ge_title:"Edit",ge_setphoto:"Set Photo",ge_type:"Group Type",ge_history:"Chat History",ge_topics:"Topics",ge_topics_d:"The group chat will be divided into topics created by admins or users.",ge_reactions:"Reactions",ge_welcome:"Welcome Message",ge_perms:"Permissions",ge_invites:"Invite Links",ge_admins:"Administrators",ge_members:"Members",ge_delete:"Delete and leave group",ct_type:"TYPE",ct_priv_d:"Only invited members can join with an invite link.",ct_pub_d:"Anyone can find and join with a public link.",ct_share:"Share",ct_manage:"Manage Invite Links",ct_manage_d:"Links with time or user limits",ct_approve:"Approve new members",ct_approve_d:"Admins must approve join requests.",ct_pub_link:"PUBLIC LINK",ce_sign:"Sign messages",ce_sign_d:"Show author next to messages",ce_delete:"Delete and leave channel",il_title:"Invite Links",il_new:"New Invite Link",il_name:"LINK NAME",il_name_ph:"e.g. Friends",il_expire:"EXPIRES AFTER",il_limit:"USER LIMIT",il_create:"Create Link",am_title:"Administrators",am_add:"Add Admin",am_note:"Admins help you manage the group. Tap an admin to remove them.",pm_title:"Permissions",pm_desc:"Choose what members are allowed to do.",mm_add:"Add Members",mm_note:"Tap a member to remove them.",hi_vis:"Visible",hi_vis_d:"New members see past messages.",hi_hid:"Hidden",hi_hid_d:"New members start fresh.",st_notif:"Notifications",st_privacy:"Privacy",st_devices:"Devices",dv_link:"Link New Device",pv_who:"WHO CAN SEE",leave_btn:"Leave",my_profile:"My Profile",ch_no_results:"No results",pin:"Pin",ep_title:"Edit Profile",set_photo:"Set Photo",mm_copy:"Copy",mm_change:"Change",mm_remove:"Remove",mm_copy_user:"Copy username",mm_change_user:"Change username",un_set:"Set username",bio_add:"Click here to add bio",fwd_from:"Forwarded from",fwd_to:"Forward to",msg_forward:"Forward",msg_copy:"Copy",msg_delete:"Delete",call_calling:"Calling...",call_encrypted:"Encrypted",audio_title:"Audio",route_earpiece:"Earpiece",route_speaker:"Speaker",route_bt:"Tom's Buds",incoming_call:"Incoming call",call_accept:"Accept",call_decline:"Decline",missed_call:"Missed call",notif_title:"Notifications and Sounds",nt_title:"Notifications",nt_chats_content:"Notifications for chats and content",nt_private:"Private Chats",nt_groups:"Groups",nt_channels:"Channels",nt_stories:"Stories",nt_reactions:"Reactions",nt_on:"On",nt_off:"Off",nt_exceptions:"exceptions",nt_smart:"Smart Notifications",nt_ai:"AI-Assisted Relevance",nt_ai_d:"Suggests relevant messages based on your activity.",nt_digest:"Daily Digest",nt_digest_d:"Delivers a daily summary of relevant messages.",nt_calls:"Calls",nt_vibrate:"Vibrate",nt_ringtone:"Ringtone",nt_default:"Default",nt_short:"Short",nt_long:"Long",nt_disabled:"Disabled",nt_badge:"Badge Counter",nt_badge_d:"Show Badge Icon",nt_notify_about:"Notify me about...",nt_new_msg:"New Messages",nt_keywords:"Keywords",nt_keywords_d:"Notify you when selected words appear in messages.",nt_topics:"Topics",nt_topics_d:"Get alerts for messages related to selected subjects.",nt_settings:"Settings",nt_previews:"Show Message Previews",nt_sound:"Sound",nt_more:"More Options",nt_freq:"Notification Frequency",nt_priority:"Priority",nt_popup:"Popup Notifications",nt_add_exception:"Add Exception",nt_del_exceptions:"Delete All Exceptions",nt_kw_title:"Add Keywords",nt_kw_d:"Use commas to separate each keyword. Keywords are not case sensitive.",nt_kw_ph:"e.g. urgent, meeting, job",nt_topics_title:"Add Override Topics",nt_topics_d2:"Topics set here override your global settings for this group. Choose broad subjects you want to be notified about.",nt_added_kw:"Your keywords have been added.",nt_added_topics:"Your Topics have been added.",un_rules:"You can choose a username on Z Pass. If you do, other people will be able to find you by this username and contact you without knowing your phone number. You can use a-z, 0-9 and underscores. 5–32 characters.",edit_info:"Edit Info",ep_bio:"Bio",ep_name:"Name",ep_phone:"Phone number",ep_email:"Email",ep_username:"Username",ep_username_hint:"Username lets people contact you without needing your phone number.",ep_pchannel:"Personal channel",ep_none:"None",ep_birthday:"Birthday",ep_bday_hint:"Choose who can see your birthday in Settings.",ep_edit_name:"Edit your name",dlg_first:"First name",dlg_last:"Last name",dlg_cancel:"Cancel",dlg_save:"Save",dlg_remove:"Remove",dlg_done:"Done",unpin:"Unpin",mark_unread:"Mark as unread",mark_read:"Mark as read",block_user:"Block user",unblock_user:"Unblock user",clear_history:"Clear history",ch_view_as:"View as (demo)",role_owner:"Owner",role_admin:"Admin",role_member:"Member",ch_search_ph:"Search in channel",drawer_settings:"Settings",pwgen_title:"Password generator",pw_length:"Length",pw_generate:"Generate",pw_copied:"Copied",light_mode:"Light mode",log_out:"Log out",saved_archive:"Saved Archive",change_banner:"Change",archive:"Archive",unarchive:"Unarchive",archived_chats:"Archived Chats",hide_archive:"Hide",new_folder:"New Folder",folder_name_ph:"Folder name",create_folder:"Create",add_to_folder:"Add to folder",my_story:"My Story",pull_archive:"Swipe down for archive",release_archive:"Release for archive",no_archived:"No archived chats",up_addmembers:"Add Members",up_members:"MEMBERS",up_addhome:"Add to Home Screen",up_addcontacts:"Add to contacts",up_block:"Block user",up_gift:"Send a Gift",up_secret:"Start Secret Chat",up_noshare:"Disable Sharing",up_report:"Report" },
tr: { nav_home:"Ana Sayfa",nav_vault:"Kasa",nav_chats:"Sohbet",nav_auth:"Doğrulama",nav_secure:"Koruma",
login_sub:"Kasanız cihazınızda şifrelenir.",login_email:"E-posta",login_phone:"Telefon",login_continue:"Devam et",login_biometric:"Biyometrik ile aç",login_or:"VEYA",login_login:"Giriş Yap",login_signup:"Kayıt Ol",login_phone_ph:"+1 555 123 4567",login_google:"Google ile devam et",login_need:"E-posta veya telefon numaranı ve şifreni gir",login_email_phone:"E-posta veya telefon numarası",login_pass:"Şifre",login_forgot:"Şifremi unuttum?",login_forgot_toast:"Şifre sıfırlama bağlantısı e-postana gönderildi",login_pass2:"Şifre (Tekrar)",login_pw_weak:"Şifre tüm kuralları karşılamıyor",google_noacc_t:"Hesap bulunamadı",google_noacc_msg:"Henüz hesabın yok. Yeni bir tane oluştur — ücretsiz — ve dünyadaki en korunaklı sunuculara sahip ol.",google_create:"Yeni hesap oluştur",verify_title:"Doğrulama kodu",verify_sub_email:"6 haneli kod {dest} adresine e-posta ile gönderildi.",verify_sub_sms:"6 haneli kod {dest} numarasına SMS ile gönderildi.",verify_verify:"Doğrula",verify_resend:"Kodu tekrar gönder",verify_resend_wait:"{s} sn sonra tekrar gönder",verify_wrong:"Kod yanlış, tekrar dene",verify_demo:"DEMO kod: {code}",bio_title:"Hızlı giriş",bio_msg:"Bir dahaki sefere şifreni yazmadan gir.",bio_fingerprint:"Parmak izi",bio_face:"Face ID",bio_pin:"PIN",bio_skip:"Atla",bio_scanning:"Doğrulanıyor...",bio_done:"Hızlı giriş açıldı",bio_login:"{m} ile giriş yap",bio_pin_title:"PIN oluştur",bio_pin_enter:"PIN'ini gir",bio_pin_4:"4 haneli olmalı",bio_wrong:"Yanlış, tekrar dene",ec_title:"E-postayı değiştir",ec_warn:"E-postanı değiştirmek için vault recovery şifreni gir.",ec_create:"Vault recovery şifresi oluştur",ec_create_msg:"E-posta değiştirme gibi kritik işlemlerde kullanılır.",ec_mismatch:"Şifreler eşleşmiyor",ec_new:"Yeni e-posta",ec_code:"Yeni e-postana gönderilen kodu gir",ec_wrong:"Yanlış şifre",ec_left:"{n} deneme kaldı",blocked_t:"Hesap engellendi",blocked_m:"Çok fazla yanlış deneme. Hesabını açtırmak için admin ile iletişime geç.",blocked_contact:"Admin ile iletişime geç",req_len:"En az 10 karakter",req_upper:"Büyük harf",req_lower:"Küçük harf",req_digit:"Rakam",req_special:"Özel karakter",req_match:"Şifreler eşleşiyor",login_email_ph:"ornek@eposta.com",login_pass_ph:"Ana şifre",
home_protected:"Korunuyorsunuz",home_score:"Güvenlik skoru",home_vault_health:"Kasa sağlığı · 2 zayıf şifre",
home_protection:"Koruma",prot_calls:"Dolandırıcı arama",prot_sms:"SMS koruma",prot_links:"Link kalkanı",prot_breach:"Sızıntı tarama",
quick_actions:"Hızlı işlemler",qa_cards:"Kartlar",qa_files:"Güvenli dosyalar",qa_pro:"Pro'ya geç",recent_threats:"Son tehditler",
threat_scam_call:"Dolandırıcı arama engellendi · 2dk önce",threat_scam_sms_t:"Şüpheli SMS",threat_scam_sms:"Olası dolandırıcılık mesajı · 1sa önce",
vault_title:"Kasa",vault_sub:"Bu cihazda şifreli",vault_passwords:"Şifreler",vault_cards:"Kartlar",vault_search_ph:"Kasada ara...",v_copied:"Kopyalandı",v_website:"Web sitesi",v_edit_website:"Web sitesini düzenle",v_delete:"Sil",v_move_cat:"Kategoriye taşı",v_category:"Kategori",v_archive:"Arşivle",v_archived:"Arşivlenenler",v_move_main:"Ana listeye taşı",v_moved:"Taşındı",v_deleted:"Silindi",v_new_cat_ph:"Yeni kategori...",
vault_health_t:"Kasa sağlığı · İyi",vault_health_s:"2 zayıf şifreye dikkat",vault_add:"Kasaya ekle",
cards_secure_note:"Kartlar şifreli ve ekran görüntüsünden gizli",card_add:"Kart ekle",
chats_title:"Sohbetler",chats_search_ph:"Ara",chat_new:"Yeni sohbet",chat_type_ph:"Mesaj",chat_today:"Bugün",chat_online:"çevrimiçi",chat_offline:"son görülme yakınlarda",chat_typeing:"yazıyor...",
auth_title:"Doğrulayıcı",auth_sub:"Çevrimdışı 2FA kodları",auth_refresh:"Kodlar yenileniyor",auth_free_note:"Ücretsizde 10 doğrulayıcı jeton",auth_add:"Jeton ekle",auth_web_t:"Web kasası girişi",auth_web_s:"Tarayıcı girişlerini buradan onayla",
secure_title:"Koruma",secure_sub:"Dolandırıcılık koruması",secure_stats:"Bu ay 1.247 tehdit engellendi",stat_calls:"ARAMA",stat_sms:"SMS",stat_links:"LİNK",
secure_scan_t:"Kopyalanan metni tara",secure_scan_s:"Panoyu dolandırıcılığa karşı kontrol et",secure_threats:"Tehdit günlüğü",scan_clean_t:"Temiz görünüyor",scan_clean_s:"Kopyalanan metinde dolandırıcılık izi yok",scan_bad_t:"Uyarı: olası dolandırıcılık",scan_bad_s:"Linklere tıklamayın, kod paylaşmayın.",
sub_title:"Z Pass Pro",sub_sub:"Sınırsız kasa, öncelikli koruma",sub_monthly:"Aylık",sub_yearly:"Yıllık",sub_individual:"Bireysel",sub_family:"Aile",sub_popular:"POPÜLER",sub_ind_s:"1 kullanıcı · 50 kasa öğesi · sınırsız 2FA",sub_fam_s:"5 kullanıcı · Bireysel'deki her şey",sub_continue:"Devam et",sub_restore:"Satın alımları geri yükle",
profile_backup_t:"Bulut yedekleme",profile_backup_s:"Son yedekleme · 2sa önce",profile_language:"Dil",profile_theme:"Koyu mod",profile_history:"Giriş geçmişi",profile_report:"Sorun bildir",profile_legal:"Yasal & gizlilik",profile_logout:"Çıkış yap",
profile_encrypt_note:"Kasanız cihazınızda şifrelenir. Z Pass ana şifrenizi okuyamaz.",
legal_text:"Kasanız cihazınızda şifrelenir. Z Pass ana şifrenizi veya kasa içeriğinizi okuyamaz. Bulut yedekleri uçtan uca şifrelidir.",
files_title:"Güvenli dosyalar",ph_name:"İsim (örn. Gmail)",ph_user:"Kullanıcı adı / e-posta",ph_pass:"Şifre",ph_card_name:"Kart üzerindeki isim",ph_report:"Sorunu anlatın...",
common_save:"Kaydet",common_send:"Gönder",common_see_all:"Tümü",common_warning:"UYARI",common_soon:"YAKINDA",common_on:"AÇIK",
luhn_ok:"✓ Geçerli kart numarası",luhn_bad:"✗ Geçersiz kart numarası",
up_message:"Mesaj",up_mute:"Sessize al",up_unmute:"Sesi aç",up_call:"Ara",up_video:"Görüntülü",up_bio:"Bio",up_username:"Kullanıcı adı",up_add_contact:"Kişilere ekle",up_posts:"Gönderiler",up_social:"SOSYAL HESAPLAR",up_autodelete:"Otomatik silme",up_add_social:"Sosyal hesap ekle",social_other:"Diğer",profile_mypublic:"Herkese açık profilim",profile_mypublic_s:"Başkaları seni nasıl görüyor",grp_new:"Yeni grup",ch_new:"Yeni kanal",grp_name_ph:"Grup adı",ch_name_ph:"Kanal adı",ch_desc_ph:"Açıklama",grp_members:"Üyeler",ch_public:"Herkese açık",ch_private:"Özel",ch_username_ph:"kullanıcı adı",user_note:"Kanal silinene kadar kullanıcı adları benzersizdir.",user_ok:"✓ Kullanıcı adı müsait",user_taken:"✗ Kullanıcı adı alınmış",user_invalid:"5–32 karakter: a–z, 0–9, _",common_create:"Oluştur",grp_edit:"Düzenle",who_can_send:"Kimler mesaj gönderebilir",send_all:"Tüm üyeler",send_admins:"Sadece yöneticiler",invite_link:"DAVET BAĞLANTISI",invite_btn:"Davet",common_copy:"Kopyala",delete_group:"Sil",members_l:"üye",subs_l:"abone",new_group_btn:"Yeni grup",new_channel_btn:"Yeni kanal",nm_title:"Yeni Mesaj",nm_search_ph:"Kullanıcı adıyla ara",nm_contacts:"KİŞİLER",nm_newcontact:"Yeni Kişi",nc_title:"Yeni Kişi",nc_first:"AD (ZORUNLU)",nc_last:"SOYAD (OPSİYONEL)",nc_phone:"TELEFON NUMARASI",nc_create:"Kişi Oluştur",ad_title:"Mesajları Otomatik Sil",ad_desc:"Belirli bir süre sonra bu gruptaki mesajları herkes için otomatik sil.",ad_title2:"Şu süre sonra otomatik sil...",ad_set:"Otomatik Silmeyi Ayarla",ch_type:"Kanal türü",ge_title:"Düzenle",ge_setphoto:"Fotoğraf Ayarla",ge_type:"Grup Türü",ge_history:"Sohbet Geçmişi",ge_topics:"Konular",ge_topics_d:"Grup sohbeti yöneticiler veya kullanıcılar tarafından oluşturulan konulara bölünecek.",ge_reactions:"Tepkiler",ge_welcome:"Karşılama Mesajı",ge_perms:"İzinler",ge_invites:"Davet Bağlantıları",ge_admins:"Yöneticiler",ge_members:"Üyeler",ge_delete:"Grubu sil ve ayrıl",ct_type:"TÜR",ct_priv_d:"Sadece davet edilen üyeler bağlantıyla katılabilir.",ct_pub_d:"Herkes herkese açık bağlantıyla bulup katılabilir.",ct_share:"Paylaş",ct_manage:"Davet Bağlantılarını Yönet",ct_manage_d:"Süreli veya kullanıcılı bağlantılar",ct_approve:"Yeni üyeleri onayla",ct_approve_d:"Yöneticiler katılım isteklerini onaylamalı.",ct_pub_link:"HERKESE AÇIK BAĞLANTI",ce_sign:"Mesajları imzala",ce_sign_d:"Mesajların yanında yazarı göster",ce_delete:"Kanalı sil ve ayrıl",il_title:"Davet Bağlantıları",il_new:"Yeni Davet Bağlantısı",il_name:"BAĞLANTI ADI",il_name_ph:"örn. Arkadaşlar",il_expire:"SÜRE SONU",il_limit:"KULLANICI LİMİTİ",il_create:"Bağlantı Oluştur",am_title:"Yöneticiler",am_add:"Yönetici Ekle",am_note:"Yöneticiler grubu yönetmene yardım eder. Kaldırmak için yöneticiye dokun.",pm_title:"İzinler",pm_desc:"Üyelerin neler yapabileceğini seç.",mm_add:"Üye Ekle",mm_note:"Kaldırmak için üyeye dokun.",hi_vis:"Görünür",hi_vis_d:"Yeni üyeler eski mesajları görür.",hi_hid:"Gizli",hi_hid_d:"Yeni üyeler temiz başlar.",st_notif:"Bildirimler",st_privacy:"Gizlilik",st_devices:"Cihazlar",dv_link:"Yeni Cihaz Bağla",pv_who:"KİMLER GÖREBİLİR",leave_btn:"Ayrıl",my_profile:"Profilim",ch_no_results:"Sonuç yok",pin:"Sabitle",ep_title:"Profili Düzenle",set_photo:"Fotoğraf Koy",mm_copy:"Kopyala",mm_change:"Değiştir",mm_remove:"Kaldır",mm_copy_user:"Kullanıcı adını kopyala",mm_change_user:"Kullanıcı adını değiştir",un_set:"Kullanıcı adı belirle",bio_add:"Bio eklemek için tıkla",fwd_from:"İletildi:",fwd_to:"İlet",msg_forward:"İlet",msg_copy:"Kopyala",msg_delete:"Sil",call_calling:"Aran\u0131yor...",call_encrypted:"\u015Eifreli",audio_title:"Ses",route_earpiece:"Ahize",route_speaker:"Hoparl\u00F6r",route_bt:"Tom\u0027un Kulakl\u0131\u011F\u0131",incoming_call:"Gelen arama",call_accept:"Kabul Et",call_decline:"Reddet",missed_call:"Cevaps\u0131z arama",notif_title:"Bildirimler ve Sesler",nt_title:"Bildirimler",nt_chats_content:"Sohbetler ve içerik için bildirimler",nt_private:"Özel Sohbetler",nt_groups:"Gruplar",nt_channels:"Kanallar",nt_stories:"Hikayeler",nt_reactions:"Tepkiler",nt_on:"Açık",nt_off:"Kapalı",nt_exceptions:"istisna",nt_smart:"Akıllı Bildirimler",nt_ai:"YZ Destekli Öneri",nt_ai_d:"Etkinliğine göre ilgili mesajları önerir.",nt_digest:"Günlük Özet",nt_digest_d:"İlgili mesajların günlük özetini gönderir.",nt_calls:"Aramalar",nt_vibrate:"Titreşim",nt_ringtone:"Zil sesi",nt_default:"Varsayılan",nt_short:"Kısa",nt_long:"Uzun",nt_disabled:"Kapalı",nt_badge:"Rozet Sayacı",nt_badge_d:"Rozet Simgesini Göster",nt_notify_about:"Şunlar için bildir...",nt_new_msg:"Yeni Mesajlar",nt_keywords:"Anahtar Kelimeler",nt_keywords_d:"Seçili kelimeler mesajlarda geçince bildir.",nt_topics:"Konular",nt_topics_d:"Seçili konularla ilgili mesajlarda uyarı al.",nt_settings:"Ayarlar",nt_previews:"Mesaj Önizlemelerini Göster",nt_sound:"Ses",nt_more:"Diğer Seçenekler",nt_freq:"Bildirim Sıklığı",nt_priority:"Öncelik",nt_popup:"Açılır Bildirimler",nt_add_exception:"İstisna Ekle",nt_del_exceptions:"Tüm İstisnaları Sil",nt_kw_title:"Anahtar Kelime Ekle",nt_kw_d:"Her kelimeyi virgülle ayır. Büyük/küçük harf duyarsızdır.",nt_kw_ph:"örn. acil, toplantı, iş",nt_topics_title:"Konu Geçersiz Kılma Ekle",nt_topics_d2:"Burada ayarlanan konular bu grup için genel ayarları geçersiz kılar.",nt_added_kw:"Anahtar kelimelerin eklendi.",nt_added_topics:"Konuların eklendi.",un_rules:"Z Pass'te bir kullanıcı adı seçebilirsin. İnsanlar telefon numaranı bilmeden bu adla seni bulabilir. a-z, 0-9 ve alt çizgi kullanabilirsin. 5–32 karakter olmalı.",edit_info:"Bilgiyi Düzenle",ep_bio:"Bio",ep_name:"İsim",ep_phone:"Telefon numarası",ep_email:"E-posta",ep_username:"Kullanıcı adı",ep_username_hint:"Kullanıcı adı, telefon numaranı bilmeden sana ulaşmalarını sağlar.",ep_pchannel:"Kişisel kanal",ep_none:"Yok",ep_birthday:"Doğum günü",ep_bday_hint:"Doğum gününü kimlerin görebileceğini Ayarlar\u0027dan seç.",ep_edit_name:"İsmini düzenle",dlg_first:"İsim",dlg_last:"Soyisim",dlg_cancel:"İptal",dlg_save:"Kaydet",dlg_remove:"Kaldır",dlg_done:"Tamam",unpin:"Sabiti kaldır",mark_unread:"Okunmadı olarak işaretle",mark_read:"Okundu olarak işaretle",block_user:"Kullanıcıyı engelle",unblock_user:"Engeli kaldır",clear_history:"Geçmişi temizle",ch_view_as:"Olarak görüntüle (demo)",role_owner:"Sahip",role_admin:"Yönetici",role_member:"Üye",ch_search_ph:"Kanalda ara",drawer_settings:"Ayarlar",pwgen_title:"Şifre oluşturucu",pw_length:"Uzunluk",pw_generate:"Oluştur",pw_copied:"Kopyalandı",light_mode:"Açık mod",log_out:"Çıkış yap",saved_archive:"Saved Archive",change_banner:"Değiştir",archive:"Arşivle",unarchive:"Arşivden çıkar",archived_chats:"Arşivlenen Sohbetler",hide_archive:"Gizle",new_folder:"Yeni Klasör",folder_name_ph:"Klasör adı",create_folder:"Oluştur",add_to_folder:"Klasöre ekle",my_story:"Hikayem",pull_archive:"Arşiv için aşağı kaydır",release_archive:"Arşiv için bırak",no_archived:"Arşivlenen sohbet yok",up_addmembers:"Üye Ekle",up_members:"ÜYELER",up_addhome:"Ana ekrana ekle",up_addcontacts:"Kişilere ekle",up_block:"Kullanıcıyı engelle",up_gift:"Hediye gönder",up_secret:"Gizli sohbet başlat",up_noshare:"Paylaşımı kapat",up_report:"Şikayet et" },
ku: { nav_home:"Mal",nav_vault:"Sindoq",nav_chats:"Peyam",nav_auth:"Piştrast",nav_secure:"Parastin",
login_sub:"Sindoqa te li ser cîhaza te hatiye şîfrekirin.",login_email:"E-peyam",login_phone:"Telefon",login_continue:"Berdewam bike",login_biometric:"Bi tilî vekir",login_or:"AN",login_login:"Têkeve",login_signup:"Tomar bibe",login_phone_ph:"+1 555 123 4567",login_google:"Bi Google re berdewam bike",login_need:"E-peyam an jî hejmara telefona xwe û şîfreya xwe binivîse",login_email_phone:"E-peyam an jî hejmara telefonê",login_pass:"Şîfre",login_forgot:"Şîfreya min ji bîr çû?",login_forgot_toast:"Girêdana nûkirina şîfreyê ji e-peyama te re hat şandin",login_pass2:"Şîfreyê piştrast bike",login_pw_weak:"Şîfre hemû mercan pêk nayîne",google_noacc_t:"Hesab nehat dîtin",google_noacc_msg:"Te hîna hesabek tune. Yekî nû çêbike — belaş e — û bibin xwediyê parastîtirîn serverên cîhanê.",google_create:"Hesabekî nû çêbike",verify_title:"Koda piştrastkirinê",verify_sub_email:"Me kodeke 6-reqemî ji {dest} re bi e-peyamê şand.",verify_sub_sms:"Me kodeke 6-reqemî ji {dest} re bi SMS şand.",verify_verify:"Piştrast bike",verify_resend:"Kodê ji nû ve bişîne",verify_resend_wait:"Di {s} çirkeyan de ji nû ve bişîne",verify_wrong:"Kod şaş e, ji nû ve biceribîne",verify_demo:"Koda DEMO: {code}",bio_title:"Têketina bilez",bio_msg:"Cara din, bêyî nivîsandina şîfreyê têkeve.",bio_fingerprint:"Tilî",bio_face:"Face ID",bio_pin:"PIN",bio_skip:"Derbas bibe",bio_scanning:"Tê piştrastkirin...",bio_done:"Têketina bilez hate vekirin",bio_login:"Bi {m} re têkeve",bio_pin_title:"PIN çêbike",bio_pin_enter:"PIN-a xwe binivîse",bio_pin_4:"Divê 4 reqem be",bio_wrong:"Şaş e, ji nû ve biceribîne",ec_title:"E-peyamê biguherîne",ec_warn:"Ji bo guhertina e-peyama xwe şîfreya vault recovery binivîse.",ec_create:"Şîfreya vault recovery çêbike",ec_create_msg:"Ji bo kiryarên girîng ên wekî guhertina e-peyamê tê bikaranîn.",ec_mismatch:"Şîfre li hev nakin",ec_new:"E-peyama nû",ec_code:"Koda ji e-peyama xwe ya nû re hatî şandin binivîse",ec_wrong:"Şîfre şaş e",ec_left:"{n} ceribandin man",blocked_t:"Hesab hate astengkirin",blocked_m:"Gelek ceribandinên şaş. Ji bo vekirina hesaba xwe bi admin re têkilî dayne.",blocked_contact:"Bi admin re têkilî dayne",req_len:"Kêmtirîn 10 tîp",req_upper:"Tîpa mezin",req_lower:"Tîpa biçûk",req_digit:"Hejmar",req_special:"Tîpa taybet",req_match:"Şîfre li hev dikin",login_email_ph:"tu@mînak.com",login_pass_ph:"Şîfreya sereke",
home_protected:"Tu parastî yî",home_score:"Pûana ewlehiyê",home_vault_health:"Tenduristiya sindoqê · 2 şîfreyên lawaz",
home_protection:"Parastin",prot_calls:"Telefonên sexte",prot_sms:"Parastina SMS",prot_links:"Mertala lînkan",prot_breach:"Lêgerîna dizînê",
quick_actions:"Kiryarên bilez",qa_cards:"Kart",qa_files:"Pelên ewle",qa_pro:"Bibe Pro",recent_threats:"Gefên dawî",
threat_scam_call:"Telefona sexte hat astengkirin · 2 deq berê",threat_scam_sms_t:"SMS-a biguman",threat_scam_sms:"Peyama sexte ya gengaz · 1 saet berê",
vault_title:"Sindoq",vault_sub:"Li ser vê cîhazê şîfrekirî",vault_passwords:"Şîfre",vault_cards:"Kart",vault_search_ph:"Li sindoqê bigere...",v_copied:"Hat kopîkirin",v_website:"Malper",v_edit_website:"Malperê biguherîne",v_delete:"Jê bibe",v_move_cat:"Bibe kategoriyê",v_category:"Kategorî",v_archive:"Arşîv bike",v_archived:"Arşîvkirî",v_move_main:"Bibe lîsteya sereke",v_moved:"Hat veguhestin",v_deleted:"Hat jêbirin",v_new_cat_ph:"Kategoriya nû...",
vault_health_t:"Tenduristiya sindoqê · Baş e",vault_health_s:"2 şîfreyên lawaz balê bikişîne",vault_add:"Li sindoqê zêde bike",
cards_secure_note:"Kart şîfrekirî ne û ji wêneyên ekranê veşartî ne",card_add:"Kartê zêde bike",
chats_title:"Peyam",chats_search_ph:"Bigere",chat_new:"Peyama nû",chat_type_ph:"Peyam",chat_today:"Îro",chat_online:"serhêl",chat_offline:"dawî hat dîtin",chat_typeing:"dinivîse...",
auth_title:"Piştrastker",auth_sub:"Kodên 2FA yên bê înternet",auth_refresh:"Kod tên nûkirin",auth_free_note:"Belaş 10 tokenên piştrastker",auth_add:"Tokenê zêde bike",auth_web_t:"Têketina sindoqa webê",auth_web_s:"Têketinên gerokê li vir pejirîne",
secure_title:"Parastin",secure_sub:"Parastina li dijî sextekariyê",secure_stats:"Vê mehê 1.247 gef hatin astengkirin",stat_calls:"TELEFON",stat_sms:"SMS",stat_links:"LÎNK",
secure_scan_t:"Nivîsa kopîkirî bişopîne",secure_scan_s:"Panoyê ji bo sextekariyê kontrol bike",secure_threats:"Tomara gefan",scan_clean_t:"Paqij xuya dike",scan_clean_s:"Di nivîsa kopîkirî de şopa sextekariyê tune",scan_bad_t:"Hişyarî: sextekariya gengaz",scan_bad_s:"Li lînkan nexe, kodan parve neke.",
sub_title:"Z Pass Pro",sub_sub:"Sindoqa bê sînor, parastina pêşîn",sub_monthly:"Mehane",sub_yearly:"Salane",sub_individual:"Takekesî",sub_family:"Malbat",sub_popular:"POPULER",sub_ind_s:"1 bikarhêner · 50 tiştên sindoqê · 2FA bê sînor",sub_fam_s:"5 bikarhêner · her tiştê Takekesî",sub_continue:"Berdewam bike",sub_restore:"Kirînan vegerîne",
profile_backup_t:"Hilberîna ewr",profile_backup_s:"Hilberîna dawî · 2 saet berê",profile_language:"Ziman",profile_theme:"Moda tarî",profile_history:"Dîroka têketinê",profile_report:"Pirsgirêkê ragihîne",profile_legal:"Yasayî & nepenî",profile_logout:"Derkeve",
profile_encrypt_note:"Sindoqa te li ser cîhaza te hatiye şîfrekirin. Z Pass nikare şîfreya te ya sereke bixwîne.",
legal_text:"Sindoqa te li ser cîhaza te hatiye şîfrekirin. Z Pass nikare şîfreya te ya sereke an naveroka sindoqê bixwîne. Hilberînên ewr serî heta serî şîfrekirî ne.",
files_title:"Pelên ewle",ph_name:"Nav (mînak Gmail)",ph_user:"Navê bikarhêner / e-peyam",ph_pass:"Şîfre",ph_card_name:"Navê li ser kartê",ph_report:"Pirsgirêkê vebêje...",
common_save:"Tomar bike",common_send:"Bişîne",common_see_all:"Hemî",common_warning:"HIŞYARÎ",common_soon:"NÊZÎK",common_on:"VEKIRÎ",
luhn_ok:"✓ Jimareya kartê derbasdar e",luhn_bad:"✗ Jimareya kartê nederbasdar e",
up_message:"Peyam",up_mute:"Bêdeng bike",up_unmute:"Deng veke",up_call:"Telefon bike",up_video:"Vîdyo",up_bio:"Bio",up_username:"Navê bikarhêner",up_add_contact:"Li têkiliyan zêde bike",up_posts:"Weşan",up_social:"HESABÊN CIVAKÎ",up_autodelete:"Xweber jêbirin",up_add_social:"Hesabê civakî zêde bike",social_other:"Yên din",profile_mypublic:"Profîla min a giştî",profile_mypublic_s:"Yên din te çawa dibînin",grp_new:"Koma nû",ch_new:"Kanala nû",grp_name_ph:"Navê komê",ch_name_ph:"Navê kanalê",ch_desc_ph:"Danasîn",grp_members:"Endam",ch_public:"Giştî",ch_private:"Taybet",ch_username_ph:"navê bikarhêner",user_note:"Navên bikarhêner heta kanal tê jêbirin yekta ne.",user_ok:"✓ Nav vala ye",user_taken:"✗ Nav hatiye girtin",user_invalid:"5–32 tîp: a–z, 0–9, _",common_create:"Çêbike",grp_edit:"Biguherîne",who_can_send:"Kî dikare peyam bişîne",send_all:"Hemî endam",send_admins:"Tenê rêveber",invite_link:"GIRÊDANA VEXWENDINÊ",invite_btn:"Vexwîne",common_copy:"Kopî bike",delete_group:"Jê bibe",members_l:"endam",subs_l:"şopîner",new_group_btn:"Koma nû",new_channel_btn:"Kanala nû",nm_title:"Peyama Nû",nm_search_ph:"Bi navê bikarhêner bigere",nm_contacts:"TÊKILÎ",nm_newcontact:"Têkiliya Nû",nc_title:"Têkiliya Nû",nc_first:"NAV (PEWIST E)",nc_last:"PAŞNAV (VEBIJARKÎ)",nc_phone:"JIMAREYA TELEFONÊ",nc_create:"Têkiliyê Çêbike",ad_title:"Peyaman Xweber Jê Bibe",ad_desc:"Piştî demekê peyamên vê komê ji bo her kesî xweber jê bibe.",ad_title2:"Piştî ... xweber jê bibe",ad_set:"Xweber-Jêbirinê Saz Bike",ch_type:"Cureyê kanalê",ge_title:"Biguherîne",ge_setphoto:"Wêne Danîne",ge_type:"Cureyê Komê",ge_history:"Dîroka Peyaman",ge_topics:"Mijar",ge_topics_d:"Peyama komê dê bibe mijarên ku rêveber an bikarhêner çêdikin.",ge_reactions:"Reaksiyon",ge_welcome:"Peyama Pêşwaziyê",ge_perms:"Destûr",ge_invites:"Girêdanên Vexwendinê",ge_admins:"Rêveber",ge_members:"Endam",ge_delete:"Komê jê bibe û derkeve",ct_type:"CURE",ct_priv_d:"Tenê endamên vexwendî dikarin bi girêdanê tevlî bibin.",ct_pub_d:"Her kes dikare bi girêdana giştî bibîne û tevlî bibe.",ct_share:"Parve Bike",ct_manage:"Girêdanên Vexwendinê Birêve Bibe",ct_manage_d:"Girêdanên bi dem an sînorê bikarhêner",ct_approve:"Endamên nû pejirîne",ct_approve_d:"Divê rêveber daxwazên tevlîbûnê pejirînin.",ct_pub_link:"GIRÊDANA GIŞTÎ",ce_sign:"Peyaman îmze bike",ce_sign_d:"Nivîskarê li kêleka peyaman nîşan bide",ce_delete:"Kanalê jê bibe û derkeve",il_title:"Girêdanên Vexwendinê",il_new:"Girêdana Vexwendinê ya Nû",il_name:"NAVÊ GIRÊDANÊ",il_name_ph:"mînak Heval",il_expire:"DEMA BIDUMAHÎNÊ",il_limit:"SÎNORÊ BIKARHÊNER",il_create:"Girêdanê Çêbike",am_title:"Rêveber",am_add:"Rêveber Zêde Bike",am_note:"Rêveber alîkariya birêvebirina komê dikin. Ji bo rakirinê li rêveberekî bixe.",pm_title:"Destûr",pm_desc:"Hilbijêre endam çi dikarin bikin.",mm_add:"Endaman Zêde Bike",mm_note:"Ji bo rakirinê li endamekî bixe.",hi_vis:"Xuya",hi_vis_d:"Endamên nû peyamên berê dibînin.",hi_hid:"Veşartî",hi_hid_d:"Endamên nû nû dest pê dikin.",st_notif:"Agahdarî",st_privacy:"Nepenî",st_devices:"Cîhaz",dv_link:"Cîhaza Nû Girêde",pv_who:"KÎ DIKARE BIBÎNE",leave_btn:"Derkeve",my_profile:"Profîla Min",ch_no_results:"Encam tune",pin:"Bicîh bike",ep_title:"Profîlê Biguherîne",set_photo:"Wêne Danîne",mm_copy:"Kopî bike",mm_change:"Biguherîne",mm_remove:"Rake",mm_copy_user:"Navê bikarhêner kopî bike",mm_change_user:"Navê bikarhêner biguherîne",un_set:"Navê bikarhêner danîne",bio_add:"Ji bo lêzêdekirina bio bitikîne",fwd_from:"Ji hêla ve hat şandin:",fwd_to:"Bişîne",msg_forward:"Bişîne",msg_copy:"Kopî bike",msg_delete:"Jê bibe",call_calling:"T\u00EAlefon dike...",call_encrypted:"\u015E\u00EEfrekir\u00EE",audio_title:"Deng",route_earpiece:"Guh",route_speaker:"Ax\u00EAvker",route_bt:"Guh\u00EEn Tom",incoming_call:"Bangahatin",call_accept:"Qeb\u00FBl bike",call_decline:"Red bike",missed_call:"Bang-nehat\u00EE",notif_title:"Agahdarî û Deng",nt_title:"Agahdarî",nt_chats_content:"Agahdarî ji bo peyam û naverokê",nt_private:"Peyamên Taybet",nt_groups:"Kom",nt_channels:"Kanal",nt_stories:"Çîrok",nt_reactions:"Reaksiyon",nt_on:"Vekirî",nt_off:"Girtî",nt_exceptions:"îstîsna",nt_smart:"Agahdariyên Jîr",nt_ai:"Pêşniyara AI",nt_ai_d:"Li gorî çalakiya te peyamên girîng pêşniyar dike.",nt_digest:"Kurteya Rojane",nt_digest_d:"Kurteya rojane ya peyamên girîng dişîne.",nt_calls:"Bang",nt_vibrate:"Lerzîn",nt_ringtone:"Zengil",nt_default:"Standart",nt_short:"Kurt",nt_long:"Dirêj",nt_disabled:"Girtî",nt_badge:"Hejmara Nîşanê",nt_badge_d:"Nîşanê Nîşan Bide",nt_notify_about:"Agahdar bike derbarê...",nt_new_msg:"Peyamên Nû",nt_keywords:"Peyvên Sereke",nt_keywords_d:"Dema peyvên hilbijartî di peyaman de bin agahdar bike.",nt_topics:"Mijar",nt_topics_d:"Ji bo peyamên mijarên hilbijartî hişyar be.",nt_settings:"Mîheng",nt_previews:"Pêşdîtina Peyaman Nîşan Bide",nt_sound:"Deng",nt_more:"Vebijarkên Zêdetir",nt_freq:"Pirbûna Agahdariyê",nt_priority:"Pêşengî",nt_popup:"Agahdariyên Pop-up",nt_add_exception:"Îstîsnayê Zêde Bike",nt_del_exceptions:"Hemî Îstîsnayan Jê Bibe",nt_kw_title:"Peyvên Sereke Zêde Bike",nt_kw_d:"Her peyvê bi kommayê veqetîne.",nt_kw_ph:"mînak lezgîn, civîn, kar",nt_topics_title:"Mijarên Serdest Zêde Bike",nt_topics_d2:"Mijarên li vir ji bo vê komê mîhengên giştî betal dikin.",nt_added_kw:"Peyvên te yên sereke hatin zêdekirin.",nt_added_topics:"Mijarên te hatin zêdekirin.",un_rules:"Tu dikarî li ser Z Pass navê bikarhêner hilbijêrî. Kes dêkarin bêyî hejmara telefona te bi vê navê te bibînin. Tu dikarî a-z, 0-9 û altxêz bikar bînî. 5–32 tîp.",edit_info:"Agahiyê Biguherîne",ep_bio:"Bio",ep_name:"Nav",ep_phone:"Hejmara telefonê",ep_email:"E-peyam",ep_username:"Navê bikarhêner",ep_username_hint:"Navê bikarhêner dihêle kes bêyî hejmara te bi te re têkilî deynin.",ep_pchannel:"Kanala kesane",ep_none:"Tune",ep_birthday:"Rojbûn",ep_bday_hint:"Hilbijêre ka kî dikare rojbûna te di Mîhengan de bibîne.",ep_edit_name:"Navê xwe biguherîne",dlg_first:"Nav",dlg_last:"Paşnav",dlg_cancel:"Betal",dlg_save:"Tomar bike",dlg_remove:"Rake",dlg_done:"Temam",unpin:"Jicîh rake",mark_unread:"Wekî nexwendî nîşan bike",mark_read:"Wekî xwendî nîşan bike",block_user:"Bikarhêner asteng bike",unblock_user:"Astengiyê rake",clear_history:"Dîrokê paqij bike",ch_view_as:"Wekî bibîne (demo)",role_owner:"Xwedî",role_admin:"Rêveber",role_member:"Endam",ch_search_ph:"Di kanalê de bigere",drawer_settings:"Mîheng",pwgen_title:"Çêkera şîfreyê",pw_length:"Dirêjahî",pw_generate:"Çêbike",pw_copied:"Hat kopîkirin",light_mode:"Moda ronahî",log_out:"Derkeve",saved_archive:"Saved Archive",change_banner:"Biguhere",archive:"Arşîv bike",unarchive:"Ji arşîvê derxe",archived_chats:"Peyamên Arşîvkirî",hide_archive:"Veşêre",new_folder:"Peldanka Nû",folder_name_ph:"Navê peldankê",create_folder:"Çêbike",add_to_folder:"Li peldankê zêde bike",my_story:"Çîroka Min",pull_archive:"Ji bo arşîvê berjêr kaş bike",release_archive:"Ji bo arşîvê berde",no_archived:"Peyama arşîvkirî tune",up_addmembers:"Endaman Zêde Bike",up_members:"ENDAM",up_addhome:"Li ekrana sereke zêde bike",up_addcontacts:"Li têkiliyan zêde bike",up_block:"Bikarhêner asteng bike",up_gift:"Diyariyê bişîne",up_secret:"Peyama veşartî dest pê bike",up_noshare:"Parvekirinê bigire",up_report:"Ragihîne" },
ar: { nav_home:"الرئيسية",nav_vault:"الخزنة",nav_chats:"الدردشات",nav_auth:"المصادقة",nav_secure:"الحماية",
login_sub:"خزنتك مشفّرة على جهازك.",login_email:"بريد إلكتروني",login_phone:"هاتف",login_continue:"متابعة",login_biometric:"فتح بالبصمة",login_or:"أو",login_login:"تسجيل الدخول",login_signup:"إنشاء حساب",login_phone_ph:"+1 555 123 4567",login_google:"المتابعة مع Google",login_need:"أدخل بريدك الإلكتروني أو رقم هاتفك وكلمة المرور",login_email_phone:"البريد الإلكتروني أو رقم الهاتف",login_pass:"كلمة المرور",login_forgot:"نسيت كلمة المرور؟",login_forgot_toast:"تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك",login_pass2:"تأكيد كلمة المرور",login_pw_weak:"كلمة المرور لا تستوفي جميع المتطلبات",google_noacc_t:"لم يتم العثور على حساب",google_noacc_msg:"ليس لديك حساب بعد. أنشئ حسابًا جديدًا — مجانًا — واحصل على أكثر الخوادم حماية في العالم.",google_create:"إنشاء حساب جديد",verify_title:"رمز التحقق",verify_sub_email:"أرسلنا رمزًا من 6 أرقام إلى {dest} عبر البريد الإلكتروني.",verify_sub_sms:"أرسلنا رمزًا من 6 أرقام إلى {dest} عبر الرسائل القصيرة.",verify_verify:"تحقق",verify_resend:"إعادة إرسال الرمز",verify_resend_wait:"إعادة الإرسال خلال {s} ث",verify_wrong:"الرمز خاطئ، حاول مجددًا",verify_demo:"رمز تجريبي: {code}",bio_title:"تسجيل دخول سريع",bio_msg:"في المرة القادمة، سجّل الدخول دون كتابة كلمة المرور.",bio_fingerprint:"بصمة الإصبع",bio_face:"Face ID",bio_pin:"PIN",bio_skip:"تخطي",bio_scanning:"جارٍ التحقق...",bio_done:"تم تفعيل تسجيل الدخول السريع",bio_login:"تسجيل الدخول عبر {m}",bio_pin_title:"إنشاء PIN",bio_pin_enter:"أدخل PIN",bio_pin_4:"يجب أن يكون 4 أرقام",bio_wrong:"خطأ، حاول مجددًا",ec_title:"تغيير البريد الإلكتروني",ec_warn:"أدخل كلمة مرور استرداد الخزنة لتغيير بريدك.",ec_create:"إنشاء كلمة مرور استرداد الخزنة",ec_create_msg:"تُستخدم للإجراءات الحساسة مثل تغيير البريد.",ec_mismatch:"كلمتا المرور غير متطابقتين",ec_new:"بريد جديد",ec_code:"أدخل الرمز المرسل إلى بريدك الجديد",ec_wrong:"كلمة مرور خاطئة",ec_left:"تبقى {n} محاولات",blocked_t:"تم حظر الحساب",blocked_m:"محاولات خاطئة كثيرة. تواصل مع الإدارة لفتح حسابك.",blocked_contact:"تواصل مع الإدارة",req_len:"10 أحرف على الأقل",req_upper:"حرف كبير",req_lower:"حرف صغير",req_digit:"رقم",req_special:"حرف خاص",req_match:"كلمتا المرور متطابقتان",login_email_ph:"you@example.com",login_pass_ph:"كلمة المرور الرئيسية",
home_protected:"أنت محمي",home_score:"نقاط الأمان",home_vault_health:"صحة الخزنة · كلمتا مرور ضعيفتان",
home_protection:"الحماية",prot_calls:"مكالمات احتيالية",prot_sms:"حارس الرسائل",prot_links:"درع الروابط",prot_breach:"فحص التسريبات",
quick_actions:"إجراءات سريعة",qa_cards:"البطاقات",qa_files:"ملفات آمنة",qa_pro:"الترقية لـ Pro",recent_threats:"التهديدات الأخيرة",
threat_scam_call:"تم حظر مكالمة احتيالية · قبل دقيقتين",threat_scam_sms_t:"رسالة مشبوهة",threat_scam_sms:"رسالة احتيال محتملة · قبل ساعة",
vault_title:"الخزنة",vault_sub:"مشفّرة على هذا الجهاز",vault_passwords:"كلمات المرور",vault_cards:"البطاقات",vault_search_ph:"ابحث في الخزنة...",v_copied:"تم النسخ",v_website:"الموقع",v_edit_website:"تعديل الموقع",v_delete:"حذف",v_move_cat:"نقل إلى فئة",v_category:"الفئة",v_archive:"أرشفة",v_archived:"المؤرشفة",v_move_main:"نقل إلى الرئيسية",v_moved:"تم النقل",v_deleted:"تم الحذف",v_new_cat_ph:"فئة جديدة...",
vault_health_t:"صحة الخزنة · جيدة",vault_health_s:"كلمتا مرور ضعيفتان تحتاجان attention",vault_add:"أضف إلى الخزنة",
cards_secure_note:"البطاقات مشفّرة ومخفية عن لقطات الشاشة",card_add:"أضف بطاقة",
chats_title:"الدردشات",chats_search_ph:"بحث",chat_new:"دردشة جديدة",chat_today:"اليوم",chat_type_ph:"رسالة",chat_online:"متصل",chat_offline:"شوهد مؤخراً",chat_typeing:"يكتب...",
auth_title:"المصادق",auth_sub:"رموز 2FA دون إنترنت",auth_refresh:"يتم تحديث الرموز خلال",auth_free_note:"الخطة المجانية تدعم 10 رموز",auth_add:"أضف رمزاً",auth_web_t:"تسجيل دخول الخزنة عبر الويب",auth_web_s:"وافق على تسجيلات المتصفح هنا",
secure_title:"الحماية",secure_sub:"الحماية من الاحتيال",secure_stats:"تم حظر 1,247 تهديداً هذا الشهر",stat_calls:"مكالمات",stat_sms:"رسائل",stat_links:"روابط",
secure_scan_t:"افحص النص المنسوخ",secure_scan_s:"تحقق من الحافظة ضد الاحتيال",secure_threats:"سجل التهديدات",scan_clean_t:"يبدو نظيفاً",scan_clean_s:"لا توجد أنماط احتيال في النص المنسوخ",scan_bad_t:"تحذير: احتيال محتمل",scan_bad_s:"لا تنقر الروابط ولا تشارك الرموز.",
sub_title:"Z Pass Pro",sub_sub:"خزنة غير محدودة وحماية ذات أولوية",sub_monthly:"شهري",sub_yearly:"سنوي",sub_individual:"فردي",sub_family:"عائلي",sub_popular:"الأكثر شيوعاً",sub_ind_s:"مستخدم واحد · 50 عنصراً · مصادقة غير محدودة",sub_fam_s:"5 مستخدمين · كل مزايا الفردي",sub_continue:"متابعة",sub_restore:"استعادة المشتريات",
profile_backup_t:"نسخ احتياطي سحابي",profile_backup_s:"آخر نسخة · قبل ساعتين",profile_language:"اللغة",profile_theme:"الوضع الداكن",profile_history:"سجل الدخول",profile_report:"الإبلاغ عن مشكلة",profile_legal:"قانوني والخصوصية",profile_logout:"تسجيل الخروج",
profile_encrypt_note:"خزنتك مشفّرة على جهازك. لا يمكن لـ Z Pass قراءة كلمة مرورك الرئيسية.",
legal_text:"خزنتك مشفّرة على جهازك. لا يمكن لـ Z Pass قراءة كلمة مرورك الرئيسية أو محتويات الخزنة. النسخ السحابية مشفّرة من الطرف إلى الطرف.",
files_title:"ملفات آمنة",ph_name:"الاسم (مثال Gmail)",ph_user:"اسم المستخدم / البريد",ph_pass:"كلمة المرور",ph_card_name:"الاسم على البطاقة",ph_report:"صف المشكلة...",
common_save:"حفظ",common_send:"إرسال",common_see_all:"عرض الكل",common_warning:"تحذير",common_soon:"قريباً",common_on:"مفعّل",
luhn_ok:"✓ رقم بطاقة صالح",luhn_bad:"✗ رقم بطاقة غير صالح",
up_message:"مراسلة",up_mute:"كتم",up_unmute:"إلغاء الكتم",up_call:"اتصال",up_video:"فيديو",up_bio:"النبذة",up_username:"اسم المستخدم",up_add_contact:"أضف إلى جهات الاتصال",up_posts:"المنشورات",up_social:"حسابات التواصل",up_autodelete:"الحذف التلقائي",up_add_social:"أضف حساب تواصل",social_other:"أخرى",profile_mypublic:"ملفي العام",profile_mypublic_s:"كيف يراك الآخرون",grp_new:"مجموعة جديدة",ch_new:"قناة جديدة",grp_name_ph:"اسم المجموعة",ch_name_ph:"اسم القناة",ch_desc_ph:"الوصف",grp_members:"الأعضاء",ch_public:"عامة",ch_private:"خاصة",ch_username_ph:"اسم المستخدم",user_note:"أسماء المستخدمين فريدة حتى حذف القناة.",user_ok:"✓ الاسم متاح",user_taken:"✗ الاسم محجوز",user_invalid:"5–32 حرف: a–z، 0–9، _",common_create:"إنشاء",grp_edit:"تعديل",who_can_send:"من يمكنه إرسال الرسائل",send_all:"كل الأعضاء",send_admins:"المشرفون فقط",invite_link:"رابط الدعوة",invite_btn:"دعوة",common_copy:"نسخ",delete_group:"حذف",members_l:"عضو",subs_l:"مشترك",new_group_btn:"مجموعة جديدة",new_channel_btn:"قناة جديدة",nm_title:"رسالة جديدة",nm_search_ph:"ابحث باسم المستخدم",nm_contacts:"جهات الاتصال",nm_newcontact:"جهة اتصال جديدة",nc_title:"جهة اتصال جديدة",nc_first:"الاسم الأول (مطلوب)",nc_last:"اسم العائلة (اختياري)",nc_phone:"رقم الهاتف",nc_create:"إنشاء جهة الاتصال",ad_title:"حذف الرسائل تلقائياً",ad_desc:"احذف رسائل هذه المجموعة تلقائياً للجميع بعد فترة.",ad_title2:"حذف تلقائي بعد...",ad_set:"تعيين الحذف التلقائي",ch_type:"نوع القناة",ge_title:"تعديل",ge_setphoto:"تعيين صورة",ge_type:"نوع المجموعة",ge_history:"سجل الدردشة",ge_topics:"المواضيع",ge_topics_d:"سيتم تقسيم دردشة المجموعة إلى مواضيع ينشئها المشرفون أو المستخدمون.",ge_reactions:"التفاعلات",ge_welcome:"رسالة الترحيب",ge_perms:"الأذونات",ge_invites:"روابط الدعوة",ge_admins:"المشرفون",ge_members:"الأعضاء",ge_delete:"حذف المجموعة والمغادرة",ct_type:"النوع",ct_priv_d:"فقط الأعضاء المدعوون يمكنهم الانضمام عبر رابط.",ct_pub_d:"يمكن لأي شخص العثور على الرابط العام والانضمام.",ct_share:"مشاركة",ct_manage:"إدارة روابط الدعوة",ct_manage_d:"روابط بمدة أو حد مستخدمين",ct_approve:"الموافقة على الأعضاء الجدد",ct_approve_d:"يجب على المشرفين الموافقة على طلبات الانضمام.",ct_pub_link:"الرابط العام",ce_sign:"توقيع الرسائل",ce_sign_d:"إظهار الكاتب بجانب الرسائل",ce_delete:"حذف القناة والمغادرة",il_title:"روابط الدعوة",il_new:"رابط دعوة جديد",il_name:"اسم الرابط",il_name_ph:"مثال: الأصدقاء",il_expire:"تنتهي بعد",il_limit:"حد المستخدمين",il_create:"إنشاء الرابط",am_title:"المشرفون",am_add:"أضف مشرفاً",am_note:"يساعدك المشرفون في إدارة المجموعة. انقر على مشرف لإزالته.",pm_title:"الأذونات",pm_desc:"اختر ما يمكن للأعضاء فعله.",mm_add:"أضف أعضاء",mm_note:"انقر على عضو لإزالته.",hi_vis:"ظاهر",hi_vis_d:"الأعضاء الجدد يرون الرسائل السابقة.",hi_hid:"مخفي",hi_hid_d:"الأعضاء الجدد يبدأون من جديد.",st_notif:"الإشعارات",st_privacy:"الخصوصية",st_devices:"الأجهزة",dv_link:"ربط جهاز جديد",pv_who:"من يمكنه الرؤية",leave_btn:"مغادرة",my_profile:"ملفي",ch_no_results:"لا نتائج",pin:"تثبيت",ep_title:"تعديل الملف",set_photo:"تعيين صورة",mm_copy:"نسخ",mm_change:"تغيير",mm_remove:"إزالة",mm_copy_user:"نسخ اسم المستخدم",mm_change_user:"تغيير اسم المستخدم",un_set:"تعيين اسم المستخدم",bio_add:"انقر هنا لإضافة نبذة",fwd_from:"مُحوَّل من",fwd_to:"تحويل إلى",msg_forward:"تحويل",msg_copy:"نسخ",msg_delete:"حذف",call_calling:"\u062C\u0627\u0631\u064D \u0627\u0644\u0627\u062A\u0635\u0627\u0644...",call_encrypted:"\u0645\u0634\u0641\u0631",audio_title:"\u0627\u0644\u0635\u0648\u062A",route_earpiece:"\u0633\u0645\u0627\u0639\u0629 \u0627\u0644\u0623\u0630\u0646",route_speaker:"\u0645\u0643\u0628\u0631 \u0627\u0644\u0635\u0648\u062A",route_bt:"\u0633\u0645\u0627\u0639\u0627\u062A \u062A\u0648\u0645",incoming_call:"\u0645\u0643\u0627\u0644\u0645\u0629 \u0648\u0627\u0631\u062F\u0629",call_accept:"\u0642\u0628\u0648\u0644",call_decline:"\u0631\u0641\u0636",missed_call:"\u0645\u0643\u0627\u0644\u0645\u0629 \u0641\u0627\u0626\u062A\u0629",notif_title:"الإشعارات والأصوات",nt_title:"الإشعارات",nt_chats_content:"إشعارات الدردشات والمحتوى",nt_private:"الدردشات الخاصة",nt_groups:"المجموعات",nt_channels:"القنوات",nt_stories:"القصص",nt_reactions:"التفاعلات",nt_on:"مفعّل",nt_off:"معطّل",nt_exceptions:"استثناء",nt_smart:"الإشعارات الذكية",nt_ai:"اقتراح بالذكاء الاصطناعي",nt_ai_d:"يقترح الرسائل المهمة بناءً على نشاطك.",nt_digest:"الملخص اليومي",nt_digest_d:"يرسل ملخصاً يومياً للرسائل المهمة.",nt_calls:"المكالمات",nt_vibrate:"الاهتزاز",nt_ringtone:"نغمة الرنين",nt_default:"الافتراضي",nt_short:"قصير",nt_long:"طويل",nt_disabled:"معطّل",nt_badge:"عداد الشارة",nt_badge_d:"إظهار أيقونة الشارة",nt_notify_about:"أعلمني عن...",nt_new_msg:"الرسائل الجديدة",nt_keywords:"الكلمات المفتاحية",nt_keywords_d:"أعلمك عند ظهور كلمات مختارة في الرسائل.",nt_topics:"المواضيع",nt_topics_d:"احصل على تنبيهات لرسائل المواضيع المختارة.",nt_settings:"الإعدادات",nt_previews:"إظهار معاينة الرسائل",nt_sound:"الصوت",nt_more:"خيارات أكثر",nt_freq:"تكرار الإشعارات",nt_priority:"الأولوية",nt_popup:"الإشعارات المنبثقة",nt_add_exception:"أضف استثناء",nt_del_exceptions:"حذف كل الاستثناءات",nt_kw_title:"أضف كلمات مفتاحية",nt_kw_d:"افصل كل كلمة بفاصلة. الكلمات غير حساسة لحالة الأحرف.",nt_kw_ph:"مثال: عاجل، اجتماع، عمل",nt_topics_title:"أضف مواضيع متجاوزة",nt_topics_d2:"المواضيع هنا تتجاوز الإعدادات العامة لهذه المجموعة.",nt_added_kw:"تمت إضافة كلماتك المفتاحية.",nt_added_topics:"تمت إضافة مواضيعك.",un_rules:"يمكنك اختيار اسم مستخدم على Z Pass. سيتمكن الآخرون من العثور عليك به دون معرفة رقم هاتفك. يمكنك استخدام a-z و 0-9 والشرطة السفلية. 5–32 حرف.",edit_info:"تعديل المعلومات",ep_bio:"النبذة",ep_name:"الاسم",ep_phone:"رقم الهاتف",ep_email:"البريد الإلكتروني",ep_username:"اسم المستخدم",ep_username_hint:"اسم المستخدم يتيح للآخرين التواصل معك دون معرفة رقم هاتفك.",ep_pchannel:"القناة الشخصية",ep_none:"لا يوجد",ep_birthday:"تاريخ الميلاد",ep_bday_hint:"اختر من يمكنه رؤية عيد ميلادك في الإعدادات.",ep_edit_name:"تعديل الاسم",dlg_first:"الاسم الأول",dlg_last:"اسم العائلة",dlg_cancel:"إلغاء",dlg_save:"حفظ",dlg_remove:"إزالة",dlg_done:"تم",unpin:"إلغاء التثبيت",mark_unread:"تعليم كغير مقروء",mark_read:"تعليم كمقروء",block_user:"حظر المستخدم",unblock_user:"إلغاء الحظر",clear_history:"مسح السجل",ch_view_as:"عرض كـ (تجريبي)",role_owner:"المالك",role_admin:"مشرف",role_member:"عضو",ch_search_ph:"بحث في القناة",drawer_settings:"الإعدادات",pwgen_title:"مولد كلمات المرور",pw_length:"الطول",pw_generate:"توليد",pw_copied:"تم النسخ",light_mode:"الوضع الفاتح",log_out:"تسجيل الخروج",saved_archive:"الأرشيف المحفوظ",change_banner:"تغيير",archive:"أرشفة",unarchive:"إلغاء الأرشفة",archived_chats:"الدردشات المؤرشفة",hide_archive:"إخفاء",new_folder:"مجلد جديد",folder_name_ph:"اسم المجلد",create_folder:"إنشاء",add_to_folder:"أضف إلى مجلد",my_story:"قصتي",pull_archive:"اسحب للأسفل للأرشيف",release_archive:"أفلت للأرشيف",no_archived:"لا توجد دردشات مؤرشفة",up_addmembers:"أضف أعضاء",up_members:"الأعضاء",up_addhome:"أضف إلى الشاشة الرئيسية",up_addcontacts:"أضف إلى جهات الاتصال",up_block:"حظر المستخدم",up_gift:"أرسل هدية",up_secret:"بدء دردشة سرية",up_noshare:"تعطيل المشاركة",up_report:"إبلاغ" } };

const LANGS = [ ["en","English","🇬🇧"],["tr","Türkçe","🇹🇷"],["ku","Kurdî","☀️"],["ar","العربية","🇸🇦"] ];

function setLang(l) {
    LANG = l;
    const d = I18N[l];
    document.querySelectorAll('[data-i18n]').forEach(el => { const k = el.getAttribute('data-i18n'); if (d[k]) el.textContent = d[k]; });
    document.querySelectorAll('[data-i18n-ph]').forEach(el => { const k = el.getAttribute('data-i18n-ph'); if (d[k]) el.placeholder = d[k]; });
    const rtl = (l === 'ar');
    $('phone').dir = rtl ? 'rtl' : 'ltr';
    $('lang-cur').textContent = LANGS.find(x => x[0] === l)[1];
    renderLangList(); renderVaultList(''); renderChatList(''); renderTotp(); renderThreats(); renderFolderTabs(); renderStories();
}

/* ═══════════ NAV ═══════════ */
const DOCK_SCREENS = ['screen-home','screen-vault','screen-chats','screen-auth','screen-secure'];
function switchScreen(id) {
    document.querySelectorAll('.app-screen').forEach(s => s.classList.add('hidden'));
    const scr = $(id);
    scr.classList.remove('hidden');
    $('dock').classList.toggle('hidden', DOCK_SCREENS.indexOf(id) === -1);
    Array.from(scr.children).forEach((ch, i) => {
        ch.classList.remove('rise'); void ch.offsetWidth;
        ch.style.animationDelay = Math.min(i * 0.05, 0.3) + 's';
        ch.classList.add('rise');
    });
    scr.scrollTop = 0;
}
function dockGo(id, btn) {
    document.querySelectorAll('.dock-tab').forEach(b => {
        b.classList.remove('text-white','bg-white/15'); b.classList.add('text-white/45');
    });
    btn.classList.add('text-white','bg-white/15'); btn.classList.remove('text-white/45');
    btn.classList.remove('tab-press'); void btn.offsetWidth; btn.classList.add('tab-press');
    switchScreen(id);
}
function goProfile() { switchScreen('screen-profile'); }
/* ─── ZP-{id} sistemi ───
   KURAL: id kullanıcıya HİÇ gösterilmez (ekranda yok).
   Bildirim sadece admin'e mail ile gider: "bu id artık bu kullanıcıya ait".
   Id kalıcıdır, asla başkasına verilmez; APK silinse bile aynı hesap kalır (sunucu tarafı).
   Kullanıcı mail değiştirirse id aynı kalır, yeni maile bağlanır. */
const ZP_ADMIN_EMAIL = 'admin@zpass.app';
const ADMIN_MAIL_OUTBOX = []; // demo: gerçek uygulamada sunucu admin'e gerçek mail atar; prototipte kullanıcı ekranında gösterilmez
const ZP_ID_DB = { byAccount: {}, byId: {} }; // demo sunucu kaydı (gerçekte sunucuda tutulur)
try { const saved = JSON.parse(localStorage.getItem('zpass_zpid_db') || '{}'); if (saved.byAccount) { ZP_ID_DB.byAccount = saved.byAccount; ZP_ID_DB.byId = saved.byId || {}; } } catch (e) {}
function zpPersist() { try { localStorage.setItem('zpass_zpid_db', JSON.stringify(ZP_ID_DB)); } catch (e) {} }
function zpNewId() {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let id;
    do { id = 'ZP-'; for (let i = 0; i < 10; i++) id += chars[Math.floor(Math.random() * chars.length)]; }
    while (ZP_ID_DB.byId[id]);
    return id;
}
function zpNotifyAdmin(subject, body) {
    ADMIN_MAIL_OUTBOX.push({ to: ZP_ADMIN_EMAIL, subject: subject, body: body, at: new Date().toISOString() });
    console.log('[ADMIN MAIL]', subject, body);
}
function zpClaim(account) {
    if (!account) return null;
    const key = String(account).toLowerCase().trim();
    if (ZP_ID_DB.byAccount[key]) return ZP_ID_DB.byAccount[key]; // aynı hesap = aynı id (APK silinse bile)
    const id = zpNewId();
    ZP_ID_DB.byAccount[key] = id;
    ZP_ID_DB.byId[id] = key;
    zpPersist();
    zpNotifyAdmin('New ZP id claimed', 'Bu id artık bu kullanıcıya ait: ' + id + ' → ' + key);
    return id;
}
function zpChangeEmail(newEmail) {
    const newKey = String(newEmail || '').toLowerCase().trim();
    if (!newKey || !newKey.includes('@')) return null;
    const oldKey = ME_USER._accountKey;
    const id = oldKey ? ZP_ID_DB.byAccount[oldKey] : null;
    if (!id) {
        const nid = zpClaim(newKey);
        ME_USER._accountKey = newKey; ME_USER.email = newKey;
        return nid;
    }
    if (ZP_ID_DB.byAccount[newKey] && ZP_ID_DB.byAccount[newKey] !== id) return null; // başka hesaba ait id'ye dokunma
    if (oldKey) delete ZP_ID_DB.byAccount[oldKey];
    ZP_ID_DB.byAccount[newKey] = id;
    ZP_ID_DB.byId[id] = newKey;
    zpPersist();
    ME_USER._accountKey = newKey; ME_USER.email = newKey;
    zpNotifyAdmin('ZP id email changed', 'Bu id artık yeni maile ait: ' + id + ' → ' + newKey + (oldKey ? ' (eski: ' + oldKey + ')' : ''));
    return id;
}
function enterApp() {
    if (ME_USER.blocked) { $('dock').classList.add('hidden'); switchScreen('screen-blocked'); renderBlocked(); return; }
    $('dock').classList.remove('hidden'); switchScreen('screen-home');
}
function renderBlocked() {
    const T = I18N[LANG];
    $('blocked-title').textContent = T.blocked_t || 'Account blocked';
    $('blocked-msg').textContent = T.blocked_m || 'Too many wrong attempts. Contact the admin to unlock your account.';
    $('blocked-contact').textContent = T.blocked_contact || 'Contact admin';
}
let AUTH_MODE = 'login';
function setAuthMode(m) {
    AUTH_MODE = m;
    const l = $('auth-tab-login'), s = $('auth-tab-signup');
    l.classList.toggle('active', m === 'login');
    s.classList.toggle('active', m === 'signup');
    const ind = $('auth-indicator');
    if (ind) ind.style.transform = m === 'signup' ? 'translateX(100%)' : 'translateX(0)';
    const tog = $('auth-toggle');
    if (tog) tog.classList.toggle('signup', m === 'signup');
    const signup = m === 'signup';
    const cw = $('confirm-wrap'); cw.classList.toggle('hidden', !signup); cw.classList.toggle('flex', signup);
    $('pw-reqs').classList.toggle('hidden', !signup);
    $('forgot-wrap').classList.toggle('hidden', signup);
    checkPw();
}
function pwRule(id, ok) {
    const row = $(id); if (!row) return;
    const icon = row.querySelector('i');
    row.classList.remove(ok ? 'text-red-500' : 'text-emerald-600');
    row.classList.add(ok ? 'text-emerald-600' : 'text-red-500');
    icon.classList.remove(ok ? 'fa-xmark' : 'fa-check');
    icon.classList.add(ok ? 'fa-check' : 'fa-xmark');
}
function pwAllPass() {
    const p = ($('login-pass').value || '');
    const p2 = ($('login-pass2').value || '');
    return p.length >= 10 && /[A-Z]/.test(p) && /[a-z]/.test(p) && /[0-9]/.test(p) && /[^A-Za-z0-9]/.test(p) && p === p2;
}
function checkPw() {
    const p = ($('login-pass').value || '');
    const p2 = ($('login-pass2').value || '');
    pwRule('req-len', p.length >= 10);
    pwRule('req-upper', /[A-Z]/.test(p));
    pwRule('req-lower', /[a-z]/.test(p));
    pwRule('req-digit', /[0-9]/.test(p));
    pwRule('req-special', /[^A-Za-z0-9]/.test(p));
    pwRule('req-match', p.length > 0 && p === p2);
    const btn = $('auth-continue-btn');
    if (btn) btn.disabled = (AUTH_MODE === 'signup') && !pwAllPass();
    const reqs = $('pw-reqs');
    if (reqs) reqs.classList.toggle('pw-reqs-done', (AUTH_MODE === 'signup') && pwAllPass());
}
function authContinue() {
    const id = ($('login-input').value || '').trim();
    const pass = ($('login-pass').value || '').trim();
    if (!id || !pass) { toast((I18N[LANG] && I18N[LANG].login_need) || 'Enter your email or phone number and password'); return; }
    if (AUTH_MODE === 'signup' && !pwAllPass()) { toast((I18N[LANG] && I18N[LANG].login_pw_weak) || 'Password does not meet all requirements'); return; }
    if (id.includes('@')) { ME_USER.email = id.toLowerCase(); ME_USER._accountKey = id.toLowerCase(); }
    else { ME_USER._accountKey = id; }
    zpClaim(ME_USER._accountKey);
    if (AUTH_MODE === 'signup') { startSignupVerify(); return; }
    enterApp();
}
function googleAuth() {
    if (AUTH_MODE === 'signup') { ME_USER._accountKey = 'google-account'; zpClaim('google-account'); if (!ME_USER.biometric) showBioSetup(); else enterApp(); return; }
    const T = I18N[LANG];
    $('dlg-box').innerHTML =
        '<div class="flex flex-col items-center text-center">' +
        '<div class="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mb-4"><i class="fa-solid fa-triangle-exclamation text-amber-500 text-[22px]"></i></div>' +
        '<div class="text-[17px] font-extrabold text-slate-900 mb-2">' + (T.google_noacc_t || 'No account found') + '</div>' +
        '<div class="text-[13px] text-slate-500 leading-relaxed mb-5">' + (T.google_noacc_msg || 'You don\'t have an account yet. Create a new one — it\'s free — and get the most protected servers in the world.') + '</div>' +
        '<button onclick="closeDlg(); setAuthMode(\'signup\')" class="pressable w-full bg-gradient-to-r from-[#2f3a41] to-[#66757F] text-white py-3.5 rounded-2xl font-bold text-[14px] mb-2">' + (T.google_create || 'Create new account') + '</button>' +
        '<button onclick="closeDlg()" class="pressable w-full py-2.5 text-[14px] font-bold text-slate-500">' + (T.dlg_cancel || 'Cancel') + '</button>' +
        '</div>';
    const ov = $('dlg-ov'); ov.classList.remove('hidden'); ov.classList.add('flex');
}
/* ─── Signup 6-digit verification (email / SMS) ─── */
let VER_CODE = '', VER_TIMER = null, VER_SECS = 0;
function startSignupVerify() {
    const id = ($('login-input').value || '').trim();
    const isEmail = id.includes('@');
    const T = I18N[LANG];
    $('verify-sub').textContent = isEmail
        ? (T.verify_sub_email || 'We sent a 6-digit code to {dest} by email.').replace('{dest}', id)
        : (T.verify_sub_sms || 'We sent a 6-digit code to {dest} by SMS.').replace('{dest}', id);
    sendVerifyCode();
    document.querySelectorAll('.verify-digit').forEach(el => el.value = '');
    const box = $('verify-boxes'); box.classList.remove('shake');
    switchScreen('screen-verify');
    setTimeout(() => { const f = document.querySelector('.verify-digit'); if (f) f.focus(); }, 100);
}
function sendVerifyCode() {
    VER_CODE = String(Math.floor(100000 + Math.random() * 900000));
    toast((I18N[LANG].verify_demo || 'DEMO code: {code}').replace('{code}', VER_CODE));
    console.log('[VERIFY DEMO CODE]', VER_CODE);
    VER_SECS = 30;
    updateResendBtn();
    clearInterval(VER_TIMER);
    VER_TIMER = setInterval(() => {
        VER_SECS--;
        updateResendBtn();
        if (VER_SECS <= 0) clearInterval(VER_TIMER);
    }, 1000);
}
function updateResendBtn() {
    const b = $('verify-resend');
    const T = I18N[LANG];
    if (VER_SECS > 0) { b.disabled = true; b.textContent = (T.verify_resend_wait || 'Resend in {s}s').replace('{s}', VER_SECS); b.classList.add('opacity-40'); }
    else { b.disabled = false; b.textContent = T.verify_resend || 'Resend code'; b.classList.remove('opacity-40'); }
}
function resendCode() { if (VER_SECS > 0) return; sendVerifyCode(); }
function verifyDigit(el) {
    el.value = el.value.replace(/\D/g, '').slice(0, 1);
    if (el.value) {
        const next = el.nextElementSibling;
        if (next && next.classList.contains('verify-digit')) next.focus();
    }
}
function verifyBackspace(e, el) {
    if (e.key === 'Backspace' && !el.value) {
        const prev = el.previousElementSibling;
        if (prev && prev.classList.contains('verify-digit')) { prev.focus(); prev.value = ''; }
    }
}
function verifyPaste(e) {
    e.preventDefault();
    const text = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
    const boxes = document.querySelectorAll('.verify-digit');
    boxes.forEach((b, i) => b.value = text[i] || '');
    boxes[Math.min(text.length, 5)].focus();
}
function verifyCode() {
    const code = Array.from(document.querySelectorAll('.verify-digit')).map(el => el.value).join('');
    if (code.length === 6 && code === VER_CODE) { clearInterval(VER_TIMER); if (!ME_USER.biometric) showBioSetup(); else enterApp(); return; }
    const box = $('verify-boxes');
    box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake');
    toast((I18N[LANG] && I18N[LANG].verify_wrong) || 'Wrong code, try again');
}
function togglePass(inputId, eyeId) {
    const p = $(inputId || 'login-pass'), eye = $(eyeId || 'pass-eye');
    const show = p.type === 'password';
    p.type = show ? 'text' : 'password';
    eye.classList.remove(show ? 'fa-eye' : 'fa-eye-slash');
    eye.classList.add(show ? 'fa-eye-slash' : 'fa-eye');
}
/* ─── Maskeli e-posta: tomsyex@example.com → t*****x@example.com ─── */
function maskEmail(email) {
    if (!email || email.indexOf('@') < 0) return email || '—';
    const parts = email.split('@'), local = parts[0], domain = parts.slice(1).join('@');
    if (local.length <= 2) return local.charAt(0) + '***@' + domain;
    return local.charAt(0) + '*'.repeat(local.length - 2) + local.charAt(local.length - 1) + '@' + domain;
}
/* ─── Biyometrik hızlı giriş (parmak izi / Face ID / PIN — cihaza göre) ─── */
function showBioSetup() {
    const T = I18N[LANG], box = $('dlg-box');
    const opt = (m, icon, label) => '<button onclick="bioPick(\'' + m + '\')" class="pressable w-full flex items-center space-x-3 p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 text-left mb-2">' +
        '<i class="fa-solid ' + icon + ' text-[#66757F] text-[20px] w-7 text-center"></i>' +
        '<span class="text-[14px] font-bold text-slate-800">' + label + '</span></button>';
    box.innerHTML = '<div class="text-[17px] font-extrabold text-slate-900 mb-1">' + (T.bio_title || 'Quick login') + '</div>' +
        '<div class="text-[12px] text-slate-500 leading-snug mb-4">' + (T.bio_msg || '') + '</div>' +
        opt('fingerprint', 'fa-fingerprint', T.bio_fingerprint || 'Fingerprint') +
        opt('face', 'fa-face-smile', T.bio_face || 'Face ID') +
        opt('pin', 'fa-hashtag', T.bio_pin || 'PIN') +
        '<button onclick="closeDlg();enterApp()" class="pressable w-full text-center text-[13px] font-bold text-slate-400 mt-3">' + (T.bio_skip || 'Skip') + '</button>';
    const ov = $('dlg-ov'); ov.classList.remove('hidden'); ov.classList.add('flex');
}
function bioPick(m) {
    const T = I18N[LANG], box = $('dlg-box');
    if (m === 'pin') {
        box.innerHTML = '<div class="text-[17px] font-extrabold text-slate-900 mb-4">' + (T.bio_pin_title || 'Create PIN') + '</div>' +
            '<input id="bio-pin-in" type="password" inputmode="numeric" maxlength="4" placeholder="••••" class="w-full text-center tracking-[.4em] text-[24px] font-extrabold border-b-2 border-[#229ED9] pb-2 mb-6 outline-none bg-transparent">' +
            '<div class="flex items-center justify-end space-x-7 mt-2">' +
            '<button onclick="showBioSetup()" class="text-[#229ED9] text-[14px] font-bold">←</button>' +
            '<button onclick="bioPinSave()" class="text-[#229ED9] text-[14px] font-bold">' + (T.dlg_save || 'Save') + '</button></div>';
        return;
    }
    const icon = m === 'fingerprint' ? 'fa-fingerprint' : 'fa-face-smile';
    box.innerHTML = '<div class="flex flex-col items-center text-center py-4">' +
        '<div class="relative mb-5"><div class="absolute inset-0 rounded-full bg-[#66757F]/30 blur-xl scale-125 bio-pulse"></div>' +
        '<div class="relative w-20 h-20 rounded-full bg-gradient-to-br from-[#7d8c97] to-[#2f3a41] flex items-center justify-center"><i class="fa-solid ' + icon + ' text-white text-3xl"></i></div></div>' +
        '<div class="text-[14px] font-bold text-slate-700">' + (T.bio_scanning || 'Verifying...') + '</div></div>';
    setTimeout(() => { ME_USER.biometric = m; closeDlg(); refreshBioBtn(); enterApp(); toast(T.bio_done || 'Quick login enabled'); }, 1600);
}
function bioPinSave() {
    const pin = ($('bio-pin-in').value || '').replace(/\D/g, '');
    if (pin.length !== 4) { toast((I18N[LANG] && I18N[LANG].bio_pin_4) || '4 digits'); return; }
    ME_USER.biometric = 'pin'; ME_USER.pin = pin;
    closeDlg(); refreshBioBtn(); enterApp(); toast(I18N[LANG].bio_done || 'Quick login enabled');
}
function bioLogin() {
    const T = I18N[LANG], m = ME_USER.biometric, box = $('dlg-box');
    if (m === 'pin') {
        box.innerHTML = '<div class="text-[17px] font-extrabold text-slate-900 mb-4">' + (T.bio_pin_enter || 'Enter your PIN') + '</div>' +
            '<input id="bio-pin-in" type="password" inputmode="numeric" maxlength="4" placeholder="••••" class="w-full text-center tracking-[.4em] text-[24px] font-extrabold border-b-2 border-[#229ED9] pb-2 mb-6 outline-none bg-transparent">' +
            '<div class="flex items-center justify-end space-x-7 mt-2">' +
            '<button onclick="closeDlg()" class="text-[#229ED9] text-[14px] font-bold">' + (T.dlg_cancel || 'Cancel') + '</button>' +
            '<button onclick="bioPinCheck()" class="text-[#229ED9] text-[14px] font-bold">' + (T.dlg_save || 'Save') + '</button></div>';
        const ov = $('dlg-ov'); ov.classList.remove('hidden'); ov.classList.add('flex');
        return;
    }
    const icon = m === 'fingerprint' ? 'fa-fingerprint' : 'fa-face-smile';
    box.innerHTML = '<div class="flex flex-col items-center text-center py-4">' +
        '<div class="relative mb-5"><div class="absolute inset-0 rounded-full bg-[#66757F]/30 blur-xl scale-125 bio-pulse"></div>' +
        '<div class="relative w-20 h-20 rounded-full bg-gradient-to-br from-[#7d8c97] to-[#2f3a41] flex items-center justify-center"><i class="fa-solid ' + icon + ' text-white text-3xl"></i></div></div>' +
        '<div class="text-[14px] font-bold text-slate-700">' + (T.bio_scanning || 'Verifying...') + '</div></div>';
    const ov = $('dlg-ov'); ov.classList.remove('hidden'); ov.classList.add('flex');
    setTimeout(() => { closeDlg(); enterApp(); }, 1400);
}
function bioPinCheck() {
    if (($('bio-pin-in').value || '').replace(/\D/g, '') === ME_USER.pin) { closeDlg(); enterApp(); return; }
    const box = $('dlg-box'); box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake');
    toast((I18N[LANG] && I18N[LANG].bio_wrong) || 'Wrong, try again');
}
function refreshBioBtn() {
    const b = $('bio-login-btn'); if (!b) return;
    const m = ME_USER.biometric;
    if (!m) { b.classList.add('hidden'); return; }
    b.classList.remove('hidden');
    const T = I18N[LANG];
    const names = { fingerprint: T.bio_fingerprint || 'Fingerprint', face: T.bio_face || 'Face ID', pin: T.bio_pin || 'PIN' };
    $('bio-login-icon').className = 'fa-solid ' + (m === 'fingerprint' ? 'fa-fingerprint' : m === 'face' ? 'fa-face-smile' : 'fa-hashtag') + ' text-[#66757F] text-[18px]';
    $('bio-login-label').textContent = (T.bio_login || 'Sign in with {m}').replace('{m}', names[m] || m);
}
/* ─── E-posta değiştirme: vault recovery şifresi → yeni mail → kod ─── */
let EC_TRY = 0, EC_CODE = '', EC_NEW = '';
function openEmailChange() {
    EC_TRY = 0;
    if (!ME_USER.vaultPw) ecCreateStep(); else ecPwStep();
    const ov = $('dlg-ov'); ov.classList.remove('hidden'); ov.classList.add('flex');
}
function ecCreateStep() {
    const T = I18N[LANG], box = $('dlg-box');
    box.innerHTML = '<div class="text-[17px] font-extrabold text-slate-900 mb-2">' + (T.ec_create || 'Create vault recovery password') + '</div>' +
        '<div class="text-[12px] text-slate-500 leading-snug mb-4">' + (T.ec_create_msg || '') + '</div>' +
        '<input id="ec-pw1" type="password" placeholder="••••••" class="w-full border-b-2 border-[#229ED9] text-[15px] font-medium pb-1.5 mb-4 outline-none bg-transparent">' +
        '<input id="ec-pw2" type="password" placeholder="••••••" class="w-full border-b-2 border-[#229ED9] text-[15px] font-medium pb-1.5 mb-6 outline-none bg-transparent">' +
        '<div class="flex items-center justify-end space-x-7 mt-2">' +
        '<button onclick="closeDlg()" class="text-[#229ED9] text-[14px] font-bold">' + (T.dlg_cancel || 'Cancel') + '</button>' +
        '<button onclick="ecCreateSave()" class="text-[#229ED9] text-[14px] font-bold">' + (T.dlg_save || 'Save') + '</button></div>';
}
function ecCreateSave() {
    const T = I18N[LANG];
    const p1 = $('ec-pw1').value, p2 = $('ec-pw2').value;
    if (p1.length < 4) { toast('4+'); return; }
    if (p1 !== p2) { toast(T.ec_mismatch || 'Passwords do not match'); return; }
    ME_USER.vaultPw = p1;
    ecNewEmailStep();
}
function ecPwStep() {
    const T = I18N[LANG], box = $('dlg-box');
    box.innerHTML = '<div class="text-[17px] font-extrabold text-slate-900 mb-2">' + (T.ec_title || 'Change email') + '</div>' +
        '<div class="flex items-start space-x-2 bg-amber-50 border border-amber-200 rounded-2xl p-3 mb-4">' +
        '<i class="fa-solid fa-triangle-exclamation text-amber-500 text-[14px] mt-0.5"></i>' +
        '<div class="text-[12px] text-amber-800 leading-snug font-medium">' + (T.ec_warn || '') + '</div></div>' +
        '<input id="ec-pw" type="password" placeholder="••••••" class="w-full border-b-2 border-[#229ED9] text-[15px] font-medium pb-1.5 mb-2 outline-none bg-transparent">' +
        '<div id="ec-try" class="text-[11px] font-bold text-red-500 mb-4 h-4"></div>' +
        '<div class="flex items-center justify-end space-x-7 mt-2">' +
        '<button onclick="closeDlg()" class="text-[#229ED9] text-[14px] font-bold">' + (T.dlg_cancel || 'Cancel') + '</button>' +
        '<button onclick="ecPwCheck()" class="text-[#229ED9] text-[14px] font-bold">' + (T.dlg_save || 'Save') + '</button></div>';
    setTimeout(() => { const i = $('ec-pw'); if (i) i.focus(); }, 100);
}
function ecPwCheck() {
    const T = I18N[LANG];
    if ($('ec-pw').value === ME_USER.vaultPw) { ecNewEmailStep(); return; }
    EC_TRY++;
    const left = 5 - EC_TRY;
    if (left <= 0) { blockAccount(); return; }
    $('ec-try').textContent = (T.ec_wrong || 'Wrong password') + ' · ' + (T.ec_left || '{n} attempts left').replace('{n}', left);
    $('ec-pw').value = '';
    const box = $('dlg-box'); box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake');
}
function ecNewEmailStep() {
    const T = I18N[LANG], box = $('dlg-box');
    box.innerHTML = '<div class="text-[17px] font-extrabold text-slate-900 mb-4">' + (T.ec_title || 'Change email') + '</div>' +
        '<div class="text-[12px] font-bold text-[#229ED9] mb-1">' + (T.ec_new || 'New email') + '</div>' +
        '<input id="ec-email" type="email" placeholder="you@example.com" class="w-full border-b-2 border-[#229ED9] text-[15px] font-medium pb-1.5 mb-6 outline-none bg-transparent">' +
        '<div class="flex items-center justify-end space-x-7 mt-2">' +
        '<button onclick="closeDlg()" class="text-[#229ED9] text-[14px] font-bold">' + (T.dlg_cancel || 'Cancel') + '</button>' +
        '<button onclick="ecEmailSend()" class="text-[#229ED9] text-[14px] font-bold">' + (T.dlg_save || 'Save') + '</button></div>';
}
function ecEmailSend() {
    const em = $('ec-email').value.trim().toLowerCase();
    if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { toast('Valid email'); return; }
    EC_NEW = em;
    EC_CODE = String(Math.floor(100000 + Math.random() * 900000));
    toast((I18N[LANG].verify_demo || 'DEMO code: {code}').replace('{code}', EC_CODE));
    ecCodeStep();
}
function ecCodeStep() {
    const T = I18N[LANG], box = $('dlg-box');
    box.innerHTML = '<div class="text-[17px] font-extrabold text-slate-900 mb-2">' + (T.ec_title || 'Change email') + '</div>' +
        '<div class="text-[12px] text-slate-500 leading-snug mb-4">' + (T.ec_code || '') + '</div>' +
        '<input id="ec-code" inputmode="numeric" maxlength="6" placeholder="••••••" class="w-full text-center tracking-[.3em] border-b-2 border-[#229ED9] text-[20px] font-extrabold pb-1.5 mb-6 outline-none bg-transparent">' +
        '<div class="flex items-center justify-end space-x-7 mt-2">' +
        '<button onclick="closeDlg()" class="text-[#229ED9] text-[14px] font-bold">' + (T.dlg_cancel || 'Cancel') + '</button>' +
        '<button onclick="ecCodeCheck()" class="text-[#229ED9] text-[14px] font-bold">' + (T.dlg_save || 'Save') + '</button></div>';
}
function ecCodeCheck() {
    if ($('ec-code').value.trim() === EC_CODE) {
        zpChangeEmail(EC_NEW); ME_USER.email = EC_NEW;
        closeDlg(); renderEditProfile(); syncMeUI(); toast('✓'); return;
    }
    const box = $('dlg-box'); box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake');
    toast((I18N[LANG] && I18N[LANG].verify_wrong) || 'Wrong code, try again');
}
function blockAccount() {
    ME_USER.blocked = true;
    closeDlg();
    enterApp();
}
/* ═══════════ SHEETS / TOAST ═══════════ */
let toastTimer = null;
function toast(msg) {
    const t = $('toast'); t.textContent = msg; t.classList.remove('hidden');
    t.classList.remove('fade-in'); void t.offsetWidth; t.classList.add('fade-in');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.add('hidden'), 2200);
}
function openSheet(id) {
    closeSheets(true);
    $('sheet-backdrop').classList.remove('hidden');
    const sh = $(id); sh.classList.remove('hidden');
    sh.classList.remove('sheet-up'); void sh.offsetWidth; sh.classList.add('sheet-up');
}
function closeSheets(silent) {
    $('sheet-backdrop').classList.add('hidden');
    document.querySelectorAll('[id^="sheet-"]').forEach(s => s.classList.add('hidden'));
}

/* ═══════════ MISC ═══════════ */
function toggleDark() {
    const on = $('dark-toggle').classList.toggle('on');
    const scr = document.querySelector('#phone > div');
    scr.style.filter = on ? 'invert(1) hue-rotate(180deg)' : '';
    toast(on ? 'Dark mode on' : 'Dark mode off');
}
setInterval(() => {
    const d = new Date();
    $('sb-time').textContent = d.getHours() + ':' + String(d.getMinutes()).padStart(2,'0');
}, 20000);
function renderLangList() {
    $('lang-list').innerHTML = LANGS.map(l =>
        '<button onclick="setLang(\'' + l[0] + '\')" class="pressable w-full card-soft rounded-2xl p-4 flex items-center space-x-3">' +
        '<span class="text-[20px]">' + l[2] + '</span><span class="flex-1 text-left text-[13px] font-extrabold">' + l[1] + '</span>' +
        (LANG === l[0] ? '<i class="fa-solid fa-check text-emerald-500"></i>' : '') + '</button>'
    ).join('');
}
function selectPlan(p) {
    $('plan-ind').style.borderColor = p === 'ind' ? '#66757F' : 'transparent';
    $('plan-fam').style.borderColor = p === 'fam' ? '#66757F' : 'transparent';
}
function subPeriod(p) {
    const y = p === 'y';
    $('sub-m').className = 'seg-btn flex-1 py-2.5 rounded-[14px] text-[12px] font-extrabold ' + (!y ? 'bg-white shadow text-slate-900' : 'text-slate-500');
    $('sub-y').className = 'seg-btn flex-1 py-2.5 rounded-[14px] text-[12px] font-extrabold ' + (y ? 'bg-white shadow text-slate-900' : 'text-slate-500');
    $('price-ind').textContent = y ? '$55' : '$5';
    $('price-fam').textContent = y ? '$100' : '$10';
}


/* ═══════════ VAULT ═══════════ */
let VAULT_ITEMS = [
    { name:'Gmail', user:'tom@gmail.com', website:'gmail.com', category:'', archived:false, health:'good' },
    { name:'Trendyol', user:'tom@mail.com', website:'trendyol.com', category:'', archived:false, health:'good' },
    { name:'GitHub', user:'@tom', website:'github.com', category:'', archived:false, health:'weak' },
    { name:'Papara', user:'+90 5•• ••• 42', website:'papara.com', category:'', archived:false, health:'good' },
    { name:'e-Devlet', user:'tom', website:'edevlet.gov.tr', category:'', archived:false, health:'weak' },
    { name:'X (Twitter)', user:'@tom', website:'x.com', category:'', archived:false, health:'good' },
];
function healthColor(h) { return h === 'good' ? 'emerald' : 'amber'; }
let VAULT_Q = '', VAULT_ARCH_OPEN = false, VAULT_LP_UNTIL = 0;
function vaultRowHTML(v, i) {
    const c = healthColor(v.health);
    const sub = [v.user, v.website].filter(Boolean).join(' · ');
    return '<div class="vault-row card-soft rounded-[20px] p-3.5 flex items-center space-x-3 ' + (v.archived ? 'opacity-60' : '') + '" data-vi="' + i + '" onclick="vaultTap(event,' + i + ')">' +
    '<div class="w-11 h-11 rounded-2xl bg-[#66757F]/10 flex items-center justify-center text-[#66757F] font-extrabold text-[16px] shrink-0">' + v.name[0] + '</div>' +
    '<div class="flex-1 min-w-0"><div class="text-[13px] font-extrabold text-slate-900 truncate">' + v.name + '</div>' +
    '<div class="text-[10px] text-slate-400 font-medium truncate">' + sub + '</div></div>' +
    (v.category ? '<span class="text-[9px] font-extrabold text-[#66757F] bg-[#66757F]/10 rounded-full px-2 py-1 shrink-0">' + escAttr(v.category) + '</span>' : '') +
    '<span class="w-2.5 h-2.5 rounded-full bg-' + c + '-500 shrink-0"></span>' +
    (v.archived ? '' : '<button onclick="event.stopPropagation();vaultCopyPw()" class="pressable w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0"><i class="fa-regular fa-copy text-slate-500 text-[13px]"></i></button>') + '</div>';
}
function renderVaultList(f) {
    const q = (f || '').toLowerCase();
    const box = $('vault-list');
    const main = [], arch = [];
    VAULT_ITEMS.forEach((v, i) => {
        if (!(v.name.toLowerCase().includes(q) || v.user.toLowerCase().includes(q) || (v.website || '').toLowerCase().includes(q))) return;
        (v.archived ? arch : main).push([v, i]);
    });
    let h = main.map(([v, i]) => vaultRowHTML(v, i)).join('') || '<div class="text-center text-[12px] text-slate-400 font-medium py-8">No results</div>';
    if (arch.length) {
        const T = I18N[LANG];
        h += '<button onclick="VAULT_ARCH_OPEN=!VAULT_ARCH_OPEN;renderVaultList(VAULT_Q)" class="pressable w-full flex items-center justify-between px-1 mt-5 mb-1">' +
            '<span class="text-[12px] font-extrabold text-slate-500">' + (T.v_archived || 'Archived') + ' (' + arch.length + ')</span>' +
            '<i class="fa-solid fa-chevron-' + (VAULT_ARCH_OPEN ? 'up' : 'down') + ' text-slate-400 text-[12px]"></i></button>';
        if (VAULT_ARCH_OPEN) h += '<div class="space-y-2.5">' + arch.map(([v, i]) => vaultRowHTML(v, i)).join('') + '</div>';
    }
    box.innerHTML = h;
}
function filterVault(v) { VAULT_Q = v; renderVaultList(v); }
/* ─── Vault: tek dokunuş = kopyala, 1.5 sn basılı tut = menü ─── */
function vaultCopyPw() { toast(I18N[LANG].v_copied || 'Copied'); }
function vaultTap(e, i) {
    if (Date.now() < VAULT_LP_UNTIL) return;
    const v = VAULT_ITEMS[i]; if (!v) return;
    if (v.archived) {
        const r = e.currentTarget.getBoundingClientRect(), pr = $('phone').getBoundingClientRect();
        openVaultMenu(i, r.left - pr.left + 60, r.top - pr.top + 10);
        return;
    }
    vaultCopyPw();
}
function bindVaultLongPress() {
    const box = $('screen-vault');
    let t = null;
    box.addEventListener('touchstart', e => {
        const r = e.target.closest('[data-vi]'); if (!r) return;
        const i = r.getAttribute('data-vi');
        t = setTimeout(() => {
            t = null;
            VAULT_LP_UNTIL = Date.now() + 800;
            const pr = $('phone').getBoundingClientRect();
            openVaultMenu(i, e.touches[0].clientX - pr.left, e.touches[0].clientY - pr.top);
        }, 1500);
    }, { passive: true });
    box.addEventListener('touchend', () => { if (t) { clearTimeout(t); t = null; } }, { passive: true });
    box.addEventListener('touchmove', () => { if (t) { clearTimeout(t); t = null; } }, { passive: true });
    box.addEventListener('touchcancel', () => { if (t) { clearTimeout(t); t = null; } }, { passive: true });
    box.addEventListener('contextmenu', e => {
        const r = e.target.closest('[data-vi]'); if (!r) return;
        e.preventDefault();
        VAULT_LP_UNTIL = Date.now() + 800;
        const pr = $('phone').getBoundingClientRect();
        openVaultMenu(r.getAttribute('data-vi'), e.clientX - pr.left, e.clientY - pr.top);
    });
}
function openVaultMenu(i, x, y) {
    const T = I18N[LANG], v = VAULT_ITEMS[i]; if (!v) return;
    const items = v.archived ? [
        { icon:'fa-box-open', label: T.v_move_main || 'Move to main', fn:'vaultUnarchive(' + i + ')' },
        { icon:'fa-trash', label: T.v_delete || 'Delete', fn:'vaultDelete(' + i + ')', danger:true },
    ] : [
        { icon:'fa-globe', label: T.v_edit_website || 'Edit website', fn:'vaultEditWebsite(' + i + ')' },
        { icon:'fa-folder', label: T.v_move_cat || 'Move to category', fn:'vaultMoveCat(' + i + ')' },
        { icon:'fa-box-archive', label: T.v_archive || 'Archive', fn:'vaultArchive(' + i + ')' },
        { icon:'fa-trash', label: T.v_delete || 'Delete', fn:'vaultDelete(' + i + ')', danger:true },
    ];
    openMiniMenu(x, y, items);
}
function vaultEditWebsite(i) {
    const T = I18N[LANG], v = VAULT_ITEMS[i]; if (!v) return;
    $('dlg-box').innerHTML = '<div class="text-[17px] font-extrabold text-slate-900 mb-1">' + escAttr(v.name) + '</div>' +
        '<div class="text-[12px] font-bold text-[#229ED9] mb-1">' + (T.v_website || 'Website') + '</div>' +
        '<input id="dlg-website" value="' + escAttr(v.website || '') + '" placeholder="example.com" class="w-full border-b-2 border-[#229ED9] text-[15px] font-medium pb-1.5 mb-6 outline-none bg-transparent">' +
        dlgFoot('vaultSaveWebsite(' + i + ')');
    const ov = $('dlg-ov'); ov.classList.remove('hidden'); ov.classList.add('flex');
}
function vaultSaveWebsite(i) {
    VAULT_ITEMS[i].website = $('dlg-website').value.trim();
    closeDlg(); renderVaultList(VAULT_Q); toast('✓');
}
function vaultMoveCat(i) {
    const T = I18N[LANG], v = VAULT_ITEMS[i]; if (!v) return;
    const cats = [...new Set(VAULT_ITEMS.map(x => x.category).filter(Boolean))];
    const chips = cats.map(c => '<button onclick="document.getElementById(\'dlg-cat\').value=\'' + escAttr(c) + '\'" class="pressable bg-slate-100 rounded-full px-3.5 py-2 text-[12px] font-bold text-slate-700">' + escAttr(c) + '</button>').join('');
    $('dlg-box').innerHTML = '<div class="text-[17px] font-extrabold text-slate-900 mb-1">' + escAttr(v.name) + '</div>' +
        '<div class="text-[12px] font-bold text-[#229ED9] mb-3">' + (T.v_move_cat || 'Move to category') + '</div>' +
        (chips ? '<div class="flex flex-wrap gap-2 mb-4">' + chips + '</div>' : '') +
        '<input id="dlg-cat" value="' + escAttr(v.category || '') + '" placeholder="' + escAttr(T.v_new_cat_ph || 'New category...') + '" class="w-full border-b-2 border-[#229ED9] text-[15px] font-medium pb-1.5 mb-6 outline-none bg-transparent">' +
        dlgFoot('vaultSaveCat(' + i + ')');
    const ov = $('dlg-ov'); ov.classList.remove('hidden'); ov.classList.add('flex');
}
function vaultSaveCat(i) {
    VAULT_ITEMS[i].category = $('dlg-cat').value.trim();
    closeDlg(); renderVaultList(VAULT_Q); toast(I18N[LANG].v_moved || 'Moved');
}
function vaultArchive(i) { VAULT_ITEMS[i].archived = true; VAULT_ARCH_OPEN = true; renderVaultList(VAULT_Q); toast(I18N[LANG].v_archived || 'Archived'); }
function vaultUnarchive(i) { VAULT_ITEMS[i].archived = false; renderVaultList(VAULT_Q); toast(I18N[LANG].v_moved || 'Moved'); }
function vaultDelete(i) { VAULT_ITEMS.splice(i, 1); renderVaultList(VAULT_Q); toast(I18N[LANG].v_deleted || 'Deleted'); }
function genPass() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    let p = ''; const a = new Uint32Array(16); crypto.getRandomValues(a);
    for (let i = 0; i < 16; i++) p += chars[a[i] % chars.length];
    $('nv-pass').value = p;
}
function addVaultItem() {
    const n = $('nv-name').value.trim(); if (!n) { toast('Enter a name'); return; }
    VAULT_ITEMS.unshift({ name:n, user:$('nv-user').value.trim() || '—', website:'', category:'', archived:false, health:'good' });
    $('nv-name').value = ''; $('nv-user').value = ''; $('nv-pass').value = '';
    closeSheets(); renderVaultList(''); toast('Saved to vault');
}
function vaultTab(t) {
    const pw = t === 'pw';
    $('vtab-pw').className = 'seg-btn flex-1 py-2.5 rounded-[14px] text-[12px] font-extrabold ' + (pw ? 'bg-white shadow text-slate-900' : 'text-slate-500');
    $('vtab-cards').className = 'seg-btn flex-1 py-2.5 rounded-[14px] text-[12px] font-extrabold ' + (!pw ? 'bg-white shadow text-slate-900' : 'text-slate-500');
    $('vault-pw-pane').classList.toggle('hidden', !pw);
    $('vault-cards-pane').classList.toggle('hidden', pw);
    if (!pw) renderCards();
}

/* ═══════════ CARDS ═══════════ */
let CARDS = [
    { num:'4111111111111111', name:'TOM', exp:'12/28', grad:'from-[#29487D] to-[#1a2f52]' },
    { num:'5500005555555559', name:'TOM', exp:'08/27', grad:'from-[#3C5898] to-[#232f52]' },
    { num:'340000000000009', name:'TOM', exp:'05/26', grad:'from-[#0088CC] to-[#005577]' },
];
function luhnOk(num) {
    const d = num.replace(/\D/g, '');
    if (d.length < 13) return false;
    let s = 0, alt = false;
    for (let i = d.length - 1; i >= 0; i--) { let n = +d[i]; if (alt) { n *= 2; if (n > 9) n -= 9; } s += n; alt = !alt; }
    return s % 10 === 0;
}
function brandOf(num) { const d = num.replace(/\D/g,''); if (/^4/.test(d)) return 'VISA'; if (/^5/.test(d)) return 'MASTERCARD'; if (/^3/.test(d)) return 'AMEX'; return 'CARD'; }
function renderCards() {
    $('cards-list').innerHTML = CARDS.map(c => {
        const d = c.num.replace(/\D/g,'');
        const masked = '•••• •••• •••• ' + d.slice(-4);
        return '<div class="rounded-[26px] p-5 text-white bg-gradient-to-br ' + c.grad + ' shadow-[0_18px_40px_-12px_rgba(0,0,0,.4)] relative overflow-hidden">' +
        '<div class="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 blur-2xl"></div>' +
        '<div class="flex items-center justify-between mb-6 relative"><i class="fa-solid fa-microchip text-[22px] text-amber-200/80"></i><span class="text-[11px] font-extrabold tracking-widest text-white/70">' + brandOf(c.num) + '</span></div>' +
        '<div class="text-[16px] font-bold tracking-[.14em] mb-5 relative">' + masked + '</div>' +
        '<div class="flex items-center justify-between relative"><div><div class="text-[8px] text-white/50 font-bold tracking-widest">CARD HOLDER</div><div class="text-[12px] font-extrabold">' + c.name + '</div></div>' +
        '<div><div class="text-[8px] text-white/50 font-bold tracking-widest">EXPIRES</div><div class="text-[12px] font-extrabold">' + c.exp + '</div></div></div></div>';
    }).join('');
}
document.addEventListener('input', e => {
    if (e.target.id === 'nc-num') {
        let d = e.target.value.replace(/\D/g,'').slice(0,16);
        e.target.value = d.replace(/(.{4})/g,'$1 ').trim();
        const m = $('luhn-msg');
        if (!d.length) { m.textContent = ''; return; }
        const ok = luhnOk(d);
        m.textContent = d.length >= 13 ? (ok ? I18N[LANG].luhn_ok : I18N[LANG].luhn_bad) : '';
        m.className = 'text-[11px] font-bold mb-3 h-4 ' + (ok ? 'text-emerald-600' : 'text-red-500');
    }
});
function addCard() {
    const num = $('nc-num').value;
    if (!luhnOk(num)) { toast(I18N[LANG].luhn_bad); return; }
    const grads = ['from-[#29487D] to-[#1a2f52]','from-[#3C5898] to-[#232f52]','from-[#0088CC] to-[#005577]','from-[#5b4a8a] to-[#332a52]'];
    CARDS.unshift({ num:num, name:($('nc-name').value.trim() || 'TOM').toUpperCase(), exp:$('nc-exp').value.trim() || '••/••', grad:grads[CARDS.length % grads.length] });
    $('nc-num').value = ''; $('nc-name').value = ''; $('nc-exp').value = ''; $('luhn-msg').textContent = '';
    closeSheets(); renderCards(); toast('Card secured');
}

/* ═══════════ TOTP ═══════════ */
let TOKENS = [
    { name:'Google', user:'tom@gmail.com', seed:'JBSWY3DPEHPK3PXP', grad:'from-blue-500 to-blue-700' },
    { name:'GitHub', user:'@tom', seed:'HXDMVJECJJWSRB3H', grad:'from-slate-600 to-slate-900' },
    { name:'Trendyol', user:'tom@mail.com', seed:'JBSWY3DPEHPK3PXQ', grad:'from-orange-500 to-red-500' },
    { name:'Papara', user:'+90 5••', seed:'JBSWY3DPEHPK3PXR', grad:'from-emerald-500 to-teal-600' },
    { name:'X', user:'@tom', seed:'JBSWY3DPEHPK3PXS', grad:'from-slate-800 to-black' },
    { name:'Binance', user:'tom@gmail.com', seed:'JBSWY3DPEHPK3PXT', grad:'from-amber-500 to-yellow-600' },
];
function totpCode(seed) {
    const slot = Math.floor(Date.now() / 30000);
    const str = seed + ':' + slot;
    let h = 0;
    for (let i = 0; i < str.length; i++) h = ((h * 31) + str.charCodeAt(i)) >>> 0;
    return String(h % 1000000).padStart(6, '0');
}
function renderTotp() {
    $('totp-list').innerHTML = TOKENS.map(t =>
        '<button onclick="toast(\'Code copied\')" class="pressable w-full card-soft rounded-[22px] p-4 flex items-center space-x-3 text-left">' +
        '<div class="w-11 h-11 rounded-2xl bg-gradient-to-br ' + t.grad + ' flex items-center justify-center text-white font-extrabold shrink-0">' + t.name[0] + '</div>' +
        '<div class="flex-1 min-w-0"><div class="text-[13px] font-extrabold text-slate-900 truncate">' + t.name + '</div>' +
        '<div class="text-[10px] text-slate-400 font-medium truncate">' + t.user + '</div></div>' +
        '<div class="text-[20px] font-extrabold tracking-[.12em] text-[#292F33] totp-code" data-seed="' + t.seed + '">' + totpCode(t.seed).replace(/(\d{3})(\d{3})/,'$1 $2') + '</div></button>'
    ).join('');
}
function addTotp(name) { closeSheets(); TOKENS.unshift({ name:name, user:'new', seed:'JBSWY3DPEHPK3PX' + TOKENS.length, grad:'from-violet-500 to-purple-700' }); renderTotp(); toast('Token added'); }
setInterval(() => {
    const secs = 30 - Math.floor(Date.now() / 1000) % 30;
    $('totp-secs').textContent = secs;
    $('totp-ring').style.strokeDashoffset = 157 * (1 - secs / 30);
    if (secs === 30 || secs === 29) document.querySelectorAll('.totp-code').forEach(el => {
        el.textContent = totpCode(el.getAttribute('data-seed')).replace(/(\d{3})(\d{3})/,'$1 $2');
    });
}, 1000);

/* ═══════════ SECURE ═══════════ */
let THREATS = [
    { icon:'fa-phone-slash', color:'red', title:'+1 (555) 014-8890', sub:'threat_scam_call', tag:'SCAM' },
    { icon:'fa-triangle-exclamation', color:'amber', title:'Suspicious SMS', sub:'threat_scam_sms', tag:'warn' },
    { icon:'fa-link-slash', color:'amber', title:'bit.ly/x9z2kq', sub:'Blocked malicious link · 3h ago', tag:'warn' },
    { icon:'fa-phone-slash', color:'red', title:'+90 (532) 000-1122', sub:'Scam call blocked · 5h ago', tag:'SCAM' },
];
function renderThreats() {
    $('threat-log').innerHTML = THREATS.map(t =>
        '<div class="card-soft rounded-[20px] p-3.5 flex items-center space-x-3">' +
        '<div class="w-10 h-10 rounded-2xl bg-' + t.color + '-500/12 flex items-center justify-center shrink-0"><i class="fa-solid ' + t.icon + ' text-' + t.color + '-500 text-[14px]"></i></div>' +
        '<div class="flex-1 min-w-0"><div class="text-[12px] font-extrabold text-slate-900 truncate">' + t.title + '</div>' +
        '<div class="text-[10px] text-slate-400 font-medium">' + (I18N[LANG][t.sub] || t.sub) + '</div></div>' +
        (t.tag === 'SCAM'
            ? '<span class="text-[9px] font-extrabold bg-red-500/10 text-red-600 px-2.5 py-1 rounded-full">SCAM</span>'
            : '<span class="text-[9px] font-extrabold bg-amber-500/10 text-amber-600 px-2.5 py-1 rounded-full">' + I18N[LANG].common_warning + '</span>') +
        '</div>'
    ).join('');
}
function scanCopied() {
    const box = $('scan-result');
    box.classList.remove('hidden');
    box.innerHTML = '<div class="card-soft rounded-[24px] p-5 text-center relative overflow-hidden">' +
        '<div class="scan-line absolute left-4 right-4 h-0.5 bg-[#66757F]/60 rounded"></div>' +
        '<i class="fa-solid fa-radar text-[#66757F] text-[22px] mb-2"></i>' +
        '<div class="text-[12px] font-extrabold text-slate-700">Scanning clipboard...</div></div>';
    setTimeout(() => {
        const bad = Math.random() < 0.35;
        box.innerHTML = '<div class="rounded-[24px] p-4 flex items-center space-x-3 ' + (bad ? 'bg-red-500/10 border border-red-500/25' : 'bg-emerald-500/10 border border-emerald-500/25') + '">' +
            '<div class="w-11 h-11 rounded-2xl ' + (bad ? 'bg-red-500' : 'bg-emerald-500') + ' flex items-center justify-center shrink-0"><i class="fa-solid ' + (bad ? 'fa-triangle-exclamation' : 'fa-check') + ' text-white"></i></div>' +
            '<div><div class="text-[13px] font-extrabold text-slate-900">' + (bad ? I18N[LANG].scan_bad_t : I18N[LANG].scan_clean_t) + '</div>' +
            '<div class="text-[10px] text-slate-500 font-medium">' + (bad ? I18N[LANG].scan_bad_s : I18N[LANG].scan_clean_s) + '</div></div></div>';
        if (bad) { THREATS.unshift({ icon:'fa-clipboard', color:'red', title:'Copied text', sub:'scan_bad_t', tag:'SCAM' }); renderThreats(); }
    }, 1800);
}

/* ═══════════ CHAT ═══════════ */
let CHATS = [
    { id:'sara', name:'Sara', username:'@sara_m', grad:'from-violet-500 to-purple-700', online:true, unread:2, photo:'https://randomuser.me/api/portraits/women/44.jpg',
      messages:[ {side:'in',text:'Hey! Did you see the new Z Pass update?',time:'09:12'}, {side:'out',text:'Yes! The new design is amazing 🔥',time:'09:14',status:'read'}, {side:'in',text:'The authenticator is so fast now',time:'09:15'},
      {side:'in',type:'img',src:'https://randomuser.me/api/portraits/women/44.jpg',time:'09:16'}, {side:'in',type:'img',src:'https://randomuser.me/api/portraits/women/68.jpg',time:'09:17'},
      {side:'in',type:'file',name:'script.py',size:'3 KB',time:'09:18'}, {side:'out',type:'file',name:'cok_uzun_dosya_adi_ornegi.py',size:'12 KB',time:'09:19',status:'read'},
      {side:'in',type:'file',name:'zpass.apk',size:'18 MB',time:'09:20'}, {side:'in',type:'voice',dur:12,time:'09:21'},
      {side:'out',text:'Sunucu kapalıyken yazılan mesaj',time:'09:22',status:'pending'} ] },
    { id:'diyar', name:'Diyar', username:'@diyar', grad:'from-blue-500 to-cyan-600', online:true, unread:1, photo:'https://randomuser.me/api/portraits/men/32.jpg',
      messages:[ {side:'in',text:'Bro check this link: bit.ly/free-crypto 👀',time:'08:40'} ] },
    { id:'zizo', name:'Zizo', username:'@zizo', grad:'from-amber-500 to-orange-600', online:false, unread:0, photo:'https://randomuser.me/api/portraits/men/22.jpg',
      messages:[ {side:'in',text:'Yo! New beats are out \uD83C\uDFB5',time:'Tue'} ] },
    { id:'kurdo', name:'Kurdo', username:'@kurdo', grad:'from-emerald-500 to-teal-600', online:true, unread:0, photo:'https://randomuser.me/api/portraits/men/45.jpg',
      messages:[ {side:'in',text:'Match at 8? \u26BD',time:'Mon'}, {side:'out',text:'I\u2019m in!',time:'Mon',status:'read'} ] },
    { id:'zteam', name:'Z Pass Team', username:'@zpass', grad:'from-[#66757F] to-[#2f3a41]', online:false, unread:0,
      messages:[ {side:'in',text:'Welcome to Z Pass! Your vault is ready 🛡️',time:'Yesterday'} ] },
];
let currentChat = null;
function chatTime() { const d = new Date(); return d.getHours() + ':' + String(d.getMinutes()).padStart(2,'0'); }
function avInner(c, big) {
    if (c.photo) return '<img src="' + c.photo + '" class="w-full h-full object-cover">';
    const sz = big ? 'text-[34px]' : 'text-[20px]';
    if (c.kind === 'group') return '<i class="fa-solid fa-users text-white ' + sz + '"></i>';
    if (c.kind === 'channel') return '<i class="fa-solid fa-bullhorn text-white ' + sz + '"></i>';
    return big ? c.name.slice(0, 2).toUpperCase() : c.name[0];
}
let suppressTap = false;
function chatRowTap(id) { if (suppressTap) { suppressTap = false; return; } openChat(id); }
function chatRowHTML(c) {
    const last = c.messages[c.messages.length - 1] || { text: '', time: '' };
    return '<button data-cid="' + c.id + '" onclick="chatRowTap(\'' + c.id + '\')" class="pressable w-full flex items-center space-x-3 p-2.5 rounded-[20px] hover:bg-white text-left">' +
    '<div class="relative shrink-0" style="cursor:pointer" onclick="event.stopPropagation();openUserProfile(\'' + c.id + '\',\'screen-chats\')"><div class="w-[52px] h-[52px] rounded-[18px] overflow-hidden bg-gradient-to-br ' + c.grad + ' flex items-center justify-center text-white font-extrabold text-[18px]">' + (c.icon ? '<i class="fa-solid ' + c.icon + ' text-[20px]"></i>' : avInner(c)) + '</div>' +
    (c.online ? '<span class="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 border-[3px] border-[#f4f4f1] rounded-full"></span>' : '') + '</div>' +
    '<div class="flex-1 min-w-0"><div class="flex items-center justify-between"><span class="text-[14px] font-extrabold text-slate-900">' + c.name + '</span>' +
    '<span class="flex items-center shrink-0">' + (c.pinned ? '<i class="fa-solid fa-thumbtack text-slate-300 text-[9px] mr-1.5"></i>' : '') + '<span class="text-[10px] text-slate-400 font-medium">' + last.time + '</span></span></div>' +
    '<div class="flex items-center justify-between"><span class="text-[12px] text-slate-500 font-medium truncate">' + last.text + '</span>' +
    '<span class="flex items-center shrink-0 ml-2">' +
    (c.muted ? '<i class="fa-solid fa-volume-xmark text-slate-300 text-[11px] mr-1.5"></i>' : '') +
    (c.unread ? '<span class="w-5 h-5 bg-[#292F33] text-white text-[10px] font-extrabold rounded-full flex items-center justify-center">' + c.unread + '</span>' : '') +
    '</span></div></div></button>';
}
function renderChatList(f) {
    const q = (f || '').toLowerCase();
    let list = CHATS.filter(c => !ARCHIVED.includes(c.id));
    if (activeFolder === 'unread') list = list.filter(c => c.unread > 0);
    else if (activeFolder !== 'all') list = list.filter(c => (c.folders || []).includes(activeFolder));
    list = list.filter(c => c.name.toLowerCase().includes(q) || ((c.username || '').toLowerCase().includes(q)));
    list.sort((a, b) => ((b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)));
    let html = '';
    if (ARCHIVED.length && !archiveHidden && !q) {
        html += '<button onclick="renderArchive();switchScreen(\'screen-archive\')" class="pressable w-full flex items-center space-x-3 p-2.5 rounded-[20px] hover:bg-white text-left">' +
        '<div class="w-[52px] h-[52px] rounded-[18px] bg-slate-500/15 flex items-center justify-center shrink-0"><i class="fa-solid fa-box-archive text-slate-500 text-[20px]"></i></div>' +
        '<div class="flex-1 min-w-0"><div class="text-[14px] font-extrabold text-slate-900">' + I18N[LANG].archived_chats + '</div></div>' +
        '<span class="text-[11px] font-extrabold text-slate-400">' + ARCHIVED.length + '</span></button>';
    }
    $('chat-list').innerHTML = html + list.map(chatRowHTML).join('');
    const nl = $('newchat-list');
    if (nl) nl.innerHTML = CHATS.map(c =>
        '<button onclick="closeSheets();openChat(\'' + c.id + '\')" class="pressable w-full card-soft rounded-2xl p-3 flex items-center space-x-3">' +
        '<div class="w-10 h-10 rounded-2xl bg-gradient-to-br ' + c.grad + ' flex items-center justify-center text-white font-extrabold shrink-0">' + c.name[0] + '</div>' +
        '<div class="flex-1 text-left"><div class="text-[13px] font-extrabold">' + c.name + '</div><div class="text-[10px] text-slate-400">' + c.username + '</div></div></button>'
    ).join('');
}
/* ─── Chats: aşağı kaydırınca üst blok (başlık/story/sekmeler) animasyonla kapanır ───
   Histerezisli eşik: tek eşik, kaydırma-sabitleme (scroll anchoring) yüzünden
   açılıp kapanıp titremeye giriyordu. 100px'i geçince kapanır, 40px'in altına
   inmeden geri açılmaz. */
function chatsScrollCollapse() {
    const list = $('chat-list'), scr = $('screen-chats');
    if (!list || !scr) return;
    const st = list.scrollTop, collapsed = scr.classList.contains('chats-collapsed');
    if (!collapsed && st > 100) scr.classList.add('chats-collapsed');
    else if (collapsed && st <= 40) scr.classList.remove('chats-collapsed');
}
function backToChats() { $('dock').classList.remove('hidden'); switchScreen('screen-chats'); }
function openChat(id) {
    const c = CHATS.find(x => x.id === id);
    if (!c) return;
    currentChat = id;
    $('dock').classList.add('hidden');
    c.unread = 0;
    $('chat-name').textContent = c.name;
    $('chat-avatar').innerHTML = c.icon ? '<i class="fa-solid ' + c.icon + '"></i>' : avInner(c);
    $('chat-avatar').className = 'w-10 h-10 rounded-2xl overflow-hidden bg-gradient-to-br ' + c.grad + ' flex items-center justify-center text-white font-extrabold cursor-pointer';
    $('chat-status').textContent = c.online ? I18N[LANG].chat_online : I18N[LANG].chat_offline;
    $('chat-status').className = 'text-[10px] font-bold ' + (c.online ? 'text-emerald-600' : 'text-slate-400');
    const cs = canSend(c);
    $('chat-composer').classList.toggle('hidden', !cs);
    $('channel-bar').classList.toggle('hidden', cs);
    if (!cs) $('channel-mute-btn').textContent = c.muted ? I18N[LANG].up_unmute : I18N[LANG].up_mute;
    closeChannelSearch(true);
    switchScreen('screen-chat');
    renderMessages(false); renderChatList('');
    setChatLoading(!navigator.onLine);
}
function chatTicks(m) {
    if (m.side !== 'out') return '';
    const color = m.status === 'read' ? 'text-[#229ED9]' : (m.status === 'delivered' ? 'text-white/60' : 'text-white/40');
    const icon = m.status === 'sent' ? 'fa-check' : 'fa-check-double';
    return '<span class="text-[10px] ml-1 ' + color + '"><i class="fa-solid ' + icon + '"></i></span>';
}
function bubbleEl(m, hlq, hlcur) {
    const w = document.createElement('div');
    const out = m.side === 'out';
    w.className = 'flex ' + (out ? 'justify-end' : 'justify-start');
    const metaIn = (cls) => '<span class="' + (cls || '') + ' text-[9px] whitespace-nowrap ' + (out ? 'text-white/60' : 'text-slate-400') + '">' + (m.status === 'pending' ? '<span class="mr-1">' + T2('msg_pending') + '</span>' : '') + m.time + chatTicks(m) + '</span>';
    let inner = '';
    if (m.type === 'img') {
        inner = '<div class="max-w-[78%] relative">' +
            '<img src="' + m.src + '" onclick="openChatMediaEl(this)" style="cursor:pointer" class="rounded-[22px] w-full max-h-80 object-cover ring-1 ring-black/10 shadow">' +
            '<div class="absolute bottom-2 right-2 flex items-center bg-black/45 rounded-full px-2 py-0.5 text-[9px] font-medium text-white">' + (m.status === 'pending' ? '<span class="mr-1">' + T2('msg_pending') + '</span>' : '') + m.time + chatTicks(m) + '</div></div>';
    } else if (m.type === 'file') {
        const fExt = fileExt(m.name), fIsApk = fExt === 'apk';
        inner = '<div class="max-w-[78%] px-3.5 py-2.5 ' + (out ? 'bg-[#292F33] text-white rounded-[20px] rounded-br-[8px]' : 'bg-white text-slate-900 rounded-[20px] rounded-bl-[8px] card-soft') + ' shadow">' +
            '<div class="flex items-center space-x-2.5"><div class="w-10 h-10 rounded-2xl ' + (out ? 'bg-white/15' : 'bg-[#66757F]/12') + ' flex items-center justify-center shrink-0"><i class="fa-solid ' + fileIcon(m.name) + ' text-[15px] ' + (out ? 'text-white' : 'text-[#66757F]') + '"></i></div>' +
            '<div class="min-w-0 flex-1"><div class="text-[13px] font-bold truncate">' + fileShortName(m.name) + '</div><div class="text-[10px] ' + (out ? 'text-white/50' : 'text-slate-400') + ' font-medium">' + fileTypeLabel(m.name) + ' · ' + m.size + '</div>' +
            (fIsApk ? '<div class="text-[10px] ' + (out ? 'text-white/50' : 'text-slate-400') + ' font-medium mt-0.5">' + T2('file_install_note') + '</div>' : '') + '</div>' +
            (fIsApk ? '<button onclick="toast(\'' + T2('file_install') + ' - demo\')" class="pressable shrink-0 bg-[#229ED9] text-white rounded-full px-3 py-1.5 text-[11px] font-extrabold">' + T2('file_install') + '</button>' : '') + metaIn('self-end shrink-0 ml-1') + '</div></div>' +
            '<button onclick="fwdFileMsg(this)" title="Forward" class="pressable ml-2 self-center w-9 h-9 rounded-full bg-white/70 border border-slate-900/10 flex items-center justify-center shrink-0 shadow-sm"><i class="fa-solid fa-share text-slate-600 text-[13px]"></i></button>';
    } else if (m.type === 'voice') {
        inner = '<div class="max-w-[78%] px-3 py-2 ' + (out ? 'bg-[#292F33] text-white rounded-[20px] rounded-br-[8px] shadow' : 'bg-white text-slate-900 rounded-[20px] rounded-bl-[8px] card-soft') + '">' +
            '<div class="flex items-center space-x-2"><button onclick="toggleVoicePlay(this,' + (m.dur || 0) + ')" class="pressable w-9 h-9 rounded-full ' + (out ? 'bg-white/15 text-white' : 'bg-[#229ED9] text-white') + ' flex items-center justify-center shrink-0"><i class="fa-solid fa-play text-[12px] ml-0.5"></i></button>' +
            '<div class="voice-bars" style="color:' + (out ? '#fff' : '#64748b') + '">' + voiceBarsHTML(18, m.dur || 8) + '</div>' +
            '<span class="text-[11px] font-bold ' + (out ? 'text-white/70' : 'text-slate-500') + ' shrink-0">' + fmtDur(m.dur || 0) + '</span>' + metaIn('self-end shrink-0') + '</div></div>';
    } else if (m.type === 'call') {
        inner = '<div class="max-w-[78%] px-3.5 py-2 ' + (out ? 'bg-[#292F33] text-white rounded-[20px] rounded-br-[8px] shadow' : 'bg-white text-slate-900 rounded-[20px] rounded-bl-[8px] card-soft') + '">' +
            '<div class="flex items-center space-x-2"><i class="fa-solid fa-phone-slash text-[#e5484d] text-[14px]"></i>' +
            '<span class="text-[13px] font-bold text-[#e5484d]">' + (m.text || '') + '</span>' + metaIn('self-end shrink-0 ml-1') + '</div></div>';
    } else {
        inner = '<div class="max-w-[78%] px-3.5 py-2 ' + (out
            ? 'bg-[#292F33] text-white rounded-[20px] rounded-br-[8px] shadow'
            : 'bg-white text-slate-900 rounded-[20px] rounded-bl-[8px] card-soft') + '">' +
            '<div class="text-[13px] font-medium leading-snug">' + (m.fwd ? '<div class="text-[10px] font-bold text-[#229ED9] mb-0.5">' + I18N[LANG].fwd_from + ' ' + escAttr(m.fwd) + '</div>' : '') + (hlq ? hlText(m.text || '', hlq, hlcur) : (m.text || '')) + metaIn('float-right inline-flex items-center ml-2 mt-[3px]') + '</div></div>';
    }
    w.innerHTML = inner;
    return w;
}
function chatInputToggle() {
    const has = $('chat-input').value.trim().length > 0;
    $('chat-send-btn').classList.toggle('hidden', !has);
    $('chat-send-btn').classList.toggle('flex', has);
    $('chat-mic-btn').classList.toggle('hidden', has);
    $('chat-mic-btn').classList.toggle('flex', !has);
}
function sendChatFile(input) {
    const f = input.files[0]; if (!f) return;
    const c = CHATS.find(x => x.id === currentChat); if (!c) return;
    const m = { side:'out', time:chatTime(), status:'sent', text:'' };
    const push = () => {
        c.messages.push(m); renderMessages(true); renderChatList('');
        setTimeout(() => { m.status = 'delivered'; renderMessages(false); }, 900);
        setTimeout(() => { m.status = 'read'; renderMessages(false); }, 2600);
        if (c.online) setTimeout(() => {
            c.messages.push({ side:'in', text:'Got it! 👍', time:chatTime() });
            renderMessages(true); renderChatList('');
        }, 2400);
    };
    if (f.type.startsWith('image/')) {
        const r = new FileReader();
        r.onload = () => { m.type = 'img'; m.src = r.result; push(); };
        r.readAsDataURL(f);
    } else {
        m.type = 'file'; m.name = f.name;
        m.size = f.size > 1048576 ? (f.size / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(f.size / 1024)) + ' KB';
        push();
    }
    input.value = '';
}

/* ═══════════ V42: CHAT MEDIA VIEWER + FILE LABELS + VOICE + OFFLINE ═══════════ */
const I18N2 = {
    en: { pv_saved: 'Saved ✓', rec_recording: 'Recording…', rec_locked: 'Locked…', rec_hint: '↑ Lock · ← Cancel', rec_tap_send: 'Tap again to send', chat_loading: 'Loading…', msg_pending: 'Waiting', file_install: 'Install', file_install_note: 'Installs inside the app' },
    tr: { pv_saved: 'Kaydedildi ✓', rec_recording: 'Kaydediliyor…', rec_locked: 'Kilitli…', rec_hint: '↑ Kilit · ← İptal', rec_tap_send: 'Tekrar dokun: gönder', chat_loading: 'Yükleniyor…', msg_pending: 'Bekliyor', file_install: 'Yükle', file_install_note: 'Uygulama içinde yüklenir' },
    ku: { pv_saved: 'Hat tomarkirin ✓', rec_recording: 'Tomar dike…', rec_locked: 'Girtî…', rec_hint: '↑ Girtî · ← Betal', rec_tap_send: 'Dîsa bitikîne: bişîne', chat_loading: 'Tê barkirin…', msg_pending: 'Li bendê', file_install: 'Saz bike', file_install_note: 'Di nav sepanê de tê sazkirin' },
    ar: { pv_saved: 'تم الحفظ ✓', rec_recording: 'جارٍ التسجيل…', rec_locked: 'مقفلة…', rec_hint: '↑ قفل · ← إلغاء', rec_tap_send: 'اضغط مرة أخرى للإرسال', chat_loading: 'جارٍ التحميل…', msg_pending: 'قيد الانتظار', file_install: 'تثبيت', file_install_note: 'يُثبَّت داخل التطبيق' }
};
function T2(k) { return (I18N2[LANG] && I18N2[LANG][k]) || I18N2.en[k] || k; }
const FILE_TYPES = {
    en: { py: 'Python file', json: 'JSON file', pdf: 'PDF file', zip: 'ZIP archive', apk: 'APK app', mp3: 'Audio file', wav: 'Audio file', ogg: 'Audio file', m4a: 'Audio file', mp4: 'Video file', mov: 'Video file', mkv: 'Video file', doc: 'Word document', docx: 'Word document', txt: 'Text file', xls: 'Excel file', xlsx: 'Excel file', ppt: 'Presentation', pptx: 'Presentation', png: 'Image file', jpg: 'Image file', jpeg: 'Image file', gif: 'Image file', webp: 'Image file' },
    tr: { py: 'Python dosyası', json: 'JSON dosyası', pdf: 'PDF dosyası', zip: 'ZIP arşivi', apk: 'APK uygulaması', mp3: 'Ses dosyası', wav: 'Ses dosyası', ogg: 'Ses dosyası', m4a: 'Ses dosyası', mp4: 'Video dosyası', mov: 'Video dosyası', mkv: 'Video dosyası', doc: 'Word belgesi', docx: 'Word belgesi', txt: 'Metin dosyası', xls: 'Excel dosyası', xlsx: 'Excel dosyası', ppt: 'Sunum dosyası', pptx: 'Sunum dosyası', png: 'Resim dosyası', jpg: 'Resim dosyası', jpeg: 'Resim dosyası', gif: 'Resim dosyası', webp: 'Resim dosyası' }
};
function fileExt(name) { const i = (name || '').lastIndexOf('.'); return i > 0 ? name.slice(i + 1).toLowerCase() : ''; }
function fileTypeLabel(name) { const ext = fileExt(name); const map = FILE_TYPES[LANG] || FILE_TYPES.en; if (map[ext]) return map[ext]; if (ext) return ext.toUpperCase() + (LANG === 'tr' ? ' dosyası' : ' file'); return LANG === 'tr' ? 'Dosya' : 'File'; }
function fileShortName(name) { const n = name || ''; return n.length > 16 ? n.slice(0, 16) + '...' : n; }
function fileIcon(name) {
    const e = fileExt(name);
    if (e === 'apk') return 'fa-robot';
    if (e === 'pdf') return 'fa-file-pdf';
    if (e === 'zip') return 'fa-file-zipper';
    if (e === 'py' || e === 'json') return 'fa-file-code';
    if (e === 'mp3' || e === 'wav' || e === 'ogg' || e === 'm4a') return 'fa-file-audio';
    if (e === 'mp4' || e === 'mov' || e === 'mkv') return 'fa-file-video';
    if (e === 'doc' || e === 'docx') return 'fa-file-word';
    if (e === 'txt') return 'fa-file-lines';
    if (e === 'png' || e === 'jpg' || e === 'jpeg' || e === 'gif' || e === 'webp') return 'fa-file-image';
    if (e === 'xls' || e === 'xlsx') return 'fa-file-excel';
    if (e === 'ppt' || e === 'pptx') return 'fa-file-powerpoint';
    return 'fa-file';
}
function fmtDur(s) { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
function voiceBarsHTML(n, seed) { let h = ''; for (let i = 0; i < n; i++) { const v = 5 + ((seed * 13 + i * 7) % 18); h += '<span style="height:' + v + 'px"></span>'; } return h; }
function toggleVoicePlay(btn, dur) {
    const bars = btn.parentElement.querySelector('.voice-bars');
    document.querySelectorAll('.voice-bars.playing').forEach(b => { if (b !== bars) { b.classList.remove('playing'); const ob = b.parentElement.querySelector('button'); if (ob) ob.innerHTML = '<i class="fa-solid fa-play text-[12px] ml-0.5"></i>'; } });
    if (!bars) return;
    if (bars.classList.contains('playing')) { bars.classList.remove('playing'); btn.innerHTML = '<i class="fa-solid fa-play text-[12px] ml-0.5"></i>'; if (btn._vt) { clearTimeout(btn._vt); btn._vt = null; } }
    else { bars.classList.add('playing'); btn.innerHTML = '<i class="fa-solid fa-pause text-[12px]"></i>'; if (btn._vt) clearTimeout(btn._vt); btn._vt = setTimeout(() => { bars.classList.remove('playing'); btn.innerHTML = '<i class="fa-solid fa-play text-[12px] ml-0.5"></i>'; btn._vt = null; }, Math.max(1000, dur * 1000)); }
}
function fwdFileMsg(el) { const w = el.closest('[data-mi]'); if (!w) return; FWD_MI = w.getAttribute('data-mi'); openForward(); }

/* ─── Chat media viewer: zoom-only (no pan), swipe prev/next, save, forward ─── */
let CM = { list: [], idx: 0, scale: 1, pointers: new Map(), startDist: 0, startScale: 1, swipeX: 0, swipeStartX: 0 };
function openChatMediaEl(el) { const w = el.closest('[data-mi]'); if (w) openChatMedia(w.getAttribute('data-mi')); }
function openChatMedia(mi) {
    const c = CHATS.find(x => x.id === currentChat); if (!c) return;
    CM.list = [];
    c.messages.forEach((m, i) => { if (m.type === 'img') CM.list.push({ mi: i, src: m.src }); });
    const pos = CM.list.findIndex(x => String(x.mi) === String(mi));
    CM.idx = pos >= 0 ? pos : 0; CM.scale = 1;
    renderChatMedia();
    const v = $('chat-media-viewer'); v.classList.remove('hidden'); v.classList.add('flex');
}
function renderChatMedia() {
    const cur = CM.list[CM.idx]; if (!cur) return;
    const img = $('chat-media-img'); img.src = cur.src; img.style.transform = 'scale(' + CM.scale + ')';
    $('chat-media-count').textContent = (CM.idx + 1) + ' / ' + CM.list.length;
    const multi = CM.list.length > 1;
    $('cm-prev').style.display = multi ? 'flex' : 'none';
    $('cm-next').style.display = multi ? 'flex' : 'none';
}
function cmApplyScale() { const img = $('chat-media-img'); if (img) img.style.transform = 'scale(' + CM.scale + ')'; }
function chatMediaNav(d) { if (!CM.list.length) return; CM.idx = (CM.idx + d + CM.list.length) % CM.list.length; CM.scale = 1; renderChatMedia(); }
function closeChatMedia() { const v = $('chat-media-viewer'); v.classList.add('hidden'); v.classList.remove('flex'); }
function saveChatMedia() {
    const cur = CM.list[CM.idx]; if (!cur) return;
    fetch(cur.src).then(r => r.blob()).then(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'zpass-image.jpg'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); toast(T2('pv_saved')); }).catch(() => window.open(cur.src, '_blank'));
}
function forwardChatMedia() { const cur = CM.list[CM.idx]; if (!cur) return; FWD_MI = cur.mi; closeChatMedia(); openForward(); }
(function () {
    const st = $('chat-media-stage'); if (!st) return;
    st.addEventListener('pointerdown', e => {
        if (e.target.closest('button')) return;
        CM.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (CM.pointers.size === 2) { const p = [...CM.pointers.values()]; CM.startDist = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) || 1; CM.startScale = CM.scale; }
        else if (CM.pointers.size === 1) { CM.swipeStartX = e.clientX; CM.swipeX = 0; }
    });
    st.addEventListener('pointermove', e => {
        if (!CM.pointers.has(e.pointerId)) return;
        CM.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (CM.pointers.size === 2) { const p = [...CM.pointers.values()]; const d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y); CM.scale = Math.min(4, Math.max(1, CM.startScale * (d / (CM.startDist || 1)))); cmApplyScale(); }
        else if (CM.pointers.size === 1 && CM.scale === 1) { CM.swipeX = e.clientX - CM.swipeStartX; }
    });
    const cmEnd = e => {
        if (!CM.pointers.has(e.pointerId)) return;
        CM.pointers.delete(e.pointerId);
        if (CM.pointers.size === 0 && CM.scale === 1 && Math.abs(CM.swipeX) > 60) chatMediaNav(CM.swipeX < 0 ? 1 : -1);
        if (CM.pointers.size === 0) CM.swipeX = 0;
    };
    st.addEventListener('pointerup', cmEnd);
    st.addEventListener('pointercancel', cmEnd);
    st.addEventListener('dblclick', () => { CM.scale = 1; cmApplyScale(); });
    st.addEventListener('wheel', e => { e.preventDefault(); CM.scale = Math.min(4, Math.max(1, CM.scale + (e.deltaY < 0 ? 0.25 : -0.25))); cmApplyScale(); }, { passive: false });
    window.addEventListener('pointerup', () => { CM.pointers.clear(); CM.swipeX = 0; });
})();

/* ─── Voice recording (WhatsApp / Telegram style) ───
   Tek tık = kayıt başlar, tekrar tık = gönder.
   Basılı tut = kayıt, bırak = gönder.
   Basılıyken yukarı = kilit (lock ikonu + Cancel), sola = iptal. */
let REC = { active: false, locked: false, tapMode: false, t0: 0, timer: null, dur: 0, sx: 0, sy: 0, pressStart: 0 };
function startVoiceRec() {
    if (REC.active) return;
    REC.active = true; REC.locked = false; REC.tapMode = false; REC.t0 = Date.now(); REC.dur = 0; REC.pressStart = Date.now();
    $('chat-input-wrap').classList.add('hidden');
    const rb = $('chat-rec-bar'); rb.classList.remove('hidden'); rb.classList.add('flex');
    $('chat-rec-wave').innerHTML = voiceBarsHTML(24, 5);
    $('chat-rec-time').textContent = '0:00';
    $('chat-rec-label').textContent = T2('rec_hint');
    $('chat-rec-lock').classList.add('hidden');
    $('chat-rec-cancel').classList.add('hidden'); $('chat-rec-cancel').classList.remove('flex');
    $('chat-send-btn').classList.add('hidden'); $('chat-send-btn').classList.remove('flex');
    REC.timer = setInterval(() => { REC.dur = Math.floor((Date.now() - REC.t0) / 1000); $('chat-rec-time').textContent = fmtDur(REC.dur); }, 250);
}
function stopVoiceUI() {
    clearInterval(REC.timer); REC.active = false; REC.locked = false; REC.tapMode = false;
    $('chat-input-wrap').classList.remove('hidden');
    const rb = $('chat-rec-bar'); rb.classList.add('hidden'); rb.classList.remove('flex');
    $('chat-rec-cancel').classList.add('hidden'); $('chat-rec-cancel').classList.remove('flex');
    $('chat-rec-lock').classList.add('hidden');
    chatInputToggle();
}
function cancelVoice() { if (!REC.active) return; stopVoiceUI(); }
function lockVoice() {
    if (!REC.active || REC.locked) return;
    REC.locked = true; REC.tapMode = false;
    $('chat-rec-label').textContent = T2('rec_locked');
    $('chat-rec-lock').classList.remove('hidden');
    const cc = $('chat-rec-cancel'); cc.classList.remove('hidden'); cc.classList.add('flex');
    $('chat-send-btn').classList.remove('hidden'); $('chat-send-btn').classList.add('flex');
}
function enterTapMode() {
    if (!REC.active || REC.locked) return;
    REC.tapMode = true;
    $('chat-rec-label').textContent = T2('rec_tap_send');
    const cc = $('chat-rec-cancel'); cc.classList.remove('hidden'); cc.classList.add('flex');
    $('chat-send-btn').classList.remove('hidden'); $('chat-send-btn').classList.add('flex');
}
function finishVoice() {
    if (!REC.active) return;
    const dur = Math.max(1, REC.dur);
    stopVoiceUI();
    const c = CHATS.find(x => x.id === currentChat); if (!c || !canSend(c)) return;
    const m = { side: 'out', type: 'voice', dur: dur, time: chatTime(), status: 'sent' };
    c.messages.push(m); renderMessages(true); renderChatList('');
    setTimeout(() => { m.status = 'delivered'; renderMessages(false); }, 900);
    setTimeout(() => { m.status = 'read'; renderMessages(false); }, 2600);
}
(function () {
    const mb = $('chat-mic-btn'); if (!mb) return;
    mb.addEventListener('pointerdown', e => {
        e.preventDefault();
        try { mb.setPointerCapture(e.pointerId); } catch (err) {}
        REC.sx = e.clientX; REC.sy = e.clientY;
        startVoiceRec();
    });
    mb.addEventListener('pointermove', e => {
        if (!REC.active || REC.locked) return;
        const dx = e.clientX - REC.sx, dy = e.clientY - REC.sy;
        if (dy < -80) lockVoice();
        else if (dx < -80) cancelVoice();
    });
    const micEnd = () => {
        if (!REC.active || REC.locked) return;
        if (REC.tapMode) { finishVoice(); return; }
        if (Date.now() - REC.pressStart < 300) enterTapMode();
        else finishVoice();
    };
    mb.addEventListener('pointerup', micEnd);
    mb.addEventListener('pointercancel', micEnd);
})();

/* ─── Offline / loading: error bubbles never appear; a loading bar shows instead ─── */
function setChatLoading(on) { const b = $('chat-loading-bar'); if (!b) return; b.classList.toggle('hidden', !on); $('chat-loading-text').textContent = T2('chat_loading'); }
window.addEventListener('online', () => setChatLoading(false));
window.addEventListener('offline', () => { if (currentChat) setChatLoading(true); });

function renderMessages(pop) {
    const c = CHATS.find(x => x.id === currentChat); if (!c) return;
    const box = $('chat-messages');
    box.innerHTML = '<div class="text-center"><span class="text-[10px] font-bold text-slate-500 bg-white/70 border border-slate-900/10 rounded-full px-3 py-1">' + I18N[LANG].chat_today + '</span></div>';
    c.messages.forEach((m, i) => { const w = bubbleEl(m); w.setAttribute('data-mi', i); box.appendChild(w); });
    if (pop && box.lastChild) box.lastChild.classList.add('msg-pop');
    box.scrollTop = box.scrollHeight;
}
function sendChatMessage() {
    if (REC.active) { finishVoice(); return; }
    const inp = $('chat-input'); const t = inp.value.trim(); if (!t) return;
    const c = CHATS.find(x => x.id === currentChat);
    if (!c || !canSend(c)) return;
    const m = { side:'out', text:t, time:chatTime(), status:'sent' };
    c.messages.push(m); inp.value = '';
    renderMessages(true); renderChatList('');
    setTimeout(() => { m.status = 'delivered'; renderMessages(false); }, 900);
    if (c.online) {
        setTimeout(() => {
            $('chat-status').textContent = I18N[LANG].chat_typeing;
            setTimeout(() => {
                const replies = ['Nice! 👍', 'Haha exactly 😄', 'Let me check and get back to you', 'The new Secure scan is crazy good 🛡️'];
                c.messages.push({ side:'in', text:replies[Math.floor(Math.random() * replies.length)], time:chatTime() });
                $('chat-status').textContent = I18N[LANG].chat_online;
                renderMessages(true); renderChatList('');
            }, 1600);
        }, 1200);
    }
    setTimeout(() => { m.status = 'read'; renderMessages(false); }, 2600);
}
$('chat-input') && $('chat-input').addEventListener('keydown', e => { if (e.key === 'Enter') sendChatMessage(); });

/* ═══════════ FILES ═══════════ */
let FILES = [
    { name:'passport.pdf', size:'2.4 MB', icon:'fa-file-pdf', color:'red' },
    { name:'family.jpg', size:'4.1 MB', icon:'fa-file-image', color:'violet' },
    { name:'backup.zip', size:'86 MB', icon:'fa-file-zipper', color:'amber' },
    { name:'notes.txt', size:'12 KB', icon:'fa-file-lines', color:'blue' },
    { name:'video.mp4', size:'32 MB', icon:'fa-file-video', color:'emerald' },
    { name:'keys.json', size:'3 KB', icon:'fa-file-code', color:'slate' },
];
function renderFiles() {
    $('files-grid').innerHTML = FILES.map(f =>
        '<div class="card-soft rounded-[22px] p-4 flex flex-col items-center text-center">' +
        '<div class="w-12 h-12 rounded-2xl bg-' + f.color + '-500/12 flex items-center justify-center mb-2.5"><i class="fa-solid ' + f.icon + ' text-' + f.color + '-500 text-[18px]"></i></div>' +
        '<div class="text-[11px] font-extrabold text-slate-900 truncate w-full">' + f.name + '</div>' +
        '<div class="text-[9px] text-slate-400 font-medium">' + f.size + ' · <i class="fa-solid fa-lock text-[8px]"></i></div></div>'
    ).join('');
}

/* ═══════════ USER PROFILE ═══════════ */
let upReturn = 'screen-chats', upUser = null, upMuted = false, upIsMe = false;
const ME_USER = { id:'me', name:'Tom', firstName:'Tom', lastName:'', username:'@tom', grad:'from-[#66757F] to-[#2f3a41]', online:true, bio:'Z Pass user', lastseen:'online', phone:'', birthday:null, personalChannel:'', posts:[], vaultPw:null, biometric:null, pin:null, blocked:false };
let MY_SOCIALS = [ {domain:'instagram.com',user:'tom'}, {domain:'x.com',user:'tom'} ];
const SOCIAL_CHIPS = [['Instagram','instagram.com'],['TikTok','tiktok.com'],['YouTube','youtube.com'],['X','x.com'],['Reddit','reddit.com'],['Telegram','t.me']];
function cleanDomain(d){ return (d||'').trim().toLowerCase().replace(/^https?:\/\//,'').split('/')[0].replace(/^www\./,''); }
function socialUrl(s){
    const d = cleanDomain(s.domain), u = (s.user||'').trim().replace(/^@/,'');
    if(!d) return '';
    if(/tiktok\.com|youtube\.com|youtu\.be/.test(d)) return 'https://' + d + '/@' + u;
    if(/t\.me/.test(d)) return 'https://t.me/' + u;
    return u ? 'https://' + d + '/' + u : 'https://' + d;
}
function socialIcon(s){ return 'https://www.google.com/s2/favicons?domain=' + cleanDomain(s.domain) + '&sz=64'; }
function openSocial(i){
    const s = (upUser.socials||[])[i]; if(!s) return;
    const u = socialUrl(s); if(u) window.open(u, '_blank');
}
function renderSocialChips(){
    const T = I18N[LANG];
    $('social-chips').innerHTML = SOCIAL_CHIPS.map(c =>
        '<button onclick="document.getElementById(\'ns-url\').value=\'' + c[1] + '\'" class="pressable bg-white/10 rounded-full px-4 py-2 text-[12px] font-bold">' + c[0] + '</button>'
    ).join('') + '<button onclick="socialOther()" class="pressable bg-[#229ED9]/20 border border-[#229ED9]/40 rounded-full px-4 py-2 text-[12px] font-bold text-[#7cc4e8]">' + (T.social_other || 'Other') + '</button>';
}
function socialOther(){
    const u = $('ns-url'); u.value = ''; u.placeholder = 'patreon.com'; u.focus();
}
function addSocial(){
    const d = cleanDomain($('ns-url').value), u = $('ns-user').value.trim().replace(/^@/,'');
    if(!d){ toast('Enter a website'); return; }
    MY_SOCIALS.push({ domain:d, user:u });
    $('ns-url').value = ''; $('ns-user').value = '';
    closeSheets(); openUserProfile('me', upReturn); toast('Social account added');
}
CHATS.forEach(c => {
    if (c.id === 'sara') Object.assign(c, { bio:'Digital artist \uD83C\uDFA8', lastseen:'last seen recently', socials:[{domain:'instagram.com',user:'sara.art'},{domain:'x.com',user:'sara_m'}], posts:[['from-violet-500 to-purple-700','0:10'],['from-blue-500 to-cyan-600','0:03'],['from-pink-500 to-rose-600','1:24']] });
    if (c.id === 'diyar') Object.assign(c, { bio:'Crypto & tech', lastseen:'online', socials:[{domain:'x.com',user:'diyar'}], posts:[['from-amber-500 to-orange-600','0:45'],['from-emerald-500 to-teal-600','2:10']] });
    if (c.id === 'zteam') Object.assign(c, { bio:'Official Z Pass announcements', lastseen:'last seen recently', socials:[{domain:'zpass.web.app',user:''}], posts:[['from-[#66757F] to-[#2f3a41]','0:30']] });
});
function openUserProfile(id, ret) {
    if (id === 'saved') id = 'me';
    upIsMe = (id === 'me');
    const c = upIsMe ? Object.assign({}, ME_USER, { socials: MY_SOCIALS }) : CHATS.find(x => x.id === id);
    if (!c) return;
    const isGrp = !!c.kind;
    upUser = c; upReturn = ret || 'screen-chats'; upMuted = false;
    const addBtn = $('up-add-social');
    addBtn.style.display = (upIsMe || isGrp) ? 'flex' : 'none';
    $('up-avatar').innerHTML = avInner(c, true);
    $('up-avatar').style.cursor = c.photo ? 'pointer' : 'default';
    $('up-avatar').onclick = c.photo ? function () { openPhoto(upUser.photo, upUser.name, upUser.username ? '@' + String(upUser.username).replace(/^@/, '') : ''); } : null;
    $('up-avatar').className = 'w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br ' + c.grad + ' flex items-center justify-center text-white font-extrabold text-[36px] mx-auto mb-3 shadow-xl';
    $('up-name').textContent = c.name;
    $('up-displayname').textContent = c.name;
    if (isGrp) {
        const n = (c.members || []).length + 1;
        $('up-status').textContent = n + ' ' + (c.kind === 'group' ? I18N[LANG].members_l : I18N[LANG].subs_l);
    } else {
        $('up-status').textContent = c.blocked ? I18N[LANG].block_user : (c.online ? I18N[LANG].chat_online : (c.lastseen || I18N[LANG].chat_offline));
    }
    const bioEl = $('up-bio');
    if (upIsMe && !isGrp) {
        if (c.bio) { bioEl.textContent = c.bio; bioEl.style.color = ''; }
        else { bioEl.textContent = I18N[LANG].bio_add; bioEl.style.color = '#229ED9'; }
    } else { bioEl.textContent = c.bio || ''; bioEl.style.color = ''; }
    $('up-username').textContent = c.username ? '@' + String(c.username).replace(/^@/, '') : '—';
    $('up-username-row').style.display = (isGrp && !c.username) ? 'none' : '';
    const gb = $('up-group-btns');
    gb.classList.toggle('hidden', !isGrp); gb.classList.toggle('grid', isGrp);
    const showEdit = isGrp || upIsMe;
    $('up-edit-btn').style.display = showEdit ? 'flex' : 'none';
    $('up-edit-btn').onclick = (!isGrp && upIsMe) ? function () { openEditProfile('screen-userprofile'); } : openEditGroup;
    $('up-addmembers-card').style.display = isGrp ? 'flex' : 'none';
    $('up-role-card').style.display = isGrp ? '' : 'none';
    if (isGrp) setMyRoleSilent(myRoleOf(c));
    $('up-members-card').style.display = isGrp ? '' : 'none';
    if (isGrp) renderUpMembers();
    const mine = upIsMe && !isGrp;
    $('up-me-btns').classList.toggle('hidden', !mine); $('up-me-btns').classList.toggle('grid', mine);
    $('up-user-btns').classList.toggle('hidden', mine || isGrp); $('up-user-btns').classList.toggle('grid', !mine && !isGrp);
    $('up-menu-btn').style.display = upIsMe ? 'none' : 'flex';
    (function () {
        const tb = $('up-topbar'), av = $('up-avatar');
        if (upIsMe) {
            $('up-banner').style.display = '';
            tb.className = 'absolute top-3 left-4 right-4 z-20 flex items-center justify-between';
            av.style.marginTop = '-56px';
            av.style.width = '112px'; av.style.height = '112px';
            av.classList.add('ring-4', 'ring-[#17212b]', 'relative', 'z-10', 'shadow-2xl');
        } else {
            $('up-banner').style.display = 'none';
            tb.className = 'flex items-center justify-between px-4 pt-3 mb-5';
            av.style.marginTop = '';
            av.style.width = ''; av.style.height = '';
            av.classList.remove('ring-4', 'ring-[#17212b]', 'relative', 'z-10', 'shadow-2xl');
        }
    })();
    $('up-invite-row').classList.toggle('hidden', !isGrp);
    if (isGrp) $('up-invite').textContent = c.inviteLink || genInvite();
    $('up-socials').innerHTML = (c.socials || []).map((sm, i) =>
        '<button onclick="openSocial(' + i + ')" class="pressable flex items-center space-x-2.5 bg-white/10 rounded-2xl pl-1.5 pr-3.5 py-1.5 text-left">' +
        '<img src="' + socialIcon(sm) + '" class="w-8 h-8 rounded-xl bg-white shrink-0" onerror="this.style.display=\'none\'">' +
        '<span><span class="block text-[12px] font-bold text-white/85">' + (sm.user ? '@' + sm.user.replace(/^@/,'') : cleanDomain(sm.domain)) + '</span>' +
        '<span class="block text-[9px] text-white/40 font-medium">' + cleanDomain(sm.domain) + '</span></span></button>'
    ).join('');
    $('up-posts').innerHTML = (c.posts || []).map(p =>
        '<div class="relative aspect-[3/4] rounded-xl overflow-hidden bg-gradient-to-br ' + p[0] + '"><div class="absolute inset-0 bg-black/20"></div>' +
        '<span class="absolute bottom-1.5 left-1.5 text-[9px] font-bold text-white bg-black/50 px-1.5 py-0.5 rounded flex items-center space-x-1"><i class="fa-solid fa-play text-[7px]"></i><span>' + p[1] + '</span></span></div>'
    ).join('');
    if (upIsMe) renderUpExtra(); else $('up-extra').innerHTML = '';
    $('dock').classList.add('hidden');
    switchScreen('screen-userprofile');
}
function upBack() {
    if (upReturn === 'screen-chat' && currentChat) openChat(currentChat);
    else if (upReturn === 'screen-home') drawerGo('home');
    else backToChats();
}
function upMessage() { if (upUser) openChat(upUser.id); }
function upMute() {
    upMuted = !upMuted;
    ['up-mute-btn', 'up-gmute-btn'].forEach(id => {
        const b = $(id); if (!b) return;
        b.querySelector('span').textContent = upMuted ? I18N[LANG].up_unmute : I18N[LANG].up_mute;
        b.querySelector('i').className = (upMuted ? 'fa-solid fa-bell' : 'fa-solid fa-bell-slash') + ' text-[17px] text-white/85';
    });
    toast(upMuted ? 'Muted' : 'Unmuted');
}

/* ═══════════ GROUPS & CHANNELS ═══════════ */
let TAKEN_USERNAMES = ['zpass', 'sara_m', 'diyar', 'tom'];
function genInvite() {
    const ch = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    let r = ''; for (let i = 0; i < 10; i++) r += ch[Math.floor(Math.random() * ch.length)];
    return 'https://zpass.app/join/' + r;
}
function validUsername(u) { return /^[a-z0-9_]{5,32}$/.test(u); }
function previewPhoto(input, imgId, iconId, key) {
    const f = input.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
        const img = $(imgId); img.src = r.result; img.classList.remove('hidden');
        $(iconId).classList.add('hidden'); window[key + '_PHOTO'] = r.result;
    };
    r.readAsDataURL(f);
}
/* ---- group create ---- */
let NG_SEL = new Set();
function openCreateGroupOLD() {
    NG_SEL = new Set(); window.NG_PHOTO = '';
    $('ng-name').value = ''; $('ng-photo').value = '';
    $('ng-photo-img').classList.add('hidden'); $('ng-photo-icon').classList.remove('hidden');
    renderNgMembers(); openSheet('sheet-create-group');
}
function ngToggle(id) { NG_SEL.has(id) ? NG_SEL.delete(id) : NG_SEL.add(id); renderNgMembers(); }
function renderNgMembers() {
    $('ng-members').innerHTML = CHATS.filter(c => !c.kind).map(c =>
        '<button onclick="ngToggle(\'' + c.id + '\')" class="w-full flex items-center space-x-3 p-2 rounded-2xl hover:bg-slate-50 text-left">' +
        '<div class="w-10 h-10 rounded-2xl overflow-hidden bg-gradient-to-br ' + c.grad + ' flex items-center justify-center text-white font-extrabold shrink-0">' + avInner(c) + '</div>' +
        '<span class="flex-1 text-[13px] font-extrabold text-slate-900">' + c.name + '</span>' +
        '<span class="w-6 h-6 rounded-full ' + (NG_SEL.has(c.id) ? 'bg-[#229ED9]' : 'bg-slate-200') + ' flex items-center justify-center shrink-0">' +
        (NG_SEL.has(c.id) ? '<i class="fa-solid fa-check text-white text-[11px]"></i>' : '') + '</span></button>'
    ).join('');
}
function createGroup() {
    const name = $('ng-name').value.trim();
    if (!name) { toast('Enter a name'); return; }
    const g = { id: 'g' + Date.now(), kind: 'group', name: name, grad: 'from-emerald-500 to-teal-600',
        photo: window.NG_PHOTO || '', online: false, unread: 0, privacy: 'private', whoCanSend: 'all',
        bio: '', members: [...NG_SEL], inviteLink: genInvite(), socials: [], posts: [],
        messages: [{ side: 'in', text: 'Group created \uD83C\uDF89', time: chatTime() }] };
    CHATS.unshift(g); closeSheets(); renderChatList(''); openChat(g.id); toast('Group created');
}
/* ---- channel create ---- */
let NC_TYPE = 'public';
function openCreateChannelOLD() {
    window.CH_PHOTO = ''; NC_TYPE = 'public';
    $('ch-name').value = ''; $('ch-desc').value = ''; $('ch-user').value = ''; $('ch-user-msg').textContent = '';
    $('ch-photo').value = ''; $('ch-photo-img').classList.add('hidden'); $('ch-photo-icon').classList.remove('hidden');
    chType('public'); openSheet('sheet-create-channel');
}
function chType(t) {
    NC_TYPE = t; const pub = t === 'public';
    $('ch-t-pub').className = 'seg-btn flex-1 py-2.5 rounded-[14px] text-[12px] font-extrabold ' + (pub ? 'bg-white shadow text-slate-900' : 'text-slate-500');
    $('ch-t-priv').className = 'seg-btn flex-1 py-2.5 rounded-[14px] text-[12px] font-extrabold ' + (!pub ? 'bg-white shadow text-slate-900' : 'text-slate-500');
    $('ch-user-wrap').classList.toggle('hidden', !pub);
}
function chCheckUser() {
    const inp = $('ch-user');
    const u = inp.value.trim().toLowerCase().replace(/^@/, ''); inp.value = u;
    const m = $('ch-user-msg');
    if (!u) { m.textContent = ''; return; }
    if (!validUsername(u)) { m.textContent = I18N[LANG].user_invalid; m.className = 'text-[11px] font-bold mt-1.5 px-1 text-red-500'; return; }
    if (TAKEN_USERNAMES.includes(u)) { m.textContent = I18N[LANG].user_taken; m.className = 'text-[11px] font-bold mt-1.5 px-1 text-red-500'; }
    else { m.textContent = I18N[LANG].user_ok; m.className = 'text-[11px] font-bold mt-1.5 px-1 text-emerald-600'; }
}
function createChannel() {
    const name = $('ch-name').value.trim();
    if (!name) { toast('Enter a name'); return; }
    let username = '';
    if (NC_TYPE === 'public') {
        username = $('ch-user').value.trim().toLowerCase().replace(/^@/, '');
        if (!validUsername(username)) { toast(I18N[LANG].user_invalid); return; }
        if (TAKEN_USERNAMES.includes(username)) { toast(I18N[LANG].user_taken); return; }
        TAKEN_USERNAMES.push(username);
    }
    const c = { id: 'c' + Date.now(), kind: 'channel', name: name, username: username, grad: 'from-[#66757F] to-[#2f3a41]',
        photo: window.CH_PHOTO || '', online: false, unread: 0, privacy: NC_TYPE, whoCanSend: 'admins',
        bio: $('ch-desc').value.trim(), members: [], inviteLink: genInvite(), socials: [], posts: [],
        messages: [{ side: 'in', text: 'Channel created \uD83D\uDCE2', time: chatTime() }] };
    CHATS.unshift(c); closeSheets(); renderChatList(''); openChat(c.id); toast('Channel created');
}
/* ---- edit / invite / delete ---- */
let EG_WHO = 'all';
function openEditGroup() {
    const c = upUser; if (!c || !c.kind) return;
    window.EG_PHOTO = c.photo || '';
    const img = $('eg-photo-img');
    if (c.photo) { img.src = c.photo; img.classList.remove('hidden'); $('eg-photo-icon').classList.add('hidden'); }
    else { img.classList.add('hidden'); $('eg-photo-icon').classList.remove('hidden'); }
    $('eg-photo').value = '';
    $('eg-name').value = c.name; $('eg-bio').value = c.bio || '';
    const pubRow = $('eg-user-row');
    if (c.kind === 'channel' && c.privacy === 'public') { pubRow.classList.remove('hidden'); $('eg-user').value = c.username || ''; }
    else pubRow.classList.add('hidden');
    egWho(c.whoCanSend || 'all');
    openSheet('sheet-edit-group');
}
function egWho(w) {
    EG_WHO = w;
    $('eg-w-all').className = 'seg-btn flex-1 py-2.5 rounded-[14px] text-[12px] font-extrabold ' + (w === 'all' ? 'bg-white shadow text-slate-900' : 'text-white/50');
    $('eg-w-admins').className = 'seg-btn flex-1 py-2.5 rounded-[14px] text-[12px] font-extrabold ' + (w === 'admins' ? 'bg-white shadow text-slate-900' : 'text-white/50');
}
function saveEditGroup() {
    const c = upUser; if (!c || !c.kind) return;
    c.name = $('eg-name').value.trim() || c.name;
    c.bio = $('eg-bio').value.trim();
    c.photo = window.EG_PHOTO || '';
    c.whoCanSend = EG_WHO;
    if (c.kind === 'channel' && c.privacy === 'public') {
        const u = $('eg-user').value.trim().toLowerCase().replace(/^@/, '');
        if (u !== c.username) {
            if (!validUsername(u)) { toast(I18N[LANG].user_invalid); return; }
            if (TAKEN_USERNAMES.includes(u)) { toast(I18N[LANG].user_taken); return; }
            TAKEN_USERNAMES = TAKEN_USERNAMES.filter(x => x !== c.username);
            TAKEN_USERNAMES.push(u); c.username = u;
        }
    }
    closeSheets(); renderChatList(''); openUserProfile(c.id, upReturn); toast('Saved');
}
function delGroup() {
    const c = upUser; if (!c || !c.kind) return;
    if (c.username) TAKEN_USERNAMES = TAKEN_USERNAMES.filter(x => x !== c.username);
    const ix = CHATS.findIndex(x => x.id === c.id); if (ix > -1) CHATS.splice(ix, 1);
    closeSheets(); renderChatList(''); backToChats(); toast('Deleted');
}
function copyInvite() { try { navigator.clipboard.writeText(upUser.inviteLink); } catch (e) {} toast(I18N[LANG].common_copy + ' ✓'); }
function regenInvite() { if (upUser && upUser.kind) { upUser.inviteLink = genInvite(); $('up-invite').textContent = upUser.inviteLink; toast('New invite link'); } }
function copyUpUsername() { if (upUser && upUser.username) { try { navigator.clipboard.writeText('@' + String(upUser.username).replace(/^@/, '')); } catch (e) {} toast('@' + String(upUser.username).replace(/^@/, '') + ' copied'); } }
/* demo group + channel */
CHATS.unshift(
    { id: 'c-news', kind: 'channel', name: 'Z Pass News', username: 'zpassnews', grad: 'from-[#66757F] to-[#2f3a41]', photo: '', online: false, unread: 1, privacy: 'public', whoCanSend: 'admins', bio: 'Official news & updates', members: ['sara', 'diyar'], inviteLink: genInvite(), socials: [{ domain: 'x.com', user: 'zpass' }], posts: [], messages: [{ side: 'in', text: 'Z Pass V13 is here! \uD83C\uDF89', time: '10:02' }] },
    { id: 'g-design', kind: 'group', name: 'Design Team', grad: 'from-emerald-500 to-teal-600', photo: '', online: false, unread: 0, privacy: 'private', whoCanSend: 'all', bio: 'UI/UX discussions', members: ['sara'], inviteLink: genInvite(), socials: [], posts: [], messages: [{ side: 'in', text: 'Sara: new mockups are ready \uD83C\uDFA8', time: '09:30' }] }
);
TAKEN_USERNAMES.push('zpassnews');


/* ═══════════ NEW MESSAGE / CONTACTS ═══════════ */
const DEMO_GRADS = ['from-violet-500 to-purple-700','from-blue-500 to-cyan-600','from-emerald-500 to-teal-600','from-amber-500 to-orange-600','from-pink-500 to-rose-600'];
function renderNewMsgList(q) {
    q = (q || '').toLowerCase();
    $('newmsg-list').innerHTML = CHATS.filter(c => !c.kind && c.id !== 'saved' && (c.name.toLowerCase().includes(q) || (c.username||'').toLowerCase().includes(q))).map(c =>
        '<button onclick="openChat(\'' + c.id + '\')" class="pressable w-full flex items-center space-x-3 p-2.5 rounded-[20px] hover:bg-white text-left">' +
        '<div class="w-[52px] h-[52px] rounded-[18px] overflow-hidden bg-gradient-to-br ' + c.grad + ' flex items-center justify-center text-white font-extrabold text-[18px]">' + avInner(c) + '</div>' +
        '<div class="flex-1 min-w-0"><div class="text-[14px] font-extrabold text-slate-900">' + c.name + '</div>' +
        '<div class="text-[11px] text-slate-400 font-medium">' + (c.username || '') + '</div></div></button>'
    ).join('') || '<div class="text-center text-[12px] text-slate-400 font-medium py-8">No contacts</div>';
}
function createContact() {
    const f = $('nct-first').value.trim(), l = $('nct-last').value.trim();
    const ph = $('nct-phone').value.replace(/\D/g, '');
    if (!f) { toast('First name required'); return; }
    if (ph.length < 7) { toast('Enter a valid phone'); return; }
    const id = 'u' + Date.now();
    CHATS.push({ id: id, name: (f + ' ' + l).trim(), username: '@user' + String(Date.now()).slice(-4),
        grad: DEMO_GRADS[Math.floor(Math.random() * DEMO_GRADS.length)], phone: $('nct-cc').value + ' ' + ph,
        online: false, unread: 0, bio: '', lastseen: 'last seen recently', socials: [], posts: [], messages: [] });
    $('nct-first').value = ''; $('nct-last').value = ''; $('nct-phone').value = '';
    renderNewMsgList(''); renderChatList(''); switchScreen('screen-newmsg'); toast('Contact created');
}
/* ═══════════ PICK MEMBERS ═══════════ */
let PICK_MODE = 'create', PICK_SEL = new Set(), PICK_RET = 'screen-members';
function openCreateGroup() { PICK_MODE = 'create'; PICK_SEL = new Set(); $('pick-search').value = ''; renderPickList(''); switchScreen('screen-pickmembers'); }
function renderPickList(q) {
    q = (q || '').toLowerCase();
    const exclude = PICK_MODE === 'add' && upUser ? [...(upUser.members || []), ...(upUser.admins || [])] : [];
    $('pick-list').innerHTML = CHATS.filter(c => !c.kind && c.id !== 'saved' && !exclude.includes(c.id) && (c.name.toLowerCase().includes(q) || (c.username||'').toLowerCase().includes(q))).map(c =>
        '<button onclick="pickToggle(\'' + c.id + '\')" class="pressable w-full flex items-center space-x-3 p-2.5 rounded-[20px] hover:bg-white text-left">' +
        '<div class="w-[52px] h-[52px] rounded-[18px] overflow-hidden bg-gradient-to-br ' + c.grad + ' flex items-center justify-center text-white font-extrabold text-[18px]">' + avInner(c) + '</div>' +
        '<div class="flex-1 min-w-0"><div class="text-[14px] font-extrabold text-slate-900">' + c.name + '</div>' +
        '<div class="text-[11px] text-slate-400 font-medium">' + (c.username || '') + '</div></div>' +
        '<span class="w-6 h-6 rounded-full ' + (PICK_SEL.has(c.id) ? 'bg-[#229ED9]' : 'bg-slate-200') + ' flex items-center justify-center shrink-0">' +
        (PICK_SEL.has(c.id) ? '<i class="fa-solid fa-check text-white text-[11px]"></i>' : '') + '</span></button>'
    ).join('');
}
function pickToggle(id) { PICK_SEL.has(id) ? PICK_SEL.delete(id) : PICK_SEL.add(id); renderPickList($('pick-search').value); }
function pickBack() {
    if (PICK_MODE === 'add') { if (PICK_RET === 'screen-userprofile') openUserProfile(upUser.id, upReturn); else switchScreen('screen-members'); }
    else switchScreen('screen-newmsg');
}
function pickDone() {
    if (PICK_MODE === 'add') {
        const c = upUser;
        [...PICK_SEL].forEach(id => { if (!c.members.includes(id) && !c.admins.includes(id)) c.members.push(id); });
        toast('Members added');
        if (PICK_RET === 'screen-userprofile') openUserProfile(upUser.id, upReturn);
        else { renderMembers(); switchScreen('screen-members'); }
    } else {
        window.GS_PHOTO = ''; $('gs-name').value = '';
        $('gs-photo-img').classList.add('hidden'); $('gs-photo-icon').classList.remove('hidden');
        curAD = 'off'; $('gs-ad-val').textContent = 'Off';
        switchScreen('screen-groupsetup');
    }
}
/* ═══════════ AUTO-DELETE ═══════════ */
let curAD = 'off';
const AD_OPTS = ['off','1 day','2 days','3 days','4 days','5 days','1 week','2 weeks','3 weeks','1 month','2 months','3 months','4 months','5 months','1 year'];
function renderADList() {
    $('ad-list').innerHTML = AD_OPTS.map(o =>
        '<button onclick="setAutoDelete(\'' + o + '\')" class="pressable w-full card-soft rounded-[20px] p-4 flex items-center space-x-3">' +
        '<span class="w-6 h-6 rounded-full border-[2.5px] ' + (curAD === o ? 'border-[#229ED9]' : 'border-slate-300') + ' flex items-center justify-center shrink-0">' +
        '<span class="w-3 h-3 rounded-full ' + (curAD === o ? 'bg-[#229ED9]' : 'bg-transparent') + '"></span></span>' +
        '<span class="text-[14px] font-extrabold text-slate-900">' + (o === 'off' ? 'Off' : o) + '</span></button>'
    ).join('');
}
function setAutoDelete(v) { curAD = v; $('gs-ad-val').textContent = v === 'off' ? 'Off' : v; switchScreen('screen-groupsetup'); }
function finishCreateGroup() {
    const name = $('gs-name').value.trim();
    if (!name) { toast('Enter a name'); return; }
    const g = { id: 'g' + Date.now(), kind: 'group', name: name, grad: 'from-emerald-500 to-teal-600',
        photo: window.GS_PHOTO || '', online: false, unread: 0, privacy: 'private', whoCanSend: 'all',
        bio: '', autoDelete: curAD, members: [...PICK_SEL], admins: [], perms: defaultPerms(),
        invites: [{ name: 'Main', link: genInvite(), expire: 'never', limit: 'unlimited', uses: 0 }],
        history: 'hidden', topics: false, reactions: 'all', welcome: false, socials: [], posts: [],
        messages: [{ side: 'in', text: 'Group created \uD83C\uDF89', time: chatTime() }] };
    g.inviteLink = g.invites[0].link;
    CHATS.unshift(g); renderChatList(''); openChat(g.id); toast('Group created');
}
/* ═══════════ CHANNEL SETUP + TYPE ═══════════ */
let CS_TYPE = 'private', CS_USER = '';
let CT_MODE = 'create', CT_ID = null, CT_INVITE = '', CT_FROM = 'screen-channelsetup';
function openCreateChannel() {
    window.CS_PHOTO = ''; CS_TYPE = 'private'; CS_USER = '';
    $('cs-name').value = ''; $('cs-desc').value = '';
    $('cs-photo-img').classList.add('hidden'); $('cs-photo-icon').classList.remove('hidden');
    $('cs-type-val').textContent = 'Private';
    switchScreen('screen-channelsetup');
}
function csGoType() { CT_MODE = 'create'; CT_ID = null; CT_FROM = 'screen-channelsetup'; ctFill('Channel Type', CS_TYPE, CS_USER, ''); switchScreen('screen-chantype'); }
function geOpenType() {
    const c = upUser; if (!c || !c.kind) return;
    CT_MODE = 'edit'; CT_ID = c.id; CT_FROM = c.kind === 'group' ? 'screen-groupedit' : 'screen-channeledit';
    ctFill(c.kind === 'group' ? 'Group Type' : 'Channel Type', c.privacy, c.username || '', c.inviteLink);
    switchScreen('screen-chantype');
}
function ctFill(title, type, username, invite) {
    $('chantype-title').textContent = title;
    CT_INVITE = invite || genInvite();
    $('ct-invite').textContent = CT_INVITE;
    $('ct-user').value = username || ''; $('ct-user-msg').textContent = '';
    ctSet(type);
}
function ctSet(t) {
    if (CT_MODE === 'create') CS_TYPE = t;
    else { const c = CHATS.find(x => x.id === CT_ID); if (c) c.privacy = t; }
    const pub = t === 'public';
    $('ct-r-priv').innerHTML = '<span class="w-3 h-3 rounded-full ' + (!pub ? 'bg-[#229ED9]' : 'bg-transparent') + '"></span>';
    $('ct-r-priv').className = 'w-6 h-6 rounded-full border-[2.5px] ' + (!pub ? 'border-[#229ED9]' : 'border-slate-300') + ' flex items-center justify-center shrink-0 mt-0.5';
    $('ct-r-pub').innerHTML = '<span class="w-3 h-3 rounded-full ' + (pub ? 'bg-[#229ED9]' : 'bg-transparent') + '"></span>';
    $('ct-r-pub').className = 'w-6 h-6 rounded-full border-[2.5px] ' + (pub ? 'border-[#229ED9]' : 'border-slate-300') + ' flex items-center justify-center shrink-0 mt-0.5';
    $('ct-priv-box').classList.toggle('hidden', pub);
    $('ct-pub-box').classList.toggle('hidden', !pub);
}
function ctCheckUser() {
    const inp = $('ct-user');
    const u = inp.value.trim().toLowerCase().replace(/^@/, ''); inp.value = u;
    const m = $('ct-user-msg');
    const cur = CT_MODE === 'edit' ? (CHATS.find(x => x.id === CT_ID) || {}).username : null;
    if (!u) { m.textContent = ''; return true; }
    if (!validUsername(u)) { m.textContent = I18N[LANG].user_invalid; m.className = 'text-[11px] font-bold h-4 px-1 text-red-500'; return false; }
    if (u !== cur && TAKEN_USERNAMES.includes(u)) { m.textContent = I18N[LANG].user_taken; m.className = 'text-[11px] font-bold h-4 px-1 text-red-500'; return false; }
    m.textContent = I18N[LANG].user_ok; m.className = 'text-[11px] font-bold h-4 px-1 text-emerald-600'; return true;
}
function ctCopy() { try { navigator.clipboard.writeText(CT_INVITE); } catch (e) {} toast(I18N[LANG].common_copy + ' ✓'); }
function ctManageInvites() { SUB_RET = 'screen-chantype'; renderInvites(); switchScreen('screen-invites'); }
function chantypeBack() {
    if (CT_MODE === 'edit') {
        const c = CHATS.find(x => x.id === CT_ID);
        if (c.privacy === 'public') {
            const u = $('ct-user').value.trim().toLowerCase().replace(/^@/, '');
            if (!validUsername(u)) { toast(I18N[LANG].user_invalid); return; }
            if (u !== c.username && TAKEN_USERNAMES.includes(u)) { toast(I18N[LANG].user_taken); return; }
            if (u !== c.username) { TAKEN_USERNAMES = TAKEN_USERNAMES.filter(x => x !== c.username); TAKEN_USERNAMES.push(u); c.username = u; }
        }
        c.inviteLink = CT_INVITE; if (c.invites && c.invites[0]) c.invites[0].link = CT_INVITE;
        if (CT_FROM === 'screen-groupedit') openGroupEdit(); else openChannelEdit();
    } else {
        CS_USER = $('ct-user').value.trim().toLowerCase().replace(/^@/, '');
        if (CS_TYPE === 'public' && !ctCheckUser()) return;
        $('cs-type-val').textContent = CS_TYPE === 'public' ? 'Public' : 'Private';
        switchScreen('screen-channelsetup');
    }
}
function finishCreateChannel() {
    const name = $('cs-name').value.trim();
    if (!name) { toast('Enter a name'); return; }
    if (CS_TYPE === 'public') {
        if (!validUsername(CS_USER)) { toast(I18N[LANG].user_invalid); return; }
        if (TAKEN_USERNAMES.includes(CS_USER)) { toast(I18N[LANG].user_taken); return; }
        TAKEN_USERNAMES.push(CS_USER);
    }
    const c = { id: 'c' + Date.now(), kind: 'channel', name: name, username: CS_TYPE === 'public' ? CS_USER : '',
        grad: 'from-[#66757F] to-[#2f3a41]', photo: window.CS_PHOTO || '', online: false, unread: 0,
        privacy: CS_TYPE, whoCanSend: 'admins', bio: $('cs-desc').value.trim(), autoDelete: 'off',
        members: [], admins: [], perms: defaultPerms(),
        invites: [{ name: 'Main', link: genInvite(), expire: 'never', limit: 'unlimited', uses: 0 }],
        history: 'hidden', sign: true, socials: [], posts: [],
        messages: [{ side: 'in', text: 'Channel created \uD83D\uDCE2', time: chatTime() }] };
    c.inviteLink = c.invites[0].link;
    CHATS.unshift(c); renderChatList(''); openChat(c.id); toast('Channel created');
}
/* ═══════════ GROUP / CHANNEL EDIT ═══════════ */
function defaultPerms() { return { messages: true, media: true, stickers: true, polls: true, addusers: true, pin: true, info: false }; }
function fixGroup(c) {
    if (!c || !c.kind) return;
    c.members = c.members || []; c.admins = c.admins || []; c.perms = c.perms || defaultPerms();
    c.invites = c.invites || [{ name: 'Main', link: c.inviteLink || genInvite(), expire: 'never', limit: 'unlimited', uses: 0 }];
    c.inviteLink = c.invites[0].link;
}
let SUB_RET = 'screen-groupedit';
function goEditScreen(c) { switchScreen(c.kind === 'group' ? 'screen-groupedit' : 'screen-channeledit'); }
function openGroupEdit() {
    const c = upUser; if (!c || c.kind !== 'group') return; fixGroup(c);
    const img = $('ge-photo-img');
    if (c.photo) { img.src = c.photo; img.classList.remove('hidden'); $('ge-photo-letter').classList.add('hidden'); }
    else { img.classList.add('hidden'); $('ge-photo-letter').classList.remove('hidden'); $('ge-photo-letter').textContent = c.name[0]; }
    window.GE_PHOTO = c.photo || ''; $('ge-photo').value = '';
    $('ge-name').value = c.name; $('ge-desc').value = c.bio || '';
    $('ge-type-val').textContent = c.privacy === 'public' ? 'Public' : 'Private';
    $('ge-history-val').textContent = c.history === 'visible' ? 'Visible' : 'Hidden';
    $('ge-topics-t').classList.toggle('on', !!c.topics);
    $('ge-reactions-val').textContent = { all: 'All', some: 'Some', off: 'Off' }[c.reactions || 'all'];
    $('ge-welcome-t').classList.toggle('on', !!c.welcome);
    $('ge-welcome-val').textContent = c.welcome ? 'On' : 'Off';
    const pc = Object.values(c.perms).filter(Boolean).length;
    $('ge-perms-val').textContent = pc + '/' + PERM_DEFS.length;
    $('ge-invites-val').textContent = c.invites.length;
    $('ge-admins-val').textContent = c.admins.length + 1;
    $('ge-members-val').textContent = c.members.length + 1;
    switchScreen('screen-groupedit');
}
function openChannelEdit() {
    const c = upUser; if (!c || c.kind !== 'channel') return; fixGroup(c);
    const img = $('ce-photo-img');
    if (c.photo) { img.src = c.photo; img.classList.remove('hidden'); $('ce-photo-letter').classList.add('hidden'); }
    else { img.classList.add('hidden'); $('ce-photo-letter').classList.remove('hidden'); $('ce-photo-letter').textContent = c.name[0]; }
    window.CE_PHOTO = c.photo || ''; $('ce-photo').value = '';
    $('ce-name').value = c.name; $('ce-desc').value = c.bio || '';
    $('ce-type-val').textContent = c.privacy === 'public' ? 'Public' : 'Private';
    $('ce-sign-t').classList.toggle('on', c.sign !== false);
    $('ce-invites-val').textContent = c.invites.length;
    $('ce-admins-val').textContent = c.admins.length + 1;
    $('ce-members-val').textContent = c.members.length + 1;
    switchScreen('screen-channeledit');
}
function openEditGroup() { if (upUser && upUser.kind === 'group') openGroupEdit(); else if (upUser) openChannelEdit(); }
function geBack() { openUserProfile(upUser.id, upReturn); }
function ceBack() { openUserProfile(upUser.id, upReturn); }
function geSave() {
    const c = upUser;
    c.name = $('ge-name').value.trim() || c.name; c.bio = $('ge-desc').value.trim(); c.photo = window.GE_PHOTO || '';
    c.topics = $('ge-topics-t').classList.contains('on'); c.welcome = $('ge-welcome-t').classList.contains('on');
    renderChatList(''); geBack(); toast('Saved');
}
function ceSave() {
    const c = upUser;
    c.name = $('ce-name').value.trim() || c.name; c.bio = $('ce-desc').value.trim(); c.photo = window.CE_PHOTO || '';
    c.sign = $('ce-sign-t').classList.contains('on');
    renderChatList(''); ceBack(); toast('Saved');
}
function geCycleReactions() {
    const c = upUser; const order = ['all', 'some', 'off'];
    c.reactions = order[(order.indexOf(c.reactions || 'all') + 1) % 3];
    $('ge-reactions-val').textContent = { all: 'All', some: 'Some', off: 'Off' }[c.reactions];
}
function geWelcomeSync() { $('ge-welcome-val').textContent = $('ge-welcome-t').classList.contains('on') ? 'On' : 'Off'; }
function geOpenPerms() { SUB_RET = upUser.kind === 'group' ? 'screen-groupedit' : 'screen-channeledit'; PERM_ID = upUser.id; renderPerms(); switchScreen('screen-permissions'); }
function openInvites() { SUB_RET = upUser.kind === 'group' ? 'screen-groupedit' : 'screen-channeledit'; renderInvites(); switchScreen('screen-invites'); }
function openAdmins() { SUB_RET = upUser.kind === 'group' ? 'screen-groupedit' : 'screen-channeledit'; renderAdmins(); switchScreen('screen-admins'); }
function openMembers() { SUB_RET = upUser.kind === 'group' ? 'screen-groupedit' : 'screen-channeledit'; renderMembers(); switchScreen('screen-members'); }
/* ═══════════ INVITES ═══════════ */
function renderInvites() {
    const c = upUser; fixGroup(c);
    $('inv-list').innerHTML = c.invites.map((l, i) =>
        '<div class="card-soft rounded-[22px] p-4">' +
        '<div class="flex items-center justify-between mb-1"><span class="text-[13px] font-extrabold text-slate-900">' + l.name + '</span>' +
        '<button onclick="delInvite(' + i + ')" class="pressable w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center"><i class="fa-solid fa-trash text-red-500 text-[12px]"></i></button></div>' +
        '<div class="text-[12px] font-bold text-[#229ED9] truncate mb-1">' + l.link + '</div>' +
        '<div class="text-[10px] text-slate-400 font-medium mb-2.5">Expires: ' + l.expire + ' · Limit: ' + l.limit + ' · Used: ' + l.uses + '</div>' +
        '<button onclick="copyInviteLink(' + i + ')" class="pressable w-full bg-[#229ED9]/12 text-[#229ED9] py-2.5 rounded-2xl font-extrabold text-[12px]">' + I18N[LANG].common_copy + '</button></div>'
    ).join('');
}
function invBack() { switchScreen(SUB_RET); }
function copyInviteLink(i) { try { navigator.clipboard.writeText(upUser.invites[i].link); } catch (e) {} toast(I18N[LANG].common_copy + ' ✓'); }
function delInvite(i) { const c = upUser; if (c.invites.length <= 1) { toast('Keep at least one link'); return; } c.invites.splice(i, 1); c.inviteLink = c.invites[0].link; renderInvites(); }
let INL_EXP = 'never', INL_LIM = 'unlimited';
function renderInviteNew() {
    const exps = [['never', 'Never'], ['1 hour', '1 hour'], ['1 day', '1 day'], ['1 week', '1 week']];
    const lims = [['unlimited', 'Unlimited'], ['1', '1'], ['10', '10'], ['100', '100']];
    $('inl-expire').innerHTML = exps.map(e =>
        '<button onclick="INL_EXP=\'' + e[0] + '\';renderInviteNew()" class="pressable w-full flex items-center space-x-3 p-3 text-left">' +
        '<span class="w-6 h-6 rounded-full border-[2.5px] ' + (INL_EXP === e[0] ? 'border-[#229ED9]' : 'border-slate-300') + ' flex items-center justify-center shrink-0"><span class="w-3 h-3 rounded-full ' + (INL_EXP === e[0] ? 'bg-[#229ED9]' : 'bg-transparent') + '"></span></span>' +
        '<span class="text-[14px] font-extrabold text-slate-900">' + e[1] + '</span></button>' + (e[0] !== '1 week' ? '<div class="h-px bg-slate-900/5 mx-4"></div>' : '')
    ).join('');
    $('inl-limit').innerHTML = lims.map(e =>
        '<button onclick="INL_LIM=\'' + e[0] + '\';renderInviteNew()" class="pressable w-full flex items-center space-x-3 p-3 text-left">' +
        '<span class="w-6 h-6 rounded-full border-[2.5px] ' + (INL_LIM === e[0] ? 'border-[#229ED9]' : 'border-slate-300') + ' flex items-center justify-center shrink-0"><span class="w-3 h-3 rounded-full ' + (INL_LIM === e[0] ? 'bg-[#229ED9]' : 'bg-transparent') + '"></span></span>' +
        '<span class="text-[14px] font-extrabold text-slate-900">' + e[1] + '</span></button>' + (e[0] !== '100' ? '<div class="h-px bg-slate-900/5 mx-4"></div>' : '')
    ).join('');
}
function createInviteLink() {
    const c = upUser; fixGroup(c);
    const nm = $('inl-name').value.trim() || ('Link ' + (c.invites.length + 1));
    c.invites.push({ name: nm, link: genInvite(), expire: INL_EXP, limit: INL_LIM, uses: 0 });
    $('inl-name').value = ''; INL_EXP = 'never'; INL_LIM = 'unlimited';
    renderInvites(); switchScreen('screen-invites'); toast('Invite link created');
}
/* ═══════════ ADMINS ═══════════ */
function renderAdmins() {
    const c = upUser; fixGroup(c);
    const row = (id, name, grad, badge, onclick) =>
        '<button ' + (onclick ? 'onclick="' + onclick + '"' : '') + ' class="pressable w-full card-soft rounded-[20px] p-3 flex items-center space-x-3 text-left">' +
        '<div class="w-11 h-11 rounded-2xl overflow-hidden bg-gradient-to-br ' + grad + ' flex items-center justify-center text-white font-extrabold shrink-0">' + name[0] + '</div>' +
        '<div class="flex-1"><div class="text-[13px] font-extrabold text-slate-900">' + name + '</div>' +
        '<div class="text-[10px] font-bold text-violet-600">' + badge + '</div></div></button>';
    let h = row('me', (ME_USER.name + ' (You)'), 'from-[#66757F] to-[#2f3a41]', 'Owner', '');
    h += c.admins.map(id => {
        const u = CHATS.find(x => x.id === id);
        return u ? row(id, u.name, u.grad, 'Admin — tap to remove', 'demoteAdmin(\'' + id + '\')') : '';
    }).join('');
    $('adm-list').innerHTML = h;
}
function admBack() { switchScreen(SUB_RET); }
function demoteAdmin(id) { const c = upUser; c.admins = c.admins.filter(x => x !== id); if (!c.members.includes(id)) c.members.push(id); renderAdmins(); toast('Admin removed'); }
function renderAddAdmin(q) {
    q = (q || '').toLowerCase();
    const c = upUser;
    $('addadmin-list').innerHTML = CHATS.filter(x => !x.kind && x.id !== 'me' && !c.admins.includes(x.id) && ((x.name.toLowerCase().includes(q)) || ((x.username || '').toLowerCase().includes(q)))).map(x =>
        '<button onclick="makeAdmin(\'' + x.id + '\')" class="pressable w-full card-soft rounded-[20px] p-3 flex items-center space-x-3 text-left">' +
        '<div class="w-11 h-11 rounded-2xl overflow-hidden bg-gradient-to-br ' + x.grad + ' flex items-center justify-center text-white font-extrabold shrink-0">' + x.name[0] + '</div>' +
        '<div class="flex-1"><div class="text-[13px] font-extrabold text-slate-900">' + x.name + '</div>' +
        '<div class="text-[10px] text-slate-400 font-medium">' + (x.username || '') + '</div></div>' +
        '<i class="fa-solid fa-plus text-[#229ED9]"></i></button>'
    ).join('') || '<div class="text-center text-[12px] text-slate-400 font-medium py-8">No users found</div>';
}
function makeAdmin(id) {
    const c = upUser;
    c.members = c.members.filter(x => x !== id);
    if (!c.admins.includes(id)) c.admins.push(id);
    renderAdmins(); switchScreen('screen-admins'); toast('Admin added');
}
/* ═══════════ PERMISSIONS ═══════════ */
const PERM_DEFS = [['messages', 'Send Messages', 'fa-message'], ['media', 'Send Media', 'fa-photo-film'], ['stickers', 'Stickers & GIFs', 'fa-face-smile'], ['polls', 'Send Polls', 'fa-square-poll-vertical'], ['addusers', 'Add Users', 'fa-user-plus'], ['pin', 'Pin Messages', 'fa-thumbtack'], ['info', 'Change Group Info', 'fa-pen']];
let PERM_ID = null;
function renderPerms() {
    const c = CHATS.find(x => x.id === PERM_ID); if (!c) return; fixGroup(c);
    $('pm-list').innerHTML = PERM_DEFS.map((p, i) =>
        '<div class="flex items-center space-x-3 p-3.5">' +
        '<div class="w-10 h-10 rounded-2xl bg-slate-500/10 flex items-center justify-center shrink-0"><i class="fa-solid ' + p[2] + ' text-slate-500 text-[14px]"></i></div>' +
        '<div class="flex-1 text-[14px] font-extrabold text-slate-900">' + p[1] + '</div>' +
        '<div class="toggle ' + (c.perms[p[0]] ? 'on' : '') + '" onclick="permToggle(\'' + p[0] + '\')"></div></div>' +
        (i < PERM_DEFS.length - 1 ? '<div class="h-px bg-slate-900/5 mx-4"></div>' : '')
    ).join('');
    const n = Object.values(c.perms).filter(Boolean).length;
    $('pm-count').textContent = n + '/' + PERM_DEFS.length;
}
function permToggle(k) { const c = CHATS.find(x => x.id === PERM_ID); c.perms[k] = !c.perms[k]; renderPerms(); }
function permBack() { switchScreen(SUB_RET); }
/* ═══════════ MEMBERS ═══════════ */
function renderMembers() {
    const c = upUser; fixGroup(c);
    const urow = (id, name, grad, sub, badge, onclick) =>
        '<button ' + (onclick ? 'onclick="' + onclick + '"' : '') + ' class="pressable w-full card-soft rounded-[20px] p-3 flex items-center space-x-3 text-left">' +
        '<div class="w-11 h-11 rounded-2xl overflow-hidden bg-gradient-to-br ' + grad + ' flex items-center justify-center text-white font-extrabold shrink-0">' + avInner({ name: name, grad: grad, photo: (CHATS.find(x => x.id === id) || {}).photo }) + '</div>' +
        '<div class="flex-1"><div class="text-[13px] font-extrabold text-slate-900">' + name + '</div>' +
        '<div class="text-[10px] text-slate-400 font-medium">' + sub + '</div></div>' +
        (badge ? '<span class="text-[9px] font-extrabold text-violet-600 bg-violet-500/10 px-2.5 py-1 rounded-full">' + badge + '</span>' : '') + '</button>';
    let h = urow('me', (ME_USER.name + ' (You)'), 'from-[#66757F] to-[#2f3a41]', 'online', 'Owner', '');
    c.admins.forEach(id => { const u = CHATS.find(x => x.id === id); if (u) h += urow(id, u.name, u.grad, u.username || '', 'Admin', 'removeMember(\'' + id + '\')'); });
    c.members.forEach(id => { const u = CHATS.find(x => x.id === id); if (u) h += urow(id, u.name, u.grad, u.username || '', '', 'removeMember(\'' + id + '\')'); });
    $('mem-list').innerHTML = h;
    $('mem-count').textContent = (c.members.length + c.admins.length + 1) + ' members';
}
function memBack() { switchScreen(SUB_RET); }
function memAddMode() { PICK_MODE = 'add'; PICK_SEL = new Set(); $('pick-search').value = ''; renderPickList(''); switchScreen('screen-pickmembers'); }
function removeMember(id) {
    const c = upUser;
    c.members = c.members.filter(x => x !== id); c.admins = c.admins.filter(x => x !== id);
    renderMembers(); toast('Member removed');
}
/* ═══════════ CHAT HISTORY ═══════════ */
function setHistory(v) {
    upUser.history = v;
    const vis = v === 'visible';
    $('hist-r-vis').innerHTML = '<span class="w-3 h-3 rounded-full ' + (vis ? 'bg-[#229ED9]' : 'bg-transparent') + '"></span>';
    $('hist-r-vis').className = 'w-6 h-6 rounded-full border-[2.5px] ' + (vis ? 'border-[#229ED9]' : 'border-slate-300') + ' flex items-center justify-center shrink-0 mt-0.5';
    $('hist-r-hid').innerHTML = '<span class="w-3 h-3 rounded-full ' + (!vis ? 'bg-[#229ED9]' : 'bg-transparent') + '"></span>';
    $('hist-r-hid').className = 'w-6 h-6 rounded-full border-[2.5px] ' + (!vis ? 'border-[#229ED9]' : 'border-slate-300') + ' flex items-center justify-center shrink-0 mt-0.5';
    switchScreen(SUB_RET);
}
function histBack() { switchScreen(SUB_RET); }
function histFill() {
    const v = (upUser && upUser.history) || 'hidden';
    const vis = v === 'visible';
    $('hist-r-vis').innerHTML = '<span class="w-3 h-3 rounded-full ' + (vis ? 'bg-[#229ED9]' : 'bg-transparent') + '"></span>';
    $('hist-r-vis').className = 'w-6 h-6 rounded-full border-[2.5px] ' + (vis ? 'border-[#229ED9]' : 'border-slate-300') + ' flex items-center justify-center shrink-0 mt-0.5';
    $('hist-r-hid').innerHTML = '<span class="w-3 h-3 rounded-full ' + (!vis ? 'bg-[#229ED9]' : 'bg-transparent') + '"></span>';
    $('hist-r-hid').className = 'w-6 h-6 rounded-full border-[2.5px] ' + (!vis ? 'border-[#229ED9]' : 'border-slate-300') + ' flex items-center justify-center shrink-0 mt-0.5';
}
/* ═══════════ NOTIF / PRIVACY / DEVICES ═══════════ */
let NTF = {
    cats: {
        private:   { on: true, exc: 25, keywords: '', topics: [] },
        groups:    { on: true, exc: 34, keywords: '', topics: [] },
        channels:  { on: true, exc: 12 },
        stories:   { on: true, exc: 5 },
        reactions: { on: true }
    },
    ai: false, digest: false,
    vibrate: 'Default', ringtone: 'Default', badge: true,
    previews: true, sound: 'Default',
    more: false, freq: '2 / 3 minutes', priority: 'Same as in Settings', popup: true
};
let NTF_DETAIL = 'groups';
const NTF_CATS = [
    ['private', 'fa-user', 'nt_private'],
    ['groups', 'fa-user-group', 'nt_groups'],
    ['channels', 'fa-bullhorn', 'nt_channels'],
    ['stories', 'fa-circle-play', 'nt_stories'],
    ['reactions', 'fa-heart', 'nt_reactions']
];
function ntSec(t) { return '<div class="text-[12px] font-extrabold text-[#229ED9] tracking-wide mb-2 px-1">' + t + '</div>'; }
function ntCard(inner) { return '<div class="card-soft rounded-[24px] p-2 mb-5">' + inner + '</div>'; }
function ntToggle(on, fn) {
    return '<div class="toggle ' + (on ? 'on' : '') + '" onclick="event.stopPropagation();' + fn + '"></div>';
}
function ntRow(o) {
    return '<div onclick="' + (o.tap || '') + '" class="pressable w-full flex items-center space-x-3 p-3 ' + (o.tap ? '' : '') + ' text-left">' +
        (o.icon ? '<div class="w-10 h-10 rounded-2xl bg-[#229ED9]/12 flex items-center justify-center shrink-0"><i class="fa-solid ' + o.icon + ' text-[#229ED9] text-[14px]"></i></div>' : '') +
        '<div class="flex-1 min-w-0"><div class="text-[14px] font-extrabold text-slate-900">' + o.title + '</div>' +
        (o.sub ? '<div class="text-[11px] text-slate-400 font-medium truncate">' + o.sub + '</div>' : '') + '</div>' +
        (o.toggle ? ntToggle(o.on, o.onToggle) : '') +
        (o.value ? '<span class="text-[13px] font-bold text-[#229ED9] shrink-0">' + o.value + '</span>' : '') +
        (o.chev ? '<i class="fa-solid fa-chevron-down text-slate-300 text-[12px] shrink-0"></i>' : '') +
        '</div>';
}
function ntDiv(i, n) { return i < n - 1 ? '<div class="h-px bg-slate-900/5 mx-4"></div>' : ''; }
function ntOnOff(on) { const T = I18N[LANG]; return on ? T.nt_on : T.nt_off; }
function renderNotifMain() {
    const T = I18N[LANG];
    let h = ntSec(T.nt_chats_content);
    h += ntCard(NTF_CATS.map((c, i) => {
        const k = NTF.cats[c[0]];
        const sub = ntOnOff(k.on) + (k.exc ? ', ' + k.exc + ' ' + T.nt_exceptions : '');
        return ntRow({ icon: c[1], title: T[c[2]], sub: sub, toggle: true, on: k.on, onToggle: "NTF.cats['" + c[0] + "'].on=!NTF.cats['" + c[0] + "'].on;renderNotifMain()", tap: "openNotifDetail('" + c[0] + "')" }) + ntDiv(i, NTF_CATS.length);
    }).join(''));
    h += ntSec(T.nt_smart);
    h += ntCard(
        ntRow({ title: T.nt_ai, sub: T.nt_ai_d, toggle: true, on: NTF.ai, onToggle: 'NTF.ai=!NTF.ai;renderNotifMain()' }) + ntDiv(0, 2) +
        ntRow({ title: T.nt_digest, sub: T.nt_digest_d, toggle: true, on: NTF.digest, onToggle: 'NTF.digest=!NTF.digest;renderNotifMain();' + (true ? '' : '') })
    );
    h += ntSec(T.nt_calls);
    h += ntCard(
        ntRow({ title: T.nt_vibrate, value: T['nt_' + NTF.vibrate.toLowerCase()] || NTF.vibrate, tap: "ntCycle('vibrate')" }) + ntDiv(0, 2) +
        ntRow({ title: T.nt_ringtone, value: T['nt_' + NTF.ringtone.toLowerCase()] || NTF.ringtone, tap: "ntCycle('ringtone')" })
    );
    h += ntSec(T.nt_badge);
    h += ntCard(ntRow({ title: T.nt_badge_d, toggle: true, on: NTF.badge, onToggle: 'NTF.badge=!NTF.badge;renderNotifMain()' }));
    $('notif-main').innerHTML = h;
}
function ntCycle(k) {
    const opts = ['Default', 'Short', 'Long', 'Disabled'];
    NTF[k] = opts[(opts.indexOf(NTF[k]) + 1) % opts.length];
    renderNotifMain();
}
function openNotifDetail(cat) {
    NTF_DETAIL = cat;
    renderNotifDetail();
    switchScreen('screen-notif-detail');
}
function notifDetailBack() { renderNotifMain(); switchScreen('screen-notif'); }
function ntDetailTitle() {
    const T = I18N[LANG];
    const f = NTF_CATS.find(c => c[0] === NTF_DETAIL);
    return T.nt_title + ' - ' + (f ? T[f[2]] : '');
}
function renderNotifDetail() {
    const T = I18N[LANG];
    const k = NTF.cats[NTF_DETAIL];
    $('notif-detail-title').textContent = ntDetailTitle();
    let h = ntSec(T.nt_notify_about);
    let rows = [ntRow({ title: T.nt_new_msg, toggle: true, on: k.on, onToggle: "NTF.cats['" + NTF_DETAIL + "'].on=!NTF.cats['" + NTF_DETAIL + "'].on;renderNotifDetail()" })];
    if (NTF_DETAIL === 'private' || NTF_DETAIL === 'groups') {
        rows.push(ntDiv(0, 2) + ntRow({ title: T.nt_keywords, sub: k.keywords || T.nt_keywords_d, tap: 'openNtKw()' }));
    }
    if (NTF_DETAIL === 'groups') {
        rows.push(ntDiv(0, 2) + ntRow({ title: T.nt_topics, sub: (k.topics && k.topics.length ? k.topics.join(', ') : T.nt_topics_d), tap: 'openNtTopic()' }));
    }
    h += ntCard(rows.join(''));
    h += ntSec(T.nt_settings);
    let srows = ntRow({ title: T.nt_previews, toggle: true, on: NTF.previews, onToggle: 'NTF.previews=!NTF.previews;renderNotifDetail()' }) + ntDiv(0, 2) +
        ntRow({ title: T.nt_sound, value: NTF.sound, tap: "ntCycle2('sound')" }) + ntDiv(0, 2) +
        ntRow({ title: T.nt_more, tap: 'NTF.more=!NTF.more;renderNotifDetail()', chev: true });
    if (NTF.more) {
        srows += ntDiv(0, 2) + ntRow({ title: T.nt_vibrate, value: NTF.vibrate, tap: "ntCycle('vibrate');renderNotifDetail()" }) + ntDiv(0, 2) +
            ntRow({ title: T.nt_freq, value: NTF.freq, tap: "ntCycle2('freq')" }) + ntDiv(0, 2) +
            ntRow({ title: T.nt_priority, value: NTF.priority, tap: "ntCycle2('priority')" }) + ntDiv(0, 2) +
            ntRow({ title: T.nt_popup, toggle: true, on: NTF.popup, onToggle: 'NTF.popup=!NTF.popup;renderNotifDetail()' });
    }
    h += ntCard(srows);
    const muted = CHATS.filter(c => c.muted && !c.kind);
    h += ntCard(
        ntRow({ icon: 'fa-user-plus', title: T.nt_add_exception, tap: 'openNtException()' }) +
        muted.map((c, i) => ntDiv(0, 2) + ntRow({
            title: c.name, sub: T.up_mute,
            icon: null, tap: "toggleMute('" + c.id + "');renderNotifDetail()",
            toggle: false
        })).join('') +
        (muted.length ? ntDiv(0, 2) + '<button onclick="CHATS.forEach(c=>c.muted=false);renderChatList(\'\');renderNotifDetail()" class="pressable w-full text-center text-[13px] font-bold text-red-500 py-3">' + T.nt_del_exceptions + '</button>' : '')
    );
    $('notif-detail').innerHTML = h;
}
function ntCycle2(k) {
    const opts = { sound: ['Default', 'Short', 'Long', 'Disabled'], freq: ['2 / 3 minutes', '5 minutes', 'Never'], priority: ['Same as in Settings', 'High', 'Low'] };
    const o = opts[k];
    NTF[k] = o[(o.indexOf(NTF[k]) + 1) % o.length];
    renderNotifDetail();
}
function openNtException() {
    const list = CHATS.filter(c => !c.kind && c.id !== 'saved');
    $('sheet-generic-title').textContent = I18N[LANG].nt_add_exception;
    $('sheet-generic-list').innerHTML = list.map(c =>
        '<button onclick="toggleMute(\'' + c.id + '\');renderChatList(\'\');renderNotifDetail();openNtException()" class="pressable w-full flex items-center space-x-3 p-2.5 rounded-[20px] hover:bg-slate-50 text-left">' +
        '<div class="w-11 h-11 rounded-2xl overflow-hidden bg-gradient-to-br ' + c.grad + ' flex items-center justify-center text-white font-extrabold shrink-0">' + avInner(c) + '</div>' +
        '<div class="flex-1 min-w-0"><div class="text-[13px] font-extrabold text-slate-900 truncate">' + c.name + '</div>' +
        '<div class="text-[11px] text-slate-400 font-medium">' + (c.muted ? I18N[LANG].up_mute : I18N[LANG].up_unmute) + '</div></div>' +
        (c.muted ? '<i class="fa-solid fa-volume-xmark text-slate-300"></i>' : '') + '</button>'
    ).join('');
    openSheet('sheet-generic');
}
/* keywords dialog */
function openNtKw() { $('nt-kw-input').value = NTF.cats[NTF_DETAIL].keywords || ''; $('nt-kw-ov').classList.remove('hidden'); setTimeout(() => $('nt-kw-input').focus(), 200); }
function closeNtKw() { $('nt-kw-ov').classList.add('hidden'); }
function saveNtKw() {
    NTF.cats[NTF_DETAIL].keywords = $('nt-kw-input').value.trim();
    closeNtKw(); renderNotifDetail(); toast(I18N[LANG].nt_added_kw);
}
/* topics dialog */
const NT_TOPICS = ['News', 'Deals', 'Events', 'Sports', 'Jobs', 'Finance', 'Travel', 'Entertainment', 'Tech', 'Education'];
let NT_TOPIC_SEL = [];
function openNtTopic() {
    NT_TOPIC_SEL = (NTF.cats[NTF_DETAIL].topics || []).slice();
    renderNtTopics();
    $('nt-topic-ov').classList.remove('hidden');
}
function closeNtTopic() { $('nt-topic-ov').classList.add('hidden'); }
function renderNtTopics() {
    $('nt-topic-list').innerHTML = NT_TOPICS.map((t, i) =>
        '<button onclick="NT_TOPIC_SEL=' + JSON.stringify(NT_TOPICS) + ';toggleNtTopic(' + i + ')" class="pressable flex items-center space-x-2.5 p-2.5 rounded-2xl hover:bg-slate-50 text-left">' +
        '<span class="w-6 h-6 rounded-lg border-2 ' + (NT_TOPIC_SEL.includes(t) ? 'bg-[#229ED9] border-[#229ED9]' : 'border-slate-300') + ' flex items-center justify-center shrink-0">' +
        (NT_TOPIC_SEL.includes(t) ? '<i class="fa-solid fa-check text-white text-[12px]"></i>' : '') + '</span>' +
        '<span class="text-[13px] font-bold text-slate-800">' + t + '</span></button>'
    ).join('');
}
function toggleNtTopic(i) {
    const t = NT_TOPICS[i];
    const x = NT_TOPIC_SEL.indexOf(t);
    if (x >= 0) NT_TOPIC_SEL.splice(x, 1); else NT_TOPIC_SEL.push(t);
    renderNtTopics();
}
function saveNtTopic() {
    NTF.cats[NTF_DETAIL].topics = NT_TOPIC_SEL.slice();
    closeNtTopic(); renderNotifDetail(); toast(I18N[LANG].nt_added_topics);
}
let PRIV = { seen: 0, phone: 0, photo: 0 };
const PRIV_OPTS = ['Everybody', 'My contacts', 'Nobody'];
const PRIV_DEFS = [['seen', 'Last seen'], ['phone', 'Phone number'], ['photo', 'Profile photo']];
function renderPrivacy() {
    $('priv-list').innerHTML = PRIV_DEFS.map((d, i) =>
        '<button onclick="PRIV.' + d[0] + '=(PRIV.' + d[0] + '+1)%3;renderPrivacy()" class="pressable w-full flex items-center space-x-3 p-3.5 text-left">' +
        '<div class="flex-1 text-[14px] font-extrabold text-slate-900">' + d[1] + '</div>' +
        '<span class="text-[13px] font-bold text-[#229ED9]">' + PRIV_OPTS[PRIV[d[0]]] + '</span></button>' +
        (i < PRIV_DEFS.length - 1 ? '<div class="h-px bg-slate-900/5 mx-4"></div>' : '')
    ).join('');
}
let DEVICES = [
    { name: 'This device · Android', loc: 'Istanbul · now', active: true },
    { name: 'Chrome · Windows', loc: 'Ankara · 2d ago', active: false }
];
function renderDevices() {
    $('dev-list').innerHTML = DEVICES.map((d, i) =>
        '<div class="card-soft rounded-[22px] p-4 flex items-center space-x-3">' +
        '<div class="w-11 h-11 rounded-2xl bg-slate-500/10 flex items-center justify-center shrink-0"><i class="fa-solid ' + (d.active ? 'fa-mobile-screen' : 'fa-laptop') + ' text-slate-500"></i></div>' +
        '<div class="flex-1"><div class="text-[13px] font-extrabold text-slate-900">' + d.name + '</div>' +
        '<div class="text-[10px] text-slate-400 font-medium">' + d.loc + '</div></div>' +
        (d.active ? '<span class="text-[9px] font-extrabold text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-full">ACTIVE</span>'
                  : '<button onclick="termDevice(' + i + ')" class="pressable text-[11px] font-extrabold text-red-500">Terminate</button>') + '</div>'
    ).join('');
}
function termDevice(i) { DEVICES.splice(i, 1); renderDevices(); toast('Session terminated'); }
function linkDevice() { DEVICES.push({ name: 'New device · Android', loc: 'just now', active: false }); renderDevices(); toast('Device linked'); }
/* ═══════════ GROUP PROFILE EXTRAS ═══════════ */
function leaveGroup() { toast('You left the group'); backToChats(); }
function renderUpMembers() {
    const c = upUser; if (!c || !c.kind) return; fixGroup(c);
    const all = [{ id: 'me', name: (ME_USER.name + ' (You)'), grad: 'from-[#66757F] to-[#2f3a41]', badge: 'Owner' }]
        .concat(c.admins.map(id => { const u = CHATS.find(x => x.id === id); return u ? { id, name: u.name, grad: u.grad, badge: 'Admin' } : null; }).filter(Boolean))
        .concat(c.members.map(id => { const u = CHATS.find(x => x.id === id); return u ? { id, name: u.name, grad: u.grad, badge: '' } : null; }).filter(Boolean));
    $('up-members-list').innerHTML = all.map(m =>
        '<div class="flex items-center space-x-3">' +
        '<div class="w-9 h-9 rounded-xl overflow-hidden bg-gradient-to-br ' + m.grad + ' flex items-center justify-center text-white font-extrabold text-[13px] shrink-0">' + m.name[0] + '</div>' +
        '<span class="flex-1 text-[13px] font-bold text-white/85">' + m.name + '</span>' +
        (m.badge ? '<span class="text-[9px] font-extrabold text-violet-300 bg-violet-500/15 px-2.5 py-1 rounded-full">' + m.badge + '</span>' : '') + '</div>'
    ).join('');
}

/* ═══════════ FOLDERS ═══════════ */
let FOLDERS = [{ id: 'all', name: 'All' }, { id: 'unread', name: 'Unread' }];
let activeFolder = 'all';
function renderFolderTabs() {
    const unreadN = CHATS.filter(c => c.unread > 0 && !ARCHIVED.includes(c.id)).length;
    $('folder-tabs').innerHTML = FOLDERS.map(f => {
        const n = f.id === 'unread' && unreadN ? ' <span class="opacity-70">' + unreadN + '</span>' : '';
        const on = activeFolder === f.id;
        return '<button onclick="setFolder(\'' + f.id + '\')" class="pressable shrink-0 px-4 py-2 rounded-full text-[12px] font-extrabold ' +
            (on ? 'bg-[#229ED9]/15 text-[#229ED9]' : 'bg-slate-500/10 text-slate-500') + '">' + f.name + n + '</button>';
    }).join('') + '<button onclick="openSheet(\'sheet-new-folder\')" class="pressable shrink-0 w-9 h-9 rounded-full bg-slate-500/10 text-slate-500 flex items-center justify-center"><i class="fa-solid fa-plus text-[12px]"></i></button>';
}
function setFolder(id) { activeFolder = id; renderFolderTabs(); renderChatList($('chats-search') ? $('chats-search').value : ''); }
function createFolder() {
    const n = $('nf-name').value.trim();
    if (!n) { toast('Enter a name'); return; }
    FOLDERS.push({ id: 'f' + Date.now(), name: n });
    $('nf-name').value = ''; closeSheets(); renderFolderTabs(); toast('Folder created');
}
/* ═══════════ ARCHIVE ═══════════ */
let ARCHIVED = [], archiveHidden = false;
function archiveChat(id) { if (!ARCHIVED.includes(id)) ARCHIVED.push(id); renderChatList(''); renderFolderTabs(); toast(I18N[LANG].archive + ' ✓'); }
function unarchiveChat(id) { ARCHIVED = ARCHIVED.filter(x => x !== id); renderChatList(''); renderFolderTabs(); renderArchive(); toast(I18N[LANG].unarchive + ' ✓'); }
function hideArchive() { archiveHidden = true; renderChatList(''); backToChats(); }
function renderArchive() {
    $('archive-list').innerHTML = ARCHIVED.map(id => {
        const c = CHATS.find(x => x.id === id); if (!c) return '';
        return chatRowHTML(c);
    }).join('') || '<div class="text-center text-[12px] text-slate-400 font-medium py-10">' + I18N[LANG].no_archived + '</div>';
}
/* ═══════════ LONG-PRESS ACTIONS ═══════════ */
let LP_ID = null;
function openChatActions(id) {
    const c = CHATS.find(x => x.id === id); if (!c) return;
    LP_ID = id; suppressTap = true;
    $('chat-actions-head').innerHTML =
        '<div class="w-11 h-11 rounded-2xl overflow-hidden bg-gradient-to-br ' + c.grad + ' flex items-center justify-center text-white font-extrabold shrink-0">' + (c.icon ? '<i class="fa-solid ' + c.icon + '"></i>' : avInner(c)) + '</div>' +
        '<div class="flex-1 min-w-0"><div class="text-[15px] font-extrabold text-slate-900 truncate">' + c.name + '</div>' +
        (c.username ? '<div class="text-[11px] text-slate-400 font-medium">@' + String(c.username).replace(/^@/, '') + '</div>' : '') + '</div>';
    const isA = ARCHIVED.includes(id);
    const isG = !!c.kind;
    const rows = [];
    if (id !== 'saved') rows.push([isA ? 'fa-box-open' : 'fa-box-archive', isA ? I18N[LANG].unarchive : I18N[LANG].archive, 'doArchive(\'' + id + '\')', '']);
    rows.push(['fa-thumbtack', c.pinned ? I18N[LANG].unpin : I18N[LANG].pin, 'togglePin(\'' + id + '\')', '']);
    rows.push([c.muted ? 'fa-volume-high' : 'fa-volume-xmark', c.muted ? I18N[LANG].up_unmute : I18N[LANG].up_mute, 'toggleMute(\'' + id + '\')', '']);
    rows.push(['fa-envelope' + (c.unread ? '-open' : ''), c.unread ? I18N[LANG].mark_read : I18N[LANG].mark_unread, 'markRead(\'' + id + '\',' + (!c.unread) + ')', '']);
    if (id !== 'saved') rows.push(['fa-folder', I18N[LANG].add_to_folder, 'openFolderPick(\'' + id + '\')', '']);
    if (!isG && id !== 'saved') rows.push(['fa-hand', c.blocked ? I18N[LANG].unblock_user : I18N[LANG].block_user, 'toggleBlock(\'' + id + '\')', '']);
    rows.push(['fa-broom', I18N[LANG].clear_history, 'clearHistory(\'' + id + '\')', '']);
    rows.push(['fa-trash', I18N[LANG].delete_group, 'deleteChat(\'' + id + '\')', 'text-red-500']);
    $('chat-actions-body').innerHTML = rows.map(r =>
        '<button onclick="closeSheets();' + r[2] + '" class="pressable w-full flex items-center space-x-4 p-3.5 ' + r[3] + '">' +
        '<i class="fa-solid ' + r[0] + ' text-slate-500 w-6 text-center ' + r[3] + '"></i>' +
        '<span class="text-[14px] font-bold">' + r[1] + '</span></button>'
    ).join('');
    openSheet('sheet-chat-actions');
}
function doArchive(id) { ARCHIVED.includes(id) ? unarchiveChat(id) : archiveChat(id); }
function togglePin(id) { const c = CHATS.find(x => x.id === id); c.pinned = !c.pinned; renderChatList($('chats-search') ? $('chats-search').value : ''); toast((c.pinned ? I18N[LANG].pin : I18N[LANG].unpin) + ' \u2713'); }
function markRead(id, unread) { const c = CHATS.find(x => x.id === id); c.unread = unread ? 1 : 0; renderChatList(''); renderFolderTabs(); }
function toggleBlock(id) { const c = CHATS.find(x => x.id === id); c.blocked = !c.blocked; toast((c.blocked ? I18N[LANG].block_user : I18N[LANG].unblock_user) + ' \u2713'); }
function clearHistory(id) { const c = CHATS.find(x => x.id === id); if (c) c.messages = []; renderChatList(''); toast(I18N[LANG].clear_history + ' \u2713'); }
function toggleMute(id) { const c = CHATS.find(x => x.id === id); c.muted = !c.muted; renderChatList(''); }
function deleteChat(id) {
    const ix = CHATS.findIndex(x => x.id === id);
    if (ix > -1) {
        const c = CHATS[ix];
        if (c.username) TAKEN_USERNAMES = TAKEN_USERNAMES.filter(x => x !== String(c.username).replace(/^@/, ''));
        CHATS.splice(ix, 1);
    }
    ARCHIVED = ARCHIVED.filter(x => x !== id);
    renderChatList(''); renderFolderTabs(); renderArchive(); toast(I18N[LANG].delete_group + ' ✓');
}
function openFolderPick(id) {
    LP_ID = id;
    const c = CHATS.find(x => x.id === id);
    $('folder-pick-list').innerHTML = FOLDERS.filter(f => f.id !== 'all' && f.id !== 'unread').map(f => {
        const has = (c.folders || []).includes(f.id);
        return '<button onclick="toggleFolderChat(\'' + f.id + '\')" class="pressable w-full card-soft rounded-2xl p-4 flex items-center space-x-3 text-left">' +
        '<i class="fa-solid fa-folder text-[#229ED9]"></i>' +
        '<span class="flex-1 text-[13px] font-extrabold text-slate-900">' + f.name + '</span>' +
        (has ? '<i class="fa-solid fa-check text-[#229ED9]"></i>' : '') + '</button>';
    }).join('') || '<div class="text-center text-[12px] text-slate-400 font-medium py-4">No folders yet — tap + on Chats</div>';
    openSheet('sheet-folder-pick');
}
function toggleFolderChat(fid) {
    const c = CHATS.find(x => x.id === LP_ID); if (!c) return;
    c.folders = c.folders || [];
    c.folders.includes(fid) ? c.folders = c.folders.filter(x => x !== fid) : c.folders.push(fid);
    openFolderPick(LP_ID); renderChatList('');
}
function bindLongPress(el) {
    let t = null, sx = 0, sy = 0;
    el.addEventListener('touchstart', e => {
        const row = e.target.closest('[data-cid]'); if (!row) return;
        sx = e.touches[0].clientX; sy = e.touches[0].clientY;
        t = setTimeout(() => { t = null; openChatActions(row.getAttribute('data-cid')); }, 550);
    }, { passive: true });
    el.addEventListener('touchmove', e => {
        if (!t) return;
        if (Math.hypot(e.touches[0].clientX - sx, e.touches[0].clientY - sy) > 12) { clearTimeout(t); t = null; }
    }, { passive: true });
    el.addEventListener('touchend', () => { if (t) { clearTimeout(t); t = null; } });
    el.addEventListener('contextmenu', e => {
        e.preventDefault();
        const row = e.target.closest('[data-cid]');
        if (row) openChatActions(row.getAttribute('data-cid'));
    });
}
/* ═══════════ PULL-DOWN FOR ARCHIVE ═══════════ */
function initPull() {
    const wrap = $('chat-list-wrap'), list = $('chat-list'), bar = $('pull-bar');
    let sy = null;
    wrap.addEventListener('touchstart', e => { if (list.scrollTop <= 0) sy = e.touches[0].clientY; }, { passive: true });
    wrap.addEventListener('touchmove', e => {
        if (sy === null) return;
        const dy = e.touches[0].clientY - sy;
        if (dy > 0) {
            e.preventDefault();
            const h = Math.min(dy, 90);
            bar.style.height = h + 'px';
            const rel = dy > 65;
            bar.querySelector('span').textContent = rel ? I18N[LANG].release_archive : I18N[LANG].pull_archive;
            bar.classList.toggle('text-[#229ED9]', rel);
            bar.classList.toggle('text-slate-400', !rel);
        }
    }, { passive: false });
    wrap.addEventListener('touchend', () => {
        const h = parseInt(bar.style.height || '0');
        bar.style.height = '0px'; sy = null;
        if (h > 65) {
            if (ARCHIVED.length) { archiveHidden = false; renderArchive(); switchScreen('screen-archive'); }
            else toast(I18N[LANG].no_archived);
        }
    });
}
/* ═══════════ STORIES ═══════════ */
let STORIES = [
    { user: 'sara', grad: 'from-violet-500 to-purple-700', text: 'New artwork \uD83C\uDFA8' },
    { user: 'diyar', grad: 'from-blue-500 to-cyan-600', text: 'Good morning \u2600\uFE0F' },
    { user: 'c-news', grad: 'from-[#66757F] to-[#2f3a41]', text: 'Z Pass V16 is here \uD83C\uDF89' }
];
function renderStories() {
    const me = '<button onclick="toast(\'Camera - demo\')" class="flex flex-col items-center shrink-0">' +
        '<span class="relative w-14 h-14 rounded-full bg-slate-200 flex items-center justify-center">' +
        '<span class="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-[#66757F] to-[#2f3a41] flex items-center justify-center text-white font-extrabold">' + (ME_USER.photo ? '<img src="' + ME_USER.photo + '" class="w-full h-full object-cover">' : 'T') + '</span>' +
        '<span class="absolute bottom-0 right-0 w-5 h-5 bg-[#229ED9] rounded-full border-2 border-[#f4f4f1] flex items-center justify-center"><i class="fa-solid fa-plus text-white text-[9px]"></i></span></span>' +
        '<span class="text-[10px] font-bold text-slate-500 mt-1">' + I18N[LANG].my_story + '</span></button>';
    $('stories-row').innerHTML = me + STORIES.map((st, i) => {
        const u = CHATS.find(x => x.id === st.user);
        const pic = u && u.photo ? '<img src="' + u.photo + '" class="w-full h-full object-cover">' : (u ? u.name[0] : '?');
        return '<button onclick="openStory(' + i + ')" class="flex flex-col items-center shrink-0">' +
        '<span class="w-14 h-14 rounded-full p-[2.5px] bg-gradient-to-tr from-amber-400 via-pink-500 to-violet-600">' +
        '<span class="w-full h-full rounded-full overflow-hidden bg-gradient-to-br ' + st.grad + ' flex items-center justify-center text-white font-extrabold border-2 border-[#f4f4f1]">' + pic + '</span></span>' +
        '<span class="text-[10px] font-bold text-slate-500 mt-1">' + (u ? u.name.split(' ')[0] : '') + '</span></button>';
    }).join('');
}
let storyTimer = null;
function openStory(i) {
    const st = STORIES[i]; if (!st) return;
    $('story-bg').className = 'absolute inset-0 bg-gradient-to-br ' + st.grad;
    $('story-content').innerHTML = '<div class="text-[34px] mb-3">' + st.text + '</div><div class="text-[13px] text-white/70 font-bold">Z Pass Stories</div>';
    $('story-viewer').classList.remove('hidden');
    const pr = $('story-prog');
    pr.style.transition = 'none'; pr.style.width = '0%';
    void pr.offsetWidth;
    pr.style.transition = 'width 5s linear'; pr.style.width = '100%';
    clearTimeout(storyTimer);
    storyTimer = setTimeout(() => { const n = STORIES[i + 1]; if (n) openStory(i + 1); else closeStory(); }, 5100);
}
function closeStory() { clearTimeout(storyTimer); $('story-viewer').classList.add('hidden'); }

/* ═══════════ DRAWER ═══════════ */
function openDrawer() {
    const ov = $('drawer-ov');
    ov.classList.remove('hidden');
    requestAnimationFrame(() => { requestAnimationFrame(() => { ov.style.opacity = '1'; }); });
    $('drawer').style.transform = 'translateX(0)';
}
function closeDrawer() {
    $('drawer-ov').style.opacity = '0';
    $('drawer').style.transform = 'translateX(-106%)';
    setTimeout(() => $('drawer-ov').classList.add('hidden'), 320);
}
function drawerGo(screen) {
    closeDrawer();
    if (screen === 'cards') { drawerGoCard(); return; }
    const map = { home:0, vault:1, chats:2, auth:3, secure:4 };
    const scr = { home:'screen-home', vault:'screen-vault', chats:'screen-chats', auth:'screen-auth', secure:'screen-secure' }[screen];
    const tabs = document.querySelectorAll('.dock-tab');
    if (tabs[map[screen]]) dockGo(scr, tabs[map[screen]]); else switchScreen(scr);
}
function drawerGoCard() {
    const tabs = document.querySelectorAll('.dock-tab');
    if (tabs[1]) dockGo('screen-vault', tabs[1]); else switchScreen('screen-vault');
    vaultTab('cards');
}
function drawerMyProfile() { closeDrawer(); openUserProfile('me', 'screen-home'); }
function drawerLogout() { closeDrawer(); try { parent.postMessage({ type: 'zpass-signout' }, location.origin); } catch (e) {} }
let darkMode = false;
function toggleDark() {
    darkMode = !darkMode;
    $('phone').classList.toggle('dark', darkMode);
    $('dark-sw').classList.toggle('bg-[#229ED9]', darkMode);
    $('dark-sw').classList.toggle('bg-slate-300', !darkMode);
    $('dark-knob').style.left = darkMode ? '22px' : '2px';
}
/* ═══════════ PASSWORD GENERATOR ═══════════ */
function pwgen() {
    let cs = '';
    if ($('pw-upper').checked) cs += 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    if ($('pw-lower').checked) cs += 'abcdefghijkmnopqrstuvwxyz';
    if ($('pw-digits').checked) cs += '23456789';
    if ($('pw-symbols').checked) cs += '!@#$%^&*()-_=+[]{}';
    if (!cs) cs = 'abcdefghijkmnopqrstuvwxyz';
    const n = parseInt($('pwgen-len').value || '16');
    let r = ''; const arr = new Uint32Array(n); crypto.getRandomValues(arr);
    for (let i = 0; i < n; i++) r += cs[arr[i] % cs.length];
    $('pwgen-out').textContent = r;
}
function pwgenCopy() { navigator.clipboard.writeText($('pwgen-out').textContent); toast(I18N[LANG].pw_copied); }
/* ═══════════ SAVED ARCHIVE ═══════════ */
function openSaved() { openChat('saved'); }
function upSetPhoto(input) {
    const f = input.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => { ME_USER.photo = r.result; syncMeUI(); openUserProfile('me', upReturn); toast('OK'); };
    r.readAsDataURL(f);
}
function setBanner(input) {
    const f = input.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => { const img = $('up-banner-img'); img.src = r.result; img.classList.remove('hidden'); };
    r.readAsDataURL(f);
}

/* ═══════════ CHANNEL / GROUP VIEW ═══════════ */
function myRoleOf(c) { return c.myRole || 'owner'; }
function canSend(c) {
    if (!c || !c.kind) return true;
    const admin = myRoleOf(c) === 'owner' || myRoleOf(c) === 'admin';
    if (c.kind === 'channel') return admin;
    return c.whoCanSend === 'admins' ? admin : true;
}
function toggleChannelMute() {
    const c = CHATS.find(x => x.id === currentChat); if (!c) return;
    c.muted = !c.muted;
    $('channel-mute-btn').textContent = c.muted ? I18N[LANG].up_unmute : I18N[LANG].up_mute;
    renderChatList($('chats-search') ? $('chats-search').value : '');
    toast(c.muted ? I18N[LANG].up_mute : I18N[LANG].up_unmute);
}
function setMyRoleSilent(r) {
    ['owner', 'admin', 'member'].forEach(x => {
        const b = $('role-' + x);
        b.className = 'pressable py-2.5 rounded-xl text-[12px] font-extrabold ' + (x === r ? 'bg-[#229ED9] text-white' : 'bg-white/10 text-white/60');
    });
}
function setMyRole(r) {
    if (!upUser) return;
    upUser.myRole = r;
    setMyRoleSilent(r);
    toast('Role: ' + r);
}
/* ═══════════ IN-CHAT SEARCH ═══════════ */
let CHS_Q = '', CHS_RES = [], CHS_I = -1;
function hlText(t, q, cur) {
    let html = '', rest = t, restLow = t.toLowerCase(), i;
    while ((i = restLow.indexOf(q)) >= 0) {
        html += rest.slice(0, i) + '<mark class="' + (cur ? 'bg-orange-500 text-white' : 'bg-amber-300') + ' rounded px-0.5">' + rest.slice(i, i + q.length) + '</mark>';
        rest = rest.slice(i + q.length); restLow = rest.toLowerCase();
    }
    return html + rest;
}
function renderMessagesHl() {
    const c = CHATS.find(x => x.id === currentChat); if (!c) return;
    const box = $('chat-messages');
    box.innerHTML = '<div class="text-center"><span class="text-[10px] font-bold text-slate-500 bg-white/70 border border-slate-900/10 rounded-full px-3 py-1">' + I18N[LANG].chat_today + '</span></div>';
    c.messages.forEach((m, i) => {
        const isHl = CHS_Q && (m.text || '').toLowerCase().includes(CHS_Q);
        const w = bubbleEl(m, isHl ? CHS_Q : '', isHl && CHS_RES[CHS_I] === i);
        w.setAttribute('data-mi', i);
        box.appendChild(w);
    });
}
function openChannelSearch() {
    $('channel-bar').classList.add('hidden');
    $('chsearch-wrap').classList.remove('hidden');
    $('chsearch-input').value = ''; CHS_Q = ''; CHS_RES = []; CHS_I = -1;
    updateChCount();
    setTimeout(() => $('chsearch-input').focus(), 120);
}
function closeChannelSearch(silent) {
    $('chsearch-wrap').classList.add('hidden');
    CHS_Q = ''; CHS_RES = []; CHS_I = -1;
    const c = CHATS.find(x => x.id === currentChat);
    if (c && !canSend(c)) $('channel-bar').classList.remove('hidden');
    if (!silent) renderMessages(false);
}
function chClearSearch() { $('chsearch-input').value = ''; chSearch(''); $('chsearch-input').focus(); }
function chSearch(q) {
    CHS_Q = (q || '').trim().toLowerCase(); CHS_RES = []; CHS_I = -1;
    const c = CHATS.find(x => x.id === currentChat);
    if (CHS_Q && c) c.messages.forEach((m, i) => { if ((m.text || '').toLowerCase().includes(CHS_Q)) CHS_RES.push(i); });
    if (CHS_RES.length) CHS_I = 0;
    renderMessagesHl(); updateChCount();
    if (CHS_I >= 0) scrollToMsg(CHS_RES[CHS_I]);
}
function updateChCount() {
    $('chsearch-count').textContent = CHS_RES.length ? ((CHS_I + 1) + ' of ' + CHS_RES.length) : I18N[LANG].ch_no_results;
}
function chNav(d) {
    if (!CHS_RES.length) return;
    CHS_I = (CHS_I + d + CHS_RES.length) % CHS_RES.length;
    renderMessagesHl(); updateChCount(); scrollToMsg(CHS_RES[CHS_I]);
}
function scrollToMsg(i) {
    const el = document.querySelector('[data-mi="' + i + '"]');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
function chShowList() {
    if (!CHS_RES.length) { toast(I18N[LANG].ch_no_results); return; }
    const c = CHATS.find(x => x.id === currentChat);
    $('chsearch-list').innerHTML = CHS_RES.map((mi, n) => {
        const m = c.messages[mi];
        return '<button onclick="chJump(' + n + ')" class="pressable w-full card-soft rounded-2xl p-3.5 text-left">' +
        '<div class="text-[13px] font-medium text-slate-800">' + hlText(m.text || '', CHS_Q, false) + '</div>' +
        '<div class="text-[10px] text-slate-400 font-medium mt-1">' + m.time + '</div></button>';
    }).join('');
    openSheet('sheet-chsearch-list');
}
function chJump(n) { closeSheets(); CHS_I = n; renderMessagesHl(); updateChCount(); scrollToMsg(CHS_RES[CHS_I]); }

/* ═══════════ EDIT PROFILE ═══════════ */
let EP_RET = 'screen-profile';
const MONTHS_L = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_S = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function escAttr(t) { return String(t || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'); }
function openEditProfile(ret) { EP_RET = ret || 'screen-profile'; renderEditProfile(); switchScreen('screen-editprofile'); }
function epBack() { if (EP_RET === 'screen-userprofile') openUserProfile('me', 'screen-profile'); else switchScreen(EP_RET || 'screen-profile'); }
function renderEditProfile() {
    const m = ME_USER;
    $('ep-name-val').textContent = m.name;
    $('ep-username-val').textContent = '@' + String(m.username).replace(/^@/, '');
    $('ep-phone-val').textContent = m.phone || '\u2014';
    $('ep-email-val').textContent = maskEmail(m.email);
    const eb = $('ep-bio');
    if (m.bio) { eb.textContent = m.bio; eb.classList.remove('text-[#229ED9]'); eb.classList.add('text-slate-500'); }
    else { eb.textContent = I18N[LANG].bio_add; eb.classList.remove('text-slate-500'); eb.classList.add('text-[#229ED9]'); }
    $('ep-bio-count').textContent = 70 - (m.bio || '').length;
    const pc = m.personalChannel ? CHATS.find(x => x.id === m.personalChannel) : null;
    $('ep-channel-val').textContent = pc ? pc.name : I18N[LANG].ep_none;
    $('ep-bday-val').textContent = m.birthday ? bdayStr(m.birthday) : '\u2014';
    $('ep-avatar').innerHTML = m.photo ? '<img src="' + m.photo + '" class="w-full h-full object-cover">' : escAttr(m.name.slice(0, 1).toUpperCase());
}
function epSetPhoto(input) {
    const f = input.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => { ME_USER.photo = r.result; renderEditProfile(); toast('\u2713'); };
    r.readAsDataURL(f);
}
function syncMeUI() {
    $('drawer-name').textContent = ME_USER.name;
    $('drawer-username').textContent = '@' + String(ME_USER.username).replace(/^@/, '');
    const sn = $('set-name'); if (sn) sn.textContent = ME_USER.name;
    const initial = ME_USER.name.slice(0, 1).toUpperCase();
    const dav = $('drawer-av');
    if (dav) dav.innerHTML = ME_USER.photo ? '<img src="' + ME_USER.photo + '" class="w-full h-full object-cover">' : initial;
    const hav = $('home-av');
    if (hav) hav.innerHTML = ME_USER.photo ? '<img src="' + ME_USER.photo + '" class="w-full h-full object-cover">' : initial;
    const sav = $('set-av');
    if (sav) sav.innerHTML = ME_USER.photo ? '<img src="' + ME_USER.photo + '" class="w-full h-full object-cover">' : initial;
    if (typeof renderStories === 'function') renderStories();
}
function bdayStr(b) { return MONTHS_S[b.m - 1] + ' ' + b.d + ', ' + b.y; }
function bdayAge(b) { const t = new Date(); let a = t.getFullYear() - b.y; const m = t.getMonth() + 1; if (m < b.m || (m === b.m && t.getDate() < b.d)) a--; return a; }
/* ---- dialogs ---- */
function dlgFoot(saveFn, removeFn) {
    const T = I18N[LANG];
    return '<div class="flex items-center ' + (removeFn ? 'justify-between' : 'justify-end space-x-7') + ' mt-2">' +
        (removeFn ? '<button onclick="' + removeFn + '" class="text-[#229ED9] text-[14px] font-bold">' + T.dlg_remove + '</button><span class="flex space-x-7">' : '') +
        '<button onclick="closeDlg()" class="text-[#229ED9] text-[14px] font-bold">' + T.dlg_cancel + '</button>' +
        '<button onclick="' + saveFn + '" class="text-[#229ED9] text-[14px] font-bold">' + T.dlg_save + '</button>' +
        (removeFn ? '</span>' : '') + '</div>';
}
function openDlg(kind) {
    const T = I18N[LANG], box = $('dlg-box'), m = ME_USER;
    if (kind === 'name') {
        box.innerHTML = '<div class="text-[17px] font-extrabold text-slate-900 mb-5">' + T.ep_edit_name + '</div>' +
            '<div class="text-[12px] font-bold text-[#229ED9] mb-1">' + T.dlg_first + '</div>' +
            '<input id="dlg-first" value="' + escAttr(m.firstName) + '" class="w-full border-b-2 border-[#229ED9] text-[15px] font-medium pb-1.5 mb-5 outline-none bg-transparent">' +
            '<div class="text-[12px] font-bold text-slate-400 mb-1">' + T.dlg_last + '</div>' +
            '<input id="dlg-last" value="' + escAttr(m.lastName) + '" class="w-full border-b border-slate-200 text-[15px] font-medium pb-1.5 mb-6 outline-none bg-transparent">' +
            dlgFoot("dlgSave('name')");
    } else if (kind === 'username') {
        box.innerHTML = '<div class="text-[17px] font-extrabold text-slate-900 mb-4">' + T.ep_username + '</div>' +
            '<div class="text-[12px] font-bold text-[#229ED9] mb-1">@username</div>' +
            '<input id="dlg-username" value="' + escAttr(String(m.username).replace(/^@/, '')) + '" class="w-full border-b-2 border-[#229ED9] text-[15px] font-medium pb-1.5 mb-4 outline-none bg-transparent">' +
            '<div class="text-[12px] text-slate-400 leading-snug mb-1">You can use a-z, 0-9 and underscores.<br>5–32 characters.</div>' +
            '<div class="mb-5"></div>' + dlgFoot("dlgSave('username')");
    } else if (kind === 'phone') {
        box.innerHTML = '<div class="text-[17px] font-extrabold text-slate-900 mb-4">' + T.ep_phone + '</div>' +
            '<div class="text-[12px] font-bold text-[#229ED9] mb-1">11 digits</div>' +
            '<input id="dlg-phone" inputmode="numeric" value="' + escAttr(m.phone) + '" placeholder="5XXXXXXXXXX" class="w-full border-b-2 border-[#229ED9] text-[15px] font-medium pb-1.5 mb-6 outline-none bg-transparent">' +
            dlgFoot("dlgSave('phone')");
    } else if (kind === 'email') {
        openEmailChange(); return;
    } else if (kind === 'bio') {
        box.innerHTML = '<div class="text-[17px] font-extrabold text-slate-900 mb-4">' + T.ep_bio + '</div>' +
            '<textarea id="dlg-bio" rows="3" maxlength="70" oninput="document.getElementById(\'dlg-bio-c\').textContent=70-this.value.length" class="w-full border-b-2 border-[#229ED9] text-[15px] font-medium pb-1.5 mb-1 outline-none bg-transparent resize-none">' + escAttr(m.bio) + '</textarea>' +
            '<div class="text-right text-[11px] font-bold text-slate-400 mb-5"><span id="dlg-bio-c">' + (70 - (m.bio || '').length) + '</span></div>' +
            dlgFoot("dlgSave('bio')");
    } else if (kind === 'birthday') {
        const b = m.birthday || { d: 1, m: 1, y: 2000 };
        const days = []; for (let d = 1; d <= 31; d++) days.push(d);
        const years = []; for (let y = 2026; y >= 1900; y--) years.push(y);
        const col = (id, items, fmt) =>
            '<div class="flex-1"><div id="wh-' + id + '" class="h-[132px] overflow-y-auto no-scrollbar" style="scroll-snap-type:y mandatory">' +
            '<div class="h-11 shrink-0"></div>' +
            items.map(v => '<div class="h-11 flex items-center justify-center text-[15px] font-medium text-slate-700 shrink-0" style="scroll-snap-align:center" data-v="' + v + '">' + fmt(v) + '</div>').join('') +
            '<div class="h-11 shrink-0"></div></div></div>';
        box.innerHTML = '<div class="text-[17px] font-extrabold text-slate-900 mb-6">' + T.ep_birthday + '</div>' +
            '<div class="relative flex mb-6">' +
            '<div class="absolute left-0 right-0 top-1/2 -translate-y-1/2 pointer-events-none"><div class="border-t-2 border-[#229ED9]/50"></div><div class="h-11"></div><div class="border-b-2 border-[#229ED9]/50"></div></div>' +
            col('d', days, v => v) + col('m', MONTHS_L, (v, i) => v) + col('y', years, v => v) +
            '</div>' + dlgFoot("dlgSave('birthday')", 'dlgRemoveBday()');
        setTimeout(() => {
            const set = (id, v, items) => { const el = $('wh-' + id); el.scrollTop = Math.max(0, items.indexOf(v)) * 44; };
            set('d', b.d, days); set('m', MONTHS_L[b.m - 1], MONTHS_L); set('y', b.y, years);
        }, 60);
    }
    const ov = $('dlg-ov'); ov.classList.remove('hidden'); ov.classList.add('flex');
}
function closeDlg() { const ov = $('dlg-ov'); ov.classList.add('hidden'); ov.classList.remove('flex'); }
function wheelVal(id, items) {
    const el = $('wh-' + id); if (!el) return items[0];
    const i = Math.round(el.scrollTop / 44);
    return items[Math.min(Math.max(i, 0), items.length - 1)];
}
function dlgSave(kind) {
    const m = ME_USER;
    if (kind === 'name') {
        m.firstName = $('dlg-first').value.trim(); m.lastName = $('dlg-last').value.trim();
        m.name = (m.firstName + ' ' + m.lastName).trim() || 'Tom';
    } else if (kind === 'username') {
        const u = $('dlg-username').value.trim().toLowerCase();
        if (!/^[a-z0-9_]{5,32}$/.test(u)) { toast('a-z, 0-9, _ · 5-32'); return; }
        m.username = '@' + u;
    } else if (kind === 'phone') {
        const ph = $('dlg-phone').value.replace(/\D/g, '');
        if (ph && ph.length !== 11) { toast('11 digits'); return; }
        m.phone = ph;
    } else if (kind === 'email') {
        const em = $('dlg-email').value.trim().toLowerCase();
        if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { toast('Valid email'); return; }
        if (em !== (m.email || '').toLowerCase()) { zpChangeEmail(em); m.email = em; }
    } else if (kind === 'bio') {
        m.bio = $('dlg-bio').value.trim();
    } else if (kind === 'birthday') {
        const days = []; for (let d = 1; d <= 31; d++) days.push(d);
        const years = []; for (let y = 2026; y >= 1900; y--) years.push(y);
        let d = wheelVal('d', days);
        const mo = MONTHS_L.indexOf(wheelVal('m', MONTHS_L)) + 1;
        const y = wheelVal('y', years);
        d = Math.min(d, new Date(y, mo, 0).getDate());
        m.birthday = { d: d, m: mo, y: y };
    }
    closeDlg(); renderEditProfile(); syncMeUI();
    if (upIsMe && !$('screen-userprofile').classList.contains('hidden')) openUserProfile('me', upReturn);
    toast('\u2713');
}
function dlgRemoveBday() { ME_USER.birthday = null; closeDlg(); renderEditProfile(); toast('\u2713'); }
/* ---- personal channel ---- */
function openPChannel() {
    const mine = CHATS.filter(c => c.kind === 'channel' && myRoleOf(c) === 'owner');
    $('pchannel-list').innerHTML = mine.map(c =>
        '<button onclick="setPChannel(\'' + c.id + '\')" class="pressable w-full flex items-center space-x-3 p-2.5 rounded-2xl hover:bg-slate-50 text-left">' +
        '<div class="w-11 h-11 rounded-2xl overflow-hidden bg-gradient-to-br ' + c.grad + ' flex items-center justify-center text-white font-extrabold shrink-0">' + avInner(c) + '</div>' +
        '<div class="flex-1 min-w-0"><div class="text-[13px] font-extrabold text-slate-900 truncate">' + c.name + '</div>' +
        '<div class="text-[11px] text-slate-400 font-medium">' + ((c.members || []).length + 1) + ' subscribers</div></div>' +
        (ME_USER.personalChannel === c.id ? '<i class="fa-solid fa-check text-[#229ED9]"></i>' : '') + '</button>'
    ).join('') || '<div class="text-center text-[12px] text-slate-400 font-medium py-6">No channels yet</div>';
    openSheet('sheet-pchannel');
}
function setPChannel(id) { ME_USER.personalChannel = id; closeSheets(); renderEditProfile(); }
function renderUpExtra() {
    const m = ME_USER;
    let h = '';
    const pc = m.personalChannel ? CHATS.find(x => x.id === m.personalChannel) : null;
    if (pc) {
        const subs = (pc.members || []).length + 1;
        h += '<div id="up-pc-card" class="bg-white/[.07] rounded-[20px] p-4 mb-3">' +
        '<div class="flex items-center space-x-2 mb-3"><span class="text-[13px] font-bold text-[#229ED9]">Channel</span>' +
        '<span class="text-[10px] font-extrabold text-[#229ED9] bg-[#229ED9]/15 px-2 py-0.5 rounded-full">' + subs + ' subscribers</span></div>' +
        '<button onclick="openChat(\'' + pc.id + '\')" class="pressable w-full flex items-center space-x-3 text-left">' +
        '<div class="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br ' + pc.grad + ' flex items-center justify-center text-white font-extrabold shrink-0">' + avInner(pc) + '</div>' +
        '<div class="flex-1 min-w-0"><div class="text-[15px] font-bold text-white truncate">' + pc.name + '</div>' +
        '<div class="text-[12px] text-white/40 font-medium truncate">' + (pc.inviteLink || '') + '</div></div></button></div>';
    }
    if (m.phone) h += '<div id="up-phone-row" class="bg-white/[.07] rounded-[20px] p-4 mb-3">' +
        '<div class="text-[15px] font-bold text-white">' + escAttr(m.phone) + '</div>' +
        '<div class="text-[11px] text-white/40 font-medium mt-0.5">Mobile</div></div>';
    if (m.birthday) h += '<div class="bg-white/[.07] rounded-[20px] p-4 mb-3 flex items-center space-x-3.5">' +
        '<span class="w-11 h-11 rounded-2xl bg-pink-500/15 flex items-center justify-center shrink-0"><i class="fa-solid fa-cake-candles text-pink-400 text-[16px]"></i></span>' +
        '<div class="flex-1"><div class="text-[15px] font-bold text-white">' + bdayStr(m.birthday) + '</div>' +
        '<div class="text-[11px] text-white/40 font-medium mt-0.5">Birthday \u00B7 <span class="text-[#229ED9] font-bold">' + bdayAge(m.birthday) + ' years old</span></div></div></div>';
    $('up-extra').innerHTML = h;
    bindMeRows();
}

/* ═══════════ PHOTO VIEWER ═══════════ */
function openPhoto(src, name, sub) {
    if (!src) return;
    $('photo-view-img').src = src;
    $('photo-view-name').textContent = name || '';
    $('photo-view-sub').textContent = sub || '';
    const v = $('photo-viewer'); v.classList.remove('hidden'); v.classList.add('flex');
}
function closePhoto() { const v = $('photo-viewer'); v.classList.add('hidden'); v.classList.remove('flex'); }

/* ═══════════ CALL SCREEN ═══════════ */
let CALL = null, CALL_FROM_PROFILE = false;
function startCall(kind, chatId) {
    const id = chatId || currentChat;
    const c = CHATS.find(x => x.id === id);
    if (!c || c.kind) { toast('demo'); return; }
    CALL_FROM_PROFILE = !!(chatId && chatId !== currentChat);
    CALL = { id: id, kind: kind, muted: false, videoOn: kind === 'video', sec: 0, connected: false, route: 'earpiece', timerId: null };
    renderCall();
    $('call-status').textContent = I18N[LANG].call_calling;
    switchScreen('screen-call');
    setTimeout(() => {
        if (!CALL || CALL.id !== id) return;
        CALL.connected = true;
        $('call-status').textContent = '00:00';
        callTimerStart();
    }, 2000);
}
function renderCall() {
    if (!CALL) return;
    const c = CHATS.find(x => x.id === CALL.id); if (!c) return;
    $('call-name').textContent = c.name;
    $('call-avatar').innerHTML = avInner(c);
    $('call-remote-av').innerHTML = avInner(c);
    $('call-video-wrap').classList.toggle('hidden', !CALL.videoOn);
    $('call-avatar-wrap').classList.toggle('hidden', CALL.videoOn);
    const mb = $('call-mute-btn');
    mb.className = 'pressable w-16 h-16 rounded-full flex items-center justify-center ' + (CALL.muted ? 'bg-white text-slate-900' : 'bg-white/10 text-white');
    mb.innerHTML = '<i class="fa-solid ' + (CALL.muted ? 'fa-microphone-slash' : 'fa-microphone') + ' text-[18px]"></i>';
    const vb = $('call-video-btn');
    vb.className = 'pressable w-16 h-16 rounded-full flex items-center justify-center ' + (CALL.videoOn ? 'bg-white text-slate-900' : 'bg-white/10 text-white');
    vb.innerHTML = '<i class="fa-solid fa-video text-[18px]"></i>';
    $('call-audio-icon').className = 'fa-solid text-white text-[18px] ' + (CALL.route === 'bt' ? 'fa-bluetooth-b' : CALL.route === 'speaker' ? 'fa-volume-high' : 'fa-ear-listen');
}
function callToggleMute() { if (!CALL) return; CALL.muted = !CALL.muted; renderCall(); }
function callToggleVideo() { if (!CALL) return; CALL.videoOn = !CALL.videoOn; renderCall(); }
function openAudioRoute() {
    if (!CALL) return;
    const T = I18N[LANG];
    const routes = [
        { id: 'earpiece', icon: 'fa-ear-listen', label: T.route_earpiece },
        { id: 'speaker', icon: 'fa-volume-high', label: T.route_speaker },
        { id: 'bt', icon: 'fa-bluetooth-b', label: T.route_bt }
    ];
    $('audio-list').innerHTML = routes.map(r =>
        '<button onclick="setAudioRoute(\'' + r.id + '\')" class="pressable w-full flex items-center space-x-3.5 p-3 rounded-[20px] hover:bg-slate-50 text-left">' +
        '<span class="w-11 h-11 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0"><i class="fa-solid ' + r.icon + ' text-slate-700 text-[16px]"></i></span>' +
        '<span class="flex-1 text-[14px] font-bold text-slate-900">' + r.label + '</span>' +
        (CALL.route === r.id ? '<i class="fa-solid fa-check text-[#229ED9]"></i>' : '') + '</button>'
    ).join('');
    openSheet('sheet-audio');
}
function setAudioRoute(id) { if (CALL) CALL.route = id; closeSheets(); renderCall(); }
let INCOMING = null, INCOMING_TIMER = null;
function simulateIncomingCall(chatId, delaySec) {
    const c = CHATS.find(x => x.id === (chatId || currentChat));
    if (!c || c.kind) return;
    if (INCOMING_TIMER) clearTimeout(INCOMING_TIMER);
    toast('\uD83D\uDCDE ' + I18N[LANG].incoming_call + ' ' + delaySec + 's...');
    INCOMING_TIMER = setTimeout(() => showIncomingCall(c.id), (delaySec || 5) * 1000);
}
function showIncomingCall(chatId) {
    if (CALL) return;
    const c = CHATS.find(x => x.id === chatId); if (!c) return;
    if (INCOMING) clearTimeout(INCOMING.timer);
    INCOMING = { id: chatId, timer: setTimeout(missIncoming, 20000) };
    $('hu-avatar').innerHTML = avInner(c);
    $('hu-name').textContent = c.name;
    $('heads-up').classList.remove('hidden');
}
function hideHeadsUp() { $('heads-up').classList.add('hidden'); }
function callTimerStart() {
    if (CALL) clearInterval(CALL.timerId);
    CALL.timerId = setInterval(() => {
        if (!CALL) return;
        CALL.sec++;
        const el = $('call-status');
        if (el) el.textContent = String(Math.floor(CALL.sec / 60)).padStart(2, '0') + ':' + String(CALL.sec % 60).padStart(2, '0');
    }, 1000);
}
function acceptIncoming() {
    if (!INCOMING) return;
    clearTimeout(INCOMING.timer);
    const id = INCOMING.id; INCOMING = null; hideHeadsUp();
    CALL_FROM_PROFILE = false;
    CALL = { id: id, kind: 'audio', muted: false, videoOn: false, sec: 0, connected: true, route: 'earpiece', timerId: null };
    renderCall();
    $('call-status').textContent = '00:00';
    switchScreen('screen-call');
    callTimerStart();
}
function declineIncoming() { missIncoming(); }
function missIncoming() {
    if (!INCOMING) return;
    clearTimeout(INCOMING.timer);
    const c = CHATS.find(x => x.id === INCOMING.id);
    INCOMING = null; hideHeadsUp();
    if (c) {
        c.messages.push({ side: 'in', type: 'call', text: I18N[LANG].missed_call, time: chatTime() });
        if (currentChat === c.id && !$('screen-chat').classList.contains('hidden')) renderMessages(false);
        renderChatList('');
    }
    toast(I18N[LANG].missed_call);
}
function endCall() {
    if (CALL && CALL.timerId) clearInterval(CALL.timerId);
    const id = CALL && CALL.id;
    const fromP = CALL_FROM_PROFILE;
    CALL = null; CALL_FROM_PROFILE = false;
    if (fromP && id) openUserProfile(id, upReturn);
    else if (id) switchScreen('screen-chat');
    else switchScreen('screen-chats');
}
/* ═══════════ MESSAGE MENU + FORWARD ═══════════ */
let FWD_MI = -1;
function bindMsgLongPress() {
    const box = $('chat-messages');
    let t = null;
    box.addEventListener('touchstart', e => {
        const b = e.target.closest('[data-mi]'); if (!b) return;
        const mi = b.getAttribute('data-mi');
        t = setTimeout(() => { t = null; openMsgMenu(mi, e.touches[0].clientX, e.touches[0].clientY); }, 500);
    }, { passive: true });
    ['touchmove', 'touchend', 'touchcancel'].forEach(ev => box.addEventListener(ev, () => { if (t) { clearTimeout(t); t = null; } }));
    box.addEventListener('contextmenu', e => {
        const b = e.target.closest('[data-mi]'); if (!b) return;
        e.preventDefault(); openMsgMenu(b.getAttribute('data-mi'), e.clientX, e.clientY);
    });
}
function openMsgMenu(mi, cx, cy) {
    const c = CHATS.find(x => x.id === currentChat); if (!c) return;
    const m = c.messages[mi]; if (!m) return;
    FWD_MI = mi;
    const T = I18N[LANG];
    const pr = $('phone').getBoundingClientRect();
    const items = [{ icon: 'fa-share', label: T.msg_forward, fn: 'openForward()' }];
    if ((m.text || '').trim()) items.push({ icon: 'fa-copy', label: T.msg_copy, fn: 'copyMsg(' + mi + ')' });
    items.push({ icon: 'fa-trash', label: T.msg_delete, fn: 'deleteMsg(' + mi + ')', danger: true });
    openMiniMenu(cx - pr.left, cy - pr.top, items);
}
function copyMsg(mi) { const c = CHATS.find(x => x.id === currentChat); const m = c && c.messages[mi]; if (m && m.text) { try { navigator.clipboard.writeText(m.text); } catch (e) {} toast(I18N[LANG].msg_copy + ' \u2713'); } }
function deleteMsg(mi) { const c = CHATS.find(x => x.id === currentChat); if (c) { c.messages.splice(mi, 1); renderMessages(false); renderChatList(''); } }
function openForward() {
    closeMiniMenu();
    const saved = CHATS.find(x => x.id === 'saved');
    const others = CHATS.filter(x => x.id !== 'saved' && x.id !== currentChat && !ARCHIVED.includes(x.id));
    const row = c => '<button onclick="doForward(\'' + c.id + '\')" class="pressable w-full flex items-center space-x-3 p-2.5 rounded-[20px] hover:bg-slate-50 text-left">' +
        '<div class="w-11 h-11 rounded-2xl overflow-hidden bg-gradient-to-br ' + c.grad + ' flex items-center justify-center text-white font-extrabold shrink-0">' + (c.icon ? '<i class="fa-solid ' + c.icon + '"></i>' : avInner(c)) + '</div>' +
        '<div class="flex-1 min-w-0"><div class="text-[13px] font-extrabold text-slate-900 truncate">' + c.name + '</div>' +
        '<div class="text-[11px] text-slate-400 font-medium truncate">' + (c.username || '') + '</div></div></button>';
    $('forward-list').innerHTML = (saved ? row(saved) : '') + others.map(row).join('');
    openSheet('sheet-forward');
}
function doForward(targetId) {
    const src = CHATS.find(x => x.id === currentChat);
    const m = src && src.messages[FWD_MI]; if (!m) return;
    const t = CHATS.find(x => x.id === targetId); if (!t) return;
    const cp = Object.assign({}, m, { side: 'out', fwd: m.fwd || src.name, time: chatTime(), status: 'sent' });
    t.messages.push(cp);
    closeSheets();
    openChat(targetId);
    toast(I18N[LANG].msg_forward + ' \u2713');
}
/* ═══════════ MINI MENU (long-press) ═══════════ */
function openMiniMenu(x, y, items) {
    const mm = $('mini-menu');
    mm.innerHTML = items.map(it =>
        '<button onclick="closeMiniMenu();' + it.fn + '" class="pressable w-full flex items-center space-x-3.5 px-4 py-3 rounded-xl text-left">' +
        '<i class="fa-solid ' + it.icon + ' ' + (it.danger ? 'text-red-400' : 'text-white/70') + ' text-[15px] w-5 text-center shrink-0"></i>' +
        '<span class="text-[14px] font-bold ' + (it.danger ? 'text-red-400' : 'text-white') + '">' + it.label + '</span></button>'
    ).join('');
    const W = $('phone').clientWidth || 402;
    mm.style.left = Math.min(Math.max(8, x), W - 216) + 'px';
    mm.style.top = Math.max(8, y) + 'px';
    $('mini-menu-ov').classList.remove('hidden');
    mm.classList.remove('hidden');
}
function closeMiniMenu() { $('mini-menu').classList.add('hidden'); $('mini-menu-ov').classList.add('hidden'); }
function lpMenu(el, itemsFn) {
    if (!el || el.dataset.lp) return;
    el.dataset.lp = '1';
    const pos = (cx, cy) => {
        const pr = $('phone').getBoundingClientRect();
        openMiniMenu(cx - pr.left, cy - pr.top, itemsFn());
    };
    let t = null;
    el.addEventListener('touchstart', e => {
        const cx = e.touches[0].clientX, cy = e.touches[0].clientY;
        t = setTimeout(() => { t = null; pos(cx, cy); }, 550);
    }, { passive: true });
    ['touchmove', 'touchend', 'touchcancel'].forEach(ev => el.addEventListener(ev, () => { if (t) { clearTimeout(t); t = null; } }));
    el.addEventListener('contextmenu', e => { e.preventDefault(); pos(e.clientX, e.clientY); });
}
function bindMeRows() {
    const T = I18N[LANG];
    const pc = $('up-pc-card');
    if (pc) lpMenu(pc, () => [
        { icon: 'fa-copy', label: T.mm_copy, fn: 'pcCopy()' },
        { icon: 'fa-pen', label: T.mm_change, fn: 'openPChannel()' },
        { icon: 'fa-trash', label: T.mm_remove, fn: 'pcRemove()', danger: true }
    ]);
    const un = $('up-username-row');
    if (un) lpMenu(un, () => [
        { icon: 'fa-copy', label: T.mm_copy_user, fn: 'copyUpUsername()' },
        { icon: 'fa-pen', label: T.mm_change_user, fn: "openUsernameScreen('screen-userprofile')" }
    ]);
    const ph = $('up-phone-row');
    if (ph) lpMenu(ph, () => [
        { icon: 'fa-copy', label: T.mm_copy, fn: 'pcCopyPhone()' }
    ]);
}
function pcCopy() {
    const pc = ME_USER.personalChannel ? CHATS.find(x => x.id === ME_USER.personalChannel) : null;
    if (pc && pc.inviteLink) { try { navigator.clipboard.writeText(pc.inviteLink); } catch (e) {} toast(pc.inviteLink + ' copied'); }
}
function pcCopyPhone() { try { navigator.clipboard.writeText(ME_USER.phone); } catch (e) {} toast(ME_USER.phone + ' copied'); }
function pcRemove() { ME_USER.personalChannel = ''; renderUpExtra(); toast('\u2713'); }
/* ═══════════ USERNAME SCREEN ═══════════ */
let UNAME_RET = 'screen-userprofile';
function openUsernameScreen(ret) {
    UNAME_RET = ret || 'screen-userprofile';
    closeMiniMenu();
    $('uname-input').value = String(ME_USER.username).replace(/^@/, '');
    switchScreen('screen-username');
    setTimeout(() => { const i = $('uname-input'); if (i) i.focus(); }, 350);
}
function unameBack() {
    if (UNAME_RET === 'screen-userprofile') openUserProfile('me', upReturn);
    else switchScreen(UNAME_RET);
}
function unameSave() {
    const u = $('uname-input').value.trim().toLowerCase();
    if (!/^[a-z0-9_]{5,32}$/.test(u)) { toast('a-z, 0-9, _ \u00B7 5-32'); return; }
    ME_USER.username = '@' + u;
    syncMeUI(); renderEditProfile();
    unameBack(); toast('\u2713');
}

(function () {
    const bioEl = $('up-bio'); let bt = null;
    bioEl.addEventListener('click', () => { if (upIsMe && upUser && !upUser.bio && !upUser.kind) openDlg('bio'); });
    bioEl.addEventListener('touchstart', () => {
        if (!(upIsMe && upUser && upUser.bio && !upUser.kind)) return;
        bt = setTimeout(() => { bt = null; openDlg('bio'); }, 2000);
    }, { passive: true });
    ['touchmove', 'touchend', 'touchcancel'].forEach(ev => bioEl.addEventListener(ev, () => { if (bt) { clearTimeout(bt); bt = null; } }));
    bioEl.addEventListener('contextmenu', e => { if (upIsMe && upUser && upUser.bio && !upUser.kind) { e.preventDefault(); openDlg('bio'); } });
    bindMsgLongPress();
    bindVaultLongPress();
})();
/* ═══════════ INIT ═══════════ */
CHATS.unshift({ id:'c-pirate', kind:'channel', name:"The Pirate's Cloud", username:'@piratescloud', grad:'from-teal-600 to-cyan-800',
    online:false, unread:0, myRole:'member', muted:true, privacy:'public', whoCanSend:'admins',
    bio:'Cloud storage & tools', members:[], inviteLink:'zp.me/piratescloud', socials:[], posts:[],
    messages:[
        { side:'in', text:'Welcome to THE PIRATE\u2019S CLOUD \u2620\uFE0F', time:'Aug 18' },
        { side:'in', text:'THE PIRATE\u2019S CLOUD pinned a photo', time:'Sep 11' },
        { side:'in', text:'hello everyone, new drop is live \uD83D\uDE80', time:'Sep 22' },
        { side:'in', text:'Channel photo updated', time:'Oct 1' },
        { side:'in', text:'hello hello, bot status: online', time:'Oct 10' },
        { side:'in', text:'Wait guys bot is down now so i will fix that', time:'7:24 PM' },
        { side:'in', text:'say hello if you need support \uD83D\uDC4D', time:'7:26 PM' }
    ] });
CHATS.unshift({ id:'saved', name:'Saved Archive', icon:'fa-bookmark', grad:'from-[#229ED9] to-[#1a7fb5]', online:false, unread:0, username:'', bio:'', messages:[{ side:'in', text:'Your personal cloud \u2601\uFE0F \u2014 send yourself anything', time:'now' }] });
(function () {
    const P = new URLSearchParams(location.search);
    const l = P.get('lang');
    if (P.get('n')) { ME_USER.name = ME_USER.firstName = P.get('n'); }
    if (P.get('u')) { ME_USER.username = '@' + P.get('u'); }
    window.__bootLang = I18N[l] ? l : 'en';
})();
setLang(window.__bootLang);
renderVaultList(''); renderCards(); renderChatList(''); renderTotp(); renderThreats(); renderFiles();
bindLongPress($('chat-list')); bindLongPress($('archive-list')); initPull();
selectPlan('fam');
enterApp();

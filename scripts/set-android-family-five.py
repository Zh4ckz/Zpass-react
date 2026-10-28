from pathlib import Path
root=Path(r'C:\Users\rezan\AndroidStudioProjects\ZPassManager\app\src\main\java\com\zpass')
p=root/'FamilyMembersDialog.kt';s=p.read_text(encoding='utf-8').replace('MAX_FAMILY_MEMBERS = 10','MAX_FAMILY_MEMBERS = 4').replace('Paid plans can share a vault with up to 10 people — invite them by their Z App ID or the email they signed up with.','Family includes 5 people: 1 paying administrator and 4 members. Invite members by their Z Pass ID or account email.').replace('This vault has reached the paid sharing limit of 10 people.','Family is full: 1 paying administrator and 4 members.');p.write_text(s,encoding='utf-8')
p=root/'SubscriptionScreen.kt';s=p.read_text(encoding='utf-8').replace('Family · share with 10','Family · 5 people (1 admin + 4 members)');p.write_text(s,encoding='utf-8')
print('Android: 4 invited member slots; paying administrator is the fifth person.')

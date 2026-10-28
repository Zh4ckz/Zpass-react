from pathlib import Path
import xml.etree.ElementTree as E
r=Path('C:/Users/rezan/AndroidStudioProjects/ZPassManager/app/src/main/res')
translations={
'pay_ui_07bdc1e607a8':'Pro Cloud 요금제가 활성화되어 있습니다.',
'pay_ui_11a4b1afe579':'초대 보내기',
'pay_ui_13b7bfcac438':'처리 중…',
'pay_ui_25bdf9860e96':'제출 중…',
'pay_ui_2a161a8fedda':'1/2단계 · 카드 정보 확인',
'pay_ui_2d05d0f179ce':'Plus',
'pay_ui_34065aef7461':'클라우드 보관함 복원',
'pay_ui_3cbe6d6b9a8d':'복원',
'pay_ui_58afa4c9ec17':'2/2단계 · 민감한 정보 보호',
'pay_ui_596cd8855661':'동기화: %1$s',
'pay_ui_5c258f098c9b':'활성화 중…',
'pay_ui_5f06968a6f3c':'Pro 요금제',
'pay_ui_6364297ed52f':'보관함 복원',
'pay_ui_6db6a862d4c6':'요금제 관리',
'pay_ui_7620354a9fb3':'이전에 만든 보관함 비밀번호를 입력하세요. 계정 로그인 비밀번호와 다를 수 있습니다.',
'pay_ui_7622eb5aa42d':'연간',
'pay_ui_7a9132350adc':'주소를 찾는 중…',
'pay_ui_7d9205c23fb2':'보호된 접근이 활성화되어 있습니다',
'pay_ui_820599da89a1':'가져오는 중…',
'pay_ui_84c29015de33':'사용자 이름',
'pay_ui_870c24068aaa':'암호화폐로 결제 (%1$s)',
'pay_ui_8764bcf42b3f':'이 비밀번호는 앱을 다시 설치하거나 새 휴대폰을 사용할 때 클라우드 보관함을 보호합니다. Z Pass는 이 비밀번호를 재설정할 수 없습니다. 안전한 곳에 보관하세요.',
'pay_ui_8a26761a3524':'Google Pay로 결제 (%1$s)',
'pay_ui_91df9a73faf4':'Family · 5명',
'pay_ui_928c9dc073f9':'추가 보호가 현재 꺼져 있습니다',
'pay_ui_9995e577f13d':'보호 및 백업',
'pay_ui_9eb096d0cc8c':'보관함 잠금 해제 코드 끄기',
'pay_ui_a23cd7df8617':'현재 위치로 입력',
'pay_ui_a6f47e00e036':'업그레이드',
'pay_ui_a8820cd64db8':'Z Pass',
'pay_ui_bb700287f414':'보관함 잠금 해제 코드 켜기',
'pay_ui_bbda53b49038':'무료 요금제',
'pay_ui_c50921e0469a':'이 보관함을 처음 백업할 때 만든 복구 비밀번호를 입력하세요.',
'pay_ui_c5dc8bf53e7a':'무료 요금제는 계정과 카드 무제한 저장 및 인증 토큰 10개를 제공합니다. Pro는 무제한 2단계 인증과 프리미엄 공유를 제공합니다.',
'pay_ui_c8ae37c99c73':'아직 저장된 비밀번호가 없습니다',
'pay_ui_c94d3175a656':'이메일 주소',
'pay_ui_cdf964e758d0':'검색 결과가 없습니다',
'pay_ui_cf765512cc6d':'보내는 중…',
'pay_ui_d39eb32e28cf':'네트워크를 기다리는 중…',
'pay_ui_d55926bc15bc':'파일이 REZHN Cloud에 안전하게 보관되어 있습니다',
'pay_ui_dbcd9101f34d':'결제 제출',
'pay_ui_e44455bc6697':'클라우드 백업 잠금 해제',
'pay_ui_fd6b528d2478':'휴대폰의 파일 보기',
}
root=E.Element('resources')
for k,v in translations.items(): E.SubElement(root,'string',name=k).text=v
E.indent(root,space='    ')
E.ElementTree(root).write(r/'values-ko/payment_polish.xml',encoding='utf-8',xml_declaration=True)
print('43 Korean Android UI translations added locally without external requests.')

// 수달일기 설정 — 웹 배포·앱 빌드 공통
// 할 일·감사 한 줄·수달 이름은 서버로 보내지 않는다. 아래 서버는 익명 이용 지표만 받는다.
window.SUDAL_CONFIG = {
  site: 'https://rlawnstlr001-design.github.io/sudal/',
  supabaseUrl: 'https://nkmkqczahmwqjddzpeqr.supabase.co',
  supabaseKey: 'sb_publishable_EkAloSEEewcCT4qyu6smSQ_gk4kDT_R', // 공개용 키 — 권한은 RPC가 통제
};

// 교사 모드 비밀번호는 저장소에 글자로 두지 않아요(공개 저장소에서 보이지 않게).
// 비밀번호를 넣어 봐야 하는 화면 검사는 환경 변수로 받아요: TEACHER_PASSWORD=… npx playwright test
// 없으면 그 검사만 건너뛰어요(틀린 비밀번호를 막는 검사는 그대로 해요).
export const TEACHER_PASS = process.env.TEACHER_PASSWORD ?? '';
export const NEED_PASS = '교사 모드 비밀번호(TEACHER_PASSWORD 환경 변수)가 있어야 하는 검사예요.';

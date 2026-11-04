// 학생 보고서를 받을 선생님 구글 시트의 웹 앱 주소(…/exec)를 따옴표 안에 넣으세요.
// 비워 두면 실험 페이지에 제출 칸이 나타나지 않아요. 설정 순서: docs/google-sheet-submission.md
export const SUBMIT_URL = 'https://script.google.com/macros/s/AKfycbyjuAbB04MMUR9cnl0kP1j48AZLxhqxXI4kts3h-F8-Cn7a5r5pNQ3cqtoq43Qepjls/exec';

// 학년별로 시트를 나눠 받기: 학번 첫 자리(학년)마다 받을 시트의 웹 앱 주소를 넣으세요.
// 비워 둔 학년의 보고서는 위의 SUBMIT_URL로 가요. 예: 1학년 주소만 넣으면 1xxxx는 1학년 시트로, 2xxxx는 SUBMIT_URL(지금 시트)로 가요.
export const SUBMIT_URL_BY_GRADE = {
  1: '', // 1학년 시트의 웹 앱 주소
  2: '', // 2학년 시트의 웹 앱 주소(비워 두면 SUBMIT_URL)
  3: '', // 3학년 시트의 웹 앱 주소(비워 두면 SUBMIT_URL)
};

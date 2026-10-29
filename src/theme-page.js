// 목록 페이지(첫 화면, 학년, 단원)에 테마 바꾸기 단추를 붙여요(src/theme.js).
// 첫 화면의 ‘교사용 자료’ 폴더는 누르면 교사 모드 비밀번호를 물어요(src/teacher-gate.js).
import { setupTheme } from './theme.js';
import { setupTeacherFolderLinks } from './teacher-gate.js';
setupTheme();
setupTeacherFolderLinks();

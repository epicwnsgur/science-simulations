// 교사용 자료 목록 페이지: 테마 단추와 교사 모드 잠금(src/teacher-gate.js).
import { setupTheme } from './theme.js';
import { guardTeacherPage } from './teacher-gate.js';
setupTheme();
guardTeacherPage({ home: '../' });

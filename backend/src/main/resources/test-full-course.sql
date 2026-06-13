-- Test data: 1 khoa hoc day du video, bai doc, quiz, bai tap xen lan.
-- Chay trong MySQL Workbench sau khi chon database LMS cua ban.

SET @now = NOW();
SET @password_123456 = '$2a$10$7EqJtq98hPqEX7fNZaFWoOhi3tR2qf7WtGz7J8CIkSz2H3uQ9H/4W';

INSERT INTO roles (name, description) VALUES
('INSTRUCTOR', 'Giang vien'),
('STUDENT', 'Hoc vien')
ON DUPLICATE KEY UPDATE description = VALUES(description);

INSERT INTO users (id, username, email, password, full_name, avatar, dob, created_at, updated_at, role_name) VALUES
('test-full-instructor', 'gv_fulltest', 'gv.fulltest@lms.test', @password_123456, 'Giang vien Test Day Du', NULL, '1990-01-01', @now, @now, 'INSTRUCTOR'),
('test-full-student', 'hv_fulltest', 'hv.fulltest@lms.test', @password_123456, 'Hoc vien Test Day Du', NULL, '2002-01-01', @now, @now, 'STUDENT')
ON DUPLICATE KEY UPDATE
  password = VALUES(password),
  full_name = VALUES(full_name),
  role_name = VALUES(role_name),
  updated_at = VALUES(updated_at);

INSERT INTO categories (id, name, description, created_at) VALUES
('test-cat-fullstack', 'Fullstack Test', 'Danh muc dung de test khoa hoc day du noi dung', @now)
ON DUPLICATE KEY UPDATE description = VALUES(description);

INSERT INTO courses (
  id, title, description, thumbnail_url, status, visibility, level,
  estimated_hours, price, currency, paid, category_id, instructor_id
) VALUES (
  'test-course-full-learning',
  'Khoa test Fullstack LMS day du',
  'Khoa hoc mau dung de test luong hoc tap: video, bai doc, quiz, bai tap va chatbot AI.',
  NULL,
  'PUBLISHED',
  'PUBLIC',
  'BEGINNER',
  12,
  0.00,
  'VND',
  false,
  'test-cat-fullstack',
  'test-full-instructor'
)
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  description = VALUES(description),
  status = VALUES(status),
  visibility = VALUES(visibility),
  paid = VALUES(paid);

INSERT INTO course_sections (id, title, order_index, description, course_id) VALUES
('test-sec-full-01', 'Phan 1 - Nen tang', 1, 'Hoc theo thu tu video, bai doc, quiz.', 'test-course-full-learning'),
('test-sec-full-02', 'Phan 2 - Thuc hanh', 2, 'Hoc video, lam bai tap va doc tong ket.', 'test-course-full-learning')
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  order_index = VALUES(order_index),
  description = VALUES(description);

INSERT INTO lessons (
  id, title, content, description, video_url, video_transcript,
  video_transcript_source, video_transcript_updated_at, thumbnail_url,
  duration_minutes, is_published, is_preview, order_index,
  created_at, updated_at, section_id
) VALUES
(
  'test-les-full-01-video',
  'Video 1 - Tong quan LMS Fullstack',
  '<p>Bai video gioi thieu kien truc tong quan cua he thong LMS.</p>',
  'Video mo dau khoa hoc, giai thich frontend, backend va database.',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'Video trinh bay kien truc LMS gom frontend React, backend Spring Boot, MySQL va cac module khoa hoc, bai hoc, quiz, bai tap, thanh toan va chatbot AI.',
  'TRANSCRIPT_API',
  @now,
  NULL,
  8,
  true,
  true,
  1,
  @now,
  @now,
  'test-sec-full-01'
),
(
  'test-les-full-02-reading',
  'Bai doc 1 - Kien truc frontend va backend',
  '<h3>Kien truc he thong</h3><p>Frontend React hien thi giao dien hoc tap. Backend Spring Boot xu ly API, xac thuc, khoa hoc, tien do va chatbot. MySQL luu tru du lieu.</p>',
  'Bai doc ngan ve cach frontend, backend va database phoi hop.',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  10,
  true,
  false,
  2,
  @now,
  @now,
  'test-sec-full-01'
),
(
  'test-les-full-03-quiz',
  'Quiz 1 - Kiem tra kien truc LMS',
  '<p>Hoan thanh quiz de mo bai tiep theo.</p>',
  'Quiz kiem tra nhanh sau video va bai doc dau tien.',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  0,
  true,
  false,
  3,
  @now,
  @now,
  'test-sec-full-01'
),
(
  'test-les-full-04-video',
  'Video 2 - Luong hoc tap va tien do',
  '<p>Video giai thich cach luu tien do hoc tap cua hoc vien.</p>',
  'Video ve lesson progress, mo khoa bai tiep va nhac hoc tiep.',
  'https://www.youtube.com/watch?v=oHg5SJYRHA0',
  'Video giai thich khi hoc vien xem video, doc bai, lam quiz hoac nop bai tap, he thong cap nhat lesson_progress va enrollment.progress_percent.',
  'TRANSCRIPT_API',
  @now,
  NULL,
  9,
  true,
  false,
  1,
  @now,
  @now,
  'test-sec-full-02'
),
(
  'test-les-full-05-assignment',
  'Bai tap 1 - Ve luong hoc tap',
  '<p>Hay mo ta lai luong hoc tap trong LMS bang so do hoac gach dau dong.</p>',
  'Bai tap yeu cau hoc vien nop mo ta luong hoc tap.',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  0,
  true,
  false,
  2,
  @now,
  @now,
  'test-sec-full-02'
),
(
  'test-les-full-06-reading',
  'Bai doc 2 - Tong ket chatbot AI',
  '<h3>Chatbot AI</h3><p>Chatbot lay noi dung bai hoc, transcript video, quiz, bai tap va tien do hoc vien lam ngu canh de tra loi cau hoi.</p>',
  'Bai doc tong ket phan chatbot AI va transcript video.',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  7,
  true,
  false,
  3,
  @now,
  @now,
  'test-sec-full-02'
)
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  content = VALUES(content),
  description = VALUES(description),
  video_url = VALUES(video_url),
  video_transcript = VALUES(video_transcript),
  video_transcript_source = VALUES(video_transcript_source),
  video_transcript_updated_at = VALUES(video_transcript_updated_at),
  duration_minutes = VALUES(duration_minutes),
  is_published = VALUES(is_published),
  is_preview = VALUES(is_preview),
  order_index = VALUES(order_index),
  updated_at = VALUES(updated_at);

INSERT INTO quizzes (
  id, course_id, lesson_id, title, description, quiz_scope,
  time_limit_minutes, max_attempts, passing_score,
  is_published, created_source, created_by
) VALUES (
  'test-quiz-full-01',
  'test-course-full-learning',
  'test-les-full-03-quiz',
  'Quiz kien truc LMS',
  'Kiem tra kien thuc ve frontend, backend, database va chatbot.',
  'LESSON',
  10,
  3,
  2,
  true,
  'MANUAL',
  'test-full-instructor'
)
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  description = VALUES(description),
  is_published = VALUES(is_published);

INSERT INTO quiz_questions (
  id, quiz_id, question_text, question_type, explanation,
  order_index, created_source, created_at
) VALUES
('test-q-full-01', 'test-quiz-full-01', 'Frontend cua du an dung de lam gi?', 'SINGLE_CHOICE', 'Frontend React phu trach hien thi giao dien va goi API.', 1, 'MANUAL', @now),
('test-q-full-02', 'test-quiz-full-01', 'Backend Spring Boot co vai tro nao?', 'SINGLE_CHOICE', 'Backend xu ly nghiep vu, API, xac thuc va luu doc du lieu qua repository.', 2, 'MANUAL', @now),
('test-q-full-03', 'test-quiz-full-01', 'Chatbot AI lay transcript video de lam gi?', 'SINGLE_CHOICE', 'Transcript giup AI hieu noi dung video va tra loi cau hoi cua hoc vien.', 3, 'MANUAL', @now)
ON DUPLICATE KEY UPDATE
  question_text = VALUES(question_text),
  explanation = VALUES(explanation),
  order_index = VALUES(order_index);

INSERT INTO quiz_options (id, option_text, is_correct, order_index, question_id) VALUES
('test-o-full-01-a', 'Hien thi giao dien va goi API', true, 1, 'test-q-full-01'),
('test-o-full-01-b', 'Thay the database', false, 2, 'test-q-full-01'),
('test-o-full-01-c', 'Gui webhook SePay', false, 3, 'test-q-full-01'),
('test-o-full-01-d', 'Bien dich ma Java', false, 4, 'test-q-full-01'),
('test-o-full-02-a', 'Chi dung de viet CSS', false, 1, 'test-q-full-02'),
('test-o-full-02-b', 'Xu ly API va nghiep vu he thong', true, 2, 'test-q-full-02'),
('test-o-full-02-c', 'Chi hien thi nut bam', false, 3, 'test-q-full-02'),
('test-o-full-02-d', 'Thay the trinh duyet', false, 4, 'test-q-full-02'),
('test-o-full-03-a', 'De AI hieu noi dung video', true, 1, 'test-q-full-03'),
('test-o-full-03-b', 'De xoa khoa hoc', false, 2, 'test-q-full-03'),
('test-o-full-03-c', 'De doi mat khau admin', false, 3, 'test-q-full-03'),
('test-o-full-03-d', 'De tao tai khoan ngan hang', false, 4, 'test-q-full-03')
ON DUPLICATE KEY UPDATE
  option_text = VALUES(option_text),
  is_correct = VALUES(is_correct),
  order_index = VALUES(order_index);

INSERT INTO assignments (
  id, course_id, lesson_id, title, description, assignment_type, created_by
) VALUES (
  'test-assign-full-01',
  'test-course-full-learning',
  'test-les-full-05-assignment',
  'Mo ta luong hoc tap trong LMS',
  'Viet ngan gon luong: hoc vien vao khoa hoc, xem video/doc bai, lam quiz, nop bai tap, he thong cap nhat tien do va mo bai tiep theo.',
  'ESSAY',
  'test-full-instructor'
)
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  description = VALUES(description),
  assignment_type = VALUES(assignment_type);

INSERT INTO enrollments (
  id, user_id, course_id, enrolled_at, status, progress_percent, last_accessed_at
) VALUES (
  'test-enroll-full-01',
  'test-full-student',
  'test-course-full-learning',
  @now,
  'ACTIVE',
  0.00,
  NULL
)
ON DUPLICATE KEY UPDATE
  status = VALUES(status),
  progress_percent = VALUES(progress_percent),
  last_accessed_at = VALUES(last_accessed_at);

-- Dev/test data for LMS.
-- Run manually when you need sample data:
-- mysql -u root -p lms_db < backend/src/main/resources/dev-test-data.sql

SET @now = NOW();
SET @password_123456 = '$2a$10$7EqJtq98hPqEX7fNZaFWoOhi3tR2qf7WtGz7J8CIkSz2H3uQ9H/4W';

INSERT INTO roles (name, description) VALUES
('ADMIN', 'Quan tri vien'),
('INSTRUCTOR', 'Giang vien'),
('STUDENT', 'Hoc vien')
ON DUPLICATE KEY UPDATE description = VALUES(description);

INSERT INTO users (id, username, email, password, full_name, avatar, dob, created_at, updated_at, role_name) VALUES
('seed-admin-01', 'seed_admin', 'seed.admin@lms.test', @password_123456, 'Quan tri vien Test', NULL, '1995-01-01', @now, @now, 'ADMIN'),
('seed-instructor-01', 'seed_gv_java', 'gv.java@lms.test', @password_123456, 'Nguyen Minh Java', NULL, '1990-03-12', @now, @now, 'INSTRUCTOR'),
('seed-instructor-02', 'seed_gv_web', 'gv.web@lms.test', @password_123456, 'Tran Thu Web', NULL, '1992-07-20', @now, @now, 'INSTRUCTOR'),
('seed-instructor-03', 'seed_gv_data', 'gv.data@lms.test', @password_123456, 'Le Hoang Data', NULL, '1989-11-05', @now, @now, 'INSTRUCTOR'),
('seed-student-01', 'seed_hocvien01', 'hocvien01@lms.test', @password_123456, 'Pham An', NULL, '2002-02-11', @now, @now, 'STUDENT'),
('seed-student-02', 'seed_hocvien02', 'hocvien02@lms.test', @password_123456, 'Do Binh', NULL, '2001-09-22', @now, @now, 'STUDENT'),
('seed-student-03', 'seed_hocvien03', 'hocvien03@lms.test', @password_123456, 'Hoang Chi', NULL, '2003-04-18', @now, @now, 'STUDENT'),
('seed-student-04', 'seed_hocvien04', 'hocvien04@lms.test', @password_123456, 'Vu Dung', NULL, '2000-12-03', @now, @now, 'STUDENT'),
('seed-student-05', 'seed_hocvien05', 'hocvien05@lms.test', @password_123456, 'Ngo Ha', NULL, '2004-06-16', @now, @now, 'STUDENT'),
('seed-student-06', 'seed_hocvien06', 'hocvien06@lms.test', @password_123456, 'Bui Khanh', NULL, '2002-10-09', @now, @now, 'STUDENT'),
('seed-student-07', 'seed_hocvien07', 'hocvien07@lms.test', @password_123456, 'Mai Linh', NULL, '2001-01-25', @now, @now, 'STUDENT'),
('seed-student-08', 'seed_hocvien08', 'hocvien08@lms.test', @password_123456, 'Dang Nam', NULL, '2003-08-30', @now, @now, 'STUDENT')
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), password = VALUES(password), role_name = VALUES(role_name), updated_at = VALUES(updated_at);

INSERT INTO categories (id, name, description, created_at) VALUES
('seed-cat-java', 'Lap trinh Java', 'Khoa hoc Java tu co ban den nang cao', @now),
('seed-cat-web', 'Phat trien Web', 'HTML, CSS, React va backend web', @now),
('seed-cat-data', 'Co so du lieu', 'SQL, thiet ke database va bao cao', @now),
('seed-cat-ai', 'Tri tue nhan tao', 'Ung dung AI trong hoc tap va san pham', @now),
('seed-cat-softskill', 'Ky nang mem', 'Ky nang hoc tap, lam viec nhom va thuyet trinh', @now)
ON DUPLICATE KEY UPDATE description = VALUES(description);

INSERT INTO courses (id, title, description, thumbnail_url, status, visibility, level, estimated_hours, price, currency, paid, category_id, instructor_id) VALUES
('seed-course-java-basic', 'Java co ban cho nguoi moi', 'Lam quen Java, bien, hang so, cau truc dieu kien, vong lap va OOP co ban.', '/uploads/courses/0fe2e7fb-fdc7-45ce-94f2-f512d269d1ba.jpg', 'PUBLISHED', 'PUBLIC', 'BEGINNER', 18, 0.00, 'VND', false, 'seed-cat-java', 'seed-instructor-01'),
('seed-course-java-oop', 'Lap trinh huong doi tuong voi Java', 'Thuc hanh class, object, ke thua, da hinh, interface va clean code.', '/uploads/courses/2197eb4b-029b-415b-83ec-58139b71f1a3.jpg', 'PUBLISHED', 'PUBLIC', 'INTERMEDIATE', 24, 299000.00, 'VND', true, 'seed-cat-java', 'seed-instructor-01'),
('seed-course-spring-api', 'Spring Boot REST API', 'Xay dung REST API voi Spring Boot, JPA, validation va bao mat JWT.', '/uploads/courses/36d1113a-9861-448f-ab77-8b852b2b507d.jpg', 'PUBLISHED', 'PUBLIC', 'INTERMEDIATE', 30, 499000.00, 'VND', true, 'seed-cat-java', 'seed-instructor-01'),
('seed-course-react-basic', 'React co ban', 'Xay dung giao dien voi component, props, state, hook va goi API.', '/uploads/courses/53c0c417-9222-4cdb-8728-a23524041b90.jpg', 'PUBLISHED', 'PUBLIC', 'BEGINNER', 20, 199000.00, 'VND', true, 'seed-cat-web', 'seed-instructor-02'),
('seed-course-fullstack', 'Fullstack Java Spring va React', 'Ket hop backend Spring Boot va frontend React de xay dung ung dung LMS mini.', '/uploads/courses/78f8da25-89bf-410b-a8dc-639eae00ce90.jpg', 'PUBLISHED', 'PUBLIC', 'ADVANCED', 45, 799000.00, 'VND', true, 'seed-cat-web', 'seed-instructor-02'),
('seed-course-sql', 'SQL va thiet ke co so du lieu', 'Hoc truy van SQL, khoa chinh, khoa ngoai, join, index va bao cao du lieu.', '/uploads/courses/978c0759-0252-4598-aba3-66386e35c50e.jpg', 'PUBLISHED', 'PUBLIC', 'BEGINNER', 16, 0.00, 'VND', false, 'seed-cat-data', 'seed-instructor-03'),
('seed-course-ai-chatbot', 'Ung dung AI Chatbot trong LMS', 'Tich hop AI chatbot, prompt context, transcript video va hoi dap bai hoc.', '/uploads/courses/a118ca9b-9699-411a-92b9-e7c7355bd858.jpeg', 'PUBLISHED', 'PUBLIC', 'INTERMEDIATE', 22, 399000.00, 'VND', true, 'seed-cat-ai', 'seed-instructor-03'),
('seed-course-softskill', 'Ky nang hoc tap truc tuyen hieu qua', 'Lap ke hoach hoc, ghi chu, on tap, lam quiz va theo doi tien do.', '/uploads/courses/c0ce982d-fe5a-40a5-a757-682757dd81f2.jpg', 'DRAFT', 'PRIVATE', 'BEGINNER', 8, 0.00, 'VND', false, 'seed-cat-softskill', 'seed-instructor-02')
ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description), status = VALUES(status), visibility = VALUES(visibility), price = VALUES(price), paid = VALUES(paid);

INSERT INTO course_sections (id, title, order_index, description, course_id) VALUES
('seed-sec-java-basic-01', 'Nhap mon Java', 1, 'Cai dat moi truong va cu phap co ban', 'seed-course-java-basic'),
('seed-sec-java-basic-02', 'Dieu khien chuong trinh', 2, 'Dieu kien, vong lap va ham', 'seed-course-java-basic'),
('seed-sec-java-oop-01', 'Class va Object', 1, 'Tu duy doi tuong trong Java', 'seed-course-java-oop'),
('seed-sec-spring-01', 'Nen tang REST API', 1, 'Controller, service, repository', 'seed-course-spring-api'),
('seed-sec-react-01', 'Component React', 1, 'Props, state va hook', 'seed-course-react-basic'),
('seed-sec-fullstack-01', 'Kien truc Fullstack', 1, 'Ket noi frontend backend', 'seed-course-fullstack'),
('seed-sec-sql-01', 'SQL can ban', 1, 'Select, where, join va group by', 'seed-course-sql'),
('seed-sec-ai-01', 'AI Chatbot LMS', 1, 'Prompt, context va transcript video', 'seed-course-ai-chatbot')
ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description), order_index = VALUES(order_index);

INSERT INTO lessons (id, title, content, description, video_url, video_transcript, video_transcript_source, video_transcript_updated_at, thumbnail_url, duration_minutes, is_published, is_preview, order_index, created_at, updated_at, section_id) VALUES
('seed-les-java-01', 'Gioi thieu Java va JDK', '<p>Java la ngon ngu lap trinh pho bien, chay tren JVM va duoc dung nhieu trong backend.</p>', 'Tong quan ve Java, JDK va JVM.', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'Video gioi thieu Java, vai tro cua JDK, JVM va cach chuong trinh Java duoc bien dich thanh bytecode de chay tren nhieu moi truong.', 'TRANSCRIPT_API', @now, NULL, 12, true, true, 1, @now, @now, 'seed-sec-java-basic-01'),
('seed-les-java-02', 'Bien, hang so va kieu du lieu', '<p>Bien dung de luu tru gia tri, hang so dung tu khoa final de khong cho thay doi gia tri.</p>', 'Hoc bien, hang so, int, double, boolean va String.', NULL, NULL, NULL, NULL, NULL, 15, true, false, 2, @now, @now, 'seed-sec-java-basic-01'),
('seed-les-java-03', 'Cau truc if else', '<p>If else giup chuong trinh re nhanh theo dieu kien dung sai.</p>', 'Thuc hanh cau truc dieu kien.', NULL, NULL, NULL, NULL, NULL, 14, true, false, 1, @now, @now, 'seed-sec-java-basic-02'),
('seed-les-java-04', 'Quiz Java co ban', NULL, 'Kiem tra nhanh bien, hang so va if else.', NULL, NULL, NULL, NULL, NULL, 0, true, false, 2, @now, @now, 'seed-sec-java-basic-02'),
('seed-les-oop-01', 'Class va Object trong Java', '<p>Class la ban thiet ke, object la the hien cu the duoc tao tu class.</p>', 'Nam vung class, object, field va method.', 'https://www.youtube.com/watch?v=oHg5SJYRHA0', 'Video giai thich class la khuon mau, object la doi tuong cu the. Vi du Student co name, email va method study.', 'TRANSCRIPT_API', @now, NULL, 18, true, true, 1, @now, @now, 'seed-sec-java-oop-01'),
('seed-les-oop-02', 'Bai tap tao class Student', '<p>Tao class Student gom id, name, email va ham hien thi thong tin.</p>', 'Bai tap thuc hanh OOP.', NULL, NULL, NULL, NULL, NULL, 0, true, false, 2, @now, @now, 'seed-sec-java-oop-01'),
('seed-les-spring-01', 'Controller va REST endpoint', '<p>Controller nhan request, goi service va tra response ve client.</p>', 'Xay dung API dau tien voi Spring Boot.', NULL, NULL, NULL, NULL, NULL, 20, true, true, 1, @now, @now, 'seed-sec-spring-01'),
('seed-les-spring-02', 'Quiz Spring REST', NULL, 'Kiem tra Controller, Service va Repository.', NULL, NULL, NULL, NULL, NULL, 0, true, false, 2, @now, @now, 'seed-sec-spring-01'),
('seed-les-react-01', 'Component va Props', '<p>Component giup tach UI thanh cac khoi nho, props truyen du lieu tu cha sang con.</p>', 'React component co ban.', NULL, NULL, NULL, NULL, NULL, 16, true, true, 1, @now, @now, 'seed-sec-react-01'),
('seed-les-fullstack-01', 'Goi API tu React den Spring Boot', '<p>Frontend goi API bang fetch/axios, backend tra JSON cho giao dien.</p>', 'Ket noi frontend va backend.', NULL, NULL, NULL, NULL, NULL, 25, true, false, 1, @now, @now, 'seed-sec-fullstack-01'),
('seed-les-sql-01', 'SELECT va WHERE', '<p>SELECT dung de truy van du lieu, WHERE dung de loc ban ghi theo dieu kien.</p>', 'SQL truy van co ban.', NULL, NULL, NULL, NULL, NULL, 12, true, true, 1, @now, @now, 'seed-sec-sql-01'),
('seed-les-ai-01', 'Chatbot AI doc context bai hoc', '<p>Chatbot AI nhan cau hoi va context gom noi dung bai hoc, transcript video, tien do hoc vien.</p>', 'Cach AI tra loi dua tren ngu canh.', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'Video mo ta luong AI: hoc vien dat cau hoi, he thong lay noi dung bai hoc va transcript video, tao prompt, goi model AI va tra ket qua co cau truc.', 'TRANSCRIPT_API', @now, NULL, 22, true, true, 1, @now, @now, 'seed-sec-ai-01')
ON DUPLICATE KEY UPDATE title = VALUES(title), content = VALUES(content), description = VALUES(description), video_transcript = VALUES(video_transcript), updated_at = VALUES(updated_at);

INSERT INTO quizzes (id, course_id, lesson_id, title, description, quiz_scope, time_limit_minutes, max_attempts, passing_score, is_published, created_source, created_by) VALUES
('seed-quiz-java-basic', 'seed-course-java-basic', 'seed-les-java-04', 'Quiz Java co ban', 'Kiem tra bien, hang so va dieu kien.', 'LESSON', 15, 3, 2, true, 'MANUAL', 'seed-instructor-01'),
('seed-quiz-spring-rest', 'seed-course-spring-api', 'seed-les-spring-02', 'Quiz Spring REST', 'Kiem tra kien thuc REST API.', 'LESSON', 20, 2, 2, true, 'MANUAL', 'seed-instructor-01'),
('seed-quiz-sql-basic', 'seed-course-sql', NULL, 'Luyen tap SQL co ban', 'Quiz doc lap ve SELECT, WHERE va JOIN.', 'STANDALONE', 10, 5, 2, true, 'MANUAL', 'seed-instructor-03')
ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description), is_published = VALUES(is_published);

INSERT INTO quiz_questions (id, quiz_id, question_text, question_type, explanation, order_index, created_source, created_at) VALUES
('seed-q-java-01', 'seed-quiz-java-basic', 'Tu khoa nao dung de khai bao hang so trong Java?', 'SINGLE_CHOICE', 'final dung de khai bao gia tri khong duoc thay doi sau khi gan.', 1, 'MANUAL', @now),
('seed-q-java-02', 'seed-quiz-java-basic', 'Kieu du lieu nao dung de luu gia tri dung/sai?', 'SINGLE_CHOICE', 'boolean chi nhan true hoac false.', 2, 'MANUAL', @now),
('seed-q-java-03', 'seed-quiz-java-basic', 'Cau truc nao dung de re nhanh chuong trinh?', 'SINGLE_CHOICE', 'if else dung de xu ly cac nhanh dieu kien.', 3, 'MANUAL', @now),
('seed-q-spring-01', 'seed-quiz-spring-rest', 'Annotation nao thuong dung de khai bao REST controller?', 'SINGLE_CHOICE', '@RestController ket hop @Controller va @ResponseBody.', 1, 'MANUAL', @now),
('seed-q-spring-02', 'seed-quiz-spring-rest', 'Tang service thuong dung de lam gi?', 'SINGLE_CHOICE', 'Service chua nghiep vu va dieu phoi repository.', 2, 'MANUAL', @now),
('seed-q-sql-01', 'seed-quiz-sql-basic', 'Menh de nao dung de loc du lieu?', 'SINGLE_CHOICE', 'WHERE dung de loc ban ghi theo dieu kien.', 1, 'MANUAL', @now),
('seed-q-sql-02', 'seed-quiz-sql-basic', 'JOIN dung de lam gi?', 'SINGLE_CHOICE', 'JOIN ket hop du lieu tu nhieu bang lien quan.', 2, 'MANUAL', @now)
ON DUPLICATE KEY UPDATE question_text = VALUES(question_text), explanation = VALUES(explanation);

INSERT INTO quiz_options (id, option_text, is_correct, order_index, question_id) VALUES
('seed-o-java-01-a', 'const', false, 1, 'seed-q-java-01'),
('seed-o-java-01-b', 'final', true, 2, 'seed-q-java-01'),
('seed-o-java-01-c', 'static', false, 3, 'seed-q-java-01'),
('seed-o-java-01-d', 'var', false, 4, 'seed-q-java-01'),
('seed-o-java-02-a', 'int', false, 1, 'seed-q-java-02'),
('seed-o-java-02-b', 'String', false, 2, 'seed-q-java-02'),
('seed-o-java-02-c', 'boolean', true, 3, 'seed-q-java-02'),
('seed-o-java-02-d', 'double', false, 4, 'seed-q-java-02'),
('seed-o-java-03-a', 'if else', true, 1, 'seed-q-java-03'),
('seed-o-java-03-b', 'class', false, 2, 'seed-q-java-03'),
('seed-o-java-03-c', 'package', false, 3, 'seed-q-java-03'),
('seed-o-java-03-d', 'import', false, 4, 'seed-q-java-03'),
('seed-o-spring-01-a', '@Service', false, 1, 'seed-q-spring-01'),
('seed-o-spring-01-b', '@Repository', false, 2, 'seed-q-spring-01'),
('seed-o-spring-01-c', '@RestController', true, 3, 'seed-q-spring-01'),
('seed-o-spring-01-d', '@Entity', false, 4, 'seed-q-spring-01'),
('seed-o-spring-02-a', 'Xu ly nghiep vu', true, 1, 'seed-q-spring-02'),
('seed-o-spring-02-b', 'Chi hien thi CSS', false, 2, 'seed-q-spring-02'),
('seed-o-spring-02-c', 'Luu file anh', false, 3, 'seed-q-spring-02'),
('seed-o-spring-02-d', 'Tao database engine', false, 4, 'seed-q-spring-02'),
('seed-o-sql-01-a', 'WHERE', true, 1, 'seed-q-sql-01'),
('seed-o-sql-01-b', 'ORDER BY', false, 2, 'seed-q-sql-01'),
('seed-o-sql-01-c', 'INSERT', false, 3, 'seed-q-sql-01'),
('seed-o-sql-01-d', 'UPDATE', false, 4, 'seed-q-sql-01'),
('seed-o-sql-02-a', 'Xoa bang', false, 1, 'seed-q-sql-02'),
('seed-o-sql-02-b', 'Ket hop du lieu tu nhieu bang', true, 2, 'seed-q-sql-02'),
('seed-o-sql-02-c', 'Tao user moi', false, 3, 'seed-q-sql-02'),
('seed-o-sql-02-d', 'Ma hoa password', false, 4, 'seed-q-sql-02')
ON DUPLICATE KEY UPDATE option_text = VALUES(option_text), is_correct = VALUES(is_correct);

INSERT INTO assignments (id, course_id, lesson_id, title, description, assignment_type, created_by) VALUES
('seed-assign-oop-01', 'seed-course-java-oop', 'seed-les-oop-02', 'Bai tap class Student', 'Tao class Student co id, name, email va method displayInfo.', 'ESSAY', 'seed-instructor-01'),
('seed-assign-fullstack-01', 'seed-course-fullstack', 'seed-les-fullstack-01', 'Mini project goi API', 'Tao man hinh React goi API danh sach khoa hoc tu backend.', 'FILE_UPLOAD', 'seed-instructor-02')
ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description);

INSERT INTO enrollments (id, user_id, course_id, enrolled_at, status, progress_percent, last_accessed_at) VALUES
('seed-enroll-01', 'seed-student-01', 'seed-course-java-basic', DATE_SUB(@now, INTERVAL 12 DAY), 'ACTIVE', 75.00, DATE_SUB(@now, INTERVAL 1 DAY)),
('seed-enroll-02', 'seed-student-01', 'seed-course-sql', DATE_SUB(@now, INTERVAL 9 DAY), 'ACTIVE', 100.00, @now),
('seed-enroll-03', 'seed-student-02', 'seed-course-java-basic', DATE_SUB(@now, INTERVAL 7 DAY), 'ACTIVE', 35.00, DATE_SUB(@now, INTERVAL 2 DAY)),
('seed-enroll-04', 'seed-student-02', 'seed-course-react-basic', DATE_SUB(@now, INTERVAL 4 DAY), 'ACTIVE', 20.00, DATE_SUB(@now, INTERVAL 1 DAY)),
('seed-enroll-05', 'seed-student-03', 'seed-course-spring-api', DATE_SUB(@now, INTERVAL 14 DAY), 'ACTIVE', 50.00, DATE_SUB(@now, INTERVAL 3 DAY)),
('seed-enroll-06', 'seed-student-04', 'seed-course-fullstack', DATE_SUB(@now, INTERVAL 20 DAY), 'ACTIVE', 10.00, DATE_SUB(@now, INTERVAL 6 DAY)),
('seed-enroll-07', 'seed-student-05', 'seed-course-ai-chatbot', DATE_SUB(@now, INTERVAL 3 DAY), 'ACTIVE', 45.00, @now),
('seed-enroll-08', 'seed-student-06', 'seed-course-java-oop', DATE_SUB(@now, INTERVAL 11 DAY), 'ACTIVE', 60.00, DATE_SUB(@now, INTERVAL 2 DAY)),
('seed-enroll-09', 'seed-student-07', 'seed-course-sql', DATE_SUB(@now, INTERVAL 18 DAY), 'COMPLETED', 100.00, DATE_SUB(@now, INTERVAL 1 DAY)),
('seed-enroll-10', 'seed-student-08', 'seed-course-react-basic', DATE_SUB(@now, INTERVAL 2 DAY), 'ACTIVE', 0.00, NULL)
ON DUPLICATE KEY UPDATE status = VALUES(status), progress_percent = VALUES(progress_percent), last_accessed_at = VALUES(last_accessed_at);

INSERT INTO lesson_progress (id, user_id, lesson_id, is_completed, watched_seconds, last_position_sec, completed_at, last_accessed_at, created_at, updated_at) VALUES
('seed-prog-01', 'seed-student-01', 'seed-les-java-01', true, 720, 720, DATE_SUB(@now, INTERVAL 10 DAY), DATE_SUB(@now, INTERVAL 10 DAY), DATE_SUB(@now, INTERVAL 12 DAY), @now),
('seed-prog-02', 'seed-student-01', 'seed-les-java-02', true, 900, 900, DATE_SUB(@now, INTERVAL 8 DAY), DATE_SUB(@now, INTERVAL 8 DAY), DATE_SUB(@now, INTERVAL 12 DAY), @now),
('seed-prog-03', 'seed-student-01', 'seed-les-java-03', true, 840, 840, DATE_SUB(@now, INTERVAL 6 DAY), DATE_SUB(@now, INTERVAL 6 DAY), DATE_SUB(@now, INTERVAL 12 DAY), @now),
('seed-prog-04', 'seed-student-01', 'seed-les-java-04', false, 0, 0, NULL, DATE_SUB(@now, INTERVAL 1 DAY), DATE_SUB(@now, INTERVAL 12 DAY), @now),
('seed-prog-05', 'seed-student-02', 'seed-les-java-01', true, 710, 710, DATE_SUB(@now, INTERVAL 5 DAY), DATE_SUB(@now, INTERVAL 5 DAY), DATE_SUB(@now, INTERVAL 7 DAY), @now),
('seed-prog-06', 'seed-student-02', 'seed-les-java-02', false, 300, 300, NULL, DATE_SUB(@now, INTERVAL 2 DAY), DATE_SUB(@now, INTERVAL 7 DAY), @now),
('seed-prog-07', 'seed-student-03', 'seed-les-spring-01', true, 1200, 1200, DATE_SUB(@now, INTERVAL 9 DAY), DATE_SUB(@now, INTERVAL 9 DAY), DATE_SUB(@now, INTERVAL 14 DAY), @now),
('seed-prog-08', 'seed-student-05', 'seed-les-ai-01', false, 600, 600, NULL, @now, DATE_SUB(@now, INTERVAL 3 DAY), @now),
('seed-prog-09', 'seed-student-07', 'seed-les-sql-01', true, 720, 720, DATE_SUB(@now, INTERVAL 15 DAY), DATE_SUB(@now, INTERVAL 1 DAY), DATE_SUB(@now, INTERVAL 18 DAY), @now),
('seed-prog-10', 'seed-student-06', 'seed-les-oop-01', true, 1080, 1080, DATE_SUB(@now, INTERVAL 7 DAY), DATE_SUB(@now, INTERVAL 7 DAY), DATE_SUB(@now, INTERVAL 11 DAY), @now),
('seed-prog-11', 'seed-student-06', 'seed-les-oop-02', false, 0, 0, NULL, DATE_SUB(@now, INTERVAL 2 DAY), DATE_SUB(@now, INTERVAL 11 DAY), @now)
ON DUPLICATE KEY UPDATE is_completed = VALUES(is_completed), watched_seconds = VALUES(watched_seconds), last_position_sec = VALUES(last_position_sec), updated_at = VALUES(updated_at);

INSERT INTO assignment_submissions (id, assignment_id, student_id, submission_text, submitted_at, status, score, feedback, graded_by, graded_at) VALUES
('seed-sub-01', 'seed-assign-oop-01', 'seed-student-06', 'Em da tao class Student gom id, name, email va ham displayInfo.', DATE_SUB(@now, INTERVAL 2 DAY), 'GRADED', 8.5, 'Bai lam dat yeu cau, can them validate email.', 'seed-instructor-01', DATE_SUB(@now, INTERVAL 1 DAY)),
('seed-sub-02', 'seed-assign-fullstack-01', 'seed-student-04', 'Da nop file source mini project React goi API khoa hoc.', DATE_SUB(@now, INTERVAL 5 DAY), 'SUBMITTED', NULL, NULL, NULL, NULL)
ON DUPLICATE KEY UPDATE submission_text = VALUES(submission_text), status = VALUES(status), score = VALUES(score), feedback = VALUES(feedback);

INSERT INTO payments (id, payment_code, user_id, course_id, amount, currency, provider, status, bank_code, bank_name, account_number, account_name, qr_url, sepay_transaction_id, reference_code, paid_content, created_at, paid_at) VALUES
('seed-pay-01', 'LMS-SEED-0001', 'seed-student-01', 'seed-course-react-basic', 199000.00, 'VND', 'SEPAY', 'PAID', 'TPB', 'TPBank', '88826062004', 'NGUYEN TAT THANG', NULL, 'SEED-TXN-0001', 'LMSSEED0001', 'Thanh toan khoa React co ban', DATE_SUB(@now, INTERVAL 4 DAY), DATE_SUB(@now, INTERVAL 4 DAY)),
('seed-pay-02', 'LMS-SEED-0002', 'seed-student-03', 'seed-course-spring-api', 499000.00, 'VND', 'SEPAY', 'PAID', 'TPB', 'TPBank', '88826062004', 'NGUYEN TAT THANG', NULL, 'SEED-TXN-0002', 'LMSSEED0002', 'Thanh toan khoa Spring Boot REST API', DATE_SUB(@now, INTERVAL 14 DAY), DATE_SUB(@now, INTERVAL 14 DAY)),
('seed-pay-03', 'LMS-SEED-0003', 'seed-student-04', 'seed-course-fullstack', 799000.00, 'VND', 'SEPAY', 'PENDING', 'TPB', 'TPBank', '88826062004', 'NGUYEN TAT THANG', NULL, NULL, 'LMSSEED0003', 'Cho thanh toan khoa Fullstack', DATE_SUB(@now, INTERVAL 1 DAY), NULL),
('seed-pay-04', 'LMS-SEED-0004', 'seed-student-05', 'seed-course-ai-chatbot', 399000.00, 'VND', 'SEPAY', 'PAID', 'TPB', 'TPBank', '88826062004', 'NGUYEN TAT THANG', NULL, 'SEED-TXN-0004', 'LMSSEED0004', 'Thanh toan khoa AI Chatbot LMS', DATE_SUB(@now, INTERVAL 3 DAY), DATE_SUB(@now, INTERVAL 3 DAY)),
('seed-pay-05', 'LMS-SEED-0005', 'seed-student-06', 'seed-course-java-oop', 299000.00, 'VND', 'SEPAY', 'PAID', 'TPB', 'TPBank', '88826062004', 'NGUYEN TAT THANG', NULL, 'SEED-TXN-0005', 'LMSSEED0005', 'Thanh toan khoa Java OOP', DATE_SUB(@now, INTERVAL 11 DAY), DATE_SUB(@now, INTERVAL 11 DAY))
ON DUPLICATE KEY UPDATE status = VALUES(status), paid_at = VALUES(paid_at), amount = VALUES(amount);

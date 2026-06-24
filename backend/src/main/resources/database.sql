-- LMS database schema for MySQL.
-- Run from project root:
-- mysql -u root -p < backend/src/main/resources/database.sql
-- Optional sample data:
-- mysql -u root -p lms_db < backend/src/main/resources/dev-test-data.sql

CREATE DATABASE IF NOT EXISTS lms_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE lms_db;

SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS roles (
  name VARCHAR(255) NOT NULL,
  description VARCHAR(255),
  PRIMARY KEY (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) NOT NULL,
  username VARCHAR(255),
  email VARCHAR(255),
  password VARCHAR(255),
  full_name VARCHAR(255),
  avatar VARCHAR(255),
  dob DATE,
  created_at DATETIME(6),
  updated_at DATETIME(6),
  role_name VARCHAR(255),
  PRIMARY KEY (id),
  UNIQUE KEY uk_users_username (username),
  UNIQUE KEY uk_users_email (email),
  KEY idx_users_role_name (role_name),
  CONSTRAINT fk_users_role FOREIGN KEY (role_name) REFERENCES roles (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS categories (
  id VARCHAR(36) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(255),
  created_at DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_categories_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS courses (
  id VARCHAR(36) NOT NULL,
  title VARCHAR(255),
  description TEXT,
  thumbnail_url VARCHAR(255),
  status VARCHAR(255),
  visibility VARCHAR(255),
  level VARCHAR(255),
  estimated_hours INT,
  price DECIMAL(12,2),
  currency VARCHAR(255),
  paid BIT(1),
  category_id VARCHAR(36),
  instructor_id VARCHAR(36),
  PRIMARY KEY (id),
  KEY idx_courses_category_id (category_id),
  KEY idx_courses_instructor_id (instructor_id),
  CONSTRAINT fk_courses_category FOREIGN KEY (category_id) REFERENCES categories (id),
  CONSTRAINT fk_courses_instructor FOREIGN KEY (instructor_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS course_sections (
  id VARCHAR(36) NOT NULL,
  title VARCHAR(255),
  order_index INT NOT NULL DEFAULT 0,
  description VARCHAR(255),
  course_id VARCHAR(36),
  PRIMARY KEY (id),
  KEY idx_course_sections_course_id (course_id),
  CONSTRAINT fk_course_sections_course FOREIGN KEY (course_id) REFERENCES courses (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS lessons (
  id VARCHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content LONGTEXT,
  description TEXT,
  video_url VARCHAR(255),
  video_transcript LONGTEXT,
  video_transcript_source VARCHAR(255),
  video_transcript_updated_at DATETIME(6),
  thumbnail_url VARCHAR(255),
  duration_minutes INT,
  is_published BIT(1),
  is_preview BIT(1),
  order_index INT,
  created_at DATETIME(6),
  updated_at DATETIME(6),
  section_id VARCHAR(36),
  PRIMARY KEY (id),
  KEY idx_lessons_section_id (section_id),
  CONSTRAINT fk_lessons_section FOREIGN KEY (section_id) REFERENCES course_sections (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quizzes (
  id VARCHAR(36) NOT NULL,
  course_id VARCHAR(36),
  lesson_id VARCHAR(36),
  title VARCHAR(255),
  description TEXT,
  quiz_scope VARCHAR(255),
  time_limit_minutes INT,
  max_attempts INT,
  passing_score INT,
  is_published BIT(1) NOT NULL DEFAULT b'0',
  created_source VARCHAR(255),
  created_by VARCHAR(36),
  PRIMARY KEY (id),
  KEY idx_quizzes_course_id (course_id),
  KEY idx_quizzes_lesson_id (lesson_id),
  KEY idx_quizzes_created_by (created_by),
  CONSTRAINT fk_quizzes_course FOREIGN KEY (course_id) REFERENCES courses (id),
  CONSTRAINT fk_quizzes_lesson FOREIGN KEY (lesson_id) REFERENCES lessons (id),
  CONSTRAINT fk_quizzes_created_by FOREIGN KEY (created_by) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quiz_questions (
  id VARCHAR(36) NOT NULL,
  quiz_id VARCHAR(36) NOT NULL,
  question_text TEXT NOT NULL,
  question_type VARCHAR(255),
  explanation TEXT,
  order_index INT,
  created_source VARCHAR(255),
  created_at DATETIME(6),
  PRIMARY KEY (id),
  KEY idx_quiz_questions_quiz_id (quiz_id),
  CONSTRAINT fk_quiz_questions_quiz FOREIGN KEY (quiz_id) REFERENCES quizzes (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quiz_options (
  id VARCHAR(36) NOT NULL,
  option_text TEXT NOT NULL,
  is_correct BIT(1) NOT NULL,
  order_index INT,
  question_id VARCHAR(36) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_quiz_options_question_id (question_id),
  CONSTRAINT fk_quiz_options_question FOREIGN KEY (question_id) REFERENCES quiz_questions (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id VARCHAR(36) NOT NULL,
  quiz_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  attempt_no INT,
  score DOUBLE,
  total_score DOUBLE,
  started_at DATETIME(6),
  submitted_at DATETIME(6),
  status VARCHAR(255),
  PRIMARY KEY (id),
  UNIQUE KEY uq_quiz_attempt_no (quiz_id, user_id, attempt_no),
  KEY idx_quiz_attempts_user_id (user_id),
  CONSTRAINT fk_quiz_attempts_quiz FOREIGN KEY (quiz_id) REFERENCES quizzes (id),
  CONSTRAINT fk_quiz_attempts_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quiz_attempt_answers (
  id VARCHAR(36) NOT NULL,
  attempt_id VARCHAR(36) NOT NULL,
  question_id VARCHAR(36) NOT NULL,
  selected_option_id VARCHAR(36),
  answer_text TEXT,
  is_correct BIT(1),
  earned_points DOUBLE,
  PRIMARY KEY (id),
  KEY idx_quiz_attempt_answers_attempt_id (attempt_id),
  KEY idx_quiz_attempt_answers_question_id (question_id),
  KEY idx_quiz_attempt_answers_selected_option_id (selected_option_id),
  CONSTRAINT fk_quiz_attempt_answers_attempt FOREIGN KEY (attempt_id) REFERENCES quiz_attempts (id),
  CONSTRAINT fk_quiz_attempt_answers_question FOREIGN KEY (question_id) REFERENCES quiz_questions (id),
  CONSTRAINT fk_quiz_attempt_answers_option FOREIGN KEY (selected_option_id) REFERENCES quiz_options (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS assignments (
  id VARCHAR(36) NOT NULL,
  course_id VARCHAR(36) NOT NULL,
  lesson_id VARCHAR(36),
  title VARCHAR(255),
  description TEXT,
  assignment_type VARCHAR(255),
  created_by VARCHAR(36) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_assignments_course_id (course_id),
  KEY idx_assignments_lesson_id (lesson_id),
  KEY idx_assignments_created_by (created_by),
  CONSTRAINT fk_assignments_course FOREIGN KEY (course_id) REFERENCES courses (id),
  CONSTRAINT fk_assignments_lesson FOREIGN KEY (lesson_id) REFERENCES lessons (id),
  CONSTRAINT fk_assignments_created_by FOREIGN KEY (created_by) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS assignment_submissions (
  id VARCHAR(36) NOT NULL,
  assignment_id VARCHAR(36) NOT NULL,
  student_id VARCHAR(36) NOT NULL,
  submission_text LONGTEXT,
  submitted_at DATETIME(6),
  status VARCHAR(255),
  score DOUBLE,
  feedback TEXT,
  graded_by VARCHAR(36),
  graded_at DATETIME(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_assignment_student (assignment_id, student_id),
  KEY idx_assignment_submissions_student_id (student_id),
  KEY idx_assignment_submissions_graded_by (graded_by),
  CONSTRAINT fk_assignment_submissions_assignment FOREIGN KEY (assignment_id) REFERENCES assignments (id),
  CONSTRAINT fk_assignment_submissions_student FOREIGN KEY (student_id) REFERENCES users (id),
  CONSTRAINT fk_assignment_submissions_graded_by FOREIGN KEY (graded_by) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS submission_files (
  id VARCHAR(36) NOT NULL,
  submission_id VARCHAR(36) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_url VARCHAR(255) NOT NULL,
  file_type VARCHAR(255),
  file_size BIGINT,
  uploaded_at DATETIME(6),
  PRIMARY KEY (id),
  KEY idx_submission_files_submission_id (submission_id),
  CONSTRAINT fk_submission_files_submission FOREIGN KEY (submission_id) REFERENCES assignment_submissions (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS enrollments (
  id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36),
  course_id VARCHAR(36),
  enrolled_at DATETIME(6),
  status VARCHAR(255),
  progress_percent DOUBLE,
  last_accessed_at DATETIME(6),
  PRIMARY KEY (id),
  KEY idx_enrollments_user_id (user_id),
  KEY idx_enrollments_course_id (course_id),
  CONSTRAINT fk_enrollments_user FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT fk_enrollments_course FOREIGN KEY (course_id) REFERENCES courses (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS lesson_progress (
  id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36),
  lesson_id VARCHAR(36),
  is_completed BIT(1),
  watched_seconds INT,
  last_position_sec INT,
  completed_at DATETIME(6),
  last_accessed_at DATETIME(6),
  created_at DATETIME(6),
  updated_at DATETIME(6),
  PRIMARY KEY (id),
  KEY idx_lesson_progress_user_id (user_id),
  KEY idx_lesson_progress_lesson_id (lesson_id),
  CONSTRAINT fk_lesson_progress_user FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT fk_lesson_progress_lesson FOREIGN KEY (lesson_id) REFERENCES lessons (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS lesson_notes (
  id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  lesson_id VARCHAR(36) NOT NULL,
  note_content TEXT NOT NULL,
  time_marker_sec INT,
  created_at DATETIME(6),
  updated_at DATETIME(6),
  PRIMARY KEY (id),
  KEY idx_lesson_notes_user_id (user_id),
  KEY idx_lesson_notes_lesson_id (lesson_id),
  CONSTRAINT fk_lesson_notes_user FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT fk_lesson_notes_lesson FOREIGN KEY (lesson_id) REFERENCES lessons (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS lesson_resources (
  id VARCHAR(36) NOT NULL,
  lesson_id VARCHAR(36) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_url VARCHAR(255) NOT NULL,
  file_type VARCHAR(255),
  file_size BIGINT,
  created_at DATETIME(6),
  PRIMARY KEY (id),
  KEY idx_lesson_resources_lesson_id (lesson_id),
  CONSTRAINT fk_lesson_resources_lesson FOREIGN KEY (lesson_id) REFERENCES lessons (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS discussion_topics (
  id VARCHAR(36) NOT NULL,
  course_id VARCHAR(36),
  lesson_id VARCHAR(36),
  created_by VARCHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content LONGTEXT NOT NULL,
  is_pinned BIT(1) NOT NULL,
  is_locked BIT(1) NOT NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_discussion_topics_course_id (course_id),
  KEY idx_discussion_topics_lesson_id (lesson_id),
  KEY idx_discussion_topics_created_by (created_by),
  CONSTRAINT fk_discussion_topics_course FOREIGN KEY (course_id) REFERENCES courses (id),
  CONSTRAINT fk_discussion_topics_lesson FOREIGN KEY (lesson_id) REFERENCES lessons (id),
  CONSTRAINT fk_discussion_topics_created_by FOREIGN KEY (created_by) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS discussion_replies (
  id VARCHAR(36) NOT NULL,
  topic_id VARCHAR(36) NOT NULL,
  parent_reply_id VARCHAR(36),
  user_id VARCHAR(36) NOT NULL,
  content LONGTEXT NOT NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_discussion_replies_topic_id (topic_id),
  KEY idx_discussion_replies_parent_reply_id (parent_reply_id),
  KEY idx_discussion_replies_user_id (user_id),
  CONSTRAINT fk_discussion_replies_topic FOREIGN KEY (topic_id) REFERENCES discussion_topics (id),
  CONSTRAINT fk_discussion_replies_parent FOREIGN KEY (parent_reply_id) REFERENCES discussion_replies (id),
  CONSTRAINT fk_discussion_replies_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chatbot_conversations (
  id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  title VARCHAR(255),
  context_type VARCHAR(255) NOT NULL,
  course_id VARCHAR(36),
  lesson_id VARCHAR(36),
  created_at DATETIME(6),
  updated_at DATETIME(6),
  PRIMARY KEY (id),
  KEY idx_chatbot_conversations_user_id (user_id),
  KEY idx_chatbot_conversations_course_id (course_id),
  KEY idx_chatbot_conversations_lesson_id (lesson_id),
  CONSTRAINT fk_chatbot_conversations_user FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT fk_chatbot_conversations_course FOREIGN KEY (course_id) REFERENCES courses (id),
  CONSTRAINT fk_chatbot_conversations_lesson FOREIGN KEY (lesson_id) REFERENCES lessons (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chatbot_messages (
  id BIGINT NOT NULL AUTO_INCREMENT,
  conversation_id VARCHAR(36) NOT NULL,
  sender_type VARCHAR(255) NOT NULL,
  message_text LONGTEXT NOT NULL,
  metadata_json JSON,
  created_at DATETIME(6),
  PRIMARY KEY (id),
  KEY idx_chatbot_messages_conversation_id (conversation_id),
  CONSTRAINT fk_chatbot_messages_conversation FOREIGN KEY (conversation_id) REFERENCES chatbot_conversations (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payments (
  id VARCHAR(36) NOT NULL,
  payment_code VARCHAR(255) NOT NULL,
  user_id VARCHAR(36),
  course_id VARCHAR(36),
  amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(255),
  provider VARCHAR(255),
  status VARCHAR(255) NOT NULL,
  bank_code VARCHAR(255),
  bank_name VARCHAR(255),
  account_number VARCHAR(255),
  account_name VARCHAR(255),
  qr_url TEXT,
  sepay_transaction_id VARCHAR(255),
  reference_code VARCHAR(255),
  paid_content TEXT,
  created_at DATETIME(6),
  paid_at DATETIME(6),
  PRIMARY KEY (id),
  UNIQUE KEY uk_payments_payment_code (payment_code),
  KEY idx_payments_user_id (user_id),
  KEY idx_payments_course_id (course_id),
  CONSTRAINT fk_payments_user FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT fk_payments_course FOREIGN KEY (course_id) REFERENCES courses (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id VARCHAR(36) NOT NULL,
  token_hash VARCHAR(64) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  expires_at DATETIME(6) NOT NULL,
  used BIT(1) NOT NULL,
  used_at DATETIME(6),
  created_at DATETIME(6),
  PRIMARY KEY (id),
  UNIQUE KEY uk_password_reset_tokens_token_hash (token_hash),
  KEY idx_password_reset_tokens_user_id (user_id),
  CONSTRAINT fk_password_reset_tokens_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS app_notifications (
  id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  type VARCHAR(60) NOT NULL,
  title VARCHAR(180) NOT NULL,
  message VARCHAR(1000),
  target_url VARCHAR(500),
  is_read BIT(1) NOT NULL,
  created_at DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_app_notifications_user_id (user_id),
  CONSTRAINT fk_app_notifications_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_notification_settings (
  id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  new_lesson_email BIT(1) NOT NULL,
  new_assignment_email BIT(1) NOT NULL,
  weekly_progress_email BIT(1) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_user_notification_settings_user_id (user_id),
  CONSTRAINT fk_user_notification_settings_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS invalidated_token (
  id VARCHAR(255) NOT NULL,
  expiry_time DATETIME(6),
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO roles (name, description) VALUES
('ADMIN', 'Administrator'),
('INSTRUCTOR', 'Instructor'),
('STUDENT', 'Student')
ON DUPLICATE KEY UPDATE description = VALUES(description);

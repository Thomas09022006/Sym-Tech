-- InnovateX Quiz Platform — MySQL Schema
-- Run: mysql -u root -p < database/schema.sql

CREATE DATABASE IF NOT EXISTS innovatex_quiz
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE innovatex_quiz;

-- Drop old tables (safe to re-run)
DROP TABLE IF EXISTS quiz_attempts;
DROP TABLE IF EXISTS quiz_results;
DROP TABLE IF EXISTS quiz_settings;
DROP TABLE IF EXISTS questions;
DROP TABLE IF EXISTS registrations;
-- ═══════════════════════════════════════
-- REGISTRATIONS
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS registrations (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    reg_id        VARCHAR(20)  NOT NULL UNIQUE,
    name          VARCHAR(100) NOT NULL,
    roll          VARCHAR(30)  NOT NULL,
    year          VARCHAR(20)  NOT NULL,
    dept          VARCHAR(20)  NOT NULL,
    phone         VARCHAR(15)  DEFAULT NULL,
    email         VARCHAR(100) DEFAULT NULL,
    college       VARCHAR(150) DEFAULT 'CSI College of Engineering',
    quiz_done     BOOLEAN      DEFAULT FALSE,
    created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_roll (roll)
);

-- ═══════════════════════════════════════
-- QUESTIONS
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS questions (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    question        TEXT         NOT NULL,
    option_a        VARCHAR(255) NOT NULL,
    option_b        VARCHAR(255) NOT NULL,
    option_c        VARCHAR(255) NOT NULL,
    option_d        VARCHAR(255) NOT NULL,
    correct_answer  TINYINT      NOT NULL COMMENT '0=A, 1=B, 2=C, 3=D',
    topic           VARCHAR(60)  NOT NULL,
    difficulty      ENUM('easy','hard') NOT NULL DEFAULT 'easy',
    created_at      DATETIME     DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════
-- QUIZ RESULTS (Leaderboard)
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS quiz_results (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    roll            VARCHAR(30)  NOT NULL,
    dept            VARCHAR(20)  DEFAULT '',
    score           INT          NOT NULL COMMENT 'Percentage 0-100',
    correct_count   INT          NOT NULL,
    total_questions INT          NOT NULL,
    time_taken      INT          NOT NULL COMMENT 'Total seconds',
    screenshot_attempts INT      NOT NULL DEFAULT 0,
    flagged_cheater BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at      DATETIME     DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_score_time (score DESC, time_taken ASC)
);

-- ═══════════════════════════════════════
-- QUIZ ATTEMPTS (one-time enforcement)
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS quiz_attempts (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    roll          VARCHAR(30)  NOT NULL UNIQUE,
    attempted_at  DATETIME     DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════
-- QUIZ SETTINGS
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS quiz_settings (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    timer_seconds       INT     NOT NULL DEFAULT 30,
    questions_per_quiz  INT     NOT NULL DEFAULT 40,
    shuffle_questions   BOOLEAN NOT NULL DEFAULT TRUE,
    shuffle_options     BOOLEAN NOT NULL DEFAULT FALSE
);

-- Insert default settings row
INSERT INTO quiz_settings (timer_seconds, questions_per_quiz, shuffle_questions, shuffle_options)
VALUES (30, 40, TRUE, FALSE);

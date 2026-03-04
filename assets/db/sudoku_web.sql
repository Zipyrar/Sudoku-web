CREATE DATABASE IF NOT EXISTS sudoku_web
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE sudoku_web;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(32) NOT NULL UNIQUE,
    email VARCHAR(120) NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS games (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    status ENUM('in_progress','win','loss','abandoned') NOT NULL DEFAULT 'in_progress',
    difficulty ENUM('easy','medium','hard','expert') NOT NULL,

    time_sec INT NOT NULL DEFAULT 0,
    mistakes INT NOT NULL DEFAULT 0,
    correct INT NOT NULL DEFAULT 0,
    hints_used INT NOT NULL DEFAULT 0,

    state_json LONGTEXT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_games_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_stats (
    user_id INT PRIMARY KEY,
    played INT NOT NULL DEFAULT 0,
    wins INT NOT NULL DEFAULT 0,
    losses INT NOT NULL DEFAULT 0,
    best_time_sec INT NULL,
    total_correct BIGINT NOT NULL DEFAULT 0,
    total_mistakes BIGINT NOT NULL DEFAULT 0,
    fav_easy INT NOT NULL DEFAULT 0,
    fav_medium INT NOT NULL DEFAULT 0,
    fav_hard INT NOT NULL DEFAULT 0,
    fav_expert INT NOT NULL DEFAULT 0,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_stats_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
);
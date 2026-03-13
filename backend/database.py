import sqlite3
import os
from datetime import datetime

# Database path
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "scam_detector.db")


def get_db():
    """Get database connection with row factory."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    """Initialize database with all required tables."""
    conn = get_db()
    cursor = conn.cursor()

    # Users table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_admin INTEGER DEFAULT 0
        )
    """)

    # Scan history table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS scan_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            url TEXT NOT NULL,
            job_title TEXT,
            company_name TEXT,
            risk_score REAL,
            risk_level TEXT,
            nlp_score REAL,
            salary_score REAL,
            domain_score REAL,
            description TEXT,
            salary TEXT,
            email_found TEXT,
            scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    # Resume uploads table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS resumes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            filename TEXT NOT NULL,
            extracted_text TEXT,
            skills TEXT,
            experience TEXT,
            education TEXT,
            uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    # Resume-Job match history
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS match_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            resume_id INTEGER NOT NULL,
            job_url TEXT,
            job_title TEXT,
            match_score REAL,
            strengths TEXT,
            weaknesses TEXT,
            recommendations TEXT,
            matched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (resume_id) REFERENCES resumes(id)
        )
    """)

    # Community scam reports
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS scam_reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            job_url TEXT,
            company_name TEXT NOT NULL,
            job_title TEXT,
            description TEXT NOT NULL,
            evidence TEXT,
            category TEXT DEFAULT 'other',
            status TEXT DEFAULT 'pending',
            upvotes INTEGER DEFAULT 0,
            downvotes INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    # Report votes (prevent duplicate voting)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS report_votes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            report_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            vote_type TEXT NOT NULL CHECK(vote_type IN ('up', 'down')),
            voted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (report_id) REFERENCES scam_reports(id),
            FOREIGN KEY (user_id) REFERENCES users(id),
            UNIQUE(report_id, user_id)
        )
    """)

    # Company blacklist (auto-generated from reports)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS company_blacklist (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_name TEXT UNIQUE NOT NULL,
            domain TEXT,
            total_reports INTEGER DEFAULT 1,
            trust_score REAL DEFAULT 50.0,
            blacklisted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_reported TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Model metrics (for analytics dashboard)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS model_metrics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            model_name TEXT NOT NULL,
            accuracy REAL,
            precision_score REAL,
            recall REAL,
            f1_score REAL,
            training_samples INTEGER,
            test_samples INTEGER,
            trained_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    conn.commit()
    conn.close()
    print("Database initialized successfully!")


# Initialize on import
init_db()

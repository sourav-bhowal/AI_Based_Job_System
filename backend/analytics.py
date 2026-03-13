"""Analytics endpoints for dashboard data."""

import json
import os
from database import get_db
from datetime import datetime

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))


def get_overview_stats() -> dict:
    """Get overall platform statistics."""
    conn = get_db()

    total_users = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    total_scans = conn.execute("SELECT COUNT(*) FROM scan_history").fetchone()[0]
    total_reports = conn.execute("SELECT COUNT(*) FROM scam_reports").fetchone()[0]
    total_resumes = conn.execute("SELECT COUNT(*) FROM resumes").fetchone()[0]
    blacklisted = conn.execute("SELECT COUNT(*) FROM company_blacklist").fetchone()[0]

    # Average risk score
    avg_risk = conn.execute("SELECT AVG(risk_score) FROM scan_history").fetchone()[0]

    # Scans today
    today = datetime.now().strftime("%Y-%m-%d")
    scans_today = conn.execute(
        "SELECT COUNT(*) FROM scan_history WHERE DATE(scanned_at) = ?", (today,)
    ).fetchone()[0]

    # Risk distribution
    high_risk = conn.execute("SELECT COUNT(*) FROM scan_history WHERE risk_level = 'High Risk'").fetchone()[0]
    medium_risk = conn.execute("SELECT COUNT(*) FROM scan_history WHERE risk_level = 'Medium Risk'").fetchone()[0]
    safe = conn.execute("SELECT COUNT(*) FROM scan_history WHERE risk_level = 'Safe'").fetchone()[0]

    conn.close()

    return {
        "total_users": total_users,
        "total_scans": total_scans,
        "total_reports": total_reports,
        "total_resumes": total_resumes,
        "blacklisted_companies": blacklisted,
        "average_risk_score": round(avg_risk, 1) if avg_risk else 0,
        "scans_today": scans_today,
        "risk_distribution": {
            "high_risk": high_risk,
            "medium_risk": medium_risk,
            "safe": safe,
        },
    }


def get_scan_trends(days: int = 30) -> list:
    """Get scan count trends for the last N days."""
    conn = get_db()

    results = conn.execute("""
        SELECT DATE(scanned_at) as date, 
               COUNT(*) as count,
               AVG(risk_score) as avg_score
        FROM scan_history 
        WHERE scanned_at >= datetime('now', ?)
        GROUP BY DATE(scanned_at)
        ORDER BY date
    """, (f"-{days} days",)).fetchall()

    conn.close()

    return [
        {
            "date": row["date"],
            "count": row["count"],
            "avg_risk_score": round(row["avg_score"], 1) if row["avg_score"] else 0,
        }
        for row in results
    ]


def get_top_reported_companies(limit: int = 10) -> list:
    """Get most reported companies."""
    conn = get_db()

    results = conn.execute("""
        SELECT company_name, 
               COUNT(*) as report_count,
               SUM(upvotes) as total_upvotes
        FROM scam_reports 
        GROUP BY LOWER(company_name)
        ORDER BY report_count DESC
        LIMIT ?
    """, (limit,)).fetchall()

    conn.close()

    return [
        {
            "company_name": row["company_name"],
            "report_count": row["report_count"],
            "total_upvotes": row["total_upvotes"] or 0,
        }
        for row in results
    ]


def get_model_comparison() -> dict:
    """Get model comparison metrics."""
    # Try JSON file first (more detailed)
    metrics_path = os.path.join(SCRIPT_DIR, "model_metrics.json")
    if os.path.exists(metrics_path):
        with open(metrics_path, "r") as f:
            return json.load(f)

    # Fallback to database
    conn = get_db()
    results = conn.execute("""
        SELECT * FROM model_metrics 
        ORDER BY trained_at DESC
    """).fetchall()
    conn.close()

    if not results:
        return {"message": "No model metrics available. Run train_model.py first."}

    models = []
    for row in results:
        models.append({
            "model_name": row["model_name"],
            "accuracy": row["accuracy"],
            "precision": row["precision_score"],
            "recall": row["recall"],
            "f1_score": row["f1_score"],
            "training_samples": row["training_samples"],
            "test_samples": row["test_samples"],
        })

    return {"models": models}


def get_recent_scans(limit: int = 20) -> list:
    """Get recent scan history."""
    conn = get_db()

    results = conn.execute("""
        SELECT sh.*, u.username 
        FROM scan_history sh
        LEFT JOIN users u ON sh.user_id = u.id
        ORDER BY sh.scanned_at DESC
        LIMIT ?
    """, (limit,)).fetchall()

    conn.close()

    return [dict(row) for row in results]


def get_report_categories() -> list:
    """Get scam report distribution by category."""
    conn = get_db()

    results = conn.execute("""
        SELECT category, COUNT(*) as count 
        FROM scam_reports 
        GROUP BY category 
        ORDER BY count DESC
    """).fetchall()

    conn.close()

    return [{"category": row["category"], "count": row["count"]} for row in results]

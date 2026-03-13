"""Community scam reporting system."""

from database import get_db
from datetime import datetime


def create_report(user_id: int, company_name: str, description: str,
                  job_url: str = None, job_title: str = None,
                  evidence: str = None, category: str = "other") -> dict:
    """Create a new scam report."""
    conn = get_db()

    cursor = conn.execute(
        """INSERT INTO scam_reports 
           (user_id, job_url, company_name, job_title, description, evidence, category)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (user_id, job_url, company_name, job_title, description, evidence, category)
    )
    report_id = cursor.lastrowid

    # Auto-update blacklist
    _update_blacklist(conn, company_name)

    conn.commit()
    conn.close()

    return {"report_id": report_id, "message": "Report submitted successfully"}


def get_reports(page: int = 1, per_page: int = 20, category: str = None) -> dict:
    """Get community reports with pagination."""
    conn = get_db()
    offset = (page - 1) * per_page

    query = """
        SELECT sr.*, u.username 
        FROM scam_reports sr
        LEFT JOIN users u ON sr.user_id = u.id
    """
    params = []

    if category:
        query += " WHERE sr.category = ?"
        params.append(category)

    # Total count
    count_query = f"SELECT COUNT(*) FROM ({query})"
    total = conn.execute(count_query, params).fetchone()[0]

    query += " ORDER BY sr.created_at DESC LIMIT ? OFFSET ?"
    params.extend([per_page, offset])

    reports = conn.execute(query, params).fetchall()
    conn.close()

    return {
        "reports": [dict(r) for r in reports],
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": (total + per_page - 1) // per_page,
    }


def vote_report(report_id: int, user_id: int, vote_type: str) -> dict:
    """Vote on a scam report (upvote or downvote)."""
    if vote_type not in ("up", "down"):
        raise ValueError("vote_type must be 'up' or 'down'")

    conn = get_db()

    # Check for existing vote
    existing = conn.execute(
        "SELECT id, vote_type FROM report_votes WHERE report_id = ? AND user_id = ?",
        (report_id, user_id)
    ).fetchone()

    if existing:
        if existing["vote_type"] == vote_type:
            # Remove vote (toggle off)
            conn.execute("DELETE FROM report_votes WHERE id = ?", (existing["id"],))
            column = "upvotes" if vote_type == "up" else "downvotes"
            conn.execute(f"UPDATE scam_reports SET {column} = {column} - 1 WHERE id = ?", (report_id,))
            conn.commit()
            conn.close()
            return {"message": "Vote removed", "action": "removed"}
        else:
            # Change vote
            conn.execute(
                "UPDATE report_votes SET vote_type = ? WHERE id = ?",
                (vote_type, existing["id"])
            )
            # Adjust counts
            if vote_type == "up":
                conn.execute("UPDATE scam_reports SET upvotes = upvotes + 1, downvotes = downvotes - 1 WHERE id = ?", (report_id,))
            else:
                conn.execute("UPDATE scam_reports SET upvotes = upvotes - 1, downvotes = downvotes + 1 WHERE id = ?", (report_id,))
            conn.commit()
            conn.close()
            return {"message": "Vote changed", "action": "changed"}
    else:
        # New vote
        conn.execute(
            "INSERT INTO report_votes (report_id, user_id, vote_type) VALUES (?, ?, ?)",
            (report_id, user_id, vote_type)
        )
        column = "upvotes" if vote_type == "up" else "downvotes"
        conn.execute(f"UPDATE scam_reports SET {column} = {column} + 1 WHERE id = ?", (report_id,))
        conn.commit()
        conn.close()
        return {"message": "Vote recorded", "action": "added"}


def _update_blacklist(conn, company_name: str):
    """Auto-update company blacklist based on report count."""
    report_count = conn.execute(
        "SELECT COUNT(*) FROM scam_reports WHERE LOWER(company_name) = ?",
        (company_name.lower(),)
    ).fetchone()[0]

    if report_count >= 3:  # Auto-blacklist after 3 reports
        existing = conn.execute(
            "SELECT id FROM company_blacklist WHERE LOWER(company_name) = ?",
            (company_name.lower(),)
        ).fetchone()

        trust_score = max(0, 50 - (report_count * 10))

        if existing:
            conn.execute(
                """UPDATE company_blacklist 
                   SET total_reports = ?, trust_score = ?, last_reported = CURRENT_TIMESTAMP
                   WHERE id = ?""",
                (report_count, trust_score, existing["id"])
            )
        else:
            conn.execute(
                """INSERT INTO company_blacklist (company_name, total_reports, trust_score)
                   VALUES (?, ?, ?)""",
                (company_name, report_count, trust_score)
            )


def get_blacklist() -> list:
    """Get the full company blacklist."""
    conn = get_db()
    results = conn.execute(
        "SELECT * FROM company_blacklist ORDER BY total_reports DESC"
    ).fetchall()
    conn.close()
    return [dict(r) for r in results]

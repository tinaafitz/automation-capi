#!/usr/bin/env python3
"""
Database migration script for helm_tests.db
Adds chart_source, git_branch, and install_method columns
"""

import sqlite3
import os
import sys


def migrate_database():
    """Add new columns to existing helm_test_results table"""

    db_path = os.path.join(os.path.dirname(__file__), "helm_tests.db")

    print(f"🔄 Migrating database: {db_path}")

    if not os.path.exists(db_path):
        print("⚠️  Database doesn't exist yet - will be created with new schema on first use")
        return True

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Check if columns already exist
        cursor.execute("PRAGMA table_info(helm_test_results)")
        columns = [row[1] for row in cursor.fetchall()]

        print(f"📋 Existing columns: {columns}")

        migrations_needed = []

        if "chart_source" not in columns:
            migrations_needed.append("chart_source")

        if "git_branch" not in columns:
            migrations_needed.append("git_branch")

        if "install_method" not in columns:
            migrations_needed.append("install_method")

        if not migrations_needed:
            print("✅ Database already up to date - no migration needed")
            conn.close()
            return True

        print(f"🔧 Adding columns: {migrations_needed}")

        # Add missing columns
        if "chart_source" in migrations_needed:
            cursor.execute("""
                ALTER TABLE helm_test_results
                ADD COLUMN chart_source TEXT DEFAULT 'helm_repo'
            """)
            print("  ✓ Added chart_source column")

        if "git_branch" in migrations_needed:
            cursor.execute("""
                ALTER TABLE helm_test_results
                ADD COLUMN git_branch TEXT
            """)
            print("  ✓ Added git_branch column")

        if "install_method" in migrations_needed:
            cursor.execute("""
                ALTER TABLE helm_test_results
                ADD COLUMN install_method TEXT DEFAULT 'helm_repo'
            """)
            print("  ✓ Added install_method column")

        conn.commit()

        # Verify columns were added
        cursor.execute("PRAGMA table_info(helm_test_results)")
        new_columns = [row[1] for row in cursor.fetchall()]
        print(f"📋 Updated columns: {new_columns}")

        conn.close()

        print("✅ Database migration completed successfully!")
        return True

    except Exception as e:
        print(f"❌ Migration failed: {str(e)}")
        import traceback

        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = migrate_database()
    sys.exit(0 if success else 1)

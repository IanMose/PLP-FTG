"""
Sentinel — Load Module

V4: Writes ETL output directly to PostgreSQL via psycopg2.
Local DuckDB/Parquet warehouse retained for dev convenience when WAREHOUSE_ENABLED=true.

Responsible for:
- Writing trusted and corrected output to PostgreSQL fact tables
- Maintaining local DuckDB warehouse (optional, for local dev)
- Recording ingest_log entries for batch tracking
"""

import argparse
import logging
import os
from datetime import datetime
from pathlib import Path

import duckdb
import pandas as pd

log = logging.getLogger(__name__)

# Local warehouse enabled by env var (dev convenience)
WAREHOUSE_ENABLED = os.environ.get("WAREHOUSE_ENABLED", "false").lower() == "true"


# ─────────────────────────────────────────────────────────────────────────────
# PostgreSQL Direct Writes (V4)
# ─────────────────────────────────────────────────────────────────────────────

def load_incidents(df, batch_id: str) -> int:
    """Insert trusted/corrected incidents to PostgreSQL. ON CONFLICT DO NOTHING."""
    if df is None or df.empty:
        return 0

    try:
        from src.db import get_connection, execute_batch
    except ImportError:
        log.warning("psycopg2 not available, skipping PostgreSQL write for incidents")
        return 0

    SQL = """
        INSERT INTO fact_incidents
            (incident_id, site_id, incident_date, severity, description,
             compliance_score, status, decision, decision_reason,
             batch_id, ingestion_timestamp)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (incident_id) DO NOTHING
    """

    rows = []
    for row in df.itertuples():
        rows.append((
            row.incident_id,
            getattr(row, 'site', getattr(row, 'site_id', '')).lower(),
            getattr(row, 'incident_date', None),
            getattr(row, 'severity', None),
            getattr(row, 'description', None),
            getattr(row, 'compliance_score', None),
            getattr(row, 'status', 'Open'),
            getattr(row, 'decision', 'trusted'),
            getattr(row, 'decision_reason', None),
            batch_id,
            datetime.utcnow(),
        ))

    try:
        with get_connection() as conn:
            count = execute_batch(conn, SQL, rows)
        log.info("load_incidents: inserted %d rows (batch_id=%s)", count, batch_id[:8])
        return count
    except Exception as e:
        log.error("load_incidents failed: %s", e)
        return 0


def load_audits(df, batch_id: str) -> int:
    """Insert trusted/corrected audits to PostgreSQL. ON CONFLICT DO NOTHING."""
    if df is None or df.empty:
        return 0

    try:
        from src.db import get_connection, execute_batch
    except ImportError:
        log.warning("psycopg2 not available, skipping PostgreSQL write for audits")
        return 0

    SQL = """
        INSERT INTO fact_audits
            (audit_id, site_id, inspection_date, auditor, findings,
             compliance_score, follow_up_required, decision, decision_reason,
             batch_id, ingestion_timestamp)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (audit_id) DO NOTHING
    """

    rows = []
    for row in df.itertuples():
        rows.append((
            row.audit_id,
            getattr(row, 'site', getattr(row, 'site_id', '')).lower(),
            getattr(row, 'inspection_date', None),
            getattr(row, 'auditor', None),
            getattr(row, 'findings_detail', getattr(row, 'findings', None)),
            getattr(row, 'compliance_score', None),
            bool(getattr(row, 'follow_up_required', False)),
            getattr(row, 'decision', 'trusted'),
            getattr(row, 'decision_reason', None),
            batch_id,
            datetime.utcnow(),
        ))

    try:
        with get_connection() as conn:
            count = execute_batch(conn, SQL, rows)
        log.info("load_audits: inserted %d rows (batch_id=%s)", count, batch_id[:8])
        return count
    except Exception as e:
        log.error("load_audits failed: %s", e)
        return 0


def load_tank_telemetry(df, batch_id: str) -> int:
    """Insert tank telemetry readings to PostgreSQL. ON CONFLICT DO NOTHING."""
    if df is None or df.empty:
        return 0

    try:
        from src.db import get_connection, execute_batch
    except ImportError:
        log.warning("psycopg2 not available, skipping PostgreSQL write for tank telemetry")
        return 0

    SQL = """
        INSERT INTO fact_tank_telemetry
            (reading_id, site_id, tank_id, reading_timestamp,
             tank_level_pct, flow_rate_bph, valve_status, overfill_flag, batch_id)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (reading_id) DO NOTHING
    """

    rows = []
    for row in df.itertuples():
        rows.append((
            row.reading_id,
            getattr(row, 'site_id', '').lower(),
            getattr(row, 'tank_id', None),
            getattr(row, 'reading_timestamp', datetime.utcnow()),
            float(getattr(row, 'tank_level_pct', 0)),
            getattr(row, 'flow_rate_bph', None),
            getattr(row, 'valve_status', 'Unknown'),
            bool(getattr(row, 'overfill_flag', False)),
            batch_id,
        ))

    try:
        with get_connection() as conn:
            count = execute_batch(conn, SQL, rows)
        log.info("load_tank_telemetry: inserted %d rows (batch_id=%s)", count, batch_id[:8])
        return count
    except Exception as e:
        log.error("load_tank_telemetry failed: %s", e)
        return 0


def load_predictions(df, model_version: str) -> int:
    """Insert predictions to PostgreSQL. ON CONFLICT DO NOTHING."""
    if df is None or df.empty:
        return 0

    try:
        from src.db import get_connection, execute_batch
    except ImportError:
        log.warning("psycopg2 not available, skipping PostgreSQL write for predictions")
        return 0

    SQL = """
        INSERT INTO fact_predictions
            (site_id, as_of_date, probability, model_version, top_features, created_at)
        VALUES (%s, %s, %s, %s, %s, NOW())
        ON CONFLICT (site_id, as_of_date) DO NOTHING
    """

    rows = []
    for row in df.itertuples():
        rows.append((
            getattr(row, 'site_id', '').lower(),
            getattr(row, 'as_of_date', None),
            float(getattr(row, 'probability', 0)),
            model_version,
            getattr(row, 'top_features', None),
        ))

    try:
        with get_connection() as conn:
            count = execute_batch(conn, SQL, rows)
        log.info("load_predictions: inserted %d rows (model=%s)", count, model_version)
        return count
    except Exception as e:
        log.error("load_predictions failed: %s", e)
        return 0


def load_ingest_log(batch_id: str, source: str, row_count: int,
                    trusted: int, corrected: int, review: int, rejected: int,
                    checksum: str = "") -> None:
    """Record the batch ingestion summary in PostgreSQL."""
    try:
        from src.db import get_connection
    except ImportError:
        log.warning("psycopg2 not available, skipping ingest_log write")
        return

    SQL = """
        INSERT INTO ingest_log
            (batch_id, source_filename, row_count, sha256_checksum,
             ingestion_timestamp, trusted_count, corrected_count,
             review_count, rejected_count)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (batch_id) DO NOTHING
    """
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(SQL, (batch_id, source, row_count, checksum,
                                  datetime.utcnow(), trusted, corrected, review, rejected))
        log.info("load_ingest_log: recorded batch_id=%s", batch_id[:8])
    except Exception as e:
        log.error("load_ingest_log failed: %s", e)


# ─────────────────────────────────────────────────────────────────────────────
# Local DuckDB/Parquet Warehouse (optional, for local dev)
# ─────────────────────────────────────────────────────────────────────────────

def load_to_parquet(df: pd.DataFrame, output_dir: str, table_name: str) -> str:
    """Write a DataFrame to Parquet in the warehouse directory."""
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, f"{table_name}.parquet")
    df.to_parquet(output_path, index=False)
    return output_path


def load_to_duckdb(df: pd.DataFrame, db_path: str, table_name: str) -> str:
    """Write a DataFrame to a DuckDB table in the warehouse (replace existing)."""
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    con = duckdb.connect(db_path)
    con.execute(f"DROP TABLE IF EXISTS {table_name}")
    con.execute(f"CREATE TABLE {table_name} AS SELECT * FROM df")
    con.close()
    return db_path


def load_dim_site(output_dir: str, raw_dir: str = "data/raw") -> int:
    """Load the dim_site reference table directly into the warehouse."""
    if not WAREHOUSE_ENABLED:
        return 0

    dim_site_path = os.path.join(raw_dir, "dim_site.csv")
    if not os.path.exists(dim_site_path):
        log.warning("dim_site.csv not found at %s, skipping.", dim_site_path)
        return 0

    df = pd.read_csv(dim_site_path)
    load_to_parquet(df, output_dir, "dim_site")
    db_path = os.path.join(output_dir, "sentinel.duckdb")
    load_to_duckdb(df, db_path, "dim_site")
    return len(df)


def load_trusted_output(decided_df: pd.DataFrame, output_dir: str) -> dict:
    """
    Filter to trusted + corrected records and write to warehouse,
    split into fact_incidents, fact_audits, and fact_telemetry.
    """
    if not WAREHOUSE_ENABLED:
        return {
            "incidents_loaded": 0,
            "audits_loaded": 0,
            "telemetry_loaded": 0,
            "total_loaded": 0,
            "rejected": 0,
            "db_path": None,
        }

    db_path = os.path.join(output_dir, "sentinel.duckdb")

    # Write full decided output
    load_to_parquet(decided_df, output_dir, "decided_all")
    load_to_duckdb(decided_df, db_path, "decided_all")

    # Filter to trusted + corrected only
    warehouse_df = decided_df[
        decided_df["decision"].isin(["trusted", "corrected"])
    ].copy()

    columns_to_drop = ["decision", "decision_reason", "_source_file", "_batch_id"]
    warehouse_df = warehouse_df.drop(
        columns=[c for c in columns_to_drop if c in warehouse_df.columns],
        errors="ignore",
    )

    incidents_df = pd.DataFrame()
    audits_df = pd.DataFrame()
    telemetry_df = pd.DataFrame()

    if "reading_id" in warehouse_df.columns:
        telemetry_df = warehouse_df[
            warehouse_df["reading_id"].notna() & (warehouse_df["reading_id"] != "")
        ].copy()
        warehouse_df = warehouse_df[
            ~(warehouse_df["reading_id"].notna() & (warehouse_df["reading_id"] != ""))
        ]

    if "incident_id" in warehouse_df.columns and "audit_id" in warehouse_df.columns:
        incidents_df = warehouse_df[
            warehouse_df["incident_id"].notna() & (warehouse_df["incident_id"] != "")
        ].copy()
        audits_df = warehouse_df[
            warehouse_df["audit_id"].notna() & (warehouse_df["audit_id"] != "")
        ].copy()

    elif "incident_id" in warehouse_df.columns:
        incidents_df = warehouse_df
    elif "audit_id" in warehouse_df.columns:
        audits_df = warehouse_df

    if len(incidents_df) > 0:
        load_to_parquet(incidents_df, output_dir, "fact_incidents")
        load_to_duckdb(incidents_df, db_path, "fact_incidents")

    if len(audits_df) > 0:
        load_to_parquet(audits_df, output_dir, "fact_audits")
        load_to_duckdb(audits_df, db_path, "fact_audits")

    if len(telemetry_df) > 0:
        load_to_parquet(telemetry_df, output_dir, "fact_telemetry")
        load_to_duckdb(telemetry_df, db_path, "fact_telemetry")

    # Quarantine rejected records
    rejected_df = decided_df[decided_df["decision"] == "rejected"]
    quarantine_dir = os.path.join("data", "quarantine")
    os.makedirs(quarantine_dir, exist_ok=True)

    if len(rejected_df) > 0:
        rejected_path = os.path.join(quarantine_dir, "rejected_records.csv")
        rejected_df.to_csv(rejected_path, index=False)
        log.info("Quarantined %d rejected records -> %s", len(rejected_df), rejected_path)

    return {
        "incidents_loaded": len(incidents_df),
        "audits_loaded": len(audits_df),
        "telemetry_loaded": len(telemetry_df),
        "total_loaded": len(incidents_df) + len(audits_df) + len(telemetry_df),
        "rejected": len(rejected_df),
        "db_path": db_path,
    }


def main():
    parser = argparse.ArgumentParser(description="Sentinel Load")
    parser.add_argument(
        "--input",
        default=os.path.join("data", "warehouse", "decided_batch.parquet"),
        help="Path to decided batch parquet",
    )
    parser.add_argument(
        "--output-dir",
        default=os.path.join("data", "warehouse"),
        help="Warehouse output directory",
    )
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO)

    if not os.path.exists(args.input):
        log.error("Input file not found: %s", args.input)
        raise SystemExit(1)

    decided_df = pd.read_parquet(args.input)
    log.info("Loading from %d decided records...", len(decided_df))

    if WAREHOUSE_ENABLED:
        n_sites = load_dim_site(args.output_dir)
        log.info("Loaded %d sites -> dim_site", n_sites)

        result = load_trusted_output(decided_df, args.output_dir)

        log.info("Warehouse Summary:")
        log.info("  dim_site:       %d rows", n_sites)
        log.info("  fact_incidents: %d rows", result['incidents_loaded'])
        log.info("  fact_audits:    %d rows", result['audits_loaded'])
        log.info("  fact_telemetry: %d rows", result['telemetry_loaded'])
        log.info("  rejected:       %d rows (quarantined)", result['rejected'])
    else:
        log.info("Local warehouse disabled (WAREHOUSE_ENABLED=false)")


if __name__ == "__main__":
    main()

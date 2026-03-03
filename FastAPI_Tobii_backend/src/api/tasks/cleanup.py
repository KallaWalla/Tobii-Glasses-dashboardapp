import datetime
import shutil
from pathlib import Path

from fastapi import Depends
from FastAPI_Tobii_backend.src.api.repositories import recordings_repo
from sqlalchemy.orm import Session
from src.api.models.db import Recording
from src.api.db import get_db

def cleanup_old_recordings():
    """Delete recordings older than 7 days without a calibration recording"""
    db: Session = Depends(get_db),

    try:
        seven_days_ago = datetime.datetime.now() - datetime.timedelta(days=7)

        # Fetch recordings older than 7 days
        old_recordings = db.query(Recording).all()  # We'll filter manually because `created` is string

        for rec in old_recordings:
            try:
                # Parse created date
                rec_created = datetime.datetime.fromisoformat(rec.created)
            except Exception:
                # Skip recordings with invalid date
                continue

            if rec_created > seven_days_ago:
                continue  # not old enough

            # Skip if a calibration exists
            if rec.calibration_recordings and len(rec.calibration_recordings) > 0:
                continue


            recordings_repo.delete(rec.id)

        db.commit()
    finally:
        db.close()
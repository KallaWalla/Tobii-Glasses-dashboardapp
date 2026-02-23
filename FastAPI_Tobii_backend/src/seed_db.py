from sqlalchemy.orm import Session

from src.api.db import Base, engine, SessionLocal
from src.api.models.db import (
    Recording,
    SimRoom,
    SimRoomClass,
    CalibrationRecording,
    Annotation,
)
# -----------------------------
# CONFIG
# -----------------------------



RECORDINGS_SEED = [
    {
        "id": "rec_001",
        "visible_name": "Session 1",
        "participant": "Alice",
        "created": "2025-01-01 10:00",
        "duration": "00:05:12",
    },
    {
        "id": "rec_002",
        "visible_name": "Session 2",
        "participant": "Bob",
        "created": "2025-01-02 11:00",
        "duration": "00:04:03",
    },
]

SIMROOMS_SEED = [
    {
        "name": "Operating Room",
        "classes": ["Patient", "Monitor", "Doctor"],
    },
    {
        "name": "ICU",
        "classes": ["Bed", "Nurse", "Equipment"],
    },
]


# -----------------------------
# HELPERS
# -----------------------------

def get_or_create_recording(db: Session, data: dict) -> Recording:
    rec = db.get(Recording, data["id"])
    if rec:
        return rec

    rec = Recording(**data)
    db.add(rec)
    db.flush()
    return rec


def get_or_create_simroom(db: Session, name: str) -> SimRoom:
    existing = db.query(SimRoom).filter_by(name=name).first()
    if existing:
        return existing

    room = SimRoom(name=name)
    db.add(room)
    db.flush()
    return room


def get_or_create_class(db: Session, simroom: SimRoom, class_name: str):
    existing = (
        db.query(SimRoomClass)
        .filter_by(simroom_id=simroom.id, class_name=class_name)
        .first()
    )
    if existing:
        return existing

    cls = SimRoomClass(simroom_id=simroom.id, class_name=class_name)
    db.add(cls)
    db.flush()
    return cls


# -----------------------------
# MAIN SEED
# -----------------------------

def seed():
    print("🌱 Seeding database...")

    # create tables
    Base.metadata.create_all(bind=engine)

    db: Session = SessionLocal()

    try:
        # -------------------------
        # recordings
        # -------------------------
        recordings = []
        for rec_data in RECORDINGS_SEED:
            rec = get_or_create_recording(db, rec_data)
            recordings.append(rec)

        # -------------------------
        # simrooms + classes
        # -------------------------
        simrooms = []
        for room_data in SIMROOMS_SEED:
            room = get_or_create_simroom(db, room_data["name"])

            for class_name in room_data["classes"]:
                get_or_create_class(db, room, class_name)

            simrooms.append(room)

        db.flush()

        # -------------------------
        # calibration recordings
        # -------------------------
        # link first recording to first simroom
        if simrooms and recordings:
            exists = (
                db.query(CalibrationRecording)
                .filter_by(
                    simroom_id=simrooms[0].id,
                    recording_id=recordings[0].id,
                )
                .first()
            )

            if not exists:
                cal = CalibrationRecording(
                    simroom_id=simrooms[0].id,
                    recording_id=recordings[0].id,
                )
                db.add(cal)

        db.commit()
        print("✅ Database seeded successfully")

    except Exception as e:
        db.rollback()
        print("❌ Seed failed:", e)
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
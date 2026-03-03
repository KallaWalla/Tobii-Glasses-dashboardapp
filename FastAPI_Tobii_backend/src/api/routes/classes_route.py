from fastapi import APIRouter, Depends, Form, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from fastapi.encoders import jsonable_encoder

from src.api.db import get_db
from src.api.repositories import classes_repo
from src.api.exceptions import NotFoundError

router = APIRouter(prefix="/classes")


@router.get("/")
async def get_classes(db: Session = Depends(get_db)):
    classes = classes_repo.get_all_classes(db)
    return JSONResponse(content=jsonable_encoder(classes))


@router.post("/")
async def add_class(name: str = Form(...), db: Session = Depends(get_db)):
    simroom_class = classes_repo.create_class(db, name=name)
    db.commit()
    return JSONResponse(
        content={"id": simroom_class.id, "name": simroom_class.class_name}
    )


@router.delete("/{class_id}")
async def delete_class(class_id: int, db: Session = Depends(get_db)):
    try:
        classes_repo.delete_class(db, class_id)
        db.commit()
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Class not found")

    return JSONResponse(content={"message": "Class deleted"})
from typing import TYPE_CHECKING

from fastapi import FastAPI

if TYPE_CHECKING:
    from src.api.services.labeling_service import Labeler


class App(FastAPI):
    def __init__(self, *args, **kwargs) -> None:  # type: ignore[no-untyped-def]
        super().__init__(*args, **kwargs)
        self.labeler: Labeler | None = None


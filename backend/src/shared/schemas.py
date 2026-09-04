import time

from pydantic import BaseModel, EmailStr, Field, ConfigDict, model_validator

# Client clocks can drift; accept a small future skew before rejecting.
_CLOCK_SKEW_TOLERANCE_SEC = 60


class SessionCreate(BaseModel):
    session_id: str
    game_exe: str
    game_name: str
    started_at: int
    ended_at: int
    duration_sec: int = Field(gt=0)
    label: str = "tracked"

    @model_validator(mode="after")
    def _validate_time_window(self) -> "SessionCreate":
        if self.started_at >= self.ended_at:
            raise ValueError("started_at must be strictly less than ended_at")
        skew_limit = int(time.time()) + _CLOCK_SKEW_TOLERANCE_SEC
        if self.ended_at > skew_limit:
            raise ValueError(f"ended_at is in the future (max {skew_limit})")
        return self


class SessionBatchCreate(BaseModel):
    sessions: list[SessionCreate] = Field(min_length=1, max_length=25)


class SessionPatch(BaseModel):
    label: str = Field(min_length=1, max_length=64)


class ProfilePatch(BaseModel):
    model_config = ConfigDict(extra="ignore")

    email: EmailStr | None = None

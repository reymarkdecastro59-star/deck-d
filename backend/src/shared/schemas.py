import time

from pydantic import BaseModel, EmailStr, Field, ConfigDict, model_validator

# Client clocks can drift; accept a small future skew before rejecting.
_CLOCK_SKEW_TOLERANCE_SEC = 60
# duration_sec vs (ended_at - started_at) can diverge by a few seconds due to
# integer rounding at session close on the agent. Anything beyond this window
# means the caller is fabricating playtime.
_DURATION_TOLERANCE_SEC = 5
# Cap the wall-clock length of a single session at 12 hours. A single legit
# gaming session doesn't exceed this, and without a cap a caller can pass
# started_at=0 (Unix epoch) and end up with a "55-year session" that nukes
# every aggregation. Closes issue #18.
_MAX_SESSION_LENGTH_SEC = 12 * 60 * 60


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
        wall = self.ended_at - self.started_at
        # Cap wall-clock length before the duration cross-check. Without this,
        # started_at=0 + ended_at=now passes every other check and stores a
        # 55-year "session".
        if wall > _MAX_SESSION_LENGTH_SEC:
            raise ValueError(
                f"session length ({wall}s) exceeds the maximum "
                f"({_MAX_SESSION_LENGTH_SEC}s / 12 hours)"
            )
        # Cross-check duration_sec against the wall-clock window. Without this,
        # a caller can send started_at=T, ended_at=T+60, duration_sec=999999
        # and inflate their decay-weighted dashboard total.
        if abs(self.duration_sec - wall) > _DURATION_TOLERANCE_SEC:
            raise ValueError(
                f"duration_sec ({self.duration_sec}) must match "
                f"ended_at - started_at ({wall}) within {_DURATION_TOLERANCE_SEC}s"
            )
        return self


class SessionBatchCreate(BaseModel):
    sessions: list[SessionCreate] = Field(min_length=1, max_length=25)


class SessionPatch(BaseModel):
    label: str = Field(min_length=1, max_length=64)


class ProfilePatch(BaseModel):
    model_config = ConfigDict(extra="ignore")

    email: EmailStr | None = None


class DevicePatch(BaseModel):
    device_name: str = Field(min_length=1, max_length=64)

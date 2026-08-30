from pydantic import BaseModel, EmailStr, Field, ConfigDict


class SessionCreate(BaseModel):
    session_id: str
    game_exe: str
    game_name: str
    started_at: int
    ended_at: int
    duration_sec: int
    label: str = "tracked"


class SessionPatch(BaseModel):
    label: str = Field(min_length=1, max_length=64)


class ProfilePatch(BaseModel):
    model_config = ConfigDict(extra="ignore")

    email: EmailStr | None = None

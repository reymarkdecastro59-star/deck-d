from dataclasses import dataclass, field
import time


@dataclass
class Session:
    user_id: str
    session_id: str
    game_exe: str
    game_name: str
    started_at: int
    ended_at: int
    duration_sec: int
    label: str = "tracked"

    @property
    def pk(self) -> str:
        return f"USER#{self.user_id}"

    @property
    def sk(self) -> str:
        return f"SESSION#{self.started_at}#{self.session_id}"

    @property
    def gsi1pk(self) -> str:
        return f"GAME#{self.game_exe.lower()}"

    @property
    def gsi1sk(self) -> str:
        return f"SESSION#{self.started_at}"

    def to_item(self) -> dict:
        return {
            "pk": self.pk, "sk": self.sk,
            "gsi1pk": self.gsi1pk, "gsi1sk": self.gsi1sk,
            "user_id": self.user_id, "session_id": self.session_id,
            "game_exe": self.game_exe, "game_name": self.game_name,
            "started_at": self.started_at, "ended_at": self.ended_at,
            "duration_sec": self.duration_sec, "label": self.label,
        }

    @classmethod
    def from_item(cls, item: dict) -> "Session":
        return cls(
            user_id=item["user_id"], session_id=item["session_id"],
            game_exe=item["game_exe"], game_name=item["game_name"],
            started_at=int(item["started_at"]), ended_at=int(item["ended_at"]),
            duration_sec=int(item["duration_sec"]), label=item.get("label", "tracked"),
        )


@dataclass
class UserProfile:
    user_id: str
    email: str
    created_at: int = field(default_factory=lambda: int(time.time()))

    @property
    def pk(self) -> str:
        return f"USER#{self.user_id}"

    @property
    def sk(self) -> str:
        return "PROFILE"

    def to_item(self) -> dict:
        return {
            "pk": self.pk, "sk": self.sk,
            "user_id": self.user_id, "email": self.email,
            "created_at": self.created_at,
        }

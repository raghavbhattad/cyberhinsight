import json
import logging
import threading
from datetime import datetime, timezone
from pathlib import Path

logger = logging.getLogger(__name__)

_DEFAULT_CHAT_STORE = Path(__file__).resolve().parent.parent.parent / "conversations.json"


class ChatStore:
    """Thread-safe persistent storage for chat conversations backed by atomic JSON writes."""

    def __init__(self, path: Path | None = None):
        self._path = path or _DEFAULT_CHAT_STORE
        self._lock = threading.Lock()
        self._conversations: dict[str, list[dict]] = {}
        self._load()

    def _load(self):
        if self._path.exists():
            try:
                with open(self._path, "r", encoding="utf-8") as f:
                    self._conversations = json.load(f)
                logger.info("Loaded %d conversations from %s", len(self._conversations), self._path)
            except Exception as e:
                logger.warning("Could not load conversations: %s", e)
                self._conversations = {}
        else:
            self._conversations = {}

    def _save(self):
        try:
            tmp = self._path.with_suffix(".tmp")
            with open(tmp, "w", encoding="utf-8") as f:
                json.dump(self._conversations, f, indent=2, default=str)
            tmp.replace(self._path)
        except Exception as e:
            logger.error("Failed to save conversations store: %s", e)

    def get(self, conversation_id: str) -> list[dict]:
        with self._lock:
            return list(self._conversations.get(conversation_id, []))

    def get_last_turns(self, conversation_id: str, max_turns: int = 20) -> list[dict]:
        """Return at most the last `max_turns` messages for prompt context."""
        with self._lock:
            messages = self._conversations.get(conversation_id, [])
            return list(messages[-max_turns:]) if len(messages) > max_turns else list(messages)

    def add_message(self, conversation_id: str, message: dict):
        with self._lock:
            if conversation_id not in self._conversations:
                self._conversations[conversation_id] = []
            if not message.get("timestamp"):
                message["timestamp"] = datetime.now(timezone.utc).isoformat()
            self._conversations[conversation_id].append(message)
            self._save()

    def list_conversations(self) -> list[dict]:
        """List all conversations ordered by latest update."""
        with self._lock:
            items = []
            for conv_id, msgs in self._conversations.items():
                if not msgs:
                    continue
                first_msg = msgs[0].get("content", "New Conversation")
                title = (first_msg[:45] + "…") if len(first_msg) > 45 else first_msg
                last_ts = msgs[-1].get("timestamp") or datetime.now(timezone.utc).isoformat()
                items.append({
                    "id": conv_id,
                    "title": title,
                    "updated_at": last_ts,
                    "message_count": len(msgs),
                })
            items.sort(key=lambda x: x["updated_at"], reverse=True)
            return items

    def delete(self, conversation_id: str) -> bool:
        with self._lock:
            if conversation_id in self._conversations:
                del self._conversations[conversation_id]
                self._save()
                return True
            return False

    def clear(self):
        with self._lock:
            self._conversations = {}
            self._save()

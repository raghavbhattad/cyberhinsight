import json
import logging
import threading
from pathlib import Path

logger = logging.getLogger(__name__)

# Store file next to the app
_STORE_PATH = Path(__file__).resolve().parent.parent.parent / "incident_store.json"


class IncidentStore:
    """Persistent incident store backed by a JSON file with atomic writes."""

    def __init__(self, path: Path | None = None):
        self._path = path or _STORE_PATH
        self._lock = threading.Lock()
        self._incidents: list[dict] = []
        self._load()

    def _load(self):
        if self._path.exists():
            try:
                with open(self._path, "r", encoding="utf-8") as f:
                    self._incidents = json.load(f)
                logger.info("Loaded %d incidents from %s", len(self._incidents), self._path)
            except Exception as e:
                logger.warning("Could not load incident store: %s", e)
                self._incidents = []
        else:
            self._incidents = []

    def _save(self):
        try:
            tmp = self._path.with_suffix(".tmp")
            with open(tmp, "w", encoding="utf-8") as f:
                json.dump(self._incidents, f, indent=2, default=str)
            tmp.replace(self._path)
        except Exception as e:
            logger.error("Failed to save incident store: %s", e)

    def add(self, incident_data: dict):
        with self._lock:
            self._incidents.append(incident_data)
            self._save()

    def get_all(self) -> list[dict]:
        with self._lock:
            return list(self._incidents)

    def get_by_id(self, id: str) -> dict | None:
        with self._lock:
            for incident in self._incidents:
                if incident.get("id") == id:
                    return incident
            return None

    def update(self, id: str, updates: dict) -> bool:
        """Update fields on an existing incident."""
        with self._lock:
            for incident in self._incidents:
                if incident.get("id") == id:
                    incident.update(updates)
                    self._save()
                    return True
            return False

    def get_stats(self) -> dict:
        with self._lock:
            total = len(self._incidents)
            by_severity = {}
            by_category = {}
            for inc in self._incidents:
                sev = (
                    inc.get("incident", {}).get("severity")
                    or inc.get("severity")
                    or "unknown"
                ).lower()
                cat = (
                    inc.get("incident", {}).get("category")
                    or inc.get("category")
                    or "Unknown"
                )
                by_severity[sev] = by_severity.get(sev, 0) + 1
                by_category[cat] = by_category.get(cat, 0) + 1

            recent = list(reversed(self._incidents[-5:])) if total >= 5 else list(reversed(self._incidents))

            return {
                "total": total,
                "by_severity": by_severity,
                "by_category": by_category,
                "recent": recent,
            }

    def clear(self):
        with self._lock:
            self._incidents = []
            self._save()

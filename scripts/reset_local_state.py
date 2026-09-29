"""Utility script to reset local runtime stores for CyberHinsight.

Deletes local JSON stores (incident_store.json, conversations.json)
to ensure a clean state between test runs or demonstrations.
"""

from pathlib import Path
import logging

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("reset_state")

ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT_DIR / "backend"

TARGET_FILES = [
    ROOT_DIR / "incident_store.json",
    ROOT_DIR / "conversations.json",
    BACKEND_DIR / "incident_store.json",
    BACKEND_DIR / "conversations.json",
    ROOT_DIR / "incident_store.tmp",
    ROOT_DIR / "conversations.tmp",
    BACKEND_DIR / "incident_store.tmp",
    BACKEND_DIR / "conversations.tmp",
]


def reset_local_state():
    removed = 0
    for path in TARGET_FILES:
        if path.exists():
            try:
                path.unlink()
                logger.info(f"Deleted: {path.relative_to(ROOT_DIR)}")
                removed += 1
            except Exception as e:
                logger.error(f"Error deleting {path}: {e}")
    if removed == 0:
        logger.info("Local state is already clean (no local store files found).")
    else:
        logger.info(f"Successfully cleaned {removed} local state store file(s).")


if __name__ == "__main__":
    reset_local_state()

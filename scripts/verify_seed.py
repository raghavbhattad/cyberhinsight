"""Verify seeded incidents in local incident store and in Hindsight memory.
Checks for key demo tokens: 'DocuShare', '203.0.113.77', and '198.51.100.45'.
"""

import sys
import asyncio
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from app.config import settings
from app.services.incidents import IncidentStore
from app.services.hindsight_memory import HindsightMemoryService


async def verify():
    print("=" * 60)
    print("CYBERHINSIGHT SEED VERIFICATION")
    print("=" * 60)

    # 1. Check local incident store
    store = IncidentStore()
    all_incidents = store.get_all()
    print(f"\n[Local Incident Store]")
    print(f"Total stored incidents: {len(all_incidents)}")

    # 2. Check Hindsight Cloud Memory
    print(f"\n[Hindsight Memory Bank: {settings.HINDSIGHT_BANK_ID}]")
    memory = HindsightMemoryService(
        api_key=settings.HINDSIGHT_API_KEY,
        base_url=settings.HINDSIGHT_BASE_URL,
        bank_id=settings.HINDSIGHT_BANK_ID,
    )

    if not memory.available:
        print("WARNING: HINDSIGHT_API_KEY not configured. Memory verification skipped.")
        return

    connected = await memory.check_connection()
    print(f"Connection status: {'CONNECTED' if connected else 'UNREACHABLE'}")
    if not connected:
        print("ERROR: Could not reach Hindsight service.")
        return

    test_tokens = ["DocuShare", "203.0.113.77", "198.51.100.45"]
    print("\n[Recall Verification]")

    all_passed = True
    for token in test_tokens:
        try:
            results = await memory.recall_similar(token, limit=5)
            matches = [r for r in results if token.lower() in (r.get("text", "")).lower()]
            if matches:
                top_score = matches[0].get("score")
                score_str = f"{top_score:.2f}" if top_score is not None else "N/A"
                print(f"  ✓ FOUND: '{token}' ({len(matches)} matches, top score: {score_str})")
            else:
                all_passed = False
                print(f"  ✗ MISSING: '{token}' (0 matches in {len(results)} recalled items)")
        except Exception as e:
            all_passed = False
            print(f"  ✗ ERROR querying '{token}': {e}")

    print("\n" + "=" * 60)
    if all_passed:
        print("ALL VERIFICATION CHECKS PASSED ✓")
    else:
        print("SOME TOKENS NOT YET INDEXED IN HINDSIGHT (Indexing may still be in progress)")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(verify())

"""Send sample SIEM alerts to CyberHinsight for demo/testing."""
import json
import os
import sys
import httpx
from pathlib import Path


def main():
    base_url = os.environ.get("CYBERHINSIGHT_URL", "http://127.0.0.1:8000")
    api_key = os.environ.get("APP_API_KEY", "")

    alerts_path = Path(__file__).resolve().parent.parent / "demo" / "alerts" / "sample_alerts.json"
    if not alerts_path.exists():
        print(f"ERROR: {alerts_path} not found")
        sys.exit(1)

    with open(alerts_path, "r", encoding="utf-8") as f:
        alerts = json.load(f)

    headers = {}
    if api_key:
        headers["X-API-Key"] = api_key

    print(f"Sending {len(alerts)} SIEM alerts to {base_url}/api/ingest/alert\n")

    for i, alert in enumerate(alerts, 1):
        print(f"--- Alert {i}/{len(alerts)}: {alert.get('rule_name', 'unknown')} ---")
        try:
            r = httpx.post(
                f"{base_url}/api/ingest/alert",
                json=alert,
                headers=headers,
                timeout=120.0,
            )
            if r.status_code == 200:
                data = r.json()
                print(f"  ✓ Investigated: {data.get('incident', {}).get('summary', 'N/A')}")
                print(f"    Severity: {data.get('incident', {}).get('severity', 'N/A')}")
                print(f"    Memory matches: {len(data.get('memory_matches', []))}")
                campaign = data.get("campaign_link")
                if campaign:
                    print(f"    Campaign: {campaign.get('campaign_id')} ({campaign.get('link_strength')})")
                print(f"    Stored: {data.get('memory_stored', False)}")
            else:
                print(f"  ✗ HTTP {r.status_code}: {r.text[:200]}")
        except Exception as e:
            print(f"  ✗ Error: {e}")
        print()


if __name__ == "__main__":
    main()

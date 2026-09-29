"""Smoke test: verify CyberHinsight backend is working end-to-end."""
import sys
import httpx

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')


def main():
    base_url = os.environ.get("CYBERHINSIGHT_URL", "http://127.0.0.1:8000")
    api_key = os.environ.get("APP_API_KEY", "")
    headers = {"X-API-Key": api_key} if api_key else {}

    print(f"CyberHinsight Smoke Test -> {base_url}\n")

    # 1. Health check
    print("1. Health check...")
    r = httpx.get(f"{base_url}/api/health")
    assert r.status_code == 200, f"Health failed: {r.status_code}"
    health = r.json()
    print(f"   Status: {health['status']}, Groq: {health['groq']}, Hindsight: {health['hindsight']}")

    # 2. Investigate Act 1 (first incident, no prior memory)
    print("\n2. Act 1: First phishing incident (baseline)...")
    inc1 = {
        "description": (
            "Finance department employee received a suspicious email with an attachment. "
            "Upon opening, PowerShell was observed executing on the endpoint FIN-WS-042. "
            "The process spawned cmd.exe and attempted to download files from an external "
            "IP 198.51.100.45. Credentials for the user account may have been compromised."
        ),
        "use_memory": True,
    }
    r1 = httpx.post(f"{base_url}/api/incidents/investigate", json=inc1, headers=headers, timeout=120.0)
    assert r1.status_code == 200, f"Act 1 failed: {r1.status_code} {r1.text[:200]}"
    d1 = r1.json()
    print(f"   Summary: {d1['incident']['summary']}")
    print(f"   Severity: {d1['incident']['severity']}")
    print(f"   Memory matches: {len(d1.get('memory_matches', []))}")
    print(f"   IOCs extracted: {len(d1.get('iocs', {}).get('ipv4', []))} IPs")
    print(f"   Stored: {d1.get('memory_stored')}")

    # 3. Submit feedback on Act 1
    print("\n3. Submitting feedback on Act 1 (effective)...")
    feedback = {
        "outcome": "effective",
        "actions_taken": ["Endpoint isolated", "Credentials reset", "IP blocked at firewall"],
        "what_worked": "Immediate endpoint isolation prevented lateral movement",
        "what_failed": "",
        "analyst_notes": "Quick response. Same IP range as previous campaigns targeting Finance.",
    }
    rf = httpx.post(
        f"{base_url}/api/incidents/{d1['id']}/feedback",
        json=feedback,
        headers=headers,
        timeout=60.0,
    )
    print(f"   Status: {rf.status_code}, Retained: {rf.json().get('retained', False)}")

    # 4. Investigate Act 2 (similar incident, memory should recall Act 1)
    print("\n4. Act 2: Similar phishing on FIN-WS-067 (Hindsight recall expected)...")
    inc2 = {
        "description": (
            "Another Finance employee on endpoint FIN-WS-067 reported a suspicious email. "
            "Similar PowerShell activity detected. Connection attempts to IP range "
            "198.51.100.0/24 observed. Employee had access to financial reporting systems."
        ),
        "use_memory": True,
    }
    r2 = httpx.post(f"{base_url}/api/incidents/investigate", json=inc2, headers=headers, timeout=120.0)
    assert r2.status_code == 200, f"Act 2 failed: {r2.status_code} {r2.text[:200]}"
    d2 = r2.json()
    print(f"   Summary: {d2['incident']['summary']}")
    print(f"   Memory matches: {len(d2.get('memory_matches', []))}")
    print(f"   Adapted from memory: {d2['recommendations'].get('adapted_from_memory')}")
    campaign = d2.get("campaign_link")
    if campaign:
        print(f"   Campaign: {campaign['campaign_id']} ({campaign['link_strength']}, "
              f"{campaign['incident_count']} incidents, depts: {campaign['departments_touched']})")
    escalation = d2.get("predicted_escalation")
    if escalation:
        print(f"   Escalation prediction: {escalation['predicted_next_stage']}")
    print(f"   Why: {d2['recommendations'].get('why_these_recommendations', '')[:200]}")

    print("\n[OK] Smoke test passed!")


if __name__ == "__main__":
    main()

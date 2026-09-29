import pytest
from app.services.ioc import extract_iocs, merge_iocs, ExtractedIOCs
from app.services.campaigns import link_campaign, predict_escalation


def test_ioc_extractor():
    """Test 5: Deterministic extraction of IPs, domains, hashes, hostnames, MITRE techniques."""
    sample_text = (
        "Alert on host FIN-WS-042: PowerShell executed malicious script downloaded from "
        "http://malicious-c2.xyz/payload.ps1 (hosted at 198.51.100.45). "
        "File hash SHA256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855. "
        "MD5: d41d8cd98f00b204e9800998ecf8427e. "
        "Technique T1566.001 observed. Phishing email from attacker@evil-corp.com."
    )

    iocs = extract_iocs(sample_text)

    # Verify extracted entities
    assert "198.51.100.45" in iocs.ipv4
    assert "malicious-c2.xyz" in iocs.domains
    assert "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" in iocs.hashes_sha256
    assert "d41d8cd98f00b204e9800998ecf8427e" in iocs.hashes_md5
    assert "FIN-WS-042" in iocs.hostnames
    assert "T1566.001" in iocs.mitre_techniques
    assert "payload.ps1" in iocs.filenames
    assert "attacker@evil-corp.com" in iocs.emails

    # Subnet extraction
    assert "198.51.100.0/24" in iocs.ip_networks

    # Merge deduplication
    merged = merge_iocs(iocs, ["198.51.100.45", "new-indicator.com"])
    assert merged.count("198.51.100.45") == 1
    assert "new-indicator.com" in merged


def test_campaign_linking_exact_ip_strong():
    """Test 6a: Exact IP match creates a STRONG campaign link."""
    incident_iocs = extract_iocs("Attacking IP: 198.51.100.45 targeting FIN-WS-067")
    memory_matches = [{
        "text": "Prior incident on FIN-WS-042 involved IP 198.51.100.45",
        "document_id": "DEMO-001",
    }]
    incident_store = [{
        "id": "DEMO-001",
        "department": "Finance",
        "incident": {"description": "Phishing connecting to 198.51.100.45", "department": "Finance"},
        "analysis": {},
    }]

    link = link_campaign(incident_iocs, memory_matches, incident_store, "current-id")

    assert link is not None
    assert link["link_strength"] == "strong"
    assert "198.51.100.45" in link["shared_iocs"]
    assert link["campaign_id"].startswith("CMP-")
    assert "DEMO-001" in link["linked_incident_ids"]


def test_campaign_linking_subnet_moderate():
    """Test 6b: Same /24 subnet creates a MODERATE campaign link."""
    incident_iocs = extract_iocs("Connection to 198.51.100.88 on FIN-WS-088")
    memory_matches = [{
        "text": "Prior attack from 198.51.100.45",
        "document_id": "DEMO-001",
    }]
    incident_store = []

    link = link_campaign(incident_iocs, memory_matches, incident_store, "current-id")

    assert link is not None
    assert link["link_strength"] == "moderate"
    assert "198.51.100.0/24" in link["shared_iocs"]


def test_campaign_linking_unrelated_none():
    """Test 6c: Unrelated incidents produce NO campaign link."""
    incident_iocs = extract_iocs("USB device violation on MFG-WS-001 with flash drive")
    memory_matches = [{
        "text": "Prior attack from 198.51.100.45 on FIN-WS-042",
        "document_id": "DEMO-001",
    }]
    incident_store = []

    link = link_campaign(incident_iocs, memory_matches, incident_store, "current-id")
    assert link is None


def test_escalation_prediction_grounded():
    """Test escalation prediction when campaign has >=2 incidents with progression evidence."""
    campaign_link = {
        "campaign_id": "CMP-12345678",
        "incident_count": 2,
        "linked_incident_ids": ["DEMO-001"],
        "departments_touched": ["Finance"],
        "shared_iocs": ["198.51.100.45"],
        "shared_mitre": ["T1566.001"],
    }
    memory_matches = [{
        "text": "Subsequent incident DEMO-003 escalated to ransomware encrypting files with .crypt extension",
        "document_id": "DEMO-003",
    }]

    escalation = predict_escalation(campaign_link, memory_matches, [])

    assert escalation is not None
    assert "ransomware" in escalation["predicted_next_stage"].lower() or "encrypt" in escalation["predicted_next_stage"].lower()
    assert len(escalation["grounding_evidence"]) > 0
    assert escalation["preventive_action"] != ""


def test_private_ips_ignored_for_campaigns():
    """Private IPs (10.x, 192.168.x, 172.16.x) must NEVER link campaigns."""
    from app.services.ioc import is_private_ip
    assert is_private_ip("10.10.4.22") is True
    assert is_private_ip("192.168.1.100") is True
    assert is_private_ip("172.20.5.1") is True
    assert is_private_ip("127.0.0.1") is True
    # Synthetic attacker IP must be external
    assert is_private_ip("198.51.100.45") is False

    # Incident with only private IP matching
    incident_iocs = extract_iocs("Internal workstation connecting to internal proxy at 10.10.4.22")
    memory_matches = [{
        "text": "Prior connection to internal server 10.10.4.22",
        "document_id": "DEMO-001",
    }]
    link = link_campaign(incident_iocs, memory_matches, [], "current-id")
    assert link is None, "Private IP triggered a false campaign link!"


def test_deterministic_department_extraction():
    """Verify department extraction from host prefix and text keywords."""
    from app.services.ioc import extract_department

    assert extract_department("Malware found on FIN-WS-042") == "Finance"
    assert extract_department("Suspicious process on HR-WS-015") == "HR"
    assert extract_department("Engineering user reported strange activity on ENG-WS-200") == "Engineering"
    assert extract_department("Executive laptop EXEC-WS-001 compromised") == "Executive"
    assert extract_department("Employee in Legal received unexpected attachment") == "Legal"


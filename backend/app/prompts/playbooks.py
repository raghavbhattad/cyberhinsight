"""Deterministic attack-type awareness and base playbooks.
Standard industry best practice actions per MITRE ATT&CK technique.
"""

import re
from typing import Tuple

PLAYBOOKS = {
    "T1528": {
        "name": "OAuth Consent Phishing",
        "technique": "T1528",
        "actions": [
            "Revoke the malicious app's OAuth consent organization-wide in Entra ID / Google Workspace.",
            "Revoke all active refresh tokens and user sessions for the consenting account immediately.",
            "Review and remove any unauthorized mailbox forwarding rules or inbox delegates created by the app.",
            "Audit granted OAuth scopes (e.g. Mail.ReadWrite, Files.ReadWrite.All, User.Read) to assess exposure.",
            "Block the application client ID, redirect URI, and hosting domain at the perimeter firewall/proxy.",
        ],
    },
    "T1621": {
        "name": "MFA Fatigue / Push Prompting",
        "technique": "T1621",
        "actions": [
            "Revoke all active sessions and refresh tokens for the target user account.",
            "Force an immediate password reset via out-of-band identity verification.",
            "Enable number matching and geographic context requirements for all MFA push notifications.",
        ],
    },
    "T1530": {
        "name": "Cloud Storage Public Exposure",
        "technique": "T1530",
        "actions": [
            "Enforce 'Block Public Access' on the storage bucket/container immediately.",
            "Rotate all exposed storage account access keys and service principal credentials.",
            "Review cloud storage data access logs to determine exact scope of accessed or exfiltrated files.",
        ],
    },
    "T1195.001": {
        "name": "Compromise Software Dependencies (Malicious Package)",
        "technique": "T1195.001",
        "actions": [
            "Quarantine and rebuild affected CI/CD runner environments and build nodes.",
            "Rotate all secrets, API tokens, and deployment credentials stored in the CI/CD pipeline.",
            "Pin package dependencies to known-good verified hashes and update package lockfiles.",
        ],
    },
    "T1496": {
        "name": "Resource Hijacking (Cryptominer)",
        "technique": "T1496",
        "actions": [
            "Terminate the cryptomining process and suspend the associated container or instance.",
            "Close exposed container management ports (Docker socket, Kubernetes API) and enforce mTLS.",
            "Rebuild the affected host or node from a trusted, verified baseline image.",
        ],
    },
    "T1566.001": {
        "name": "Spearphishing Attachment (Macro / Malware)",
        "technique": "T1566.001",
        "actions": [
            "Isolate the affected endpoint from the network before rebooting to prevent C2 persistence.",
            "Reset credentials for the affected user account and invalidate active sessions.",
            "Remove malicious document, dropper artifacts, and persistence registry keys.",
        ],
    },
    "T1566.002": {
        "name": "Spearphishing Link (Credential Harvesting / QR)",
        "technique": "T1566.002",
        "actions": [
            "Reset compromised account password across the identity provider.",
            "Revoke all active browser sessions, OAuth refresh tokens, and mobile app tokens.",
            "Block the phishing domain and associated IP addresses at the edge proxy and perimeter firewall.",
        ],
    },
    "T1190": {
        "name": "Exploit Public-Facing Application (SQL Injection)",
        "technique": "T1190",
        "actions": [
            "Deploy targeted WAF blocking rules for the exploit pattern and payload signature.",
            "Patch vulnerable endpoints with parameterized queries and strict input validation.",
            "Review database transaction and access logs for unauthorized data exfiltration.",
        ],
    },
}

_PATTERNS = [
    (re.compile(r'\b(?:consent(?:ed)? to|grant(?:ed)? consent|oauth|app permissions?|docs-secure-share|docushare)\b', re.I), "T1528"),
    (re.compile(r'\b(?:mfa fatigue|push prompt|prompt bomb|repeated push|mfa spam)\b', re.I), "T1621"),
    (re.compile(r'\b(?:s3 bucket|blob storage|public storage|public bucket|cloud storage upload)\b', re.I), "T1530"),
    (re.compile(r'\b(?:malicious package|typosquat|pypi|npm package|dependency confusion)\b', re.I), "T1195.001"),
    (re.compile(r'\b(?:cryptomin|xmrig|crypto-mining|coinminer|stratum)\b', re.I), "T1496"),
    (re.compile(r'\b(?:macro|\.docm|\.xlsm|vba script|document attachment)\b', re.I), "T1566.001"),
    (re.compile(r'\b(?:qr code|phishing link|credential harvesting|fake login|spoofed login)\b', re.I), "T1566.002"),
    (re.compile(r'\b(?:sql injection|sqli|union select|or 1=1)\b', re.I), "T1190"),
]


def detect_technique(text: str, explicit_technique: str | None = None) -> Tuple[str | None, str | None]:
    """Detect MITRE ATT&CK technique from text or explicit field.
    Returns (technique_id, technique_name) or (None, None)."""
    if explicit_technique:
        for t_id, data in PLAYBOOKS.items():
            if t_id.lower() in explicit_technique.lower():
                return t_id, data["name"]

    for pattern, t_id in _PATTERNS:
        if pattern.search(text):
            return t_id, PLAYBOOKS[t_id]["name"]

    return None, None


def get_base_playbook(technique_id: str | None) -> list[str]:
    """Get standard must-consider actions for a detected technique."""
    if not technique_id or technique_id not in PLAYBOOKS:
        return []
    return list(PLAYBOOKS[technique_id]["actions"])

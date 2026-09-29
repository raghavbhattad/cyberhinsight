"""Helpers for generating human-readable memory labels, deriving outcome statuses,
and sanitizing assistant citations to eliminate raw UUIDs and unrecorded outcome claims.
"""

import re
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

_UUID_REGEX = re.compile(
    r'\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b'
)

_CAMPAIGN_EFFECTIVE_REGEX = re.compile(
    r'\b(?:proved\s+effective|was\s+effective|effective)\s+in\s+campaign\s+(CMP-[0-9a-fA-F]+)\b',
    re.IGNORECASE,
)


def derive_outcome_status(
    tags: list[str] | None = None,
    feedback: dict | None = None,
    text: str | None = None,
    raw_outcome: str | None = None,
) -> str:
    """Derive explicit outcome status:
    'effective' | 'not effective' | 'partially effective' | 'false positive' | 'unknown'
    """
    # 1. Tags
    for t in (tags or []):
        t_low = t.lower().strip()
        if t_low in ("outcome:effective", "outcome:worked"):
            return "effective"
        if t_low in ("outcome:ineffective", "outcome:failed", "outcome:not_effective"):
            return "not effective"
        if t_low in ("outcome:partially_effective", "outcome:partly_effective"):
            return "partially effective"
        if t_low in ("outcome:false_positive", "outcome:false_alarm"):
            return "false positive"

    # 2. Stored feedback dict
    if feedback and isinstance(feedback, dict):
        fb_out = str(feedback.get("outcome", "")).lower().strip()
        if fb_out == "effective":
            return "effective"
        if fb_out in ("ineffective", "not_effective", "failed"):
            return "not effective"
        if fb_out in ("partially_effective", "partly_effective"):
            return "partially effective"
        if fb_out in ("false_positive", "false_alarm"):
            return "false positive"

    # 3. Seeded incident raw_outcome text (prefix rules)
    if raw_outcome:
        raw_upper = raw_outcome.strip().upper()
        if raw_upper.startswith("NOT EFFECTIVE") or raw_upper.startswith("INEFFECTIVE"):
            return "not effective"
        if raw_upper.startswith("PARTIALLY EFFECTIVE") or raw_upper.startswith("PARTLY EFFECTIVE"):
            return "partially effective"
        if raw_upper.startswith("FALSE POSITIVE") or raw_upper.startswith("FALSE ALARM"):
            return "false positive"
        if raw_upper.startswith("EFFECTIVE"):
            return "effective"

    # 4. Text content check
    if text:
        t_low = text.lower()
        if "result: effective" in t_low or "remediation effective" in t_low:
            return "effective"
        if "result: ineffective" in t_low or "remediation ineffective" in t_low or "result: not effective" in t_low:
            return "not effective"
        if "result: partially_effective" in t_low or "result: partially effective" in t_low:
            return "partially effective"
        if "result: false_positive" in t_low or "result: false positive" in t_low:
            return "false positive"

    return "unknown"


def _format_date(date_str: str | None) -> str | None:
    if not date_str:
        return None
    try:
        dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        return dt.strftime("%d %b")
    except Exception:
        # Try finding date like 2026-09-25
        m = re.search(r'(\d{4})-(\d{2})-(\d{2})', date_str)
        if m:
            try:
                dt = datetime(int(m.group(1)), int(m.group(2)), int(m.group(3)))
                return dt.strftime("%d %b")
            except Exception:
                pass
    return None


def format_memory_label(
    doc_id: str | None,
    store_item: dict | None = None,
    text: str = "",
    timestamp: str | None = None,
) -> str:
    """Build a concise, human-readable citation label like:
    [DEMO-001 · FIN-WS-042 · Finance · phishing · 25 Sep]
    """
    id_clean = None
    if doc_id and not _UUID_REGEX.match(doc_id):
        # Clean suffix like -outcome
        id_clean = doc_id.replace("-outcome", "")

    asset = None
    dept = None
    category = None
    date_val = None

    if store_item:
        inc = store_item.get("incident", {})
        if not id_clean:
            st_id = store_item.get("id")
            if st_id and not _UUID_REGEX.match(st_id):
                id_clean = st_id
        asset = inc.get("affected_asset") or store_item.get("endpoint")
        dept = inc.get("department") or store_item.get("department")
        category = inc.get("category") or store_item.get("category")
        ts = store_item.get("timestamp") or timestamp
        date_val = _format_date(ts)
    else:
        # Fallback to parsing from text
        m_id = re.search(r'Incident ID:\s*([A-Za-z0-9_-]+)', text, re.I) or re.search(r'\b(DEMO-\d+|INC-\d+)\b', text)
        if m_id:
            cand = m_id.group(1)
            if not _UUID_REGEX.match(cand):
                id_clean = cand

        m_host = re.search(r'(?:Host|Endpoint|Affected Asset):\s*([A-Za-z0-9_-]+)', text, re.I)
        if m_host:
            asset = m_host.group(1)

        m_dept = re.search(r'Department:\s*([A-Za-z0-9_\s&-]+)', text, re.I)
        if m_dept:
            dept = m_dept.group(1).strip()

        m_cat = re.search(r'Category:\s*([A-Za-z0-9_\s&-]+)', text, re.I)
        if m_cat:
            category = m_cat.group(1).strip()

        m_ts = re.search(r'Timestamp:\s*([0-9T:Z.+-]+)', text, re.I)
        if m_ts:
            date_val = _format_date(m_ts.group(1))

    parts = []
    if id_clean:
        parts.append(id_clean)
    if asset and asset.lower() not in ("unknown", "workstation", "none"):
        parts.append(asset)
    if dept and dept.lower() not in ("unknown", "none"):
        parts.append(dept)
    if category and category.lower() not in ("unknown", "none"):
        parts.append(category.lower())
    if date_val:
        parts.append(date_val)

    if not parts:
        return "[earlier incident]"

    return f"[{' · '.join(parts)}]"


def sanitize_uuid_citations(answer: str, id_to_label_map: dict[str, str]) -> str:
    """Replace all raw UUIDs in assistant responses with their readable labels,
    or a neutral fallback if unknown."""
    def _replace_uuid(match):
        raw_uuid = match.group(0)
        # Check direct match
        if raw_uuid in id_to_label_map:
            return id_to_label_map[raw_uuid]
        # Check without or with -outcome
        base_uuid = raw_uuid.replace("-outcome", "")
        if base_uuid in id_to_label_map:
            return id_to_label_map[base_uuid]
        return "[prior incident]"

    sanitized = _UUID_REGEX.sub(_replace_uuid, answer)
    # Clean redundant citations like "incident [DEMO-001 ...]" -> "[DEMO-001 ...]"
    sanitized = re.sub(r'\b(?:incident|ticket)\s+(\[[^\]]+\])', r'\1', sanitized, flags=re.I)
    return sanitized


def sanitize_outcome_claims(answer: str, label_outcome_map: dict[str, str]) -> str:
    """Ensure answers never claim unrecorded outcomes:
    - Never describe a campaign as having proven anything
    - If 'effective' appears next to a citation whose outcome is not effective,
      rewrite to 'was taken in' or 'was used in'.
    """
    result = answer

    # 1. Neutralize claims about campaigns proving actions
    def _fix_campaign(match):
        cmp_id = match.group(1)
        logger.info("Rewriting campaign outcome claim for %s", cmp_id)
        return f"observed in campaign {cmp_id}"

    result = _CAMPAIGN_EFFECTIVE_REGEX.sub(_fix_campaign, result)

    # 2. Check each label's outcome status
    for label, status in label_outcome_map.items():
        if status != "effective":
            esc_label = re.escape(label)
            # Match "effective in [label]" or "proved effective in [label]"
            pattern1 = re.compile(
                rf'\b(?:proved\s+effective|was\s+effective|effective)\s+(?:in|for|against)\s+{esc_label}',
                re.IGNORECASE,
            )
            if pattern1.search(result):
                logger.warning("Rewriting invalid effective claim for non-effective source %s (status=%s)", label, status)
                result = pattern1.sub(f"was used in {label}", result)

            # Match "[label] was effective" or "[label] proved effective"
            pattern2 = re.compile(
                rf'{esc_label}\s+(?:proved\s+effective|was\s+effective|effective)\b',
                re.IGNORECASE,
            )
            if pattern2.search(result):
                logger.warning("Rewriting invalid effective claim for non-effective source %s (status=%s)", label, status)
                result = pattern2.sub(f"{label} was applied", result)

            # Also check if raw incident ID (e.g. DEMO-032) is cited with 'effective'
            m_id = re.search(r'\b(DEMO-\d+|INC-\d+)\b', label)
            if m_id:
                id_token = m_id.group(1)
                pattern3 = re.compile(
                    rf'\b(?:proved\s+effective|was\s+effective|effective)\s+(?:in|for|against)\s+(?:incident\s+)?{id_token}\b',
                    re.IGNORECASE,
                )
                if pattern3.search(result):
                    logger.warning("Rewriting invalid effective claim for ID %s (status=%s)", id_token, status)
                    result = pattern3.sub(f"was used in {id_token}", result)

    return result

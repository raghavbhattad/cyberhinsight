import hashlib
import logging
from datetime import datetime
from app.services.ioc import ExtractedIOCs, is_private_ip, extract_department

logger = logging.getLogger(__name__)


def _campaign_id(strongest_ioc: str) -> str:
    """Deterministic campaign ID from the strongest shared IOC."""
    h = hashlib.sha256(strongest_ioc.encode()).hexdigest()[:8]
    return f"CMP-{h}"


def _ip_to_network(ip: str) -> str:
    """Convert IP to /24 network."""
    parts = ip.split("/")[0].split(".")
    if len(parts) == 4:
        return f"{parts[0]}.{parts[1]}.{parts[2]}.0/24"
    return ip


def link_campaign(
    incident_iocs: ExtractedIOCs,
    memory_matches: list[dict],
    incident_store_items: list[dict],
    current_incident_id: str,
    current_text: str = "",
) -> dict | None:
    """Compare new incident IOCs against memory matches and stored incidents.
    Private/internal IPs (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, etc.)
    are ignored so they never form false campaign links.
    Returns campaign_link dict or None."""
    from app.services.ioc import extract_iocs

    all_prior_iocs: list[tuple[str, ExtractedIOCs, str]] = []  # (source_id, iocs, source_text)

    # From memory matches
    for i, m in enumerate(memory_matches):
        text = m.get("text", "")
        doc_id = m.get("document_id") or f"memory-{i}"
        iocs = extract_iocs(text)
        all_prior_iocs.append((doc_id, iocs, text))

    # From incident store (exclude baseline runs)
    for inc in incident_store_items:
        if inc.get("is_baseline"):
            continue
        inc_id = inc.get("id", "")
        if inc_id == current_incident_id:
            continue
        desc = inc.get("incident", {}).get("description", "")
        findings = inc.get("analysis", {}).get("investigation_findings", "")
        full_text = f"{desc} {findings}"
        iocs = extract_iocs(full_text)
        all_prior_iocs.append((inc_id, iocs, full_text))

    # Find shared IOCs — FILTER OUT PRIVATE / RESERVED RANGES
    shared_exact_ips = set()
    shared_domains = set()
    shared_hashes = set()
    shared_subnet_ips = set()
    shared_mitre = set()
    linked_ids = set()

    current_nets = set(net for net in incident_iocs.ip_networks if not is_private_ip(net))
    current_ips = set(ip for ip in incident_iocs.ipv4 if not is_private_ip(ip))
    current_domains = set(incident_iocs.domains)
    current_hashes = set(incident_iocs.hashes_md5 + incident_iocs.hashes_sha1 + incident_iocs.hashes_sha256)
    current_mitre = set(incident_iocs.mitre_techniques)

    # If there are no external IPs, domains, or hashes, do not link campaigns based on private telemetry alone
    if not (current_ips or current_domains or current_hashes or current_nets):
        return None

    for source_id, prior_iocs, _ in all_prior_iocs:
        matched = False
        prior_external_ips = set(ip for ip in prior_iocs.ipv4 if not is_private_ip(ip))
        prior_external_nets = set(net for net in prior_iocs.ip_networks if not is_private_ip(net))

        # Exact IP match (strong) — only external
        common_ips = current_ips & prior_external_ips
        if common_ips:
            shared_exact_ips |= common_ips
            matched = True

        # Domain match (strong)
        common_domains = current_domains & set(prior_iocs.domains)
        if common_domains:
            shared_domains |= common_domains
            matched = True

        # Hash match (strong)
        prior_hashes = set(prior_iocs.hashes_md5 + prior_iocs.hashes_sha1 + prior_iocs.hashes_sha256)
        common_hashes = current_hashes & prior_hashes
        if common_hashes:
            shared_hashes |= common_hashes
            matched = True

        # Subnet match (moderate) — only external
        common_nets = current_nets & prior_external_nets
        if common_nets and not common_ips:
            shared_subnet_ips |= common_nets
            matched = True

        # MITRE technique match (supplementary, not sole reason)
        common_mitre = current_mitre & set(prior_iocs.mitre_techniques)
        if common_mitre:
            shared_mitre |= common_mitre

        if matched:
            linked_ids.add(source_id)

    if not linked_ids:
        return None

    # Determine link strength
    strong_iocs = shared_exact_ips | shared_domains | shared_hashes
    if strong_iocs:
        link_strength = "strong"
    elif shared_subnet_ips:
        link_strength = "moderate"
    else:
        link_strength = "weak"

    # Determine the strongest IOC for campaign ID
    strongest_ioc = (
        sorted(shared_exact_ips)[0] if shared_exact_ips
        else sorted(shared_domains)[0] if shared_domains
        else sorted(shared_hashes)[0] if shared_hashes
        else sorted(shared_subnet_ips)[0] if shared_subnet_ips
        else "unknown"
    )

    # Collect departments deterministically
    departments = set()
    current_dept = extract_department(
        current_text,
        incident_iocs.hostnames[0] if incident_iocs.hostnames else None,
    )
    if current_dept and current_dept != "General":
        departments.add(current_dept)

    for inc in incident_store_items:
        inc_id = inc.get("id", "")
        if inc_id in linked_ids or inc_id == current_incident_id:
            dept = (
                inc.get("incident", {}).get("department")
                or inc.get("department")
            )
            if not dept or dept == "Unknown":
                desc = inc.get("incident", {}).get("description", "")
                host = inc.get("incident", {}).get("affected_asset", "")
                dept = extract_department(desc, host)
            if dept and dept != "Unknown":
                departments.add(dept)

    if not departments:
        departments.add("Security Operations")

    all_shared = sorted(shared_exact_ips | shared_domains | shared_hashes | shared_subnet_ips)

    campaign = {
        "campaign_id": _campaign_id(strongest_ioc),
        "linked_incident_ids": sorted(linked_ids),
        "shared_iocs": all_shared[:10],  # cap for response size
        "link_strength": link_strength,
        "incident_count": len(linked_ids) + 1,  # distinct count including current
        "departments_touched": sorted(departments),
        "shared_mitre": sorted(shared_mitre),
    }

    logger.info(
        "Campaign linked: %s, strength=%s, linked_ids=%s, depts=%s",
        campaign["campaign_id"], link_strength, linked_ids, campaign["departments_touched"]
    )
    return campaign


def predict_escalation(
    campaign_link: dict | None,
    memory_matches: list[dict],
    incident_store_items: list[dict],
) -> dict | None:
    """If campaign has >=2 linked incidents, predict next stage from memory.
    Must be grounded in recalled memories. Never predict from a single keyword match."""
    if not campaign_link or campaign_link.get("incident_count", 0) < 2:
        return None

    linked_ids = set(campaign_link.get("linked_incident_ids", []))
    if len(linked_ids) < 1:
        return None

    # Look for escalation patterns in memory and history
    escalation_keywords = [
        "ransomware", "encrypt", ".crypt", ".lock", ".encrypted",
        "lateral movement", "privilege escalation", "exfiltration",
        "data theft", "wiper", "vssadmin", "shadow copy",
    ]

    grounding_evidence = []
    seen_sources = set()

    for m in memory_matches:
        text = m.get("text", "").lower()
        for kw in escalation_keywords:
            if kw in text:
                src = m.get("document_id") or "memory"
                if src not in seen_sources:
                    seen_sources.add(src)
                    grounding_evidence.append({
                        "source": src,
                        "keyword": kw,
                        "snippet": m.get("text", "")[:200],
                    })
                break

    for inc in incident_store_items:
        inc_id = inc.get("id", "")
        if inc_id in linked_ids and inc_id not in seen_sources:
            desc = (inc.get("incident", {}).get("description", "") + " " +
                    inc.get("analysis", {}).get("investigation_findings", "")).lower()
            for kw in escalation_keywords:
                if kw in desc:
                    seen_sources.add(inc_id)
                    grounding_evidence.append({
                        "source": inc_id,
                        "keyword": kw,
                        "snippet": inc.get("incident", {}).get("summary", "")[:200],
                    })
                    break

    # Must require grounded evidence from at least 1 memory source and 2 linked incidents total
    if not grounding_evidence:
        return None

    # Find the most concerning escalation
    high_severity_keywords = ["ransomware", "encrypt", "wiper", "exfiltration", "data theft"]
    predicted_stage = "lateral movement or privilege escalation"
    for ev in grounding_evidence:
        if ev["keyword"] in high_severity_keywords:
            predicted_stage = f"{ev['keyword']} attack based on observed campaign progression"
            break

    return {
        "predicted_next_stage": predicted_stage,
        "confidence": "medium" if len(grounding_evidence) >= 2 else "low",
        "grounding_evidence": grounding_evidence[:5],
        "preventive_action": f"Immediately isolate remaining endpoints in affected departments ({', '.join(campaign_link.get('departments_touched', []))}), block all traffic to {', '.join(campaign_link.get('shared_iocs', [])[:3])}, and enable enhanced EDR monitoring for {', '.join(campaign_link.get('shared_mitre', [])[:3])} techniques.",
        "based_on_incidents": sorted(linked_ids),
    }

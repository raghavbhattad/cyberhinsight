import re
import logging
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)

# Patterns
_IPV4 = re.compile(
    r'\b(?:(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\.){3}'
    r'(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(?:/\d{1,2})?\b'
)
_DOMAIN = re.compile(
    r'\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+'
    r'(?:com|net|org|io|xyz|info|biz|co|dev|app|cloud|gov|edu|mil)\b',
    re.IGNORECASE,
)
_URL = re.compile(r'https?://[^\s<>"\')]+', re.IGNORECASE)
_MD5 = re.compile(r'\b[a-fA-F0-9]{32}\b')
_SHA1 = re.compile(r'\b[a-fA-F0-9]{40}\b')
_SHA256 = re.compile(r'\b[a-fA-F0-9]{64}\b')
_HOSTNAME = re.compile(r'\b[A-Z]{2,5}-[A-Z]{2,5}-\d{2,4}\b')
_MITRE = re.compile(r'\bT\d{4}(?:\.\d{3})?\b')
_FILENAME = re.compile(
    r'\b[\w.-]+\.(?:docm|docx|doc|xlsm|xlsx|xls|pptm|exe|dll|ps1|bat|cmd|vbs|js|hta|scr|msi|jar|py|sh|zip|rar|7z)\b',
    re.IGNORECASE,
)
_EMAIL = re.compile(r'\b[\w.+-]+@[\w-]+\.[\w.]+\b')


@dataclass
class ExtractedIOCs:
    ipv4: list[str] = field(default_factory=list)
    domains: list[str] = field(default_factory=list)
    urls: list[str] = field(default_factory=list)
    hashes_md5: list[str] = field(default_factory=list)
    hashes_sha1: list[str] = field(default_factory=list)
    hashes_sha256: list[str] = field(default_factory=list)
    hostnames: list[str] = field(default_factory=list)
    mitre_techniques: list[str] = field(default_factory=list)
    filenames: list[str] = field(default_factory=list)
    emails: list[str] = field(default_factory=list)

    @property
    def all_flat(self) -> list[str]:
        """All IOCs as a flat deduplicated list."""
        seen = set()
        out = []
        for lst in [
            self.ipv4, self.domains, self.urls,
            self.hashes_md5, self.hashes_sha1, self.hashes_sha256,
            self.hostnames, self.mitre_techniques, self.filenames, self.emails,
        ]:
            for item in lst:
                if item not in seen:
                    seen.add(item)
                    out.append(item)
        return out

    @property
    def ip_networks(self) -> list[str]:
        """Extract /24 networks from IPs for campaign correlation."""
        nets = set()
        for ip in self.ipv4:
            parts = ip.split("/")
            octets = parts[0].split(".")
            if len(octets) == 4:
                nets.add(f"{octets[0]}.{octets[1]}.{octets[2]}.0/24")
        return sorted(nets)

    def to_dict(self) -> dict:
        return {
            "ipv4": self.ipv4,
            "domains": self.domains,
            "urls": self.urls,
            "hashes_md5": self.hashes_md5,
            "hashes_sha1": self.hashes_sha1,
            "hashes_sha256": self.hashes_sha256,
            "hostnames": self.hostnames,
            "mitre_techniques": self.mitre_techniques,
            "filenames": self.filenames,
            "emails": self.emails,
        }


def extract_iocs(text: str) -> ExtractedIOCs:
    """Extract all IOCs from text using deterministic regex patterns."""
    # Remove common false positives
    cleaned = text

    iocs = ExtractedIOCs(
        ipv4=sorted(set(_IPV4.findall(cleaned))),
        domains=sorted(set(_DOMAIN.findall(cleaned))),
        urls=sorted(set(_URL.findall(cleaned))),
        hashes_sha256=sorted(set(_SHA256.findall(cleaned))),
        hashes_sha1=sorted(set(h for h in _SHA1.findall(cleaned) if h not in set(_SHA256.findall(cleaned)))),
        hashes_md5=sorted(set(
            h for h in _MD5.findall(cleaned)
            if h not in set(_SHA1.findall(cleaned)) and h not in set(_SHA256.findall(cleaned))
        )),
        hostnames=sorted(set(_HOSTNAME.findall(cleaned))),
        mitre_techniques=sorted(set(_MITRE.findall(cleaned))),
        filenames=sorted(set(_FILENAME.findall(cleaned))),
        emails=sorted(set(_EMAIL.findall(cleaned))),
    )

    logger.debug("Extracted IOCs: %d total from %d chars", len(iocs.all_flat), len(text))
    return iocs


def merge_iocs(extracted: ExtractedIOCs, llm_indicators: list[str]) -> list[str]:
    """Merge deterministic IOCs with LLM-provided indicators, deduplicated."""
    seen = set()
    merged = []
    for item in extracted.all_flat + llm_indicators:
        normalized = item.strip()
        if normalized and normalized not in seen:
            seen.add(normalized)
            merged.append(normalized)
    return merged

import re
import logging
from typing import Literal, Tuple
from app.services.ioc import extract_iocs

logger = logging.getLogger(__name__)

IntentType = Literal["investigate", "ask_history", "general", "teach"]

# Deterministic patterns
_TEACH_PATTERNS = [
    re.compile(r'\b(?:remember that|note that|fyi|for future|keep in mind)\b', re.IGNORECASE),
    re.compile(r'\b(?:that worked|that didn\'t work|that failed|it was a false positive|mark as|treat as)\b', re.IGNORECASE),
    re.compile(r'^(?:note|remember|feedback):', re.IGNORECASE),
]

_HISTORY_PATTERNS = [
    re.compile(r'\b(?:have we seen|seen before|seen this before|prior incident|previous incident|in the past)\b', re.IGNORECASE),
    re.compile(r'\b(?:last time|which hosts|who was affected|how many times|past incidents|history of)\b', re.IGNORECASE),
    re.compile(r'\b(?:what worked|what failed|effective against|past resolution|previous resolution)\b', re.IGNORECASE),
    re.compile(r'\b(?:campaign pattern|recurring attack|prior alerts|incident history)\b', re.IGNORECASE),
]

_INVESTIGATE_TRIGGERS = [
    re.compile(r'\b(?:detected|observed|alert|user reported|spawned|connected to|beaconed to|executing|malware|compromise|ransomware|phishing)\b', re.IGNORECASE),
]

_EXTENSION_PATTERN = re.compile(r'\.(?:exe|docm|docx|xlsm|ps1|bat|cmd|vbs|js|hta|scr|dll|crypt|encrypted)\b', re.IGNORECASE)


def deterministic_intent_check(message: str) -> Tuple[IntentType | None, str]:
    """Fast, deterministic intent classification based on domain keywords and IOCs."""
    text = message.strip()

    # 1. Teach check (feedback / notes)
    for pattern in _TEACH_PATTERNS:
        if pattern.search(text):
            return "teach", f"Matched teach pattern: {pattern.pattern}"

    # 2. History Q&A check
    for pattern in _HISTORY_PATTERNS:
        if pattern.search(text):
            return "ask_history", f"Matched history pattern: {pattern.pattern}"

    # 3. Investigation check
    # Check for technical indicators (IPs, domains, hashes, hostnames, malicious extensions)
    iocs = extract_iocs(text)
    ext_matches = _EXTENSION_PATTERN.findall(text)
    indicator_count = (
        len(iocs.ipv4) + len(iocs.domains) + len(iocs.hashes_sha256) +
        len(iocs.hashes_md5) + len(iocs.hostnames) + len(ext_matches)
    )

    has_alert_word = any(trig.search(text) for trig in _INVESTIGATE_TRIGGERS)

    if indicator_count >= 2 and has_alert_word:
        return "investigate", f"Matched investigation: {indicator_count} indicators and alert terminology"

    if indicator_count >= 1 and (
        "beacon" in text.lower() or "powershell" in text.lower() or "cmd.exe" in text.lower() or
        "encrypt" in text.lower() or "credential" in text.lower() or "invoice" in text.lower()
    ):
        return "investigate", "Matched investigation: technical indicator with attack behavior"

    return None, "Undetermined deterministically"


async def route_intent(
    message: str,
    llm_service = None,
) -> Tuple[IntentType, str]:
    """Classify the user intent. Checks deterministic rules first; falls back to LLM if ambiguous."""
    intent, reason = deterministic_intent_check(message)
    if intent is not None:
        logger.debug("Intent routed deterministically: %s (%s)", intent, reason)
        return intent, reason

    # Fallback to LLM if available
    if llm_service:
        system_prompt = (
            "You are an intent classifier for a security operations assistant. "
            "Analyze the user message and classify it into EXACTLY ONE of these categories:\n"
            "- 'investigate': The user is describing a new security alert, suspicious telemetry, or malware execution for investigation.\n"
            "- 'ask_history': The user is asking about past incidents, whether an indicator was seen before, or what remediations worked previously.\n"
            "- 'teach': The user is providing feedback on a past incident, teaching a new organizational fact, or noting a host importance.\n"
            "- 'general': A general cybersecurity question, how-to, definition, or conversational inquiry.\n\n"
            "Return ONLY valid JSON: {\"intent\": \"investigate|ask_history|teach|general\", \"reason\": \"brief explanation\"}"
        )
        try:
            parsed = await llm_service.analyze_json(system_prompt, f"User message: {message}")
            llm_intent = parsed.get("intent", "general")
            if llm_intent in ("investigate", "ask_history", "teach", "general"):
                return llm_intent, f"LLM classification: {parsed.get('reason', '')}"
        except Exception as e:
            logger.warning("LLM intent routing failed: %s. Defaulting to general.", e)

    return "general", "Defaulted to general security response"

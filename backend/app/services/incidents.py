class IncidentStore:
    def __init__(self):
        self.incidents = []

    def add(self, incident_data: dict):
        self.incidents.append(incident_data)

    def get_all(self):
        return self.incidents

    def get_by_id(self, id: str):
        for incident in self.incidents:
            if incident.get("id") == id:
                return incident
        return None

    def get_stats(self):
        total = len(self.incidents)
        by_severity = {}
        by_category = {}
        for inc in self.incidents:
            sev = (inc.get("incident", {}).get("severity") or inc.get("severity") or "unknown").lower()
            cat = inc.get("incident", {}).get("category") or inc.get("category") or "Unknown"
            by_severity[sev] = by_severity.get(sev, 0) + 1
            by_category[cat] = by_category.get(cat, 0) + 1
        
        recent = list(reversed(self.incidents[-5:])) if total >= 5 else list(reversed(self.incidents))
        
        return {
            "total": total,
            "by_severity": by_severity,
            "by_category": by_category,
            "recent": recent
        }

    def clear(self):
        self.incidents = []


import httpx
import json

base_url = 'http://127.0.0.1:8000'

# 1. Health check
r = httpx.get(f'{base_url}/api/health')
print('HEALTH:', r.status_code, r.json())

# 2. Investigate Incident 1
inc1 = {
    'description': 'Finance department employee received a suspicious email with an attachment. Upon opening, PowerShell was observed executing on the endpoint FIN-WS-042. The process spawned cmd.exe and attempted to download files from an external IP 203.0.113.45. Credentials for the user account may have been compromised.',
    'use_memory': True
}
print('\n========================================')
print('ACT 1: FIRST INCIDENT (BASELINE / FIRST MEMORY)')
print('========================================')
r1 = httpx.post(f'{base_url}/api/incidents/investigate', json=inc1, timeout=60.0)
print('HTTP STATUS:', r1.status_code)
d1 = r1.json()
print('Summary:', d1.get('incident', {}).get('summary'))
print('Severity:', d1.get('incident', {}).get('severity'))
print('MITRE ATT&CK:', d1.get('incident', {}).get('mitre_technique'))
print('Affected Asset:', d1.get('incident', {}).get('affected_asset'))
print('Memory Matches Count:', len(d1.get('memory_matches', [])))
print('Immediate Actions:')
for act in d1.get('recommendations', {}).get('immediate_actions', []):
    print(f'  - {act}')
print('Adapted from Memory:', d1.get('recommendations', {}).get('adapted_from_memory'))
print('Memory Stored in Hindsight:', d1.get('memory_stored'))

# 3. Investigate Incident 2 (Similar Phishing Alert on another Finance endpoint)
inc2 = {
    'description': 'Another Finance employee on endpoint FIN-WS-067 reported a suspicious email. Similar PowerShell activity detected. Connection attempts to IP range 203.0.113.0/24 observed. Employee had access to financial reporting systems.',
    'use_memory': True
}
print('\n========================================')
print('ACT 2: SECOND INCIDENT (HINDSIGHT RECALL TRIGGERED)')
print('========================================')
r2 = httpx.post(f'{base_url}/api/incidents/investigate', json=inc2, timeout=60.0)
print('HTTP STATUS:', r2.status_code)
d2 = r2.json()
print('Summary:', d2.get('incident', {}).get('summary'))
print('Severity:', d2.get('incident', {}).get('severity'))
print('Memory Matches Recalled from Hindsight:', len(d2.get('memory_matches', [])))
for idx, m in enumerate(d2.get('memory_matches', [])):
    snippet = m.get('text', '').replace('\n', ' ')[:150]
    print(f'  [Memory #{idx+1}]: {snippet}...')

print('\nContext-Aware Recommendations:')
for act in d2.get('recommendations', {}).get('immediate_actions', []):
    print(f'  - {act}')
print('Adapted from Memory:', d2.get('recommendations', {}).get('adapted_from_memory'))
print('Why these recommendations:')
print(f"  {d2.get('recommendations', {}).get('why_these_recommendations')}")
print('Memory Stored in Hindsight:', d2.get('memory_stored'))

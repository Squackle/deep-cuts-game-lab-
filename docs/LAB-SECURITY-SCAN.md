# Game Lab safe source security scan

The separate Lab repository has no production D1 or score authority. This read-only workflow detects high-confidence credential shapes and two high-risk CI patterns in tracked current source before review, weekly, or on demand. It reports only rule names and paths, never matched token values. No external service, npm install, Cloudflare secret, production request, or paid scanner is needed.

Local reproduction: `node --test tests/lab-security-scan.test.mjs && node scripts/lab-security-scan.mjs` (Node 24 and Git). The scanner uses the tracked checkout, selected text extensions/config files, an 8 MB per-file and 150 MB total limit. It reports omitted candidates; omissions in functions/workflows or credential-file candidates, and total budget exhaustion, fail the check. A credential shape is a potential finding, not proof of a live secret or compromise. Never paste the value into an issue, artifact or chat. Verify privately and coordinate with the owner.

This does not scan Git history, prove secret scanning is enabled in GitHub, audit external dependencies, assess all vulnerabilities, or replace production security controls. GitHub security settings and Cloudflare permissions remain owner-gated. Do not disable the check for real findings; document false positives and use narrow reviewed corrections.

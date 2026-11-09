# C2 browser acceptance preparation — approval review

7 November 2026. **C2 NOT ACCEPTED.** Four C2 checkpoints remain in force;
C3 has not started. The November 9 database backup is verified; it must not be
recreated. Fresh candidate recovery is verified below. Asset publication completed and HTTP verification passed on November 9,
as recorded below. Organization/account changes and browser writes remain unexecuted.

## Current C2 operations status — 10 November

| Operation | Current status |
| --- | --- |
| November 9 development database backup | COMPLETE / verified; do not recreate |
| Frontend publication | COMPLETE / HTTP VERIFIED; do not rebuild or republish |
| Synthetic organization/account provisioning | COMPLETE: scopes 6/7, Healthcare 30/31, Relawan 32/33; HTTP/DATABASE VERIFIED |
| Browser acceptance | P0 CORE BROWSER VERIFIED; local demo CONDITIONAL PASS; native lock/P1/P2/full C2 pending |
| Overall C2 / C3 | C2 NOT ACCEPTED; C3 not started |

The safe browser/PWA retirement confirmation is already recorded and retained.
[Synthetic provisioning record](c2-synthetic-provisioning-preflight.md) retains the
historical preflight and current completion evidence. The owner has confirmed all
local data is dummy, approved necessary C2 writes and accepted the audit limitation.
No historical-provenance or routine dummy-write approval remains pending.
The sections below retain earlier snapshot/failed-attempt evidence with dates;
they do not override this current summary or authorize repetition.

## Historical pre-publication read-only evidence

- Laravel: APP_ENV=local, pgsql, actual database rapid_mind. All 28 migrations
  applied; November 3 batch 8 and November 7 batch 9. No migrations repeated.
- Existing app, nginx, postgres, queue, scheduler and reverb containers running;
  PostgreSQL healthy. TCP reachable at app:9000, nginx:80, reverb:8080,
  postgres:5432. Nginx → Reverb public handshake returned HTTP 101 using the
  configured public client key. This is not private authorization/event evidence.
- Existing frontend manifest SHA-256:
  `c8326f8e5d9de218c30753fc25183652a1e75e29da3af00e61adc6b177b11dfb`.
  No public/hot. All 59 existing manifest entries have their target files.
- 17 assessments and 42 emergencies remain UNRESOLVED, with originating Posko
  and responsible facility NULL. Seven primary mappings NULL; no case shares.
- OFFLINE_ENCRYPTION_LOCAL_ENROLLMENT resolves true. The server still requires
  local environment, exact http://localhost:8080 host/origin, current authenticated
  active Relawan session and matching owner/version. No configuration changed.

## Organization inventory and proposed assignments

| Posko ID | Name | Active | Primary facility |
| --- | --- | --- | --- |
| 1 | Posko Candi | yes | NULL |
| 2 | Posko Utama Maguwo | yes | NULL |
| 3 | Posko Siaga Pakem | yes | NULL |
| 4 | Posko Browser Test | no | NULL |
| 5 | Posko Browser Test 2 | no | NULL |
| 6 | Posko Final 88a4387 A | no | NULL |
| 7 | Posko Final 88a4387 B | no | NULL |

| Facility ID | Name | Active |
| --- | --- | --- |
| 1 | RSUD Candi | yes |
| 2 | Puskesmas Pakem | yes |
| 3 | PSC 119 Sleman | yes |
| 4 | Faskes Browser Test | no |
| 5 | Faskes Browser Test 2 | no |
| 6 | Faskes Final 88a4387 A | no |
| 7 | Faskes Final 88a4387 B | no |

Recommended minimal reuse: owner confirms test-labeled rows 6/7 are disposable
synthetic organizations, activates these two Posko and two facilities, then uses
Admin to set **Posko 6 → facility 6**, **Posko 7 → facility 7**. Other five Posko,
all original case routing, and all existing account assignments remain unchanged.
Use the established audited Admin mapping workflow, not a seeder or bulk UPDATE.

Create four dedicated synthetic accounts through Admin after explicit approval:

| Alias / proposed email | Role | New assignment |
| --- | --- | --- |
| C2 Relawan A / c2-relawan-a@example.invalid | RELAWAN | Posko 6 |
| C2 Relawan B / c2-relawan-b@example.invalid | RELAWAN | Posko 7 |
| C2 Healthcare A / c2-healthcare-a@example.invalid | HEALTHCARE | facility 6 |
| C2 Healthcare B / c2-healthcare-b@example.invalid | HEALTHCARE | facility 7 |

Names/emails are proposals, not created identities. Check uniqueness at execution.
Owner supplies credentials privately; do not include them in reports or commands.
New database IDs must be recorded after creation, not predicted.

Why dedicated accounts: seeded relawan@rapidmind.id (ID 19) is active in Posko 1
and owns 16 assessments/40 emergencies; reading its ordinary workspace could open
historical clinical information. nakes@rapidmind.id (ID 20) is active in facility 1;
ID 23 is also active Healthcare there. Only facility 1 currently has active
Healthcare users, so existing active accounts cannot establish two-facility
acceptance without changing somebody's scope. The seeded Admin ID 21 can perform
approved organization provisioning without patient-level access.

The three known seeded accounts have matching stored credential hashes when
checked against their seeder definitions in memory; credentials/hashes are omitted.
No login was performed: login would create/update session/token state. This proves
credential configuration, not successful browser authentication or that arbitrary
historical clinical records are synthetic. Do not use the seeded Relawan for C2
clinical scenarios. Healthcare ID 20 is technically eligible but is not selected
for the clean two-facility run.

Posko/facility 6 have no current users. Posko 7 has inactive Relawan ID 27;
facility 7 has inactive Healthcare ID 28. Keep both inactive and unchanged.
Neither candidate scope has assigned cases. If owner cannot confirm the existing
organization fixtures' synthetic provenance, create two dedicated Posko/facilities
instead under a separate explicit approval; do not infer disposability from names.

## Fresh build and backend compatibility — recovered 9 November

Persistent private candidate: `/home/saga/rapid-mind-staging/c2-frontend-20261109-76ku_ksx/public/build`.
HEAD `8d3ac3c5a4fd3d1f068ac181688c05362484bf95`, branch demo, **94 changed files** at build capture.
The complete status and HEAD diff are retained privately in repository-state.json
and working-tree.diff beside the candidate. The source-input manifest records
**317** frontend/backend/configuration/static/dependency-lock inputs, SHA-256
`15a3c86797c74866cf16eb8ba2f9c58f7c1d97204795a10daeac55db79ead49d`.
All inputs matched again after building. Documentation is excluded from these
source hashes so this evidence update cannot alter the application snapshot.
The backend snapshot includes CaseRouting.php unchanged, including its outdated
schema-approval comment at line 17; cleanup is deferred.

Build: existing installed dependencies, Node v24.21.0, Vite 8.3.1,
@laravel/echo-vue 2.5.0 and vite-plugin-pwa 1.3.0. `npm run build` exit **0**,
normal production mode, 59 manifest entries, 67 output files, 31 injected PWA
precache entries plus the existing logo entry. All manifest targets/import keys
and all 32 actual worker precache URLs resolve. Large-chunk and deprecated
inlineDynamicImports warnings remain. TypeScript passed; the two focused Node
files for Healthcare worklist/channel freshness and sync retry passed (2/2 files).
These do not constitute browser acceptance.

Only the public VITE_REVERB_APP_KEY was injected from existing Laravel config;
no .env, secret configuration file or fixture-mode switch was copied. The public
key in the compiled JavaScript matches Laravel. Artifact scanning found none of
the checked configured local app/JWT/Reverb/database/mail private values or private
key headers; no source maps, .env, .pem or .key files are published. No production
configuration was supplied. Absence of unknown production secrets cannot be
independently attested by scanning this local configuration. Private scan values
were held in memory and were not printed or written to evidence.

Laravel remains local/pgsql rapid_mind, both C2 migrations Ran, six existing
services running and PostgreSQL healthy. Source inspection confirms the layout
uses the canonical healthcareChannel and AssessmentUpdated invalidations with
retired-channel callback guards; backend channels/audiences use
healthcare.facility.{facility}.user.{user}.version.{version}. Echo targets the
page origin's hostname/port; Nginx proxies Reverb. This is static/backend contract
compatibility evidence, not proof of successful private browser event reception.

All four recorded old control-file hashes match the recovered build. The deleted
candidate's original source-input inventory and full asset bytes are unavailable,
so exact source differences since that snapshot and full byte equality cannot be
established. Current source/working-tree state is captured rather than assumed.
The pre-C2 live build and previously key-less temporary build remain unsuitable
substitutes for this reviewed candidate.

| Candidate control file | SHA-256 |
| --- | --- |
| manifest.json | 3cdb72539ecbcf5f9db259b593f233447d58854c9353d80f3f3706eb15c8a5d8 |
| serviceWorker.js | 3f9b4cab2343d447f15dd4e17634b2bf10f63dfebbd90edf58ef50598ad83371 |
| manifest.webmanifest | 0c3cd31dc482870be9965ff3a2f14eb7a4d04d74d2b1dce84357201c4f20f1d8 |
| offline.html | 690c8da1c5fbcfd2b3ebb826faf50afd7ca3dde9e225218125dfccf9ffa74de7 |

Complete 67-file output inventory: `/home/saga/rapid-mind-staging/c2-frontend-20261109-76ku_ksx/artifact-hashes.json`, SHA-256
`6be2c8071b4bdace7a72f8be13727bf7b12de9fad32f6726bed344eb05b1faf6`.
Live frontend hashes remain unchanged, including manifest
`c8326f8e5d9de218c30753fc25183652a1e75e29da3af00e61adc6b177b11dfb`.
No public/hot; no live manifest or worker was replaced.

## Reference backup procedure — DO NOT REPEAT VERIFIED BACKUP

Run only after backup approval, from the repository root. This creates protected
host backup files outside the repository, performs only source-database reads,
and does not create/restore another database. Ensure owner-only trusted parent
`/home/saga/Backups/rapid-mind` exists. Stop on any nonzero command; no recovery.
Recheck Laravel local/pgsql/actual rapid_mind and service identity immediately
before this procedure. Docker pg_dump uses the existing container-local role;
no password is printed or placed on a command line.

```bash
bash <<'BASH'
set -euo pipefail
umask 077
backup_root=/home/saga/Backups/rapid-mind
[ -d "$backup_root" ] && [ ! -L "$backup_root" ]
[ "$(stat -c %u "$backup_root")" = "$(id -u)" ]
[ "$(stat -c %a "$backup_root")" = 700 ]
backup_dir=$(mktemp -d "$backup_root/c2-before-browser-XXXXXXXX")
docker compose exec -T postgres pg_dump -U rapid_mind -d rapid_mind --format=custom </dev/null > "$backup_dir/rapid_mind.dump"
[ -s "$backup_dir/rapid_mind.dump" ]
(cd "$backup_dir" && sha256sum rapid_mind.dump > rapid_mind.dump.sha256)
(cd "$backup_dir" && sha256sum --check rapid_mind.dump.sha256)
docker compose exec -T postgres pg_restore --list < "$backup_dir/rapid_mind.dump" > "$backup_dir/archive-toc.txt"
docker compose exec -T postgres pg_restore --file=/dev/null < "$backup_dir/rapid_mind.dump"
stat -c '%a %U %s %n' "$backup_dir" "$backup_dir/rapid_mind.dump"
printf 'Backup verified: %s\n' "$backup_dir"
BASH
```

Docker commands that do not require input must use `</dev/null` so they cannot
consume the enclosing heredoc. The pg_restore commands above intentionally read
the archive from stdin and retain their explicit archive redirections. This
runbook correction was syntax-checked only; the verified backup was not recreated.

Record actual timestamps, source identity, exit codes, byte size, checksum and
counts privately with the backup. pg_dump obtains its own consistent snapshot;
nearby count checks are not claimed to share that snapshot. Readability is not a
new restore rehearsal. A restore rehearsal would need separate approval. The
October 24 backup remains intact; it is not the proposed current recovery point.
Filesystem permission protection does not establish encryption or an off-host copy;
no browser IndexedDB/outbox or application keys are included in a database dump.

## Controlled asset publication — EXECUTED AND HTTP VERIFIED

The owner has already confirmed safe retirement of all existing browser/PWA
sessions with no unsynchronized fieldwork stranded. Preserve that confirmation;
do not ask again without new contrary evidence. The November 9 database backup
remains verified (SHA-256 7b21f0f6f6d9eca8cf06afe61c579c6f3c402110538e29095483215308816752);
do not recreate it. The owner explicitly approved publication of this recovered candidate; it has
now completed. The command below is the executed one-time procedure, not a request
to rerun it. Its original-live-manifest assertion intentionally prevents reruns.
Use disposable Antigravity profiles. No service restart, cache clear or new proxy.

The command below checks exact source/live/candidate manifests, backs up the live
public assets, adds hashed dependencies without deleting old ones, then atomically
replaces each control file. It is a staged publication, not a transactional
multi-file switch. Do not browse during publication. Any unexpected collision or
failure means stop and report; no automatic rollback. If source or candidate has
changed/reboot removed /tmp, rebuild privately and review new hashes first.

```bash
python3 - <<'PY'
from pathlib import Path
import hashlib, json, os, shutil, stat, tarfile, tempfile
repo = Path('/home/saga/coding/rapid-mind')
stage = Path('/home/saga/rapid-mind-staging/c2-frontend-20261109-76ku_ksx')
src, dst = stage/'public/build', repo/'public/build'
def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()
assert not (repo/'public/hot').exists(), 'Unexpected Vite hot file'
assert digest(dst/'manifest.json') == 'c8326f8e5d9de218c30753fc25183652a1e75e29da3af00e61adc6b177b11dfb'
expected = {
 'manifest.json': '3cdb72539ecbcf5f9db259b593f233447d58854c9353d80f3f3706eb15c8a5d8',
 'serviceWorker.js': '3f9b4cab2343d447f15dd4e17634b2bf10f63dfebbd90edf58ef50598ad83371',
 'manifest.webmanifest': '0c3cd31dc482870be9965ff3a2f14eb7a4d04d74d2b1dce84357201c4f20f1d8',
 'offline.html': '690c8da1c5fbcfd2b3ebb826faf50afd7ca3dde9e225218125dfccf9ffa74de7',
}
assert digest(stage/'source-inputs.json') == '15a3c86797c74866cf16eb8ba2f9c58f7c1d97204795a10daeac55db79ead49d'
assert digest(stage/'artifact-hashes.json') == '6be2c8071b4bdace7a72f8be13727bf7b12de9fad32f6726bed344eb05b1faf6'
artifact_inventory = json.loads((stage/'artifact-hashes.json').read_text())
assert set(artifact_inventory) == {str(p.relative_to(src)) for p in src.rglob('*') if p.is_file()}
assert all(digest(src/n) == h for n,h in artifact_inventory.items())
assert all(digest(src/n) == h for n,h in expected.items())
assert all(digest(repo/n) == h for n,h in json.loads((stage/'source-inputs.json').read_text()).items())
for name in ['pwa-192.png','pwa-512.png','manifest.webmanifest','manifest.json','favicon.png','favicon.ico','logo.png','robots.txt']:
 assert digest(stage/'public'/name) == digest(repo/'public'/name), name
manifest = json.loads((src/'manifest.json').read_text())
for entry in manifest.values():
 for name in [entry['file'], *entry.get('css',[]), *entry.get('assets',[])]:
  assert (src/name).is_file(), name
 for dependency in [*entry.get('imports',[]), *entry.get('dynamicImports',[])]:
  assert dependency in manifest, dependency
import subprocess
key_reader = "require 'vendor/autoload.php'; $a=require 'bootstrap/app.php'; $a->make(Illuminate\\Contracts\\Console\\Kernel::class)->bootstrap(); echo config('broadcasting.connections.reverb.key');"
public_key = subprocess.check_output(['docker','compose','exec','-T','app','php','-r',key_reader], cwd=repo, stdin=subprocess.DEVNULL)
assert hashlib.sha256(public_key).hexdigest() == 'b913c3bda16c71dec880c7102fb03892fe96778235004e69f9421b358b897e04'
assert any(public_key in p.read_bytes() for p in src.rglob('*.js'))
files = [p for p in src.rglob('*') if p.is_file()]
for p in files:
 assert not p.is_symlink()
 rel = p.relative_to(src)
 assert rel.parts[0] == 'assets' or str(rel) in expected, rel
 target = dst/rel
 assert not target.is_symlink()
 if str(rel) not in expected and target.exists():
  assert digest(p) == digest(target), f'Collision: {rel}'
backup_root = Path('/home/saga/Backups/rapid-mind')
assert not backup_root.is_symlink()
assert backup_root.stat().st_uid == os.getuid()
assert stat.S_IMODE(backup_root.stat().st_mode) == 0o700
save = Path(tempfile.mkdtemp(prefix='c2-assets-', dir=backup_root))
archive = save/'live-build.tar.gz'
fd = os.open(archive, os.O_CREAT|os.O_EXCL|os.O_WRONLY, 0o600)
with os.fdopen(fd,'wb') as output:
 with tarfile.open(fileobj=output, mode='w:gz') as tar:
  tar.add(dst, arcname='build')
(save/'live-build.sha256').write_text(digest(archive)+'  live-build.tar.gz\n')
os.chmod(save/'live-build.sha256',0o600)
# Verify the protected backup fully before any live-file replacement.
recorded = (save/'live-build.sha256').read_text().split()
assert recorded == [digest(archive), 'live-build.tar.gz'], 'Backup checksum mismatch'
import gzip
with gzip.open(archive, 'rb') as compressed:
 while compressed.read(1024 * 1024): pass  # Includes gzip trailer/CRC validation.
backed_up = {}
with tarfile.open(archive, 'r:gz') as tar:
 for member in tar:
  if member.isdir(): continue
  assert member.isfile(), f'Unexpected backup entry: {member.name}'
  relative = Path(member.name).relative_to('build')
  assert relative.parts and '..' not in relative.parts
  assert str(relative) not in backed_up, 'Duplicate backup entry'
  stream = tar.extractfile(member)
  assert stream is not None
  hashed = hashlib.sha256()
  while chunk := stream.read(1024 * 1024): hashed.update(chunk)
  backed_up[str(relative)] = hashed.hexdigest()
current_live = {str(p.relative_to(dst)): digest(p) for p in dst.rglob('*') if p.is_file()}
assert backed_up == current_live, 'Backup contents do not match existing live files'
print('Backup checksum, gzip readability and all file contents verified:', archive)
print('Backup SHA-256:', digest(archive), 'Files:', len(backed_up))
def publish(p):
 target = dst/p.relative_to(src)
 target.parent.mkdir(parents=True, exist_ok=True, mode=0o755)
 fd, temporary = tempfile.mkstemp(prefix='.c2-publish-', dir=target.parent)
 with os.fdopen(fd,'wb') as output:
  output.write(p.read_bytes()); output.flush(); os.fsync(output.fileno())
 os.chmod(temporary,0o644)
 os.replace(temporary,target)
for p in files:
 if str(p.relative_to(src)) not in expected and not (dst/p.relative_to(src)).exists(): publish(p)
for name in ['offline.html','manifest.webmanifest','manifest.json','serviceWorker.js']: publish(src/name)
assert all(digest(dst/n) == h for n,h in expected.items())
print('Published candidate; old assets retained. Backup:',save)
PY
```

After publication, request only static /build manifest, selected entry JS/CSS,
serviceWorker.js and offline.html to confirm HTTP 200 and expected bytes; then
record URLs and hashes in browser evidence. No login/clinical request is part of
asset verification. Do not infer service-worker activation from HTTP status.
No npm build directly in the live checkout and no recursive deletion of public/build.

The same exact proposed Python body is stored privately at
`/home/saga/rapid-mind-staging/c2-frontend-20261109-76ku_ksx/publish-reviewed.py`, SHA-256
`35165dff67b4271dff5005cd59619cb123331e001203786a56c6172156f5b418`. Actual command executed successfully from the repository root (exit 0):

```bash
python3 /home/saga/rapid-mind-staging/c2-frontend-20261109-76ku_ksx/publish-reviewed.py
```

Publication completed after the backup-content verification below. The procedure retains all old hashed
assets, adds new dependencies before switching control files, and never accesses
IndexedDB/Cache Storage or browser profiles. It is still suitable with the updated
persistent path and frozen source/full-artifact inventories. It is not a multi-file
transaction; fail closed on any drift and do not automatically roll back.

## First browser wave and approval boundaries

See the linked handoff's first-wave section. Minimum new clinical footprint:
one new synthetic patient with one assessment and linked T0 from A, plus one new
synthetic B patient/assessment for reciprocal scoping (two patients, two assessments,
one emergency). Capture actual UUIDs as an explicit allowlist. No old case IDs may
be a mutation target. Do not reuse NIK or match historical patient demographics.
Use a synthetic code/name and absent optional NIK where supported; no fake real NIK.
If the UI requires additional patient rows/identifiers, stop and revise approval.

Remaining approvals, in execution order:

1. Current protected database backup creation using the procedure above.
2. Exact candidate publication plus owner-managed retirement of old clients.
3. Confirmation of fixture provenance, activation of only organization rows 6/7,
   audited primary mappings 6→6 and 7→7, and creation of the four proposed users.
   Existing IDs 27/28 remain inactive. No other assignment or historical transfer.
4. Antigravity login/session writes and encrypted local enrollment in new profiles;
   explicit synthetic writes limited to the two new patients/two assessments/one
   emergency, their normal sync receipts and creation/audit effects. Read-only
   Healthcare viewing and negative authorization probes against those new IDs.
   Do not authorize successful acknowledgement/verification/referral/dispatch
   progression in this first wave. No SMS, external contact or responder dispatch.

These are reviewable proposals, not questions that authorize execution by silence.
Backup/publication/account work and browser writes have not been performed here.
Later sharing/revocation and clinical-state acceptance require separately scoped
writes, not expansion of this minimal wave. Full C2 handoff remains required;
first-wave success alone cannot mark C2 ACCEPTED. Preserve C1 limits and no C3.

## Historical 9 November publication attempt — BLOCKED THEN, NOT EXECUTED

Owner conditionally authorized the documented publication, requiring explicit safe
retirement of existing browser/PWA sessions. That confirmation was requested and
has not been received at this checkpoint. It cannot override a failed artifact gate.

Read-only publication preflight stopped because the reviewed candidate directory
`/tmp/rapid-mind-c2-browser-build-mpj_r1br` is absent, including manifest.json and
source-inputs.json. The existing live manifest still matches
`c8326f8e5d9de218c30753fc25183652a1e75e29da3af00e61adc6b177b11dfb`;
public/hot is absent. Candidate source hashes, public Reverb key and dependencies
could not be reverified. No asset backup or publication ran, and no replacement
candidate was built or substituted. No HTTP publication verification was performed.
The previously verified current database backup was not recreated.

Only this runbook's pg_dump stdin redirection and checkpoint documentation changed.
CaseRouting.php line 17 still says schema deployment lacks approval; this comment
is outdated after the approved November migrations and is left unchanged for later
source cleanup. No clinical records, organizations, users, browser storage, service
worker storage, Docker services, dependencies or Git state were mutated.

Next: separately authorize preparation/review of a fresh candidate or supply the
original reviewed artifact with its source-input manifest. Re-run all publication
gates and obtain safe-session-retirement confirmation before any live replacement.
C2 remains NOT ACCEPTED; C3 has not started.

## Recovery gate status — 9 November

The earlier missing-candidate blocker is superseded by the verified persistent
candidate above. The historical blocked-attempt text records the state at that
attempt only. Safe-session retirement is already confirmed. Current database
backup evidence is retained without recreation. Recovery/build verification is
complete; publication is NOT EXECUTED and requires approval of the new path and
reviewed command. Organizations/users and all clinical/browser writes remain
outside this approval. C2 NOT ACCEPTED; no C3.

Final recovery checks: the updated publication script's read-only prefix passed
all source/full-artifact/current-Reverb-key/live-manifest/collision assertions.
All 67 live build files were compared with the before-build inventory and remain
unchanged; public/hot remains absent. Runbook shell syntax and git diff --check
passed. No live-asset backup or publication mutation was executed.

## Controlled publication results — 9 November 2026

**Publication PASS; static HTTP verification PASS. C2 remains NOT ACCEPTED.**
Verification timestamp: `2026-11-09T20:24:01.585557+07:00`. Source HEAD remains
`8d3ac3c5a4fd3d1f068ac181688c05362484bf95`; all 317 source-input hashes matched.
The recorded safe-session retirement approval was retained without re-requesting.
The November 9 PostgreSQL backup was not recreated or restored.

Only the authorized narrow script improvement was made: before any live file
replacement, recheck recorded archive SHA-256, decode the entire gzip stream to
validate its trailer/CRC, read every regular tar member without extraction, and
compare the complete member/hash inventory with current live files. No recovery,
rebuild, substitution, reset or restart was attempted.

Updated executed script SHA-256: `35165dff67b4271dff5005cd59619cb123331e001203786a56c6172156f5b418`.
Preflight rechecked all 67 candidate artifacts, manifest targets/imports, current
public Reverb key, original live manifest and potential collisions. All passed.

Protected frontend backup: `/home/saga/Backups/rapid-mind/c2-assets-l8q3bj97/live-build.tar.gz`.
Archive SHA-256: `f817f2421870c0816e1a732770e552480bddf270eb2788dd62d9895583a8c0c3`.
Directory mode 0700; archive and checksum file mode 0600. All **67** archived
file contents matched existing live files before publication. The backup was
read and validated without extraction. It is a frontend backup, not a new DB dump.

Published dependencies first, then offline.html → manifest.webmanifest →
manifest.json → serviceWorker.js, each control file by atomic replacement.
**63 old non-control files retained byte-for-byte**; **50** new asset paths added.
The four intended control files changed. All 67 candidate files match the frozen
output inventory. The complete added/replaced filename inventory can be derived
from artifact-hashes.json and live-before.json in staging; no old hashed file was
removed. No public/hot appeared.

| Final live file | SHA-256 |
| --- | --- |
| manifest.json | 3cdb72539ecbcf5f9db259b593f233447d58854c9353d80f3f3706eb15c8a5d8 |
| manifest.webmanifest | 0c3cd31dc482870be9965ff3a2f14eb7a4d04d74d2b1dce84357201c4f20f1d8 |
| offline.html | 690c8da1c5fbcfd2b3ebb826faf50afd7ca3dde9e225218125dfccf9ffa74de7 |
| serviceWorker.js | 3f9b4cab2343d447f15dd4e17634b2bf10f63dfebbd90edf58ef50598ad83371 |

**71 static HTTP GETs** through `http://localhost:8080` returned **200**, with
response bytes matching the expected SHA-256: all 67 candidate files including
entry JS/CSS, manifests, worker and offline page; plus the two PWA icons, logo and
root PWA manifest. No redirects, cookies, login or clinical endpoint were used.
This verifies served files, not browser service-worker activation or clinical E2E.

Evidence: `/home/saga/rapid-mind-staging/c2-frontend-20261109-76ku_ksx/publication-result.json`
contains each exact URL/status/hash. artifact-hashes.json holds the full candidate
inventory; live-before.json retains the old build fingerprints. No application
source changed; CaseRouting.php's outdated approval comment remains intact.
No IndexedDB/cache/profile access, DB writes, migrations, seeders, provisioning,
service restart/recreation, dependency installation or Git mutation occurred.
Stop after publication. Antigravity clinical testing, organization activation,
accounts and clinical writes remain separately gated. C3 has not started.

## Accelerated provisioning completed — 9 November

The owner superseded earlier preservation/provenance gates by confirming all local
rapid_mind data is dummy and authorizing necessary local C2 writes. No reset or
unrelated cleanup was needed. Real validated Admin HTTP requests activated facilities
6/7 and Posko 6/7 with primary mappings 6→6 and 7→7; mapping audits 111/112, actor 21.
Four active users created: Healthcare A=30/facility6, B=31/facility7;
Relawan A=32/Posko6, B=33/Posko7. Generated credentials are only in ignored
storage/app/private/c2-acceptance/credentials.json, directory0700/file0600.

After finding no documented non-routable phone fixture, the later owner-approved
backend fix permits exact C2-TEST-NONROUTABLE-A/B contacts only for creation of
these exact two Relawan identities in exact local/testing DB/URL contexts.
IndonesianPhone's strict normalizer is unchanged. Production/other environments,
other accounts, wrong context and existing-account updates reject the exception.
No reachable number was generated or used; no external contact was attempted.
The UI requires no change and all published frontend files still match the frozen
67-file inventory. The old backend source-input inventory predates this narrow fix.

Focused PHP checks passed: 13 phone/Admin tests,234 assertions; 9 C2 case/realtime
tests,186 assertions. Initial production negative fixture was corrected to supply
matching CSRF so the assertion exercised phone validation. Initial Admin HTTP GET
returned Inertia409 before provisioning; the client then read the real HTML
bootstrap normally. No response rewriting, validation bypass or fake success.
Actual four-account logins passed; own/foreign channel auth200/403, role-wide403;
two real assessment syncs201 routed6/7; own/foreign patient HTTP200/404. PostgreSQL
confirmed YES/NO/UNCLEAR/UNANSWERED persistence on these two unfinished fixtures.
These are HTTP/DATABASE checks, not browser encryption or actual WS reception.

Current counts: users15,patients27,assessments19,emergencies42,shares0,audits112.
Six services remain running, Postgres healthy. No full regression repeated,
installation, migration, asset build/publication, new backup or Git mutation.
The existing account/activation audit gap is accepted for this dummy demo and
remains documented; no new audit subsystem. Antigravity first-wave handoff is
ready; browser acceptance NOT TESTED, C2 NOT ACCEPTED, no C3.

## 10 November P0 handoff classification update

Owner-confirmed core P0 browser acceptance and the saved seven-PASS result now
supersede earlier blanket browser-NOT-TESTED summaries for that core subset only.
P0 IMPLEMENTED YES; CORE BROWSER VERIFIED YES; LOCAL DEMO ACCEPTANCE CONDITIONAL PASS.
Natural background/foreground locking NOT TESTED; production security acceptance
NOT ESTABLISHED. Receiving team owns native-lock, P1/P2 and remaining C2/C3 checks.
See P0-HANDOFF.md and p0-final-handoff-review.md for evidence limits and commit blockers.
No tests/operations were rerun for this documentation review; C2 is not fully accepted.

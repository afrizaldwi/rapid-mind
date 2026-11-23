# T0 device key restoration — 15 November 2026

The reported message maps to `waitForDeviceClinicalAccess`: when no key was
installed and no startup promise remained, it immediately rejected with a
generic storage error. Even an existing valid device key could not be restored
by that final action. Separately, ngrok is outside the frontend/server
localhost enrollment policy; a new tunnel profile cannot initialize encryption.
The screenshot alone does not establish its origin or persisted key state.

The final T0 action now restores only an already-authorized persisted device key.
It does not enroll a new key or request server authorization. Owner continuity,
logout barrier, key proof, initialization metadata and access generation remain
checked. Unsupported origins now get an explicit explanation; missing or legacy
storage is preserved and remains blocked. No origin policy was broadened.

T0 verification preserves the selected indicator during locked-to-ready key
restoration. Key revocation/replacement and owner/path invalidation still clear
the form and suppress stale callbacks. Neither opening the dialog nor key
restoration creates or transmits a report; the explicit final Send action retains
the atomic encrypted emergency and priority-outbox write.

Files:

- `resources/js/offline/deviceKeyWorkflow.ts`
- `resources/js/components/Relawan/T0Verification.vue`
- `tests/Node/deviceClinicalAccess.test.ts`
- `tests/Node/relawanAssessmentUi.test.ts`
- `docs/checkpoints/t0-device-key-restoration-2026-11-15.md`

Verification: 29 focused Node tests passed; TypeScript, frontend build and
`git diff --check` passed. Coverage includes offline restoration without any
fetch, missing/legacy/substituted keys, logout, unsupported tunnel origin,
preserved final verification, atomic outbox rollback and stale callback denial.
No live browser T0-to-Laravel/Nakes integration or physical phone was tested in
this checkpoint. Build generated normal localhost assets; existing PWA tabs may
still use the previously installed worker until its normal update lifecycle.
No dependencies, existing clinical data or origin configuration were changed.
No database/browser reset, old-key migration, commit or push was performed.

The next separate scope is an explicit authenticated HTTPS demo-origin policy
for the owner's actual tunnel URL, with its own synthetic browser acceptance.
This checkpoint does not claim T0 delivery over ngrok.

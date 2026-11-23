import assert from 'node:assert/strict';
import test from 'node:test';
import { effectScope, ref } from 'vue';
import { useHealthcareDraft } from '../../resources/js/composables/useHealthcareDraft.ts';
import { createHealthcareReconciler, healthcareDrafts } from '../../resources/js/lib/healthcareReconciliation.ts';

function fixture() {
    const jobs: (() => void)[] = [];
    const reloads: (() => void)[] = [];
    const reconciler = createHealthcareReconciler(done => reloads.push(done), job => jobs.push(job));
    const unsubscribe = healthcareDrafts.subscribe(reconciler.editing);
    const scope = effectScope();
    return { jobs, reloads, reconciler, scope,
        flush() { jobs.shift()?.(); },
        stop() { reconciler.stop(); unsubscribe(); scope.stop(); },
    };
}

test('typing defers notifications and reverting the last draft resumes one coalesced reload', () => {
    const f = fixture();
    try {
        const notes = ref('');
        f.scope.run(() => useHealthcareDraft(() => notes.value));
        notes.value = 'Catatan belum tersimpan';
        f.reconciler.request(); f.reconciler.request();
        assert.equal(f.jobs.length, 0);
        notes.value = '';
        assert.equal(f.jobs.length, 1);
        f.flush(); assert.equal(f.reloads.length, 1);
        f.reloads.shift()!(); assert.equal(f.jobs.length, 0);
    } finally { f.stop(); }
});

test('canceling a completion draft releases protection without clearing another form', () => {
    const f = fixture();
    try {
        const completion = ref(''); const response = ref('');
        let cancelDraft: ReturnType<typeof useHealthcareDraft>;
        f.scope.run(() => {
            cancelDraft = useHealthcareDraft(() => completion.value);
            useHealthcareDraft(() => response.value);
        });
        completion.value = 'Selesai'; response.value = 'Catatan respons';
        f.reconciler.request();
        // Same explicit cancellation lifecycle as ClinicalReferralCard.
        completion.value = ''; cancelDraft!.reset();
        assert.equal(response.value, 'Catatan respons'); assert.equal(f.jobs.length, 0);
        response.value = '';
        f.flush(); assert.equal(f.reloads.length, 1);
    } finally { f.stop(); }
});

test('exiting an abandoned component releases its owner; hiding a parent-owned draft does not', () => {
    const f = fixture();
    try {
        const parentNotes = ref(''); const childNotes = ref('');
        const child = effectScope();
        f.scope.run(() => useHealthcareDraft(() => parentNotes.value));
        child.run(() => useHealthcareDraft(() => childNotes.value));
        childNotes.value = 'Draf dialog'; parentNotes.value = 'Draf verifikasi tetap dimiliki halaman';
        f.reconciler.request(); child.stop();
        assert.equal(f.jobs.length, 0); assert.notEqual(parentNotes.value, '');
        f.scope.stop(); f.flush();
        assert.equal(f.reloads.length, 1);
    } finally { f.stop(); }
});

test('successful receipt clears only submitted values; validation failure and in-flight edits stay dirty', () => {
    const f = fixture();
    try {
        const notes = ref('');
        const draft = f.scope.run(() => useHealthcareDraft(() => notes.value))!;
        notes.value = 'Dikirim';
        const saved = draft.submitted();
        f.reconciler.request();
        // Failure does not invoke the receipt callback.
        assert.equal(f.jobs.length, 0);
        notes.value = 'Diedit saat permintaan berjalan'; saved();
        assert.equal(f.jobs.length, 0);
        assert.equal(notes.value, 'Diedit saat permintaan berjalan');
        draft.submitted()(); f.flush(); assert.equal(f.reloads.length, 1);
        f.reloads.shift()!();
        notes.value = ''; f.reconciler.request(); f.flush();
        assert.equal(f.reloads.length, 0, 'returning to the original empty value differs from the acknowledged baseline');
        notes.value = 'Diedit saat permintaan berjalan';
        f.flush(); assert.equal(f.reloads.length, 1, 'reverting to the latest acknowledged value resumes reconciliation');
    } finally { f.stop(); }
});

test('manual refresh reconciles once without permanently bypassing unsaved drafts', () => {
    const f = fixture();
    try {
        const notes = ref('');
        f.scope.run(() => useHealthcareDraft(() => notes.value));
        notes.value = 'Tetap belum tersimpan';
        f.reconciler.request(); f.reconciler.refresh(); f.flush();
        assert.equal(f.reloads.length, 1); assert.equal(notes.value, 'Tetap belum tersimpan');
        f.reconciler.request(); f.reloads.shift()!();
        assert.equal(f.jobs.length, 0, 'later background events still respect the unsaved draft');
        notes.value = ''; f.flush(); assert.equal(f.reloads.length, 1);
    } finally { f.stop(); }
});

test('no overlapping reloads when a draft exits during a reload or mutation', () => {
    const f = fixture();
    try {
        const notes = ref('');
        const active = ref(true);
        f.scope.run(() => useHealthcareDraft(() => notes.value, () => active.value));
        f.reconciler.request(); f.flush();
        notes.value = 'Catatan'; f.reconciler.request();
        active.value = false;
        assert.equal(f.jobs.length, 0, 'in-flight reload still owns the slot');
        f.reconciler.mutating(true); f.reloads.shift()!();
        assert.equal(f.jobs.length, 0);
        f.reconciler.mutating(false); f.flush(); assert.equal(f.reloads.length, 1);
        assert.equal(notes.value, 'Catatan', 'inactive context never clears input implicitly');
    } finally { f.stop(); }
});

test('an unrelated successful form cannot release another dirty owner', () => {
    const f = fixture();
    try {
        const a = ref(''); const b = ref('');
        let savedA: () => void;
        f.scope.run(() => {
            const draftA = useHealthcareDraft(() => a.value);
            useHealthcareDraft(() => b.value);
            a.value = 'Opsi A'; savedA = draftA.submitted();
        });
        b.value = 'Opsi B'; f.reconciler.request(); savedA!();
        assert.equal(f.jobs.length, 0); assert.equal(b.value, 'Opsi B');
        b.value = ''; f.flush(); assert.equal(f.reloads.length, 1);
    } finally { f.stop(); }
});


test('initial empty value becomes dirty after saving nonempty and editing back to empty', () => {
    const f = fixture();
    try {
        const notes = ref('');
        const draft = f.scope.run(() => useHealthcareDraft(() => notes.value))!;
        f.reconciler.request(); f.flush();
        assert.equal(f.reloads.length, 1, 'initial value establishes a clean baseline');
        f.reloads.shift()!();
        notes.value = 'Catatan tersimpan'; draft.submitted()();
        f.reconciler.request(); f.flush();
        assert.equal(f.reloads.length, 1, 'submitted snapshot is now acknowledged');
        f.reloads.shift()!();
        notes.value = ''; f.reconciler.request(); f.flush();
        assert.equal(f.reloads.length, 0, 'empty is now an unsaved edit');
        notes.value = 'Catatan tersimpan'; f.flush();
        assert.equal(f.reloads.length, 1, 'latest saved value clears dirty state');
        assert.equal(notes.value, 'Catatan tersimpan');
    } finally { f.stop(); }
});

test('explicit reset to default establishes a clean baseline without releasing another dirty form', () => {
    const f = fixture();
    try {
        const notes = ref(''); const other = ref('');
        const draft = f.scope.run(() => {
            useHealthcareDraft(() => other.value);
            return useHealthcareDraft(() => notes.value);
        })!;
        notes.value = 'Catatan tersimpan'; draft.submitted()();
        notes.value = ''; other.value = 'Draf lain'; f.reconciler.request();
        draft.reset();
        assert.equal(f.jobs.length, 0, 'reset acknowledges only its own default values');
        other.value = ''; f.flush();
        assert.equal(f.reloads.length, 1);
        f.reloads.shift()!();
        notes.value = 'Catatan tersimpan'; f.reconciler.request();
        assert.equal(f.jobs.length, 0, 'previous saved value differs from the explicit reset baseline');
        notes.value = ''; f.flush(); assert.equal(f.reloads.length, 1);
    } finally { f.stop(); }
});

test('validation failure leaves the latest acknowledged baseline intact', () => {
    const f = fixture();
    try {
        const notes = ref('');
        const draft = f.scope.run(() => useHealthcareDraft(() => notes.value))!;
        notes.value = 'Tersimpan'; draft.submitted()();
        notes.value = ''; draft.submitted(); // Failed validation never invokes this acknowledgement.
        f.reconciler.request(); assert.equal(f.jobs.length, 0);
        notes.value = 'Tersimpan'; f.flush(); assert.equal(f.reloads.length, 1);
    } finally { f.stop(); }
});


test('late submission acknowledgement cannot re-register a disposed draft', () => {
    const f = fixture();
    try {
        const notes = ref('');
        const draft = f.scope.run(() => useHealthcareDraft(() => notes.value))!;
        notes.value = 'Dikirim'; const saved = draft.submitted();
        notes.value = 'Diedit saat menunggu'; f.reconciler.request();
        f.scope.stop();
        saved(); // The request finishes after the editing component has exited.
        f.flush(); assert.equal(f.reloads.length, 1);
        f.reloads.shift()!();
        draft.reset(); f.reconciler.request(); f.flush();
        assert.equal(f.reloads.length, 1);
    } finally { f.stop(); }
});

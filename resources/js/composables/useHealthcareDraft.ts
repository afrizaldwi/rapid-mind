import { getCurrentScope, onScopeDispose, watch } from 'vue';
import { healthcareDrafts } from '../lib/healthcareReconciliation.ts';

/** A component-owned draft: reverting, successful receipt, or disposal releases protection. */
export function useHealthcareDraft(value: () => unknown, active: () => boolean = () => true) {
    const owner = Symbol('healthcare-draft');
    const snapshot = () => JSON.stringify(value());
    let baseline = snapshot();
    let disposed = false;
    const sync = () => {
        if (disposed) return;
        const current = snapshot();
        healthcareDrafts.set(owner, active() && current !== baseline);
    };
    const stop = watch(() => [active(), snapshot()], sync, { flush: 'sync' });
    const dispose = () => { disposed = true; stop(); healthcareDrafts.release(owner); };
    if (getCurrentScope()) onScopeDispose(dispose);
    return {
        // Capture the submitted values, so typing during a request stays dirty even after success.
        submitted() {
            const sent = snapshot();
            return () => { baseline = sent; sync(); };
        },
        reset() { baseline = snapshot(); sync(); },
        dispose,
    };
}

/** Coalesce notifications and defer reloads while a form draft or mutation is active. */
export function createHealthcareReconciler(
    reload: (done: () => void) => void,
    schedule: (job: () => void) => void = (job) => {
        setTimeout(job, 150);
    },
) {
    let pending = false;
    let running = false;
    let scheduled = false;
    let editing = false;
    let manual = false;
    let mutating = false;
    let alive = true;
    function flush() {
        if (!alive || !pending || running || scheduled || (editing && !manual) || mutating)
            return;
        scheduled = true;
        schedule(() => {
            scheduled = false;
            if (!alive || (editing && !manual) || mutating || !pending) return;
            pending = false;
            manual = false;
            running = true;
            reload(() => {
                running = false;
                flush();
            });
        });
    }
    return {
        request() {
            pending = true;
            flush();
        },
        editing(value: boolean) {
            editing = value;
            flush();
        },
        mutating(value: boolean) {
            mutating = value;
            flush();
        },
        refresh() {
            manual = true;
            pending = true;
            flush();
        },
        stop() {
            alive = false;
        },
    };
}

/** Only dirty owners are retained; no form values are stored in this registry. */
export function createHealthcareDraftRegistry() {
    const dirtyOwners = new Set<symbol>();
    const listeners = new Set<(dirty: boolean) => void>();
    function notify() {
        for (const listener of listeners) listener(dirtyOwners.size > 0);
    }
    return {
        set(owner: symbol, dirty: boolean) {
            const changed = dirty ? !dirtyOwners.has(owner) : dirtyOwners.has(owner);
            if (dirty) dirtyOwners.add(owner);
            else dirtyOwners.delete(owner);
            if (changed) notify();
        },
        release(owner: symbol) {
            if (dirtyOwners.delete(owner)) notify();
        },
        subscribe(listener: (dirty: boolean) => void) {
            listeners.add(listener);
            listener(dirtyOwners.size > 0);
            return () => { listeners.delete(listener); };
        },
    };
}

export const healthcareDrafts = createHealthcareDraftRegistry();

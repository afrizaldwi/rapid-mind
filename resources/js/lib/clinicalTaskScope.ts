// A completed durable write is never rolled back. Only its stale continuation is ignored.
export function createClinicalTaskScope(identity: () => unknown) {
    let generation = 0;
    let disposed = false;
    return {
        capture() {
            const stamp = generation;
            const context = identity();
            return () =>
                !disposed && stamp === generation && context === identity();
        },
        invalidate() {
            generation++;
        },
        dispose() {
            disposed = true;
            generation++;
        },
    };
}

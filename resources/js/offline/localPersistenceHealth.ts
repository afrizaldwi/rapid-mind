import { requireOwner } from './db';

type Listener = (failed: boolean) => void;
const failures = new Set<number>();
const listeners = new Map<number, Set<Listener>>();

function publish(owner: number) {
    for (const listener of listeners.get(owner) ?? []) listener(failures.has(owner));
}

export const localPersistenceHealth = {
    subscribe(owner: number, listener: Listener) {
        requireOwner(owner);
        const group = listeners.get(owner) ?? new Set<Listener>();
        group.add(listener);
        listeners.set(owner, group);
        listener(failures.has(owner));
        return () => {
            group.delete(listener);
            if (group.size === 0) listeners.delete(owner);
        };
    },
    async recordWrite<T>(owner: number, write: () => Promise<T>): Promise<T> {
        requireOwner(owner);
        try {
            const result = await write();
            failures.delete(owner);
            publish(owner);
            return result;
        } catch (error) {
            failures.add(owner);
            publish(owner);
            throw error;
        }
    },
};

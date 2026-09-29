import { db, type OutboxItem } from './db';

class SyncManager {
  private isSyncing = false;
  private listeners: Array<(state: { isSyncing: boolean; pendingCount: number }) => void> = [];

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.sync();
      });
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.sync();
        }
      });
    }
  }

  public subscribe(listener: (state: { isSyncing: boolean; pendingCount: number }) => void) {
    this.listeners.push(listener);
    this.notify();
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private async notify() {
    const pendingCount = await db.outbox.where('status').equals('PENDING').count();
    for (const listener of this.listeners) {
      listener({ isSyncing: this.isSyncing, pendingCount });
    }
  }

  public async queueItem(type: 'EMERGENCY' | 'ASSESSMENT' | 'PATIENT', payload: any, priority = 2) {
    await db.outbox.add({
      type,
      payload,
      priority,
      status: 'PENDING',
      retry_count: 0,
      created_at: new Date().toISOString(),
    });
    this.notify();
    this.sync();
  }

  public async sync() {
    if (this.isSyncing || typeof navigator === 'undefined' || !navigator.onLine) {
      return;
    }

    this.isSyncing = true;
    this.notify();

    try {
      // Prioritize emergencies (priority 1) over regular assessments (priority 2)
      const pendingItems = await db.outbox
        .where('status')
        .equals('PENDING')
        .sortBy('priority');

      for (const item of pendingItems) {
        if (!item.id) continue;
        try {
          await db.outbox.update(item.id, { status: 'SYNCING' });

          if (item.type === 'EMERGENCY') {
            const res = await fetch('/relawan/emergencies', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
              },
              body: JSON.stringify(item.payload),
            });
            if (res.ok) {
              await db.outbox.delete(item.id);
            } else {
              throw new Error('Sync failed');
            }
          } else if (item.type === 'ASSESSMENT') {
            const res = await fetch('/relawan/assessment', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
              },
              body: JSON.stringify(item.payload),
            });
            if (res.ok) {
              await db.outbox.delete(item.id);
            } else {
              throw new Error('Sync failed');
            }
          }
        } catch {
          await db.outbox.update(item.id, {
            status: 'PENDING',
            retry_count: item.retry_count + 1,
          });
        }
      }
    } finally {
      this.isSyncing = false;
      this.notify();
    }
  }
}

export const syncManager = new SyncManager();

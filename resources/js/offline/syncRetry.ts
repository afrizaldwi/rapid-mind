import type { OutboxItem } from "./db";

// Six automatic retries per persisted operation. Manual/reconnect attempts stay
// available after exhaustion; no retry can turn a local save into a receipt.
const delays = [2_000, 5_000, 10_000, 20_000, 40_000, 60_000];

export function retryAt(item: OutboxItem): number | null {
    if (item.status !== "FAILED" || !Number.isInteger(item.retry_count))
        return null;
    const status = item.last_http_status;
    if (
        status !== undefined &&
        status !== 408 &&
        status !== 429 &&
        status < 500
    )
        return null;
    const delay = delays[item.retry_count - 1];
    const updated = Date.parse(item.updated_at);
    return delay !== undefined && Number.isFinite(updated)
        ? updated + delay
        : null;
}

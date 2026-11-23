import type { LocalAssessment, LocalEmergency, OutboxItem } from './db';

export function pendingDeliveryCount(
    assessments: LocalAssessment[], emergencies: LocalEmergency[], outbox: OutboxItem[],
): number {
    const queued = new Set(outbox.map(item => `${item.type}:${item.entity_id}`));
    const unconfirmed = (type: OutboxItem['type'], record: LocalAssessment | LocalEmergency) =>
        record.sync_state === 'SYNCED' && record.routing_status !== 'ROUTED' && !queued.has(`${type}:${record.id}`);
    return outbox.length + assessments.filter(item => item.status === 'COMPLETED' && unconfirmed('ASSESSMENT', item)).length
        + emergencies.filter(item => unconfirmed('EMERGENCY', item)).length;
}

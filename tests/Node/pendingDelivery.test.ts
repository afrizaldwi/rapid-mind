import assert from 'node:assert/strict';
import test from 'node:test';
import { pendingDeliveryCount } from '../../resources/js/offline/pendingDelivery.ts';

test('server acceptance with unresolved or unknown routing still counts as pending delivery', () => {
    const record: any = { id: 'same-id', status: 'COMPLETED', sync_state: 'SYNCED' };
    assert.equal(pendingDeliveryCount([record], [], []), 1);
    assert.equal(pendingDeliveryCount([], [{ ...record, routing_status: 'UNRESOLVED' }], []), 1);
    assert.equal(pendingDeliveryCount([{ ...record, routing_status: 'ROUTED' }], [], []), 0);
    assert.equal(pendingDeliveryCount([{ ...record, status: 'IN_PROGRESS' }], [], []), 0);
});

test('pending delivery counts queue once per entity type without conflating matching identifiers', () => {
    const record: any = { id: 'same-id', status: 'COMPLETED', sync_state: 'SYNCED' };
    const queue: any = [{ type: 'ASSESSMENT', entity_id: record.id }];
    assert.equal(pendingDeliveryCount([record], [], queue), 1);
    assert.equal(pendingDeliveryCount([record], [record], queue), 2);
});

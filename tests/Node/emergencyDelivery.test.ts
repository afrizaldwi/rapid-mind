import assert from "node:assert/strict";
import test from "node:test";
import {
    emergencyDeliveryStatus,
    emergencySmsHref,
    emergencySmsGuidance,
} from "../../resources/js/lib/emergencyDelivery.ts";

test("local, pending, and unknown outcomes never claim server acceptance", () => {
    const labels = new Set<string>();
    for (const sync_state of [
        "LOCAL_SAVED",
        "PENDING_SYNC",
        "SYNCING",
        "SYNC_FAILED",
    ] as const) {
        const status = emergencyDeliveryStatus({ sync_state });
        assert.equal(status.accepted, false);
        assert.match(status.detail, /Penerimaan server belum terkonfirmasi/);
        assert.doesNotMatch(
            status.label,
            /Diterima server|Belum diterima server/,
        );
        labels.add(status.label);
    }
    assert.equal(labels.size, 4);
});

test("canonical acceptance and server-rendered detail do not confirm Healthcare reception", () => {
    for (const input of [undefined, { sync_state: "SYNCED" as const }]) {
        const status = emergencyDeliveryStatus(input);
        assert.equal(status.accepted, true);
        assert.equal(status.label, "Diterima server");
        assert.match(status.realtime, /Healthcare belum terkonfirmasi/);
    }
    assert.match(
        emergencyDeliveryStatus({
            sync_state: "SYNCED",
            realtime_status: "UNAVAILABLE",
        }).realtime,
        /belum tersedia/,
    );
});

test("manual SMS has no preselected recipient or clinical context", () => {
    assert.ok(emergencySmsHref.startsWith("sms:?body="));
    const body = decodeURIComponent(emergencySmsHref.split("?body=")[1]);
    assert.doesNotMatch(
        body,
        /119|NIK|T0|PSYCHOSIS|bunuh diri|Pasien|Penyintas|GPS|Posko/i,
    );
    assert.match(emergencySmsGuidance, /Pilih penerima/);
    assert.match(emergencySmsGuidance, /tidak mengirim otomatis/);
    assert.match(emergencySmsGuidance, /tidak terenkripsi/);
});

test("an unresolved responsible facility never claims Healthcare receipt", () => {
    const status = emergencyDeliveryStatus({ sync_state: "SYNCED", routing_status: "UNRESOLVED" });
    assert.equal(status.accepted, true);
    assert.match(status.realtime, /Faskes belum ditetapkan/);
    assert.match(status.realtime, /penerimaan Healthcare belum terkonfirmasi/);
});

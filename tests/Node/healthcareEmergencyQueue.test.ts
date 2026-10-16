import assert from "node:assert/strict";
import test from "node:test";
import { createRenderer, defineComponent, nextTick, ref } from "vue";
import {
    emergencyQueueCounts,
    filterEmergencyQueue,
    getDetectedRedFlags,
    getFunctionLabel,
    getRiskAnswer,
    getSrqAnswer,
    normalizeEmergencyQueue,
} from "../../resources/js/lib/healthcareEmergency.ts";
import { useEmergencyQueue } from "../../resources/js/composables/useEmergencyQueue.ts";

function emergency(
    id: string,
    status: string,
    createdAt: string,
    overrides: Record<string, unknown> = {},
) {
    return {
        id,
        status,
        created_at: createdAt,
        patient: {
            name: "Siti Aminah",
            nik: "3276123412345678",
            shelter: { name: "Posko Melati" },
        },
        referrals: [],
        ...overrides,
    };
}

test("pending cases remain newest first ahead of other statuses", () => {
    const raw = [
        emergency("confirmed", "CONFIRMED", "2026-10-14T05:00:00Z"),
        emergency("pending-old", "PENDING", "2026-10-14T01:00:00Z"),
        emergency("reviewing", "REVIEWING", "2026-10-14T04:00:00Z"),
        emergency("pending-new", "PENDING", "2026-10-14T03:00:00Z"),
    ];
    assert.deepEqual(
        normalizeEmergencyQueue(raw).map((item) => item.emergencyId),
        ["pending-new", "pending-old", "confirmed", "reviewing"],
    );
});

test("summary counts retain current status and raw referral semantics", () => {
    const raw = [
        emergency("a", "PENDING", "2026-10-14T01:00:00Z"),
        emergency("b", "ACKNOWLEDGED", "2026-10-14T02:00:00Z"),
        emergency("c", "REVIEWING", "2026-10-14T03:00:00Z"),
        emergency("d", "CONFIRMED", "2026-10-14T04:00:00Z", {
            referrals: [{ id: 1 }, { id: 2 }],
        }),
        emergency("e", "DOWNGRADED", "2026-10-14T05:00:00Z"),
    ];
    assert.deepEqual(emergencyQueueCounts(normalizeEmergencyQueue(raw), raw), {
        totalSurvivorsCount: 5,
        criticalT0Count: 4,
        pendingValidationCount: 2,
        referralsIssuedCount: 2,
    });
});

test("search and status filters preserve name, RM, NIK, and Posko matching", () => {
    const queue = normalizeEmergencyQueue([
        emergency("one", "PENDING", "2026-10-14T01:00:00Z", {
            rm_code: "RM-001",
        }),
        emergency("two", "CONFIRMED", "2026-10-14T02:00:00Z", {
            patient: {
                name: "Budi Santoso",
                nik: "1234567890123456",
                shelter: { name: "Posko Anggrek" },
            },
            rm_code: "RM-002",
        }),
    ]);
    const ids = (search: string) =>
        filterEmergencyQueue(queue, "ALL", search).map(
            (item) => item.emergencyId,
        );

    assert.deepEqual(ids(" siti "), ["one"]);
    assert.deepEqual(ids("rm-002"), ["two"]);
    assert.deepEqual(ids("3276-1234"), ["one"]);
    assert.deepEqual(ids("anggrek"), ["two"]);
    assert.deepEqual(
        filterEmergencyQueue(queue, "PENDING", "").map(
            (item) => item.emergencyId,
        ),
        ["one"],
    );
    assert.deepEqual(filterEmergencyQueue(queue, "CONFIRMED", "siti"), []);
    assert.equal(queue[0].maskedNik, "3276••••5678");
    assert.equal(queue[0].searchNik, "3276123412345678");
});

test("normalization keeps stable emergency keys across refreshed case data", () => {
    const [first, second] = normalizeEmergencyQueue([
        emergency("first", "PENDING", "2026-10-14T01:00:00Z"),
        emergency("second", "PENDING", "2026-10-14T02:00:00Z"),
    ]);
    const refreshedFirst = normalizeEmergencyQueue([
        emergency(first.emergencyId, "ACKNOWLEDGED", "2026-10-14T01:00:00Z"),
    ])[0];

    assert.equal(first.key, refreshedFirst.key);
    assert.notEqual(first.key, second.key);
});

test("explicit selection and filter fallback reset state; same-case refresh does not", async () => {
    const renderer = createRenderer({
        patchProp() {},
        insert(child, parent) {
            parent.children.push(child);
        },
        remove() {},
        createElement: () => ({ children: [] }),
        createText: () => ({}),
        createComment: () => ({}),
        setText() {},
        setElementText() {},
        parentNode: () => null,
        nextSibling: () => null,
    });
    const records = ref([
        emergency("first", "PENDING", "2026-10-14T01:00:00Z"),
        emergency("second", "CONFIRMED", "2026-10-14T02:00:00Z"),
    ]);
    let queue: ReturnType<typeof useEmergencyQueue> | undefined;
    let resetCount = 0;
    const app = renderer.createApp(
        defineComponent({
            setup() {
                queue = useEmergencyQueue(
                    () => records.value,
                    () => {
                        resetCount += 1;
                    },
                );
                return () => null;
            },
        }),
    );
    app.mount({ children: [] });
    assert.ok(queue);

    queue.selectItem(queue.selectedItem.value);
    assert.equal(resetCount, 1, "clicking the already-selected case resets");

    records.value = [
        emergency("first", "ACKNOWLEDGED", "2026-10-14T01:00:00Z"),
        emergency("second", "CONFIRMED", "2026-10-14T02:00:00Z"),
    ];
    await nextTick();
    assert.equal(queue.selectedItem.value.status, "ACKNOWLEDGED");
    assert.equal(resetCount, 1, "same-case prop refresh keeps draft state");

    queue.selectedFilter.value = "CONFIRMED";
    await nextTick();
    assert.equal(queue.selectedItem.value.emergencyId, "second");
    assert.equal(resetCount, 2, "filter fallback resets");
    app.unmount();
});

test("evidence uses the emergency-linked assessment and preserves unknown values", () => {
    const [item] = normalizeEmergencyQueue([
        emergency("evidence", "PENDING", "2026-10-14T01:00:00Z", {
            patient: {
                name: "Siti Aminah",
                nik: "3276123412345678",
                assessments: [
                    { srq_responses: [{ question_number: 17, answer: false }] },
                ],
            },
            assessment: {
                srq_responses: [
                    { question_number: 17, answer: true },
                    { question_number: 18, answer: true },
                ],
                risk_assessment: [
                    { indicator: "R1", answer: false },
                    { indicator: "R3", answer: true },
                ],
                function_assessment: [
                    { domain: "SELF_CARE", level: 0 },
                    { domain: "MOBILITY", level: 3 },
                ],
            },
        }),
    ]);

    assert.equal(getSrqAnswer(item, 17), true);
    assert.equal(getSrqAnswer(item, 1), null);
    assert.equal(getRiskAnswer(item, "R1"), false);
    assert.equal(getRiskAnswer(item, "R2"), null);
    assert.equal(
        getFunctionLabel(item, "SELF_CARE"),
        "Tidak terganggu / mandiri",
    );
    assert.equal(getFunctionLabel(item, "MOBILITY"), "Gangguan berat");
    assert.equal(
        getFunctionLabel(item, "FAMILY_SOCIAL"),
        "Data fungsi tidak tersedia",
    );
    assert.deepEqual(getDetectedRedFlags(item), [
        {
            key: "SUICIDAL_IDEATION",
            title: "Risiko keamanan jiwa spesifik",
            evidence: "Jawaban YA pada SRQ #17 (Pikiran mengakhiri hidup)",
        },
    ]);
    assert.deepEqual(getDetectedRedFlags(null), []);
});

test("stored red-flag type keeps its existing evidence text", () => {
    const [item] = normalizeEmergencyQueue([
        emergency("medical", "PENDING", "2026-10-14T01:00:00Z", {
            red_flag_type: "MEDICAL_CRISIS",
        }),
    ]);
    assert.deepEqual(getDetectedRedFlags(item), [
        {
            key: "MEDICAL_CRISIS",
            title: "Krisis medis akut",
            evidence:
                "Jenis Red Flag tercatat: MEDICAL_CRISIS. Penurunan kesadaran atau cedera fisik.",
        },
    ]);
});

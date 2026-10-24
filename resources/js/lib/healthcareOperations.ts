export type DispatchStatus =
    | "ASSIGNED"
    | "EN_ROUTE"
    | "ON_SITE"
    | "TRANSPORT"
    | "COMPLETED";
export type HistoryRow = {
    id: number;
    event_type?: string;
    previous_status: string | null;
    status: string;
    notes?: string | null;
    created_at: string;
    actor?: { name: string } | null;
    referral_id?: string | null;
};
export type ClinicalReferral = {
    id: string;
    status: string;
    source?: string;
    facility?: { name: string } | null;
    history: HistoryRow[];
    notes?: string | null;
    created_at: string;
    updated_at: string;
};
export type Dispatch = {
    id: string;
    status: DispatchStatus;
    referral_id: string | null;
    assigned_at: string;
    assigner?: { name: string } | null;
    response_unit?: { name: string; code: string } | null;
    target_source: string;
    target_latitude: string | null;
    target_longitude: string | null;
    target_description: string | null;
    next_statuses: DispatchStatus[];
    history: HistoryRow[];
};
export type Operations = {
    available: boolean;
    dispatch?: Dispatch | null;
    referrals?: ClinicalReferral[];
    targets?: { source: string; label: string }[];
};
export type ResponseUnit = { id: number; name: string; code: string };
export const dispatchLabel = (status: string) =>
    ({
        ASSIGNED: "Ditugaskan di sistem",
        EN_ROUTE: "Menuju lokasi",
        ON_SITE: "Di lokasi",
        TRANSPORT: "Transport pasien",
        COMPLETED: "Respons selesai",
    })[status] ?? status;
export const clinicalLabel = (status: string) =>
    status === "ACTIVE"
        ? "Rujukan aktif"
        : status === "COMPLETED"
          ? "Pekerjaan rujukan selesai"
          : `Alur lama: ${dispatchLabel(status)}`;
export function clinicalCompletion(
    referral: Pick<ClinicalReferral, "id" | "status">,
) {
    return referral.status === "ACTIVE"
        ? {
              url: `/healthcare/referrals/${referral.id}/complete`,
              data: { expected_status: "ACTIVE" },
          }
        : null;
}
export function dispatchTransition(
    dispatch: Pick<Dispatch, "id" | "status" | "next_statuses">,
    status: DispatchStatus,
    notes: string,
) {
    return dispatch.next_statuses.includes(status)
        ? {
              url: `/healthcare/dispatches/${dispatch.id}/status`,
              data: { expected_status: dispatch.status, status, notes },
          }
        : null;
}
export function referralLink(
    dispatch: Pick<Dispatch, "id" | "status" | "referral_id">,
    referralId: string,
    notes: string,
) {
    return dispatch.status !== "COMPLETED" &&
        dispatch.referral_id === null &&
        referralId
        ? {
              url: `/healthcare/dispatches/${dispatch.id}/referral`,
              data: {
                  referral_id: referralId,
                  expected_referral_id: null,
                  notes,
              },
          }
        : null;
}
export function timeline(operations?: Operations) {
    const rows = (operations?.referrals ?? []).flatMap((referral) =>
        referral.history.map((row) => ({
            ...row,
            key: `ref-${referral.id}-${row.id}`,
            domain: "Rujukan",
            label:
                row.previous_status === null
                    ? "Rujukan diterbitkan"
                    : clinicalLabel(row.status),
        })),
    );
    rows.push(
        ...(operations?.dispatch?.history ?? []).map((row) => ({
            ...row,
            key: `dispatch-${row.id}`,
            domain: "Respons Lapangan",
            label:
                row.event_type === "REFERRAL_LINKED"
                    ? "Rujukan dihubungkan"
                    : dispatchLabel(row.status),
        })),
    );
    return rows.sort(
        (a, b) =>
            a.created_at.localeCompare(b.created_at) ||
            (a.domain === b.domain ? a.id - b.id : a.key.localeCompare(b.key)),
    );
}
export function dispatchAssignment(
    emergencyId: string,
    operations: Operations | undefined,
    input: {
        response_unit_id: number | null;
        referral_id: string;
        target_source: string;
        target_description: string;
        notes: string;
    },
    units: ResponseUnit[],
) {
    if (
        !operations?.available ||
        operations.dispatch ||
        !units.some((unit) => unit.id === input.response_unit_id) ||
        !operations.targets?.some(
            (target) => target.source === input.target_source,
        ) ||
        (input.target_source === "MANUAL" &&
            !input.target_description.trim()) ||
        (input.referral_id &&
            !operations.referrals?.some(
                (referral) => referral.id === input.referral_id,
            ))
    )
        return null;
    return {
        url: `/healthcare/emergencies/${emergencyId}/dispatches`,
        data: {
            response_unit_id: input.response_unit_id,
            referral_id: input.referral_id || null,
            target_source: input.target_source,
            target_description:
                input.target_source === "MANUAL"
                    ? input.target_description
                    : null,
            notes: input.notes,
        },
    };
}

import { type SrqAnswer } from "../domain/srq/srqAnswer.ts";
import { healthcareAssessmentPresentation } from "./healthcareAssessmentPresentation.ts";

export const srqQuestions = [
    "Apakah Anda sering merasa sakit kepala?",
    "Apakah Anda kehilangan nafsu makan?",
    "Apakah tidur Anda tidak nyenyak atau terganggu?",
    "Apakah Anda mudah merasa takut atau cemas?",
    "Apakah tangan terasa gemetar?",
    "Apakah merasa cemas, tegang, atau khawatir?",
    "Apakah pencernaan Anda terganggu atau sering mulas?",
    "Apakah Anda merasa sulit untuk berpikir jernih?",
    "Apakah Anda merasa tidak bahagia atau sedih mendalam?",
    "Apakah Anda lebih sering menangis dari biasanya?",
    "Apakah Anda merasa sulit menikmati kegiatan sehari-hari?",
    "Apakah Anda merasa sulit untuk mengambil keputusan?",
    "Apakah pekerjaan atau aktivitas harian Anda terbengkalai?",
    "Apakah Anda merasa tidak mampu berperan berguna dalam hidup?",
    "Apakah Anda kehilangan minat terhadap berbagai hal penting?",
    "Apakah Anda merasa diri Anda tidak berharga?",
    "Apakah Anda mempunyai pikiran untuk mengakhiri hidup?",
    "Apakah Anda merasa lelah sepanjang waktu?",
    "Apakah Anda sering merasa tidak nyaman di perut?",
    "Apakah Anda mudah merasa lelah dalam beraktivitas?",
].map((text, index) => ({ number: index + 1, text }));

export const riskItems = [
    {
        code: "R1",
        title: "Kehilangan Berat",
        description: "Kehilangan keluarga inti atau rumah hancur total.",
    },
    {
        code: "R2",
        title: "Pengalaman Traumatik Langsung",
        description:
            "Tertimbun, hanyut, terjebak, atau menyaksikan langsung kematian.",
    },
    {
        code: "R3",
        title: "Kelompok Rentan",
        description:
            "Lansia, hamil/menyusui, disabilitas, atau anak tanpa orang tua.",
    },
    {
        code: "R4",
        title: "Riwayat Gangguan Jiwa",
        description: "Riwayat perawatan atau obat gangguan jiwa.",
    },
    {
        code: "R5",
        title: "Terputus Obat Kronis",
        description: "Penyakit fisik kronis dengan akses obat terputus.",
    },
] as const;

export function getRiskItems(locale: string = "id") {
    if (locale === "en") {
        return [
            {
                code: "R1",
                title: "Severe Loss",
                description: "Loss of immediate family or home completely destroyed.",
            },
            {
                code: "R2",
                title: "Direct Traumatic Experience",
                description: "Was buried, swept away, trapped, or witnessed death directly.",
            },
            {
                code: "R3",
                title: "Vulnerable Group",
                description: "Elderly, pregnant/lactating, living with disability, or unaccompanied minor.",
            },
            {
                code: "R4",
                title: "History of Mental Disorders",
                description: "History of psychiatric treatment or medication.",
            },
            {
                code: "R5",
                title: "Interrupted Chronic Medication",
                description: "Chronic physical illness with interrupted access to medication.",
            },
        ] as const;
    }
    return riskItems;
}

export function getSeverityBorderClass(priority: string): string {
    switch (priority) {
        case "T0_CONFIRMED":
        case "T0_SUSPECT":
        case "T0":
            return "border-l-red-800";
        case "T1":
            return "border-l-orange-500";
        case "T2":
            return "border-l-amber-500";
        case "T3":
            return "border-l-emerald-500";
        default:
            return "border-l-slate-300";
    }
}

export function priorityBadgeClasses(priority: string): string {
    switch (priority) {
        case "T0":
        case "T0-SUSPECT":
            return "bg-red-50 text-red-800 border border-red-200 font-bold";
        case "T0-CONFIRMED":
            return "bg-red-700 text-white font-bold";
        case "T1":
        case "T1-MENDESAK":
            return "bg-orange-50 text-orange-800 border border-orange-200 font-bold";
        case "T2":
        case "T2-TERJADWAL":
            return "bg-amber-50 text-amber-800 border border-amber-200 font-bold";
        case "T3":
        case "T3-STABIL":
            return "bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold";
        default:
            return "bg-slate-100 text-slate-700 border border-slate-200";
    }
}

export function formatRmCode(record: any, locale: string = "id"): string {
    if (record?.rm_code) return record.rm_code;
    const raw =
        record?.assessment_id || record?.assessment?.id || record?.id || "";
    if (!raw) return locale === "en" ? "ID not available" : "ID tidak tersedia";
    const hex = String(raw).replace(/-/g, "").slice(-6).toUpperCase();
    return `ID-${hex.padStart(6, "0")}`;
}

export function maskNik(nik?: string, locale: string = "id"): string {
    if (!nik || nik.length < 8) {
        return locale === "en" ? "NIK not available" : "NIK tidak tersedia";
    }
    return `${nik.slice(0, 4)}••••${nik.slice(-4)}`;
}

export function timeAgo(dateStr?: string, locale: string = "id"): string {
    const isEn = locale === "en";
    if (!dateStr) return isEn ? "Time unavailable" : "Waktu tidak tersedia";
    const diffMinutes = Math.round(
        (Date.now() - new Date(dateStr).getTime()) / 60000,
    );
    if (diffMinutes < 1) return isEn ? "Just now" : "Baru saja";
    if (diffMinutes < 60) {
        return isEn ? `${diffMinutes} min ago` : `${diffMinutes} mnt lalu`;
    }
    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) {
        return isEn ? `${diffHours} hr ago` : `${diffHours} jam lalu`;
    }
    const diffDays = Math.round(diffHours / 24);
    return isEn ? `${diffDays} days ago` : `${diffDays} hari lalu`;
}

export function formatDateTime(dateStr?: string, locale: string = "id"): string {
    if (!dateStr) {
        return locale === "en" ? "Time unavailable" : "Waktu tidak tersedia";
    }
    return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Jakarta",
    }).format(new Date(dateStr));
}

function normalizeAssessment(raw: any) {
    if (!raw) return null;
    return {
        ...raw,
        triageResult: raw.triage_result ?? raw.triageResult ?? null,
        srqResponses: raw.srq_responses ?? raw.srqResponses ?? [],
        riskResponses: raw.risk_assessment ?? raw.riskAssessment ?? [],
        functionResponses:
            raw.function_assessment ?? raw.functionAssessment ?? [],
        clinicalValidation:
            raw.clinical_validation ?? raw.clinicalValidation ?? null,
    };
}

export function normalizeQueueItem(
    raw: any,
    isEmergency: boolean,
    locale: string = "id",
) {
    const isEn = locale === "en";
    const patient = raw.patient;
    const assessment = normalizeAssessment(isEmergency ? raw.assessment : raw);
    const assessmentContext = healthcareAssessmentPresentation(assessment, locale);
    const triage = assessmentContext.finalized
        ? (assessment?.triageResult ?? raw.triage_result ?? null)
        : null;
    let priority: "T0" | "T1" | "T2" | "T3" = "T2";
    let priorityLabel = isEn ? "T2 Scheduled" : "T2 Terjadwal";

    if (isEmergency) {
        priority = "T0";
        priorityLabel = isEn ? "T0 Emergency" : "T0 Darurat";
    } else if (triage?.system_recommendation) {
        const recommendation = triage.system_recommendation;
        if (recommendation.startsWith("T0"))
            [priority, priorityLabel] = ["T0", isEn ? "T0 Emergency" : "T0 Darurat"];
        else if (recommendation === "T1")
            [priority, priorityLabel] = ["T1", isEn ? "T1 Urgent" : "T1 Mendesak"];
        else if (recommendation === "T2")
            [priority, priorityLabel] = ["T2", isEn ? "T2 Scheduled" : "T2 Terjadwal"];
        else if (recommendation === "T3")
            [priority, priorityLabel] = ["T3", isEn ? "T3 Stable" : "T3 Stabil"];
    }

    const redFlag =
        raw.red_flag_type ||
        (triage?.is_red_flag_override ? triage.red_flag_source || null : null);
    const q17Answer = assessmentContext.responses[16].answer;
    let redFlagLabel = isEn ? "Field Danger Sign" : "Tanda Bahaya Lapangan";
    if (redFlag === "SUICIDAL_IDEATION")
        redFlagLabel =
            q17Answer === true
                ? isEn
                    ? "Suicidal Ideation / Risk (SRQ #17: YES)"
                    : "Ideasi / Risiko Bunuh Diri (SRQ #17: YA)"
                : isEn
                  ? "Suicidal Ideation / Risk"
                  : "Ideasi / Risiko Bunuh Diri";
    else if (redFlag === "PSYCHOSIS")
        redFlagLabel = isEn ? "Acute Psychosis Symptoms" : "Gejala Psikosis Akut";
    else if (redFlag === "SEVERE_AGITATION")
        redFlagLabel = isEn
            ? "Severe Agitation / Dangerous Behavior"
            : "Agitasi / Perilaku Berbahaya";
    else if (redFlag === "MEDICAL_CRISIS")
        redFlagLabel = isEn ? "Acute Medical Crisis" : "Krisis Medis Akut";
    else if (redFlag)
        redFlagLabel = isEn
            ? `Emergency: ${redFlag}`
            : `Kedaruratan: ${redFlag}`;

    const status = isEmergency
        ? raw.status
        : assessment?.clinicalValidation
          ? "COMPLETED"
          : "PENDING";
    let statusLabel = isEn ? "Waiting" : "Menunggu";
    if (status === "PENDING")
        statusLabel = isEmergency
            ? isEn
                ? "Needs Acknowledgement"
                : "Perlu Diakui"
            : isEn
              ? "Awaiting Validation"
              : "Menunggu Validasi";
    else if (status === "ACKNOWLEDGED")
        statusLabel = isEn ? "Acknowledged" : "Sudah Diakui";
    else if (status === "REVIEWING")
        statusLabel = isEn ? "In Review" : "Sedang Ditinjau";
    else if (status === "CONFIRMED")
        statusLabel = isEn ? "T0 Confirmed" : "T0 Terkonfirmasi";
    else if (status === "DOWNGRADED")
        statusLabel = isEn ? "Downgraded" : "Diturunkan";
    else if (status === "COMPLETED")
        statusLabel = isEn ? "Validated" : "Selesai Tervalidasi";

    if (!isEmergency && !assessmentContext.finalized)
        statusLabel = isEn ? "Assessment incomplete" : "Asesmen belum lengkap";

    let semanticPriority = priority as string;
    let semanticPriorityLabel = priorityLabel;
    let semanticStatusDescription = isEn
        ? "Awaiting medical validation"
        : "Menunggu validasi medis";
    if (!isEmergency && !assessmentContext.finalized) {
        priorityLabel = semanticPriorityLabel = isEn
            ? "No definitive recommendation yet"
            : "Belum ada rekomendasi definitif";
        semanticPriority = "UNCLASSIFIED";
        semanticStatusDescription = isEn
            ? "Assessment incomplete / needs clarification"
            : "Asesmen belum lengkap / perlu klarifikasi";
    } else if (priority === "T0" && !isEmergency) {
        priorityLabel = semanticPriorityLabel = isEn
            ? "T0-Suspect Recommendation"
            : "Rekomendasi T0-Suspect";
        semanticPriority = "T0_SUSPECT";
        semanticStatusDescription = isEn
            ? "System recommendation; emergency dispatch is not yet recorded in this data."
            : "Rekomendasi sistem; pengiriman darurat belum tercatat pada data ini.";
    } else if (priority === "T0") {
        if (status === "CONFIRMED") {
            semanticPriority = semanticPriorityLabel = "T0-CONFIRMED";
            semanticStatusDescription = isEn
                ? "Medically confirmed"
                : "Terkonfirmasi medis";
        } else if (status === "DOWNGRADED") {
            const decision = (raw.verifications || []).find(
                (verification: any) => verification.clinical_result,
            );
            semanticPriority = decision?.clinical_result || "T0-SUSPECT";
            semanticPriorityLabel = decision?.clinical_result
                ? isEn
                    ? `Downgraded to ${decision.clinical_result}`
                    : `Diturunkan ke ${decision.clinical_result}`
                : isEn
                  ? "Downgraded"
                  : "Diturunkan";
            semanticStatusDescription = isEn
                ? "Clinical decision saved"
                : "Keputusan klinis tersimpan";
        } else {
            semanticPriority = semanticPriorityLabel = "T0-SUSPECT";
        }
    } else if (priority === "T1") {
        semanticPriorityLabel = isEn ? "T1-URGENT" : "T1-MENDESAK";
        semanticStatusDescription = isEn
            ? "Medical post outpatient care"
            : "Rawat jalan pos medis";
    } else if (priority === "T2") {
        semanticPriorityLabel = isEn ? "T2-SCHEDULED" : "T2-TERJADWAL";
        semanticStatusDescription = isEn
            ? "Psychosocial support"
            : "Pendampingan psikososial";
    } else {
        semanticPriorityLabel = isEn ? "T3-STABLE" : "T3-STABIL";
        semanticStatusDescription = isEn
            ? "Community support"
            : "Dukungan komunitas";
    }

    const { srqScore, riskScore, functionScore } = assessmentContext;
    const r3Answer = assessment?.riskResponses.find(
        (response: any) => response.indicator === "R3",
    )?.answer;
    const vulnerabilityStatus =
        r3Answer === true
            ? isEn
                ? "Identified"
                : "Teridentifikasi"
            : r3Answer === false
              ? isEn
                  ? "Not flagged in assessment"
                  : "Tidak ditandai pada asesmen"
              : isEn
                ? "Data unavailable"
                : "Data tidak tersedia";
    const clinicalSummary = !assessment
        ? isEn
            ? "Structured assessment not yet available"
            : "Asesmen terstruktur belum tersedia"
        : !assessmentContext.finalized
          ? assessmentContext.statusLabel
          : !triage
            ? isEn
                ? "Triage score not yet available"
                : "Skor triase belum tersedia"
            : isEn
              ? `SRQ ${srqScore ?? "-"}/20 • Risk ${riskScore ?? "-"}/8 • Function ${functionScore ?? "-"}/9`
              : `SRQ ${srqScore ?? "-"}/20 • Risiko ${riskScore ?? "-"}/8 • Fungsi ${functionScore ?? "-"}/9`;

    const normalizedGender = !patient?.gender
        ? isEn
            ? "Gender unavailable"
            : "Jenis kelamin tidak tersedia"
        : isEn
          ? patient.gender === "Laki-laki"
              ? "Male"
              : patient.gender === "Perempuan"
                ? "Female"
                : patient.gender
          : patient.gender;

    return {
        assessmentContext,
        key: `${isEmergency ? "emg" : "asm"}-${raw.id}`,
        raw,
        isEmergency,
        emergencyId: isEmergency ? raw.id : null,
        assessmentId: assessment?.id || null,
        rmCode: formatRmCode(isEmergency ? raw : assessment, locale),
        survivorName:
            patient?.name ||
            (isEn ? "Unidentified survivor" : "Penyintas tanpa identitas tercatat"),
        maskedNik: maskNik(patient?.nik, locale),
        searchNik: String(patient?.nik ?? "").replace(/\D/g, ""),
        age:
            patient?.age !== undefined && patient?.age !== null
                ? patient.age
                : null,
        gender: normalizedGender,
        vulnerabilityStatus,
        shelterName:
            raw.shelter?.name ||
            patient?.shelter?.name ||
            (isEn ? "Shelter unknown" : "Posko tidak diketahui"),
        priority,
        priorityLabel,
        semanticPriority,
        semanticPriorityLabel,
        semanticStatusDescription,
        status,
        statusLabel,
        hasRedFlag: Boolean(redFlag),
        hasPatient: Boolean(patient),
        hasAssessment: Boolean(assessment),
        hasTriageResult: Boolean(triage),
        hasSrqResponses: Boolean(assessment?.srqResponses.length),
        hasRiskResponses: Boolean(assessment?.riskResponses.length),
        hasFunctionResponses: Boolean(assessment?.functionResponses.length),
        redFlagType: redFlag,
        redFlagLabel,
        clinicalSummary,
        timeAgo: timeAgo(raw.created_at || assessment?.completed_at, locale),
        createdAt: raw.created_at || assessment?.completed_at,
        notes:
            raw.notes || assessment?.clinicalValidation?.diagnosis_notes || "",
        volunteerName:
            raw.user?.name ||
            assessment?.user?.name ||
            (isEn ? "Volunteer unavailable" : "Relawan tidak tersedia"),
        srqScore,
        riskScore,
        functionScore,
        assessmentCreatedAt:
            assessment?.completed_at || assessment?.created_at || null,
        srqResponses: assessment?.srqResponses || [],
        ...assessmentContext.observations,
        riskResponses: assessment?.riskResponses || [],
        functionResponses: assessment?.functionResponses || [],
        verifications: raw.verifications || [],
        referrals: raw.referrals || [],
        hasReferral: Boolean(raw.referrals?.length),
        clinicalValidation: assessment?.clinicalValidation || null,
    };
}

export function formatRiskAnswer(
    answer: boolean | null,
    locale: string = "id",
): string {
    if (locale === "en") {
        if (answer === true) return "YES";
        if (answer === false) return "NO";
        return "Unavailable";
    }
    if (answer === true) return "YA";
    if (answer === false) return "TIDAK";
    return "Tidak tersedia";
}

export type HealthcareEmergencyQueueItem = ReturnType<
    typeof normalizeQueueItem
>;
export type HealthcareEmergencyFilter = "ALL" | "PENDING" | "CONFIRMED";

export function normalizeEmergencyQueue(
    emergencies: any[],
    locale: string = "id",
): HealthcareEmergencyQueueItem[] {
    return emergencies
        .map((emergency) => normalizeQueueItem(emergency, true, locale))
        .sort((a, b) => {
            if (a.status === "PENDING" && b.status !== "PENDING") return -1;
            if (a.status !== "PENDING" && b.status === "PENDING") return 1;
            const timeDifference =
                a.status === "PENDING"
                    ? new Date(a.createdAt).getTime() -
                      new Date(b.createdAt).getTime()
                    : new Date(b.createdAt).getTime() -
                      new Date(a.createdAt).getTime();
            if (timeDifference !== 0) return timeDifference;
            const firstId = String(a.emergencyId);
            const secondId = String(b.emergencyId);
            if (firstId === secondId) return 0;
            return (
                (firstId < secondId ? -1 : 1) *
                (a.status === "PENDING" ? 1 : -1)
            );
        });
}

export function emergencyQueueCounts(
    queue: HealthcareEmergencyQueueItem[],
    emergencies: any[],
) {
    let referralsIssuedCount = 0;
    for (const emergency of emergencies) {
        referralsIssuedCount += (emergency.referrals || []).length;
    }

    return {
        totalSurvivorsCount: queue.length,
        criticalT0Count: queue.filter((item) =>
            ["PENDING", "ACKNOWLEDGED", "REVIEWING", "CONFIRMED"].includes(
                item.status,
            ),
        ).length,
        pendingValidationCount: queue.filter((item) =>
            ["ACKNOWLEDGED", "REVIEWING"].includes(item.status),
        ).length,
        referralsIssuedCount,
    };
}

export function filterEmergencyQueue(
    queue: HealthcareEmergencyQueueItem[],
    selectedFilter: HealthcareEmergencyFilter,
    searchQuery: string,
): HealthcareEmergencyQueueItem[] {
    return queue.filter((item) => {
        if (selectedFilter === "PENDING" && item.status !== "PENDING") {
            return false;
        }
        if (selectedFilter === "CONFIRMED" && item.status !== "CONFIRMED") {
            return false;
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            const nikQuery = q.replace(/\D/g, "");
            const matchName = item.survivorName.toLowerCase().includes(q);
            const matchRm = item.rmCode.toLowerCase().includes(q);
            const matchNik =
                nikQuery.length > 0 && item.searchNik.includes(nikQuery);
            const matchShelter = item.shelterName.toLowerCase().includes(q);
            return matchName || matchRm || matchNik || matchShelter;
        }
        return true;
    });
}

export function getSrqAnswer(
    item: HealthcareEmergencyQueueItem | null,
    qNumber: number,
): SrqAnswer | null {
    if (!item?.srqResponses?.length) return null;
    const resp = item.srqResponses.find(
        (response: any) => response.question_number === qNumber,
    );
    if (!resp) return null;
    return item.assessmentContext.responses[qNumber - 1]?.answer ?? null;
}

export function getRiskAnswer(
    item: HealthcareEmergencyQueueItem | null,
    code: string,
): boolean | null {
    if (!item?.riskResponses?.length) return null;
    const resp = item.riskResponses.find(
        (response: any) => response.indicator === code,
    );
    if (!resp || resp.answer === undefined || resp.answer === null) return null;
    return typeof resp.answer === "boolean" ? resp.answer : null;
}

export function getFunctionLabel(
    item: HealthcareEmergencyQueueItem | null,
    domain: string,
    locale: string = "id",
): string {
    const isEn = locale === "en";
    if (!item?.functionResponses?.length) {
        return isEn
            ? "Function data unavailable"
            : "Data fungsi tidak tersedia";
    }
    const resp = item.functionResponses.find(
        (response: any) => response.domain === domain,
    );
    if (resp?.level === 3) return isEn ? "Severe impairment" : "Gangguan berat";
    if (resp?.level === 1) {
        return isEn
            ? "Mild-moderate impairment / needs support"
            : "Gangguan ringan-sedang / perlu dukungan";
    }
    if (resp?.level === 0) {
        return isEn ? "Unimpaired / independent" : "Tidak terganggu / mandiri";
    }
    return isEn ? "Function data unavailable" : "Data fungsi tidak tersedia";
}

export function getDetectedRedFlags(
    item: HealthcareEmergencyQueueItem | null,
    locale: string = "id",
) {
    if (!item) return [];
    const isEn = locale === "en";
    const list: Array<{ key: string; title: string; evidence: string }> = [];

    if (
        item.redFlagType === "SUICIDAL_IDEATION" ||
        getSrqAnswer(item, 17) === true
    ) {
        let evidence =
            item.redFlagType === "SUICIDAL_IDEATION"
                ? isEn
                    ? "Recorded Red Flag type: Suicidal Ideation / Risk."
                    : "Jenis Red Flag tercatat: Ideasi / Risiko Bunuh Diri."
                : "";
        if (getSrqAnswer(item, 17) === true) {
            evidence =
                (evidence ? evidence + " • " : "") +
                (isEn
                    ? "YES response on SRQ #17 (Thoughts of ending life)"
                    : "Jawaban YA pada SRQ #17 (Pikiran mengakhiri hidup)");
        }
        list.push({
            key: "SUICIDAL_IDEATION",
            title: isEn
                ? "Specific self-harm / life safety risk"
                : "Risiko keamanan jiwa spesifik",
            evidence:
                evidence ||
                (isEn
                    ? "YES response on SRQ #17"
                    : "Jawaban YA pada SRQ #17"),
        });
    }

    if (item.redFlagType === "PSYCHOSIS") {
        list.push({
            key: "PSYCHOSIS",
            title: isEn ? "Acute psychotic symptoms" : "Gejala psikotik akut",
            evidence: isEn
                ? "Recorded Red Flag type: PSYCHOSIS. Perceptual disturbance / delusions."
                : "Jenis Red Flag tercatat: PSYCHOSIS. Gangguan persepsi / waham.",
        });
    }

    if (item.redFlagType === "SEVERE_AGITATION") {
        list.push({
            key: "SEVERE_AGITATION",
            title: isEn
                ? "Aggressive behavior & impulse control impairment"
                : "Perilaku agresif & gangguan kontrol impuls",
            evidence: isEn
                ? "Recorded Red Flag type: SEVERE_AGITATION. Risk of harming others or damaging surroundings."
                : "Jenis Red Flag tercatat: SEVERE_AGITATION. Risiko melukai orang lain atau merusak lingkungan.",
        });
    }

    if (item.redFlagType === "MEDICAL_CRISIS") {
        list.push({
            key: "MEDICAL_CRISIS",
            title: isEn ? "Acute medical crisis" : "Krisis medis akut",
            evidence: isEn
                ? "Recorded Red Flag type: MEDICAL_CRISIS. Decreased consciousness or physical injury."
                : "Jenis Red Flag tercatat: MEDICAL_CRISIS. Penurunan kesadaran atau cedera fisik.",
        });
    }

    if (list.length === 0 && item.hasRedFlag) {
        list.push({
            key: "GENERAL_EMERGENCY",
            title:
                item.redFlagLabel ||
                (isEn ? "Reported Medical Emergency" : "Kedaruratan Medis Terlapor"),
            evidence: isEn
                ? "Field danger signs reported by volunteer."
                : "Tanda bahaya lapangan dilaporkan oleh relawan.",
        });
    }

    return list;
}

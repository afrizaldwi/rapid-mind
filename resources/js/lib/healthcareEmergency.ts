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

export function formatRmCode(record: any): string {
    if (record?.rm_code) return record.rm_code;
    const raw =
        record?.assessment_id || record?.assessment?.id || record?.id || "";
    if (!raw) return "ID tidak tersedia";
    const hex = String(raw).replace(/-/g, "").slice(-6).toUpperCase();
    return `ID-${hex.padStart(6, "0")}`;
}

export function maskNik(nik?: string): string {
    if (!nik || nik.length < 8) return "NIK tidak tersedia";
    return `${nik.slice(0, 4)}••••${nik.slice(-4)}`;
}

export function timeAgo(dateStr?: string): string {
    if (!dateStr) return "Waktu tidak tersedia";
    const diffMinutes = Math.round(
        (Date.now() - new Date(dateStr).getTime()) / 60000,
    );
    if (diffMinutes < 1) return "Baru saja";
    if (diffMinutes < 60) return `${diffMinutes} mnt lalu`;
    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} jam lalu`;
    return `${Math.round(diffHours / 24)} hari lalu`;
}

export function formatDateTime(dateStr?: string): string {
    if (!dateStr) return "Waktu tidak tersedia";
    return new Intl.DateTimeFormat("id-ID", {
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

export function normalizeQueueItem(raw: any, isEmergency: boolean) {
    const patient = raw.patient;
    const assessment = normalizeAssessment(isEmergency ? raw.assessment : raw);
    const triage = assessment?.triageResult ?? raw.triage_result ?? null;
    let priority: "T0" | "T1" | "T2" | "T3" = "T2";
    let priorityLabel = "T2 Terjadwal";

    if (isEmergency) {
        priority = "T0";
        priorityLabel = "T0 Darurat";
    } else if (triage?.system_recommendation) {
        const recommendation = triage.system_recommendation;
        if (recommendation.startsWith("T0"))
            [priority, priorityLabel] = ["T0", "T0 Darurat"];
        else if (recommendation === "T1")
            [priority, priorityLabel] = ["T1", "T1 Mendesak"];
        else if (recommendation === "T2")
            [priority, priorityLabel] = ["T2", "T2 Terjadwal"];
        else if (recommendation === "T3")
            [priority, priorityLabel] = ["T3", "T3 Stabil"];
    }

    const redFlag =
        raw.red_flag_type ||
        (triage?.is_red_flag_override ? triage.red_flag_source || null : null);
    const q17Answer = assessment?.srqResponses.find(
        (response: any) => response.question_number === 17,
    )?.answer;
    let redFlagLabel = "Tanda Bahaya Lapangan";
    if (redFlag === "SUICIDAL_IDEATION")
        redFlagLabel =
            q17Answer === true
                ? "Ideasi / Risiko Bunuh Diri (SRQ #17: YA)"
                : "Ideasi / Risiko Bunuh Diri";
    else if (redFlag === "PSYCHOSIS") redFlagLabel = "Gejala Psikosis Akut";
    else if (redFlag === "SEVERE_AGITATION")
        redFlagLabel = "Agitasi / Perilaku Berbahaya";
    else if (redFlag === "MEDICAL_CRISIS") redFlagLabel = "Krisis Medis Akut";
    else if (redFlag) redFlagLabel = `Kedaruratan: ${redFlag}`;

    const status = isEmergency
        ? raw.status
        : assessment?.clinicalValidation
          ? "COMPLETED"
          : "PENDING";
    let statusLabel = "Menunggu";
    if (status === "PENDING")
        statusLabel = isEmergency ? "Perlu Diakui" : "Menunggu Validasi";
    else if (status === "ACKNOWLEDGED") statusLabel = "Sudah Diakui";
    else if (status === "REVIEWING") statusLabel = "Sedang Ditinjau";
    else if (status === "CONFIRMED") statusLabel = "T0 Terkonfirmasi";
    else if (status === "DOWNGRADED") statusLabel = "Diturunkan";
    else if (status === "COMPLETED") statusLabel = "Selesai Tervalidasi";

    let semanticPriority = priority as string;
    let semanticPriorityLabel = priorityLabel;
    let semanticStatusDescription = "Menunggu validasi medis";
    if (priority === "T0") {
        if (status === "CONFIRMED") {
            semanticPriority = semanticPriorityLabel = "T0-CONFIRMED";
            semanticStatusDescription = "Terkonfirmasi medis";
        } else if (status === "DOWNGRADED") {
            const decision = (raw.verifications || []).find(
                (verification: any) => verification.clinical_result,
            );
            semanticPriority = decision?.clinical_result || "T0-SUSPECT";
            semanticPriorityLabel = decision?.clinical_result
                ? `Diturunkan ke ${decision.clinical_result}`
                : "Diturunkan";
            semanticStatusDescription = "Keputusan klinis tersimpan";
        } else {
            semanticPriority = semanticPriorityLabel = "T0-SUSPECT";
        }
    } else if (priority === "T1") {
        semanticPriorityLabel = "T1-MENDESAK";
        semanticStatusDescription = "Rawat jalan pos medis";
    } else if (priority === "T2") {
        semanticPriorityLabel = "T2-TERJADWAL";
        semanticStatusDescription = "Pendampingan psikososial";
    } else {
        semanticPriorityLabel = "T3-STABIL";
        semanticStatusDescription = "Dukungan komunitas";
    }

    const numberOrNull = (value: unknown) =>
        value === undefined || value === null ? null : Number(value);
    const srqScore = numberOrNull(triage?.srq_score);
    const riskScore = numberOrNull(triage?.risk_score);
    const functionScore = numberOrNull(triage?.function_score);
    const r3Answer = assessment?.riskResponses.find(
        (response: any) => response.indicator === "R3",
    )?.answer;
    const vulnerabilityStatus =
        r3Answer === true
            ? "Teridentifikasi"
            : r3Answer === false
              ? "Tidak ditandai pada asesmen"
              : "Data tidak tersedia";
    const clinicalSummary = !assessment
        ? "Asesmen terstruktur belum tersedia"
        : !triage
          ? "Skor triase belum tersedia"
          : `SRQ ${srqScore ?? "-"}/20 • Risiko ${riskScore ?? "-"}/8 • Fungsi ${functionScore ?? "-"}/9`;

    return {
        key: `${isEmergency ? "emg" : "asm"}-${raw.id}`,
        raw,
        isEmergency,
        emergencyId: isEmergency ? raw.id : null,
        assessmentId: assessment?.id || null,
        rmCode: formatRmCode(isEmergency ? raw : assessment),
        survivorName: patient?.name || "Penyintas tanpa identitas tercatat",
        maskedNik: maskNik(patient?.nik),
        searchNik: String(patient?.nik ?? "").replace(/\D/g, ""),
        age:
            patient?.age !== undefined && patient?.age !== null
                ? patient.age
                : null,
        gender: patient?.gender || "Jenis kelamin tidak tersedia",
        vulnerabilityStatus,
        shelterName:
            raw.shelter?.name ||
            patient?.shelter?.name ||
            "Posko tidak diketahui",
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
        timeAgo: timeAgo(raw.created_at || assessment?.completed_at),
        createdAt: raw.created_at || assessment?.completed_at,
        notes:
            raw.notes || assessment?.clinicalValidation?.diagnosis_notes || "",
        volunteerName:
            raw.user?.name ||
            assessment?.user?.name ||
            "Relawan tidak tersedia",
        srqScore,
        riskScore,
        functionScore,
        assessmentCreatedAt:
            assessment?.completed_at || assessment?.created_at || null,
        srqResponses: assessment?.srqResponses || [],
        riskResponses: assessment?.riskResponses || [],
        functionResponses: assessment?.functionResponses || [],
        verifications: raw.verifications || [],
        referrals: raw.referrals || [],
        hasReferral: Boolean(raw.referrals?.length),
        clinicalValidation: assessment?.clinicalValidation || null,
    };
}

export function formatRiskAnswer(answer: boolean | null): string {
    if (answer === true) return "YA";
    if (answer === false) return "TIDAK";
    return "Tidak tersedia";
}

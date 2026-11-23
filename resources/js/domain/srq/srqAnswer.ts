export type SrqAnswer = boolean | "UNCLEAR" | "UNANSWERED";
export type SrqAnswers = Partial<Record<number, SrqAnswer>>;

export function normalizeSrqAnswer(value: unknown): SrqAnswer {
    switch (value) {
        case true:
        case "YES":
            return true;
        case false:
        case "NO":
            return false;
        case "UNCLEAR":
        case "UNANSWERED":
            return value;
        default:
            throw new Error("Nilai jawaban SRQ tidak valid.");
    }
}

export function normalizeSrqAnswers(value: unknown): SrqAnswers {
    if (value === undefined) return {};
    if (!value || typeof value !== "object" || Array.isArray(value))
        throw new Error("Format jawaban SRQ tidak valid.");
    const answers: SrqAnswers = {};
    for (const [key, answer] of Object.entries(value)) {
        const number = Number(key);
        if (
            !Number.isInteger(number) ||
            number < 1 ||
            number > 20 ||
            String(number) !== key
        )
            throw new Error("Nomor pertanyaan SRQ tidak valid.");
        answers[number] = normalizeSrqAnswer(answer);
    }
    return answers;
}

export function hasDefinitiveSrqAnswers(value: unknown): boolean {
    try {
        const answers = normalizeSrqAnswers(value);
        return (
            Object.keys(answers).length === 20 &&
            Array.from({ length: 20 }, (_, i) => i + 1).every(
                (n) => typeof answers[n] === "boolean",
            )
        );
    } catch {
        return false;
    }
}

export function definitiveSrqAnswers(value: unknown): Record<number, boolean> {
    if (!hasDefinitiveSrqAnswers(value))
        throw new Error(
            "Klarifikasi seluruh 20 jawaban SRQ sebelum menghitung skor.",
        );
    return normalizeSrqAnswers(value) as Record<number, boolean>;
}

// Eloquent rows expose unresolved states separately from the nullable boolean.
export function srqAnswerFromRow(row: {
    answer?: unknown;
    answer_state?: unknown;
}): SrqAnswer {
    if (row.answer_state !== undefined && row.answer_state !== null) {
        if (row.answer !== null && row.answer !== undefined)
            throw new Error("Keadaan jawaban SRQ bertentangan.");
        if (row.answer_state !== "UNCLEAR" && row.answer_state !== "UNANSWERED")
            throw new Error("Keadaan jawaban SRQ tidak valid.");
        return row.answer_state;
    }
    return normalizeSrqAnswer(row.answer);
}

export function srqAnswerLabel(
    answer: SrqAnswer | undefined,
    locale: string = "id",
): string {
    if (locale === "en") {
        return answer === true
            ? "Yes"
            : answer === false
              ? "No"
              : answer === "UNCLEAR"
                ? "Unclear Response"
                : answer === "UNANSWERED"
                  ? "Unanswered"
                  : "Not recorded";
    }
    return answer === true
        ? "Ya"
        : answer === false
          ? "Tidak"
          : answer === "UNCLEAR"
            ? "Respons Tidak Jelas"
            : answer === "UNANSWERED"
              ? "Belum dijawab"
              : "Tidak tercatat";
}

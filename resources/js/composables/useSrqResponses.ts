import type { SpeechLanguage } from "@/stt/speechLanguage";
import { computed, ref, type Ref } from "vue";
import type { SrqAnswer, SrqAnswers } from "@/domain/srq/srqAnswer";
import {
    interpretSrqTranscript,
    selectSrqSpeechAnswerUpdates,
} from "@/domain/srq/srqTranscriptInterpreter";
import { useI18n } from "@/i18n";

export function useSrqResponses(
    answers: Ref<SrqAnswers>,
    enabled: () => boolean,
    save: () => Promise<void>,
    interrupt: () => void,
) {
    const { isEn } = useI18n();
    const safetyEvidence = ref("");
    const manualOverrides = new Set<number>();
    const sttOwnedAnswers = new Set<number>();
    const safety = ref<"CONFIRM" | "REVIEW" | "CONFIRMED" | null>(null);
    const answeredCount = computed(
        () =>
            Object.values(answers.value).filter(
                (value) => typeof value === "boolean",
            ).length,
    );
    function reset() {
        safety.value = null;
        safetyEvidence.value = "";
        manualOverrides.clear();
        sttOwnedAnswers.clear();
    }
    function setManualAnswer(number: number, value: SrqAnswer) {
        if (!enabled() || safety.value) return;
        if (number === 17 && value === true) {
            interrupt();
            safety.value = "CONFIRM";
            return;
        }
        manualOverrides.add(number);
        sttOwnedAnswers.delete(number);
        answers.value[number] = value;
        void save();
    }
    function confirmQ17() {
        if (!enabled() || safety.value !== "CONFIRM") return;
        manualOverrides.add(17);
        sttOwnedAnswers.delete(17);
        answers.value[17] = true;
        safety.value = "CONFIRMED";
        void save();
    }
    function dismissSafety() {
        safety.value = null;
        safetyEvidence.value = "";
    }
    function applySpeechTranscript(transcript: string, language: SpeechLanguage = "id-ID") {
        if (!enabled() || safety.value) return;
        const interpretation = interpretSrqTranscript(transcript, language);
        const { accepted, protectedQuestionNumbers } =
            selectSrqSpeechAnswerUpdates(
                interpretation,
                answers.value,
                sttOwnedAnswers,
                manualOverrides,
            );
        const q17Yes = interpretation.matches.some(
            (match) =>
                match.questionNumber === 17 &&
                match.status === "matched" &&
                match.answer === true,
        );
        // Never persist an apparent Q17 YES, or a Q17 NO mixed with safety uncertainty.
        const ordinary = accepted.filter(
            (update) => update.questionNumber !== 17 ||
                (!update.answer && !interpretation.requiresSafetyReview),
        );
        for (const update of ordinary) {
            answers.value[update.questionNumber] = update.answer;
            sttOwnedAnswers.add(update.questionNumber);
        }
        if (q17Yes || interpretation.requiresSafetyReview) {
            interrupt();
            safetyEvidence.value = transcript;
            safety.value =
                q17Yes && !interpretation.requiresSafetyReview && !protectedQuestionNumbers.includes(17)
                    ? "CONFIRM"
                    : "REVIEW";
        }
        if (ordinary.length) void save();
        const notices: string[] = [];
        if (ordinary.length) {
            const numbers = ordinary.map(update => update.questionNumber).join(", ");
            notices.push(isEn.value ? `Voice filled SRQ item(s) ${numbers}. Review the answers.` : `Suara mengisi SRQ nomor ${numbers}. Periksa kembali jawabannya.`);
        }
        if (protectedQuestionNumbers.length) {
            const numbers = protectedQuestionNumbers.join(", ");
            notices.push(isEn.value
                ? `Speech matched SRQ ${numbers}. Existing responses were preserved; change them manually if needed.`
                : `Suara cocok dengan SRQ nomor ${numbers}. Jawaban yang sudah tersimpan dipertahankan; ubah secara manual bila perlu.`);
        }
        if (safety.value === "CONFIRM") notices.push(isEn.value
            ? "Q17 Yes needs explicit volunteer confirmation before saving."
            : "Q17 Ya memerlukan konfirmasi eksplisit relawan sebelum disimpan.");
        else if (safety.value) notices.push(isEn.value
            ? "Q17 needs volunteer review. The speech is uncertain; no affirmative Q17 answer was saved."
            : "Q17 perlu ditinjau relawan. Ucapan belum pasti; jawaban Q17 Ya tidak disimpan.");
        else if (interpretation.unresolved.length || interpretation.matches.some(match => match.status === "conflicting"))
            notices.push(isEn.value
                ? "Some speech remains unclear or contradictory. Clarify it or select the answer manually."
                : "Sebagian ucapan belum jelas atau bertentangan. Klarifikasi atau pilih jawaban secara manual.");
        if (!ordinary.length && !protectedQuestionNumbers.length && !safety.value)
            notices.unshift(isEn.value ? "No clear match. Repeat a complete answer or select it manually." : "Belum ada jawaban yang cocok. Ucapkan jawaban lengkap atau pilih secara manual.");
        return notices.join(" ");
    }
    return {
        safety,
        safetyEvidence,
        answeredCount,
        setManualAnswer,
        confirmQ17,
        dismissSafety,
        applySpeechTranscript,
        reset,
    };
}

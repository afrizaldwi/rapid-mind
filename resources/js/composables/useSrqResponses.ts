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
    function applySpeechTranscript(transcript: string) {
        if (!enabled() || safety.value) return;
        const interpretation = interpretSrqTranscript(transcript);
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
        // Never put an apparent affirmative Q17 into the persisted answer map.
        const ordinary = accepted.filter(
            (update) => !(update.questionNumber === 17 && update.answer),
        );
        for (const update of ordinary) {
            answers.value[update.questionNumber] = update.answer;
            sttOwnedAnswers.add(update.questionNumber);
        }
        if (q17Yes || interpretation.requiresSafetyReview) {
            interrupt();
            safetyEvidence.value = transcript;
            safety.value =
                q17Yes && !protectedQuestionNumbers.includes(17)
                    ? "CONFIRM"
                    : "REVIEW";
        }
        if (ordinary.length) void save();
        return protectedQuestionNumbers.length
            ? (isEn.value
                  ? "Manual or saved answers remain preserved. Check unclear responses manually."
                  : "Jawaban manual atau tersimpan dipertahankan. Periksa respons yang belum jelas secara manual.")
            : (isEn.value
                  ? "Voice results reviewed. Clarify any unclear responses; Q17 Yes requires volunteer confirmation."
                  : "Hasil suara telah ditinjau. Klarifikasi jawaban yang belum jelas; Q17 Ya memerlukan konfirmasi relawan.");
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

export class RedFlagDetector {
  detect(srqAnswers: Record<number, boolean>, manualTrigger = false): { detected: boolean; source: string | null } {
    if (manualTrigger) {
      return { detected: true, source: 'MANUAL_RED_FLAG' };
    }

    if (srqAnswers[17] === true) {
      return { detected: true, source: 'SRQ_Q17' };
    }

    return { detected: false, source: null };
  }
}

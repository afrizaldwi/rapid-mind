import type { SrqSpeechRule } from "./srqSpeechRules.ts";

function rule(
    number: number,
    positive: string,
    negative: string,
): SrqSpeechRule {
    return {
        number,
        questionPatterns: [], // Canonical questions and scripts come from en.ts.
        positivePatterns: [new RegExp(`^(?:${positive})$`)],
        negativePatterns: [new RegExp(`^(?:${negative})$`)],
    };
}

// Whole survivor statements only. Negation, qualification and third-party tails
// cannot be swallowed by an unrestricted symptom substring match.
export const srqEnglishSpeechRules: readonly SrqSpeechRule[] = [
    rule(
        1,
        String.raw`i (?:often )?have (?:headaches|a headache)|my head (?:feels heavy|is throbbing)|i (?:often )?feel dizzy`,
        String.raw`i do not (?:often )?have (?:headaches|a headache)|my head (?:does not hurt|is not throbbing)|i do not feel dizzy`,
    ),
    rule(
        2,
        String.raw`i have lost my appetite|i do not feel like eating|my appetite is (?:poor|reduced)|i have no appetite`,
        String.raw`my appetite is (?:normal|good)|i (?:still )?feel like eating|i have not lost my appetite`,
    ),
    rule(
        3,
        String.raw`i (?:cannot sleep(?: well)?|do not sleep well|sleep badly|have trouble sleeping)|i keep waking up(?: at night)?|i cannot fall (?:back )?asleep|i have insomnia`,
        String.raw`i (?:sleep well|do not sleep badly|can sleep(?: well)?)|i do not (?:have trouble sleeping|keep waking up(?: at night)?)|i do not have insomnia`,
    ),
    rule(
        4,
        String.raw`i am easily (?:frightened|scared)|i (?:get scared|startle easily|feel afraid|am easily startled)`,
        String.raw`i am not easily (?:frightened|scared)|i do not (?:get scared|startle easily|feel afraid)|i am not easily startled`,
    ),
    rule(
        5,
        String.raw`my (?:hands|fingers) (?:shake|tremble|are shaking)|i have (?:shaky hands|hand tremors)`,
        String.raw`my (?:hands|fingers) (?:do not (?:shake|tremble)|are not shaking)|i do not have (?:shaky hands|hand tremors)`,
    ),
    rule(
        6,
        String.raw`i feel (?:anxious|nervous|tense|worried|uneasy)|i am (?:anxious|nervous|tense|worried)(?: all the time)?|my heart races when i worry`,
        String.raw`i am not (?:anxious|nervous|tense|worried)(?: all the time)?|i do not feel (?:anxious|nervous|tense|worried|uneasy)|my heart does not race when i worry`,
    ),
    rule(
        7,
        String.raw`my digestion is poor|i (?:feel (?:nauseated|nauseous)|have diarrhea|have digestive problems|have poor digestion)`,
        String.raw`my digestion is (?:good|normal)|i do not (?:feel (?:nauseated|nauseous)|have diarrhea|have digestive problems|have poor digestion)`,
    ),
    rule(
        8,
        String.raw`i have trouble thinking clearly|i (?:cannot (?:think clearly|focus)|find it hard to concentrate|feel dazed)`,
        String.raw`i do not have trouble thinking clearly|i (?:can (?:think clearly|focus)|do not find it hard to concentrate|do not feel dazed)`,
    ),
    rule(
        9,
        String.raw`i feel (?:unhappy|sad|empty)|i am (?:unhappy|not happy)`,
        String.raw`i (?:feel happy|am happy|do not feel (?:unhappy|sad|empty))`,
    ),
    rule(
        10,
        String.raw`i (?:keep crying|cry more(?: often)? than usual|feel like crying all the time|burst into tears)`,
        String.raw`i do not (?:keep crying|cry more(?: often)? than usual|feel like crying all the time|burst into tears)`,
    ),
    rule(
        11,
        String.raw`i (?:find it difficult to enjoy daily activities|cannot enjoy daily activities|do not enjoy daily activities|no longer enjoy my hobbies)|my hobbies are no longer enjoyable`,
        String.raw`i (?:do not find it difficult to enjoy daily activities|can enjoy daily activities|enjoy daily activities|still enjoy my hobbies)|my hobbies are still enjoyable`,
    ),
    rule(
        12,
        String.raw`i (?:find it difficult to make decisions|cannot make decisions|have difficulty making decisions|struggle to choose even simple things)`,
        String.raw`i (?:do not find it difficult to make decisions|can make decisions|do not have difficulty making decisions|do not struggle to choose even simple things)`,
    ),
    rule(
        13,
        String.raw`my daily work is (?:suffering|getting worse)|i (?:keep neglecting my daily tasks|cannot get my daily tasks done)|my daily tasks get neglected`,
        String.raw`my daily work is not (?:suffering|getting worse)|i (?:do not keep neglecting my daily tasks|can get my daily tasks done)|my daily tasks do not get neglected`,
    ),
    rule(
        14,
        String.raw`i (?:am unable to play a useful part in life|cannot do anything useful|only cause trouble for others|feel useless)`,
        String.raw`i (?:can play a useful part in life|can do something useful|do not only cause trouble for others|do not feel useless)`,
    ),
    rule(
        15,
        String.raw`i (?:have lost interest in (?:things|everything)|have no drive to do anything|have lost my motivation|have lost enthusiasm for activities)`,
        String.raw`i (?:have not lost interest in things|still have interest in things|still have the drive to do things|have not lost my motivation|have not lost enthusiasm for activities)`,
    ),
    rule(
        16,
        String.raw`i (?:feel (?:that i am a worthless person|worthless|like a complete failure)|am worthless)|my existence has no value`,
        String.raw`i (?:do not feel (?:that i am a worthless person|worthless|like a complete failure)|am not worthless)|my existence has value`,
    ),
    rule(
        17,
        String.raw`i (?:want to die|am thinking (?:about|of) ending my life|do not want to live anymore|have thoughts of ending my life|want to (?:end my life|kill myself))`,
        String.raw`i (?:do not want to die|am not thinking (?:about|of) ending my life|want to live|do not have thoughts of ending my life|do not want to (?:end my life|kill myself))`,
    ),
    rule(
        18,
        String.raw`i (?:feel tired all the time|am (?:tired|exhausted) all day|am always tired|feel constantly drained|feel tired even after resting)`,
        String.raw`i (?:do not feel tired all the time|am not (?:tired|exhausted) all day|am not always tired|do not feel constantly drained|do not feel tired even after resting)`,
    ),
    rule(
        19,
        String.raw`i have uncomfortable feelings in my stomach|my stomach (?:feels uncomfortable|aches)|i have pain in the pit of my stomach`,
        String.raw`i do not have uncomfortable feelings in my stomach|my stomach (?:feels comfortable|does not ache)|i do not have pain in the pit of my stomach`,
    ),
    rule(
        20,
        String.raw`i (?:am easily tired|get tired (?:easily|quickly)|run out of energy after a small task)`,
        String.raw`i (?:am not easily tired|do not get tired (?:easily|quickly)|do not run out of energy after a small task)`,
    ),
];

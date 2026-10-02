export type SrqSpeechRule = {
    number: number;
    questionPatterns: readonly RegExp[];
    positivePatterns: readonly RegExp[];
    negativePatterns: readonly RegExp[];
};

const self = String.raw`(?:saya|aku)`;

export const srqSpeechRules: readonly SrqSpeechRule[] = [
    {
        number: 1,
        questionPatterns: [
            /\bapakah (?:anda )?(?:sering )?(?:merasa )?sakit kepala\b/,
        ],
        positivePatterns: [
            new RegExp(
                String.raw`\b${self} (?:sering |merasa )?(?:sakit kepala|pusing|kepala (?:terasa )?berat)\b`,
            ),
        ],
        negativePatterns: [
            new RegExp(
                String.raw`\b${self} tidak (?:sering )?(?:sakit kepala|pusing|merasa sakit kepala)\b`,
            ),
        ],
    },
    {
        number: 2,
        questionPatterns: [
            /\bapakah (?:anda )?(?:mengalami )?(?:penurunan |kehilangan )?nafsu makan\b/,
            /\bapakah (?:anda )?tidak berselera makan\b/,
        ],
        positivePatterns: [
            new RegExp(
                String.raw`\b${self} (?:kehilangan nafsu makan|tidak (?:nafsu|berselera) makan|malas makan)\b`,
            ),
        ],
        negativePatterns: [
            new RegExp(
                String.raw`\b${self} (?:tetap |masih )?(?:nafsu makan|berselera makan)\b`,
            ),
        ],
    },
    {
        number: 3,
        questionPatterns: [
            /\bapakah (?:anda )?(?:sulit|susah) tidur(?: nyenyak)?\b/,
        ],
        positivePatterns: [
            new RegExp(
                String.raw`\b${self} (?:sulit|susah|tidak bisa) tidur\b`,
            ),
            new RegExp(String.raw`\b${self} sering terbangun\b`),
        ],
        negativePatterns: [
            new RegExp(String.raw`\b${self} tidak (?:sulit|susah) tidur\b`),
            new RegExp(String.raw`\b${self} (?:bisa tidur|tidur nyenyak)\b`),
        ],
    },
    {
        number: 4,
        questionPatterns: [
            /\bapakah (?:anda )?(?:mudah|sering) (?:merasa )?takut\b/,
        ],
        positivePatterns: [
            new RegExp(
                String.raw`\b${self} (?:mudah |sering |merasa )?(?:takut|was was|mudah kaget)\b`,
            ),
        ],
        negativePatterns: [
            new RegExp(
                String.raw`\b${self} tidak (?:mudah |sering |merasa )?(?:takut|was was)\b`,
            ),
        ],
    },
    {
        number: 5,
        questionPatterns: [
            /\bapakah (?:tangan|jari jari)(?: anda)? (?:terasa |sering )?gemetar\b/,
        ],
        positivePatterns: [
            new RegExp(
                String.raw`\b${self}(?: merasa)? (?:tangan|jari jari)(?: saya)? (?:sering )?(?:gemetar|gemeter)\b`,
            ),
            new RegExp(
                String.raw`\btangan ${self} (?:sering )?(?:gemetar|gemeter)\b`,
            ),
        ],
        negativePatterns: [
            new RegExp(
                String.raw`\b(?:tangan ${self}|${self}(?: merasa)? tangan(?: saya)?) tidak (?:gemetar|gemeter)\b`,
            ),
        ],
    },
    {
        number: 6,
        questionPatterns: [
            /\bapakah (?:anda )?(?:merasa )?(?:cemas|tegang|khawatir)\b/,
        ],
        positivePatterns: [
            new RegExp(
                String.raw`\b${self} (?:sering |merasa )?(?:cemas|tegang|khawatir|gelisah)\b`,
            ),
            new RegExp(String.raw`\b${self} merasa takut dan khawatir\b`),
        ],
        negativePatterns: [
            new RegExp(
                String.raw`\b${self} tidak (?:sering |merasa )?(?:cemas|tegang|khawatir|gelisah)\b`,
            ),
        ],
    },
    {
        number: 7,
        questionPatterns: [
            /\bapakah (?:pencernaan|pencernaan anda) (?:terasa )?buruk\b/,
            /\bapakah (?:anda )?(?:sering )?(?:mual|diare)\b/,
        ],
        positivePatterns: [
            new RegExp(
                String.raw`\b${self} (?:sering )?(?:mual|diare|mengalami gangguan pencernaan)\b`,
            ),
        ],
        negativePatterns: [
            new RegExp(
                String.raw`\b${self} tidak (?:mual|diare|mengalami gangguan pencernaan)\b`,
            ),
        ],
    },
    {
        number: 8,
        questionPatterns: [
            /\bapakah (?:anda )?(?:sulit|susah) berpikir jernih\b/,
        ],
        positivePatterns: [
            new RegExp(String.raw`\b${self} (?:sulit|susah) berpikir jernih\b`),
            new RegExp(
                String.raw`\b${self} (?:sering |merasa )?(?:linglung|sulit fokus|susah fokus)\b`,
            ),
        ],
        negativePatterns: [
            new RegExp(
                String.raw`\b${self} tidak (?:sulit|susah) berpikir jernih\b`,
            ),
            new RegExp(
                String.raw`\b${self} (?:bisa berpikir jernih|bisa fokus)\b`,
            ),
        ],
    },
    {
        number: 9,
        questionPatterns: [/\bapakah (?:anda )?(?:merasa )?tidak bahagia\b/],
        positivePatterns: [
            new RegExp(
                String.raw`\b${self} (?:merasa )?(?:tidak bahagia|sedih|hampa)\b`,
            ),
        ],
        negativePatterns: [
            new RegExp(
                String.raw`\b${self} (?:merasa )?(?:bahagia|tidak sedih)\b`,
            ),
        ],
    },
    {
        number: 10,
        questionPatterns: [
            /\bapakah (?:anda )?(?:lebih |sering )?(?:sering )?menangis\b/,
        ],
        positivePatterns: [
            new RegExp(
                String.raw`\b${self} (?:lebih |sering )?(?:sering )?(?:menangis|ingin menangis)\b`,
            ),
        ],
        negativePatterns: [
            new RegExp(
                String.raw`\b${self} tidak (?:sering )?(?:menangis|ingin menangis)\b`,
            ),
        ],
    },
    {
        number: 11,
        questionPatterns: [
            /\bapakah (?:anda )?(?:sulit|susah) menikmati kegiatan sehari hari\b/,
        ],
        positivePatterns: [
            new RegExp(
                String.raw`\b${self} (?:sulit menikmati kegiatan|tidak menikmati kegiatan|tidak tertarik dengan kegiatan)\b`,
            ),
        ],
        negativePatterns: [
            new RegExp(
                String.raw`\b${self} (?:masih |tetap )?menikmati kegiatan\b`,
            ),
        ],
    },
    {
        number: 12,
        questionPatterns: [
            /\bapakah (?:anda )?(?:kesulitan|sulit) mengambil keputusan\b/,
        ],
        positivePatterns: [
            new RegExp(
                String.raw`\b${self} (?:kesulitan|sulit|susah) (?:mengambil|membuat) keputusan\b`,
            ),
        ],
        negativePatterns: [
            new RegExp(
                String.raw`\b${self} tidak (?:kesulitan|sulit|susah) (?:mengambil|membuat) keputusan\b`,
            ),
        ],
    },
    {
        number: 13,
        questionPatterns: [
            /\bapakah hasil kerja atau tugas posko terganggu\b/,
            /\bapakah (?:hasil )?(?:kerja|tugas)(?: anda)? (?:menurun|terganggu)\b/,
        ],
        positivePatterns: [
            new RegExp(
                String.raw`\b${self}(?: merasa)? (?:kerja|tugas)(?: saya)? (?:terganggu|terbengkalai|tidak terurus)\b`,
            ),
            new RegExp(
                String.raw`\b(?:kerja|tugas) ${self} (?:terganggu|terbengkalai|tidak terurus)\b`,
            ),
        ],
        negativePatterns: [
            new RegExp(
                String.raw`\b(?:kerja|tugas) ${self} tidak (?:terganggu|terbengkalai)\b`,
            ),
        ],
    },
    {
        number: 14,
        questionPatterns: [
            /\bapakah (?:anda )?(?:merasa )?(?:tidak mampu berbuat hal bermanfaat|tidak berguna)\b/,
        ],
        positivePatterns: [
            new RegExp(
                String.raw`\b${self} (?:merasa )?(?:tidak berguna|tidak mampu (?:berbuat|melakukan) (?:hal )?bermanfaat|hanya merepotkan)\b`,
            ),
        ],
        negativePatterns: [
            new RegExp(
                String.raw`\b${self} (?:merasa )?(?:berguna|masih bisa (?:berbuat|melakukan) (?:hal )?bermanfaat)\b`,
            ),
        ],
    },
    {
        number: 15,
        questionPatterns: [
            /\bapakah (?:anda )?(?:kehilangan|minat anda hilang) (?:minat|semangat)\b/,
        ],
        positivePatterns: [
            new RegExp(
                String.raw`\b${self} (?:kehilangan minat|tidak punya minat|kehilangan semangat|tidak punya semangat)\b`,
            ),
        ],
        negativePatterns: [
            new RegExp(
                String.raw`\b${self} (?:masih |tetap )?(?:punya minat|berminat|bersemangat)\b`,
            ),
        ],
    },
    {
        number: 16,
        questionPatterns: [
            /\bapakah (?:anda )?(?:merasa )?(?:diri )?(?:tidak berharga|gagal)\b/,
        ],
        positivePatterns: [
            new RegExp(
                String.raw`\b${self} (?:merasa )?(?:tidak berharga|gagal|tidak ada artinya)\b`,
            ),
        ],
        negativePatterns: [
            new RegExp(
                String.raw`\b${self} (?:merasa )?(?:berharga|tidak gagal)\b`,
            ),
        ],
    },
    {
        number: 17,
        questionPatterns: [
            /\bapakah (?:anda )?(?:memiliki (?:pikiran|pemikiran)|pernah berpikir|ingin|mau) (?:untuk )?(?:mati|bunuh diri|mengakhiri hidup)\b/,
        ],
        positivePatterns: [
            new RegExp(String.raw`\b${self} (?:ingin|mau) mati(?: saja)?\b`),
            new RegExp(String.raw`\blebih baik ${self} mati(?: saja)?\b`),
            new RegExp(String.raw`\b${self} (?:ingin|mau) bunuh diri\b`),
            new RegExp(String.raw`\b${self} (?:ingin|mau) mengakhiri hidup\b`),
            new RegExp(String.raw`\b${self} tidak (?:mau|ingin) hidup lagi\b`),
        ],
        negativePatterns: [
            new RegExp(String.raw`\b${self} tidak (?:ingin|mau) mati\b`),
            new RegExp(String.raw`\b${self} tidak (?:ingin|mau) bunuh diri\b`),
            new RegExp(
                String.raw`\b${self} tidak (?:ingin|mau) mengakhiri hidup\b`,
            ),
        ],
    },
    {
        number: 18,
        questionPatterns: [
            /\bapakah (?:anda )?(?:merasa )?(?:lelah|capek) (?:sepanjang|setiap) waktu\b/,
        ],
        positivePatterns: [
            new RegExp(
                String.raw`\b${self} (?:merasa )?(?:lelah|capek) (?:sepanjang waktu|setiap waktu|terus menerus)\b`,
            ),
        ],
        negativePatterns: [
            new RegExp(
                String.raw`\b${self} tidak (?:merasa )?(?:lelah|capek) (?:sepanjang waktu|setiap waktu|terus menerus)\b`,
            ),
        ],
    },
    {
        number: 19,
        questionPatterns: [
            /\bapakah (?:anda )?(?:merasakan |merasa )?(?:tidak nyaman|nyeri|perih) (?:di )?(?:perut|ulu hati)\b/,
        ],
        positivePatterns: [
            new RegExp(
                String.raw`\b${self} (?:merasa |merasakan )?(?:perut (?:saya )?perih|nyeri (?:di )?ulu hati|ulu hati (?:saya )?perih)\b`,
            ),
        ],
        negativePatterns: [
            new RegExp(
                String.raw`\b${self} tidak (?:merasa |merasakan )?(?:perut (?:saya )?perih|nyeri (?:di )?ulu hati|ulu hati (?:saya )?perih)\b`,
            ),
        ],
    },
    {
        number: 20,
        questionPatterns: [
            /\bapakah (?:anda )?(?:mudah|cepat|gampang) (?:merasa )?(?:lelah|capek)\b/,
        ],
        positivePatterns: [
            new RegExp(
                String.raw`\b${self} (?:mudah|cepat|gampang) (?:merasa )?(?:lelah|capek)\b`,
            ),
            new RegExp(
                String.raw`\b${self} baru (?:bergerak|beraktivitas) sebentar (?:sudah |langsung )?(?:lelah|capek)\b`,
            ),
        ],
        negativePatterns: [
            new RegExp(
                String.raw`\b${self} tidak (?:mudah|cepat|gampang) (?:merasa )?(?:lelah|capek)\b`,
            ),
        ],
    },
];

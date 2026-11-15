export type SrqSpeechRule = {
    number: number;
    questionPatterns: readonly RegExp[];
    positivePatterns: readonly RegExp[];
    negativePatterns: readonly RegExp[];
};

// Match whole survivor statements. Anchors prevent embedded/negated/quoted
// fragments from becoming independent affirmative evidence.
function statement(expression: string): RegExp {
    // Feeling verbs may follow the outer negation; never invert its polarity.
    expression = expression.replace(/^tidak /, "tidak (?:(?:merasa|merasakan) )?");
    return new RegExp(String.raw`^(?:saya|aku) (?:(?:sering|merasa|merasakan) )?(?:${expression})$`);
}

export const srqSpeechRules: readonly SrqSpeechRule[] = [
    {
        number: 1,
        questionPatterns: [
            /\bapakah (?:anda )?(?:sering )?(?:merasa )?sakit kepala\b/,
        ],
        positivePatterns: [
            statement(String.raw`(?:sakit kepala|pusing|cekot cekot|kepala (?:terasa )?berat)`),
        ],
        negativePatterns: [
            statement(String.raw`tidak (?:sering )?(?:sakit kepala|pusing|cekot cekot|merasa sakit kepala)|kepala (?:terasa )?tidak berat`),
        ],
    },
    {
        number: 2,
        questionPatterns: [
            /\bapakah (?:anda )?(?:mengalami )?(?:penurunan |kehilangan )?nafsu makan\b/,
            /\bapakah (?:anda )?tidak berselera makan\b/,
        ],
        positivePatterns: [
            statement(String.raw`kehilangan nafsu makan|nafsu makan (?:saya )?menurun|tidak (?:nafsu|berselera|selera) makan|malas (?:banget )?(?:buat )?makan`),
        ],
        negativePatterns: [
            statement(String.raw`(?:tetap |masih )?(?:punya )?(?:nafsu makan|selera makan|berselera makan)|nafsu makan (?:saya )?tidak menurun|tidak (?:kehilangan nafsu makan|malas makan)`),
        ],
    },
    {
        number: 3,
        questionPatterns: [
            /\bapakah (?:anda )?(?:sulit|susah) tidur(?: nyenyak)?\b/,
        ],
        positivePatterns: [
            statement(String.raw`(?:sulit|susah|tidak bisa) tidur(?: nyenyak)?|sering terbangun|insomnia|melek terus|kebangun bangun`),
        ],
        negativePatterns: [
            statement(String.raw`tidak (?:sulit|susah) tidur|(?:bisa tidur(?: nyenyak)?|tidur nyenyak)|tidak (?:insomnia|sering terbangun|kebangun bangun)`),
        ],
    },
    {
        number: 4,
        questionPatterns: [
            /\bapakah (?:anda )?(?:mudah|sering) (?:merasa )?takut\b/,
        ],
        positivePatterns: [
            statement(String.raw`(?:(?:mudah |sering )?(?:merasa )?takut|was was|mudah kaget)(?: dan khawatir)?`),
        ],
        negativePatterns: [
            statement(String.raw`tidak (?:mudah |sering )?(?:merasa )?(?:takut|was was|kaget)`),
        ],
    },
    {
        number: 5,
        questionPatterns: [
            /\bapakah (?:tangan|jari jari)(?: anda)? (?:terasa |sering )?gemetar\b/,
        ],
        positivePatterns: [
            statement(String.raw`(?:tangan|jari jari)(?: saya)? (?:sering )?(?:terasa )?(?:gemetar|tremor)`),
            /^(?:tangan|jari jari) (?:saya|aku) (?:sering )?(?:terasa )?(?:gemetar|tremor)$/,
        ],
        negativePatterns: [
            statement(String.raw`(?:tangan|jari jari)(?: saya)? tidak (?:sering )?(?:gemetar|tremor)`),
            /^(?:tangan|jari jari) (?:saya|aku) tidak (?:sering )?(?:gemetar|tremor)$/,
        ],
    },
    {
        number: 6,
        questionPatterns: [
            /\bapakah (?:anda )?(?:merasa )?(?:cemas|tegang|khawatir)\b/,
        ],
        positivePatterns: [
            statement(String.raw`cemas|tegang|khawatir|gelisah|deg degan|debar debar|takut dan khawatir`),
        ],
        negativePatterns: [
            statement(String.raw`tidak (?:sering )?(?:cemas|tegang|khawatir|gelisah|deg degan|debar debar)`),
        ],
    },
    {
        number: 7,
        questionPatterns: [
            /\bapakah (?:pencernaan|pencernaan anda) (?:terasa )?buruk\b/,
            /\bapakah (?:anda )?(?:sering )?(?:mual|diare)\b/,
        ],
        positivePatterns: [
            statement(String.raw`mual|diare|(?:mengalami )?gangguan pencernaan|pencernaan (?:saya )?buruk`),
        ],
        negativePatterns: [
            statement(String.raw`tidak (?:sering )?(?:mual|diare|(?:mengalami )?gangguan pencernaan)|pencernaan (?:saya )?baik`),
        ],
    },
    {
        number: 8,
        questionPatterns: [
            /\bapakah (?:anda )?(?:sulit|susah) berpikir jernih\b/,
        ],
        positivePatterns: [
            statement(String.raw`(?:mengalami kesulitan|kesulitan|sulit|susah) (?:untuk )?(?:berpikir jernih|fokus|konsentrasi)|linglung|tidak fokus`),
        ],
        negativePatterns: [
            statement(String.raw`tidak (?:mengalami kesulitan|kesulitan|sulit|susah) (?:untuk )?(?:berpikir jernih|fokus|konsentrasi)|bisa (?:berpikir jernih|fokus)|tidak linglung`),
        ],
    },
    {
        number: 9,
        questionPatterns: [/\bapakah (?:anda )?(?:merasa )?tidak bahagia\b/],
        positivePatterns: [
            statement(String.raw`tidak bahagia|sedih|hampa|merana`),
        ],
        negativePatterns: [
            statement(String.raw`bahagia|tidak (?:sedih|hampa|merana)`),
        ],
    },
    {
        number: 10,
        questionPatterns: [
            /\bapakah (?:anda )?(?:lebih |sering )?(?:sering )?menangis\b/,
        ],
        positivePatterns: [
            statement(String.raw`(?:lebih sering |sering )?(?:menangis|nangis|mewek)(?: terus)?|ingin (?:menangis|nangis)`),
        ],
        negativePatterns: [
            statement(String.raw`tidak (?:lebih sering |sering )?(?:(?:menangis|nangis|mewek)(?: terus)?|ingin (?:menangis|nangis))`),
        ],
    },
    {
        number: 11,
        questionPatterns: [
            /\bapakah (?:anda )?(?:sulit|susah) menikmati kegiatan sehari hari\b/,
        ],
        positivePatterns: [
            statement(String.raw`(?:sulit |tidak )menikmati kegiatan(?: sehari hari)?|tidak tertarik dengan kegiatan|hobi (?:saya )?tidak (?:menarik|seru) lagi`),
        ],
        negativePatterns: [
            statement(String.raw`tidak sulit menikmati kegiatan(?: sehari hari)?|(?:masih |tetap )?menikmati kegiatan(?: sehari hari)?|(?:bisa|dapat) menikmati kegiatan(?: sehari hari)?`),
        ],
    },
    {
        number: 12,
        questionPatterns: [
            /\bapakah (?:anda )?(?:kesulitan|sulit) mengambil keputusan\b/,
        ],
        positivePatterns: [
            statement(String.raw`(?:kesulitan|sulit|susah) (?:untuk )?(?:mengambil|membuat) keputusan|bingung (?:memilih|milih)|tidak bisa (?:memutuskan|mutusin)`),
        ],
        negativePatterns: [
            statement(String.raw`tidak (?:kesulitan|sulit|susah) (?:untuk )?(?:mengambil|membuat) keputusan|bisa (?:memutuskan|mutusin)|tidak bingung (?:memilih|milih)`),
        ],
    },
    {
        number: 13,
        questionPatterns: [
            /\bapakah hasil kerja atau tugas posko terganggu\b/,
            /\bapakah (?:hasil )?(?:kerja|tugas)(?: anda)? (?:menurun|terganggu)\b/,
        ],
        positivePatterns: [
            statement(String.raw`(?:hasil )?(?:kerja|tugas)(?: sehari hari)?(?: saya)? (?:memburuk|menurun|terganggu|terbengkalai|tidak terurus)|lambat (?:mengerjakan|ngerjain) tugas`),
            /^(?:hasil )?(?:kerja|tugas)(?: sehari hari)? (?:saya|aku) (?:memburuk|menurun|terganggu|terbengkalai|tidak terurus)$/,
        ],
        negativePatterns: [
            statement(String.raw`(?:hasil )?(?:kerja|tugas)(?: sehari hari)?(?: saya)? tidak (?:memburuk|menurun|terganggu|terbengkalai)|(?:hasil )?(?:kerja|tugas)(?: sehari hari)?(?: saya)? (?:baik|terurus)`),
            /^(?:hasil )?(?:kerja|tugas)(?: sehari hari)? (?:saya|aku) tidak (?:memburuk|menurun|terganggu|terbengkalai)$/,
        ],
    },
    {
        number: 14,
        questionPatterns: [
            /\bapakah (?:anda )?(?:merasa )?(?:tidak mampu berbuat hal bermanfaat|tidak berguna)\b/,
        ],
        positivePatterns: [
            statement(String.raw`tidak berguna|tidak (?:mampu|bisa) (?:berbuat|melakukan) (?:hal (?:yang )?|sesuatu yang )?bermanfaat(?: dalam hidup)?|hanya merepotkan(?: orang lain)?|nyusahin orang(?: lain)?|tidak ada gunanya`),
        ],
        negativePatterns: [
            statement(String.raw`berguna|(?:masih )?bisa (?:berbuat|melakukan) (?:hal (?:yang )?)?bermanfaat(?: dalam hidup)?|tidak merepotkan orang lain`),
        ],
    },
    {
        number: 15,
        questionPatterns: [
            /\bapakah (?:anda )?(?:kehilangan|minat anda hilang) (?:minat|semangat)\b/,
        ],
        positivePatterns: [
            statement(String.raw`kehilangan (?:minat|semangat)(?: untuk melakukan berbagai macam hal)?|tidak (?:punya|ada) (?:minat|semangat)`),
        ],
        negativePatterns: [
            statement(String.raw`(?:masih |tetap )?(?:punya minat|berminat|bersemangat|punya semangat)|tidak kehilangan (?:minat|semangat)`),
        ],
    },
    {
        number: 16,
        questionPatterns: [
            /\bapakah (?:anda )?(?:merasa )?(?:diri )?(?:tidak berharga|gagal)\b/,
        ],
        positivePatterns: [
            statement(String.raw`(?:sebagai orang yang |diri (?:ini )?)?(?:tidak berharga|gagal|tidak ada artinya)`),
        ],
        negativePatterns: [
            statement(String.raw`(?:sebagai orang yang )?berharga|tidak gagal`),
        ],
    },
    {
        number: 17,
        questionPatterns: [
            /\bapakah (?:anda )?(?:memiliki (?:pikiran|pemikiran)|pernah berpikir|ingin|mau) (?:untuk )?(?:mati|bunuh diri|mengakhiri hidup)\b/,
        ],
        positivePatterns: [
            statement(String.raw`(?:ingin|mau) (?:mati(?: saja)?|bunuh diri|mengakhiri hidup)|tidak (?:mau|ingin) hidup lagi|(?:memiliki (?:pikiran|pemikiran)|pernah berpikir) (?:untuk )?(?:bunuh diri|mengakhiri hidup)`),
            /^lebih baik (?:saya|aku) mati(?: saja)?$/,
        ],
        negativePatterns: [
            statement(String.raw`tidak (?:ingin|mau) (?:mati|bunuh diri|mengakhiri hidup)|tidak (?:memiliki (?:pikiran|pemikiran)|pernah berpikir) (?:untuk )?(?:bunuh diri|mengakhiri hidup)`),
        ],
    },
    {
        number: 18,
        questionPatterns: [
            /\bapakah (?:anda )?(?:merasa )?(?:lelah|capek) (?:sepanjang|setiap) waktu\b/,
        ],
        positivePatterns: [
            statement(String.raw`(?:lelah|capek|lemas) (?:sepanjang waktu|setiap waktu|terus menerus|sepanjang hari)`),
        ],
        negativePatterns: [
            statement(String.raw`tidak (?:lelah|capek|lemas) (?:sepanjang waktu|setiap waktu|terus menerus|sepanjang hari)`),
        ],
    },
    {
        number: 19,
        questionPatterns: [
            /\bapakah (?:anda )?(?:merasakan |merasa )?(?:tidak nyaman|nyeri|perih) (?:di )?(?:perut|ulu hati)\b/,
        ],
        positivePatterns: [
            statement(String.raw`perut (?:saya )?(?:perih|tidak nyaman|tidak enak)|(?:perasaan )?(?:nyeri|perih|tidak nyaman) (?:di )?(?:perut|ulu hati)|ulu hati (?:saya )?(?:perih|sakit)`),
        ],
        negativePatterns: [
            statement(String.raw`tidak (?:perasaan )?(?:nyeri|perih|tidak nyaman) (?:di )?(?:perut|ulu hati)|perut (?:saya )?tidak perih|ulu hati (?:saya )?tidak (?:perih|sakit)|perut (?:saya )?nyaman`),
        ],
    },
    {
        number: 20,
        questionPatterns: [
            /\bapakah (?:anda )?(?:mudah|cepat|gampang) (?:merasa )?(?:lelah|capek)\b/,
        ],
        positivePatterns: [
            statement(String.raw`(?:mudah|cepat) (?:merasa )?(?:lelah|capek)|baru (?:bergerak|beraktivitas|gerak) sebentar (?:sudah |langsung )?(?:lelah|capek|kehabisan tenaga)`),
        ],
        negativePatterns: [
            statement(String.raw`tidak (?:mudah|cepat) (?:merasa )?(?:lelah|capek)`),
        ],
    },
];

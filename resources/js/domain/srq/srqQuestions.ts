export type SrqQuestion = {
    number: number;
    question: string;
    script: string;
    volunteerInstruction: string;
    keywords: readonly string[];
};

export const srqQuestions: readonly SrqQuestion[] = [
    {
        number: 1,
        question: "Apakah Sdr sering sakit kepala?",
        script: "Selama di posko ini, kepala Ibu/Bapak sering terasa berat, cekot-cekot, atau pusing berulang nggak?",
        volunteerInstruction:
            "Pastikan pusing bukan karena kurang minum atau terik matahari saja, melainkan pusing tegang yang terus muncul akibat pikiran tertekan.",
        keywords: ["pusing", "sakit kepala", "cekot-cekot", "kepala berat"],
    },
    {
        number: 2,
        question: "Apakah nafsu makan Sdr menurun?",
        script: "Gimana dengan makanan di posko? Apakah merasa makanan sama sekali gak enak atau rasanya males banget buat makan?",
        volunteerInstruction:
            'Centang "Ya" jika penyintas menyisakan sebagian besar porsi makan bukan karena makanan tidak cocok, melainkan karena memang kehilangan selera makan.',
        keywords: [
            "gak nafsu makan",
            "males makan",
            "makanan gak masuk",
            "gak selera",
        ],
    },
    {
        number: 3,
        question: "Apakah Sdr tidak bisa tidur nyenyak?",
        script: "Malam-malam kalau mau tidur susah nggak? Atau sering kebangun terus gak bisa tidur lagi?",
        volunteerInstruction:
            "Bedakan antara tidak bisa tidur karena tempatnya berisik/panas dengan tidak bisa tidur karena pikiran berputar atau cemas.",
        keywords: [
            "gak bisa tidur",
            "insomnia",
            "melek terus",
            "kebangun-bangun",
        ],
    },
    {
        number: 4,
        question: "Apakah Sdr mudah merasa takut?",
        script: "Belakangan ini, apakah Ibu/Bapak gampang kaget atau merasa was-was/takut tiba-tiba padahal situasi lagi aman?",
        volunteerInstruction:
            "Amati respon refleks penyintas terhadap suara keras mendadak di posko (misal: suara helikopter, sirine, atau barang jatuh).",
        keywords: ["takut", "was-was", "gampang kaget", "kawatir"],
    },
    {
        number: 5,
        question: "Apakah tangan Sdr gemetar?",
        script: "Apakah tangan atau jari-jari Ibu/Bapak sering terasa gemetar sendiri pas lagi duduk atau ngobrol?",
        volunteerInstruction:
            "Dapat diisi via observasi langsung. Perhatikan apakah jari/tangan penyintas tampak tremor (gemetar) saat memegang gelas, memegang HP, atau saat diajak bicara.",
        keywords: ["gemetar", "dég-dégan", "tremor", "tangan gemeter"],
    },
    {
        number: 6,
        question: "Apakah Sdr merasa cemas, tegang, atau khawatir?",
        script: "Dada rasanya sering debar-debar, tegang, atau ganjel karena kepikiran terus nggak?",
        volunteerInstruction:
            'Kata "ganjel di dada" atau "deg-degan" adalah bahasa awam yang paling sering menggambarkan kondisi cemas.',
        keywords: ["cemas", "tegang", "dada sesek", "deg-degan", "gelisah"],
    },
    {
        number: 7,
        question: "Apakah pencernaan Sdr buruk?",
        script: "Perutnya sering terasa mual, melilit, atau bolak-balik diare tanpa sebab yang jelas nggak?",
        volunteerInstruction:
            "Tanyakan apakah keluhan pencernaan ini timbul terutama saat rasa cemas atau ingatan bencana muncul (reaksi psikosomatik).",
        keywords: ["mual", "diare", "pencernaan ganggu", "perut melilit"],
    },
    {
        number: 8,
        question: "Apakah Sdr mengalami kesulitan untuk berpikir jernih?",
        script: "Rasanya kepalanya kayak penuh banget atau 'linglung', sampai susah konsentrasi pas diajak ngobrol?",
        volunteerInstruction:
            "Perhatikan apakah penyintas sering melamun, tampak bingung, atau meminta pertanyaan diulang berintegrasi dengan gejala kognitif.",
        keywords: ["linglung", "bingung", "gak fokus", "pikirannya kosong"],
    },
    {
        number: 9,
        question: "Apakah Sdr merasa tidak bahagia?",
        script: "Secara umum, rasanya sedih dan hampa banget ya perasaan Ibu/Bapak belakangan ini?",
        volunteerInstruction:
            "Amati nada suara yang lesu dan ekspresi wajah penyintas saat menjawab.",
        keywords: ["sedih", "hampa", "gak bahagia", "merana"],
    },
    {
        number: 10,
        question: "Apakah Sdr lebih sering menangis dari biasanya?",
        script: "Apakah belakangan ini rasanya pengen menangis terus, atau mendadak nangis tanpa bisa ditahan?",
        volunteerInstruction:
            "Validasi emosi penyintas. Jangan melarang mereka menangis saat wawancara berlangsung.",
        keywords: ["nangis terus", "pengen nangis", "menangis", "mewek"],
    },
    {
        number: 11,
        question: "Apakah Sdr sulit menikmati kegiatan sehari-hari?",
        script: "Hal-hal yang biasanya bikin senang (kayak ngobrol sama tetangga, nonton, atau main sama anak), sekarang rasanya udah gak menarik lagi nggak?",
        volunteerInstruction:
            "Amati apakah penyintas cenderung mengisolasi diri di sudut posko dan enggan bersosialisasi.",
        keywords: ["gak seru lagi", "males ngapa-ngapain", "gak hobi lagi"],
    },
    {
        number: 12,
        question: "Apakah Sdr merasa kesulitan untuk mengambil keputusan?",
        script: "Buat milih atau memutuskan hal sepele aja (misal: mau makan apa, mau mandi jam berapa), rasanya bingung dan berat banget nggak?",
        volunteerInstruction:
            "Fokus pada keraguan berlebih untuk melakukan tindakan atau pilihan sederhana sehari-hari.",
        keywords: ["bingung milih", "gak bisa mutusin", "ragu-ragu terus"],
    },
    {
        number: 13,
        question: "Apakah hasil kerja sehari-hari Sdr memburuk?",
        script: "Apakah tugas sehari-hari di posko terasa lambat banget selesainya atau sering terbengkalai?",
        volunteerInstruction:
            "Nilai keberfungsian dasar penyintas dalam menjaga kebersihan diri, merawat anak, atau merapikan tenda.",
        keywords: ["gak keurus", "tugas terbengkalai", "lambat ngerjainnya"],
    },
    {
        number: 14,
        question:
            "Apakah Sdr merasa tidak bisa melakukan hal yang bermanfaat dalam hidup?",
        script: "Apakah Ibu/Bapak merasa belakangan ini gak bisa berbuat apa-apa dan cuma bikin repot orang lain aja?",
        volunteerInstruction:
            "Dengarkan ungkapan keputusasaan atau rasa bersalah (survivor's guilt) atas bencana yang terjadi.",
        keywords: ["gak berguna", "nyusahin orang", "gak ada gunanya"],
    },
    {
        number: 15,
        question:
            "Apakah Sdr kehilangan minat untuk melakukan berbagai macam hal?",
        script: "Apakah rasanya udah kehilangan semangat total buat ngelakuin kegiatan apa pun hari ini?",
        volunteerInstruction:
            "Bedakan dengan nomor 11; nomor 15 lebih berfokus pada kehilangan dorongan energi/inisiatif (apati).",
        keywords: ["hilang minat", "males semua", "gak ada semangat"],
    },
    {
        number: 16,
        question: "Apakah Sdr merasa sebagai orang yang tidak berharga?",
        script: "Pernah merasa kalau keberadaan Ibu/Bapak ini udah gak ada harganya atau merasa diri ini gagal?",
        volunteerInstruction:
            "Perhatikan tanda-tanda devaluasi diri yang mendalam (low self-esteem).",
        keywords: ["gak berharga", "diri saya gagal", "gak ada artinya"],
    },
    {
        number: 17,
        question: "Apakah Sdr memiliki pemikiran untuk mengakhiri hidup?",
        script: "Dalam kondisi seberat ini, pernah nggak terlintas di pikiran Ibu/Bapak perasaan pengen nyerah aja, atau pikiran buat ngakhiri hidup?",
        volunteerInstruction:
            "Relawan diinstruksikan tetap mendampingi penyintas secara fisik",
        keywords: [
            "mati",
            "bunuh diri",
            "nyerah",
            "nyusul",
            "diakhirin aja",
            "gak mau hidup",
        ],
    },
    {
        number: 18,
        question: "Apakah Sdr merasa lelah sepanjang waktu?",
        script: "Badan dan pikiran rasanya lemes dan capek banget nggak sepanjang hari, padahal gak lagi kerja berat?",
        volunteerInstruction:
            "Fokus pada rasa lelah emosional/fisik yang menetap (fatigue) meski sudah beristirahat.",
        keywords: ["lelah terus", "capek banget", "badan lemes"],
    },
    {
        number: 19,
        question: "Apakah Sdr merasakan perasaan tidak nyaman di perut?",
        script: "Apakah perut sering terasa ganjel, perih di ulu hati, atau kayak ada rasa kebat/melilit yang bikin gak nyaman?",
        volunteerInstruction:
            "Melengkapi pertanyaan nomor 7, fokus pada rasa tidak nyaman fisik umum di area abdomen akibat stres.",
        keywords: ["ulu hati sakit", "perut gak enak", "perih perut"],
    },
    {
        number: 20,
        question: "Apakah Sdr mudah merasa lelah?",
        script: "Baru gerak atau ngerjain hal kecil sebentar aja, rasanya langsung kehabisan tenaga dan capek banget nggak?",
        volunteerInstruction:
            "Menilai penurunan daya tahan fisik akibat beban psikologis.",
        keywords: ["gampang capek", "cepet lelah", "tenaga habis"],
    },
];

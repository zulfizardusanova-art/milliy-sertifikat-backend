import type { Question } from '../types';

export interface AttestationSubjectOption {
  id: string;
  label: string;
  description: string;
}

export const ATTESTATION_SUBJECTS: AttestationSubjectOption[] = [
  {
    id: 'matematika',
    label: 'Matematika (50 savol)',
    description:
      '35 ta mutaxassislik fani + 5 ta kasb standarti + 10 ta pedagogika va psixologiya (120 daqiqa, 100 ball)',
  },
  {
    id: 'pedagogika',
    label: 'Pedagogika va Psixologiya (50 savol)',
    description:
      '35 ta pedagogika va psixologiya + 5 ta kasb standarti + 10 ta zamonaviy ta’lim metodikasi (120 daqiqa)',
  },
  {
    id: 'fizika',
    label: 'Fizika va Metodika (50 savol)',
    description:
      '35 ta fizika mutaxassislik + 5 ta kasb standarti + 10 ta pedagogika va psixologiya (120 daqiqa)',
  },
  {
    id: 'ona_tili',
    label: 'Ona tili va Adabiyot (50 savol)',
    description:
      '35 ta ona tili va adabiyot + 5 ta kasb standarti + 10 ta pedagogika va psixologiya (120 daqiqa)',
  },
  {
    id: 'informatika',
    label: 'Informatika va AT (50 savol)',
    description:
      '35 ta informatika va dasturlash + 5 ta kasb standarti + 10 ta pedagogika va psixologiya (120 daqiqa)',
  },
];

type BankItem = Omit<Question, 'n'>;

const KASB_STANDARTI: BankItem[] = [
  {
    k: 'mc',
    topic: 'Kasb standarti',
    s: 'Umumiy o‘rta ta’lim muassasasi o‘qituvchisining kasbiy standartiga muvofiq darsni rejalashtirishda birinchi navbatda nimaga asoslanish lozim?',
    o: [
      'Faqat darslikdagi mashqlar tartibiga',
      'Davlat ta’lim standarti, o‘quv dasturi maqsadlari va o‘quvchilarning yosh xususiyatlariga',
      'O‘tgan yilgi tayyor konspektga',
      'Faqat choraklik nazorat ishi jadvaliga',
    ],
    c: 1,
    explanation:
      'Kasbiy standartga ko‘ra rejalashtirish DTS, o‘quv maqsadlari va sinfdagi o‘quvchilarning individual imkoniyatlariga tayanadi.',
  },
  {
    k: 'mc',
    topic: 'Kasb standarti',
    s: 'O‘qituvchining kasbiy standartidagi "xavfsiz va qo‘llab-quvvatlovchi ta’lim muhitini yaratish" kompetensiyasi nimani nazarda tutadi?',
    o: [
      'Darsda mutlaq sukunatni majburiy joriy etish',
      'Jismoniy va psixologik xavfsizlikni ta’minlash, bullingning oldini olish va teng imkoniyat yaratish',
      'Faqat a’lochi o‘quvchilarni oldingi partaga o‘tqazish',
      'Sinf xonasini faqat bezaklar bilan jihozlash',
    ],
    c: 1,
    explanation:
      'Xavfsiz ta’lim muhiti har bir o‘quvchining sha’ni, psixologik osoyishtaligi va teng huquqli ishtirokini kafolatlaydi.',
  },
  {
    k: 'mc',
    topic: 'Kasb standarti',
    s: 'Pedagogik etika va kasbiy standart talablariga ko‘ra, o‘quvchi darsda xato javob berganda o‘qituvchi qanday yo‘l tutishi to‘g‘ri?',
    o: [
      'O‘quvchining shaxsiyatiga tegmasdan, xatoning sababini tushuntirib, konstruktiv teskari aloqa berishi',
      'Sinf oldida tanbeh berib, bahosini darhol pasaytirishi',
      'Javobni e’tiborsiz qoldirib, keyingi o‘quvchiga o‘tishi',
      'Ota-onaga shikoyat xati yozishi',
    ],
    c: 0,
    explanation:
      'Konstruktiv teskari aloqa o‘quvchida o‘ziga ishonch va xatodan o‘rganish madaniyatini shakllantiradi.',
  },
  {
    k: 'mc',
    topic: 'Kasb standarti',
    s: 'Kasbiy standartga ko‘ra o‘qituvchining ota-onalar (qonuniy vakillar) bilan hamkorligining asosiy maqsadi nima?',
    o: [
      'Faqat sinf fondini yig‘ishni tashkil etish',
      'O‘quvchining ta’lim natijalari va shaxsiy rivojlanishini birgalikda qo‘llab-quvvatlash',
      'O‘quvchilar ustidan ma’muriy nazorat o‘rnatish',
      'Ota-onalarga uy vazifalarini topshirish',
    ],
    c: 1,
    explanation:
      'Maktab va oila hamkorligi o‘quvchining o‘zlashtirishi hamda tarbiyaviy rivojlanishini qo‘llab-quvvatlashga xizmat qiladi.',
  },
  {
    k: 'mc',
    topic: 'Kasb standarti',
    s: 'O‘qituvchining uzluksiz kasbiy rivojlanishi (malaka oshirish) kasbiy standartda qanday baholanadi?',
    o: [
      'O‘z faoliyatini refleksiya qilish, zamonaviy metodikalarni o‘zlashtirish va hamkasblar bilan tajriba almashish',
      'Faqat 5 yilda bir marta kursga borib kelish bilan kifoyalanish',
      'Faqat hujjatlarni elektron shaklda saqlash',
      'Dars soatlarini ko‘paytirish',
    ],
    c: 0,
    explanation:
      'Doimiy refleksiya, o‘z ustida ishlash va kasbiy hamjamiyatda tajriba almashish kasbiy standartning muhim tarkibiy qismidir.',
  },
  {
    k: 'mc',
    topic: 'Kasb standarti',
    s: 'O‘zbekiston pedagog kadrlar attestatsiyasida 100 ballik tizim bo‘yicha "Oliy malaka toifasi" berilishi uchun kamida necha ball to‘plash talab etiladi?',
    o: ['70 ball', '75 ball', '80 ball', '86 ball'],
    c: 2,
    explanation:
      'Rasmiy attestatsiya mezonlariga ko‘ra 80 va undan yuqori ball — Oliy toifa, 70–79 — Birinchi toifa, 60–69 — Ikkinchi toifa.',
  },
];

const PEDAGOGIKA: BankItem[] = [
  {
    k: 'mc',
    topic: 'Pedagogik mahorat',
    s: 'O‘quvchilarning dars jarayonidagi faolligini baholashda "formativ baholash"ning asosiy maqsadi nima?',
    o: [
      'Chorak oxirida yakuniy baho qo‘yish',
      'O‘qish jarayonini doimiy kuzatish va teskari aloqa orqali o‘quvchiga yordam berish',
      'Faqat iqtidorli o‘quvchilarni saralash',
      'Ota-onalar uchun reyting jadvali tuzish',
    ],
    c: 1,
    explanation:
      'Formativ (shakllantiruvchi) baholash ta’lim jarayonining o‘zida o‘quvchining bo‘shliqlarini aniqlab, o‘z vaqtida ko‘mak berishga qaratiladi.',
  },
  {
    k: 'mc',
    topic: 'Baholash tizimi',
    s: 'Summativ baholash (BSB/CHSB) formativ baholashdan nimasi bilan farq qiladi?',
    o: [
      'Faqat og‘zaki so‘rov shaklida o‘tkaziladi',
      'Mavzu, bob yoki chorak yakunida o‘quvchining erishgan umumiy natijasini qayd etadi',
      'O‘quvchiga hech qanday ball qo‘yilmaydi',
      'Faqat darsning boshida qo‘llaniladi',
    ],
    c: 1,
    explanation:
      'Summativ baholash ma’lum o‘quv davri yoki bob yakunida standartlarning o‘zlashtirilganlik darajasini o‘lchaydi.',
  },
  {
    k: 'mc',
    topic: 'Blum taksonomiyasi',
    s: 'Blum taksonomiyasiga ko‘ra, o‘quvchining o‘rgangan qoidani yangi amaliy masalada qo‘llay olishi qaysi darajaga kiradi?',
    o: ['Bilish', 'Tushunish', 'Qo‘llash', 'Tahlil qilish'],
    c: 2,
    explanation:
      'Olingan bilim va formulalarni yangi vaziyatda ishlata olish "Qo‘llash" (Application) bosqichidir.',
  },
  {
    k: 'mc',
    topic: 'Blum taksonomiyasi',
    s: 'Yangilangan Blum taksonomiyasida eng yuqori kognitiv bosqich qaysi?',
    o: ['Tushunish', 'Tahlil qilish', 'Baholash', 'Yaratish (Kreativlik)'],
    c: 3,
    explanation:
      'Anderson va Kratvol tahriridagi taksonomiya zinasining eng yuqori darajasi — Yaratish (Creating).',
  },
  {
    k: 'mc',
    topic: 'Didaktika',
    s: 'Darsning "4K" modeli tarkibiga kirmaydigan ko‘nikmani ko‘rsating:',
    o: [
      'Kommunikatsiya',
      'Kreativ fikrlash',
      'Kollaboratsiya (hamkorlik)',
      'Konspektlashtirish (mexanik ko‘chirish)',
    ],
    c: 3,
    explanation:
      'Zamonaviy 4K modeli: Kritik fikrlash, Kreativlik, Kommunikatsiya va Kollaboratsiya.',
  },
  {
    k: 'mc',
    topic: 'Inklyuziv ta’lim',
    s: 'Alohida ta’lim ehtiyojlari bo‘lgan o‘quvchi sinfda boshqalar bilan birga ta’lim olishi uchun o‘qituvchi birinchi navbatda qanday yondashuvni qo‘llashi lozim?',
    o: [
      'O‘quvchini boshqa sinfga o‘tkazish',
      'Differensial (tabaqalashtirilgan) topshiriqlar va individual moslashuvchan muhit yaratish',
      'Faqat nazorat ishlari berish',
      'Uyga vazifani butunlay bekor qilish',
    ],
    c: 1,
    explanation:
      'Inklyuziv sinfda har bir o‘quvchining imkoniyatiga mos differensial topshiriq va qo‘llab-quvvatlovchi muhit yaratiladi.',
  },
  {
    k: 'mc',
    topic: 'Metodika',
    s: 'STEAM yondashuvi qaysi fanlarni integratsiyalashga asoslanadi?',
    o: [
      'Tarix, huquq, falsafa va jismoniy tarbiya',
      'Fan, texnologiya, muhandislik, san’at va matematika',
      'Faqat matematika va fizika',
      'Xorijiy tillar va adabiyot',
    ],
    c: 1,
    explanation: 'STEAM: Science, Technology, Engineering, Arts, Mathematics.',
  },
  {
    k: 'mc',
    topic: 'Psixologiya',
    s: 'L. S. Vigotskiy tomonidan kiritilgan "Yaqin rivojlanish zonasi" tushunchasi nimani anglatadi?',
    o: [
      'O‘quvchining mustaqil bajara oladigan va kattalar/tengdoshlar ko‘magida bajara oladigan vazifalari orasidagi soha',
      'Faqat maktabgacha yoshdagi bolalarning nutq rivoji',
      'O‘quvchining yodlab olgan ma’lumotlar hajmi',
      'Sinf xonasining jismoniy o‘lchamlari',
    ],
    c: 0,
    explanation:
      'Yaqin rivojlanish zonasi (ZPD) ta’limning samaradorligini ko‘rsatib, o‘quvchiga ko‘mak (scaffolding) berish nuqtasini belgilaydi.',
  },
  {
    k: 'mc',
    topic: 'Xalqaro tadqiqotlar',
    s: 'PISA xalqaro baholash dasturi kimlar va qaysi ko‘nikmalarni baholashga qaratilgan?',
    o: [
      '4-sinf o‘quvchilarining husnixatini',
      '15 yoshli o‘quvchilarning o‘qish, matematika va tabiiy-ilmiy savodxonligini',
      'Faqat oliy ta’lim talabalarining kasbiy bilimlarini',
      'Maktab direktorlarining boshqaruv mahoratini',
    ],
    c: 1,
    explanation:
      'PISA 15 yoshli o‘quvchilarning hayotiy vaziyatlarda bilimlarini qo‘llay olish savodxonligini tekshiradi.',
  },
  {
    k: 'mc',
    topic: 'Interaktiv metodlar',
    s: '"Aqliy hujum" (Brainstorming) metodini darsda o‘tkazishning eng muhim qoidasi qaysi?',
    o: [
      'G‘oyalarni aytilishi bilanoq tanqid qilish va xatolarni ko‘rsatish',
      'Bildirilgan fikrlarni tanqid qilmasdan barcha g‘oyalarni qayd etib borish',
      'Faqat bitta to‘g‘ri javobni aytgan o‘quvchini tinglash',
      'Vaqtni cheklamasdan bir o‘quvchiga so‘z berish',
    ],
    c: 1,
    explanation:
      'Aqliy hujumning bosh tamoyili — fikrlar oqimini to‘xtatmaslik uchun dastlabki bosqichda tanqiddan tiyilishdir.',
  },
  {
    k: 'mc',
    topic: 'Dars tuzilishi',
    s: 'Tanqidiy fikrlashni rivojlantirish texnologiyasining uch bosqichli modeli qaysi qatorda to‘g‘ri berilgan?',
    o: [
      'Tekshirish — Baholash — Jazolash',
      'Chaqiruv (Evocation) — Anglash (Realization) — Fikrlash/Refleksiya (Reflection)',
      'Kirish — Uy vazifasi — Xulosa',
      'Tushuntirish — Yodlash — Imtihon',
    ],
    c: 1,
    explanation:
      'Tanqidiy fikrlash texnologiyasi Chaqiruv, Anglash va Refleksiya bosqichlaridan iborat.',
  },
  {
    k: 'mc',
    topic: 'Motivatsiya',
    s: 'O‘quvchida "ichki motivatsiya"ni shakllantirish uchun qaysi pedagogik usul eng samarali hisoblanadi?',
    o: [
      'Faqat qattiq intizom va jarima choralarini qo‘llash',
      'Mavzuni hayotiy muammolar bilan bog‘lash va o‘quvchiga tanlov hamda muvaffaqiyat hissini berish',
      'Har darsda faqat test yechtirish',
      'Boshqa sinf o‘quvchilari bilan doimiy taqqoslash',
    ],
    c: 1,
    explanation:
      'O‘quvchi o‘rganayotgan bilimining hayotiy ahamiyatini his qilsa va o‘z tanloviga ega bo‘lsa, ichki qiziqish kuchayadi.',
  },
];

const PEDAGOGIKA_SPECIALTY_EXTRA: BankItem[] = [
  {
    k: 'mc',
    topic: 'Pedagogika nazariyasi',
    s: 'Ta’limning "ko‘rgazmalilik" tamoyili ilk bor qaysi buyuk pedagog tomonidan "Buyuk didaktika" asarida asoslab berilgan?',
    o: ['Ya. A. Komenskiy', 'I. G. Pestalotssi', 'A. Disterveg', 'J. J. Russo'],
    c: 0,
    explanation:
      'Yan Amos Komenskiy "Buyuk didaktika" asarida ko‘rgazmalilikni "didaktikaning oltin qoidasi" deb atagan.',
  },
  {
    k: 'mc',
    topic: 'O‘zbek pedagogikasi',
    s: '"Turkiy guliston yoxud axloq" asarining muallifi kim?',
    o: ['Mahmudxo‘ja Behbudiy', 'Abdulla Avloniy', 'Munavvarqori Abdurashidxonov', 'Hamza Hakimzoda Niyoziy'],
    c: 1,
    explanation:
      'Abdulla Avloniy 1913-yilda yozilgan "Turkiy guliston yoxud axloq" asarida tarbiya va axloq masalalarini yoritgan.',
  },
  {
    k: 'mc',
    topic: 'Metodika',
    s: '"Klaster" (tarmoqlash) grafik organayzeri o‘quvchilarda qaysi ko‘nikmani rivojlantiradi?',
    o: [
      'Tushunchalar o‘rtasidagi mantiqiy bog‘liqliklarni tizimlashtirish va assotsiativ fikrlashni',
      'Faqat formulalarni mexanik yodlashni',
      'Matnni tez ko‘chirib yozishni',
      'Og‘zaki nutq tezligini o‘lchashni',
    ],
    c: 0,
    explanation:
      'Klaster asosiy tushuncha atrofidagi bog‘liq g‘oyalarni tizimli tarzda birlashtirishga yordam beradi.',
  },
  {
    k: 'mc',
    topic: 'Psixologiya',
    s: 'O‘smirlik davri (11–15 yosh) psixologiyasidagi yetakchi faoliyat turi qaysi?',
    o: [
      'Rollarga kirishib o‘ynash',
      'Tengdoshlar bilan shaxsiy-intimo muloqot va o‘zini anglash',
      'Faqat buyumlar bilan manipulyatsiya',
      'Kasbiy mehnat faoliyati',
    ],
    c: 1,
    explanation:
      'D. B. Elkonin davrlashtirishiga ko‘ra, o‘smirlik davrida tengdoshlar jamoasidagi muloqot yetakchi o‘rin tutadi.',
  },
  {
    k: 'mc',
    topic: 'Xalqaro tadqiqotlar',
    s: 'TIMSS xalqaro tadqiqoti qaysi sinf o‘quvchilarining matematika va tabiiy fanlar bo‘yicha bilim darajasini baholaydi?',
    o: ['1- va 2-sinf', '4- va 8-sinf', '7- va 11-sinf', 'Faqat 9-sinf'],
    c: 1,
    explanation: 'TIMSS tadqiqoti har 4 yilda 4- va 8-sinf o‘quvchilari o‘rtasida o‘tkaziladi.',
  },
  {
    k: 'mc',
    topic: 'Xalqaro tadqiqotlar',
    s: 'PIRLS xalqaro tadqiqoti nimani baholaydi?',
    o: [
      '4-sinf o‘quvchilarining matnni o‘qish va tushunish savodxonligini',
      '8-sinf o‘quvchilarining informatika bilimlarini',
      '10-sinf o‘quvchilarining jismoniy tayyorgarligini',
      'O‘qituvchilarning ingliz tili darajasini',
    ],
    c: 0,
    explanation:
      'PIRLS (Progress in International Reading Literacy Study) boshlang‘ich sinf bitiruvchilarining o‘qib tushunish sifatini o‘rganadi.',
  },
  {
    k: 'mc',
    topic: 'Baholash mezonlari',
    s: 'Rubrika (baholash mezoni jadvali) darsda nima uchun qo‘llaniladi?',
    o: [
      'O‘quvchining ishini shaffof, aniq mezonlar asosida obyektiv baholash uchun',
      'Dars vaqtini qisqartirish uchun',
      'O‘quvchilarni darsdan chetlatish uchun',
      'Faqat yozma ishlarni tekshirmaslik uchun',
    ],
    c: 0,
    explanation:
      'Rubrika o‘quvchiga ham, o‘qituvchiga ham sifat mezonlarini oldindan aniq ko‘rsatadi.',
  },
  {
    k: 'mc',
    topic: 'Ta’lim qonunchiligi',
    s: 'O‘zbekiston Respublikasining "Ta’lim to‘g‘risida"gi Qonuniga ko‘ra, umumiy o‘rta ta’lim necha yil davom etadi?',
    o: ['9 yil', '10 yil', '11 yil', '12 yil'],
    c: 2,
    explanation:
      'Yangi tahrirdagi "Ta’lim to‘g‘risida"gi Qonunga muvofiq umumiy o‘rta ta’lim I–XI sinflarni (11 yil) o‘z ichiga oladi.',
  },
  {
    k: 'mc',
    topic: 'Metodika',
    s: '"Teskari sinf" (Flipped Classroom) texnologiyasining mohiyati nimadan iborat?',
    o: [
      'O‘quvchilar nazariy materialni uyda video/matn orqali o‘rganib keladi, darsda esa amaliy mashq va muhokama bajariladi',
      'O‘qituvchi uyda o‘tirib dars o‘tadi',
      'Uyga vazifa umuman berilmaydi',
      'Dars faqat imtihon olishdan iborat bo‘ladi',
    ],
    c: 0,
    explanation:
      'Flipped Classroom modelida dars vaqti faol amaliyot va chuqur tushunishga sarflanadi.',
  },
  {
    k: 'mc',
    topic: 'Tarbiya nazariyasi',
    s: 'Sinfdagi nizoli vaziyatni hal qilishda o‘qituvchining eng konstruktiv pozitsiyasi qaysi?',
    o: [
      'Har ikki tomonni tinglab, ayblovsiz muloqot (mediatsiya) orqali yechim izlash',
      'Birinchi bo‘lib shikoyat qilgan o‘quvchining yonini olish',
      'Ikkala o‘quvchini sinfdan chiqarib yuborish',
      'Muammoni e’tiborsiz qoldirish',
    ],
    c: 0,
    explanation:
      'Pedagogik mediatsiya tomonlarni eshitish va o‘zaro hurmat asosida kelishuvga erishishga yordam beradi.',
  },
];

function buildPedagogikaDynamic(needed: number): BankItem[] {
  const scenarios: BankItem[] = [
    {
      k: 'mc',
      topic: 'Pedagogik vaziyat',
      s: 'Dars jarayonida bir guruh o‘quvchilar topshiriqni muddatidan oldin bajarib bo‘ldi, qolganlar esa hali davom etmoqda. O‘qituvchining eng to‘g‘ri harakati qaysi?',
      o: [
        'Tez bajargan o‘quvchilarga chuqurlashtirilgan qo‘shimcha ijodiy topshiriq berish',
        'Qolgan o‘quvchilarni shoshirib, ishlarini to‘xtatish',
        'Tez bajarganlarga dars tugaguncha telefon o‘ynashga ruxsat berish',
        'Barcha o‘quvchilarning bahosini pasaytirish',
      ],
      c: 0,
      explanation:
        'Differensial yondashuvga ko‘ra tez o‘zlashtiruvchi o‘quvchilarga kengaytirilgan/ijodiy topshiriqlar taklif etiladi.',
    },
    {
      k: 'mc',
      topic: 'Didaktik tamoyillar',
      s: 'Yangi mavzuni o‘tishda o‘qituvchi avval o‘quvchilarning oldingi bilimlarini eslatib, so‘ngra murakkabroq tushunchalarga o‘tdi. Bu qaysi tamoyil?',
      o: [
        'Izchillik va tizimlilik tamoyili',
        'Tasodifiylik tamoyili',
        'Faqat nazorat tamoyili',
        'Statik yondashuv',
      ],
      c: 0,
      explanation:
        'Oddiydan murakkabga, ma’lumdan noma’lumga o‘tish izchillik va tizimlilik tamoyilining asosidir.',
    },
    {
      k: 'mc',
      topic: 'Guruhli ish',
      s: 'Kichik guruhlarda ishlashda barcha a’zolarning faol qatnashishini ta’minlash uchun nima qilish samarali?',
      o: [
        'Har bir guruh a’zosiga aniq rol (lider, kotib, vaqt nazoratchisi, ma’ruzachi) taqsimlash',
        'Guruhga faqat bitta vazifa berib, rollarni belgilamaslik',
        'Guruh tarkibini faqat a’lochilardan tuzish',
        'Guruh ishini baholamaslik',
      ],
      c: 0,
      explanation:
        'Rollarning taqsimlanishi har bir o‘quvchida shaxsiy mas’uliyat va ishtirokni ta’minlaydi.',
    },
    {
      k: 'mc',
      topic: 'Refleksiya',
      s: 'Dars yakunida o‘tkaziladigan "3-2-1" yoki "Chiqish chiptasi" (Exit ticket) usulining maqsadi nima?',
      o: [
        'O‘quvchilar mavzudan nimani tushungani va nimada qiynalayotganini tezkor aniqlash',
        'Sinf xonasini tozalash navbatini belgilash',
        'Keyingi darsga kelmaslik sabablarini yozish',
        'Faqat uy vazifasini ko‘paytirish',
      ],
      c: 0,
      explanation:
        'Chiqish chiptasi dars yakunidagi formativ refleksiya vositasi bo‘lib, keyingi darsni rejalashtirishga yordam beradi.',
    },
    {
      k: 'mc',
      topic: 'Psixologiya',
      s: 'O‘quvchining diqqatini darsning birinchi daqiqalarida jalb qilish uchun eng samarali usul qaysi?',
      o: [
        'Qiziqarli muammoli savol, hayotiy fakt yoki kutilmagan tajriba bilan boshlash',
        '15 daqiqa davomida davomat va tashkiliy tanbehlar bilan shug‘ullanish',
        'Darhol murakkab nazorat ishi tarqatish',
        'Darslikni ovoz chiqarmasdan o‘qitish',
      ],
      c: 0,
      explanation:
        'Muammoli vaziyat (hook) o‘quvchilarda qiziquvchanlik uyg‘otib, diqqatni darhol mavzuga yo‘naltiradi.',
    },
    {
      k: 'mc',
      topic: 'Metodika',
      s: '"Insert" texnologiyasi o‘quvchilarga matn bilan ishlashda qanday imkoniyat beradi?',
      o: [
        'Matn chetiga shartli belgilar (+, -, ?, !) qo‘yib, tushunish darajasini ongli tahlil qilish',
        'Matnni so‘zma-so‘z yodlash',
        'Matndagi faqat tinish belgilarini sanash',
        'Matnni tarjima qilish',
      ],
      c: 0,
      explanation:
        'INSERT belgilar tizimi o‘quvchining o‘qish jarayonida faol fikrlashi va savol qo‘yishini ta’minlaydi.',
  },
  ];

  // Expand cleanly with distinct pedagogical case studies if more needed
  const topics = [
    ['Venn diagrammasi', 'ikki obyektning o‘xshash va farqli jihatlarini solishtirish', 'taqqoslash va tahlil qilish'],
    ['Baliq skeleti (Ishikava)', 'muammoning sabab va oqibatlarini tizimli aniqlash', 'sabab-oqibat tahlili'],
    ['BBB (Bilaman / Bilishni xohlayman / Bilib oldim)', 'oldingi bilimni faollashtirish va yangi bilimni bog‘lash', 'metakognitiv kuzatuv'],
    ['Sinkveyn', 'mavzu bo‘yicha 5 qatorli qisqa xulosa tuzish', 'umumlashtirish va sintez'],
    ['Zigzag (Arra) metodi', 'katta matnni qismlarga bo‘lib o‘zaro o‘rgatish', 'tengdoshlar hamkorligi'],
    ['Debat texnologiyasi', 'dalillarga tayanib qarashlarni himoya qilish', 'argumentatsiya va nutq'],
    ['Loyiha metodi', 'amaliy mahsulot yoki tadqiqot yaratish', 'mustaqil izlanish'],
    ['Keys-stadi (Case study)', 'real hayotiy vaziyatni guruhda tahlil qilish', 'muammoli yechim topish'],
    ['Skaffolding (Qo‘llab-quvvatlash)', 'bosqichma-bosqich ko‘mak berib mustaqillikka olib chiqish', 'o‘quvchini mustaqillashtirish'],
    ['Gamifikatsiya', 'darsga o‘yin elementlari va bosqichma-bosqich maqsadlar kiritish', 'faollik va qiziqishni oshirish'],
    ['Portfolioga asoslangan baholash', 'o‘quvchining davr mobaynidagi eng yaxshi ishlarini jamlash', 'dinamik rivojlanishni ko‘rish'],
    ['Kross-savollar', 'o‘quvchilarning bir-biriga mavzu yuzasidan savol berishi', 'faol muloqot va tekshiruv'],
    ['Mind-map (Aql xaritasi)', 'mavzuni markaziy g‘oya atrofidagi shoxobchalar tarzida chizish', 'vizual xotira va tizimlashtirish'],
    ['Sokratcha suhbat', 'ketma-ket yo‘naltiruvchi savollar orqali o‘quvchini xulosaga yetaklash', 'mantiqiy mushohada'],
    ['6 ta fikrlash shlyapasi', 'muammoni 6 xil nuqtai nazardan (fakt, hissiyot, tanqid, foyda, kreativ, xulosa) ko‘rish', 'ko‘p qirrali tahlil'],
    ['T-sxema (Taqqoslash jadvali)', 'hodisaning ijobiy va salbiy jihatlarini ikki ustunga ajratib yozish', 'tanqidiy baholash'],
    ['Bumerang texnologiyasi', 'guruhlarda o‘rganilgan savollarni bir-biriga qaytarib mustahkamlash', 'bilimni pishiq o‘zlashtirish'],
    ['Frayer modeli', 'tushunchaga ta’rif, xususiyat, misol va nomisol keltirish', 'tushunchani chuqur anglash'],
    ['Akvarium metodi', 'kichik guruh markazda muhokama qilib, tashqi guruh kuzatishi va tahlil berishi', 'reflektiv kuzatuv'],
    ['Konseptual jadval', 'bir nechta obyektlarni umumiy mezonlar bo‘yicha jadvalda solishtirish', 'tizimli tahlil'],
  ] as const;

  const out: BankItem[] = [...scenarios];
  for (let i = 0; i < topics.length && out.length < needed; i++) {
    const [method, desc, goal] = topics[i];
    out.push({
      k: 'mc',
      topic: 'Zamonaviy metodika',
      s: `Dars jarayonida "${method}" metodidan foydalanishning asosiy didaktik vazifasi nima?`,
      o: [
        `O‘quvchilarda ${desc} orqali ${goal} ko‘nikmasini rivojlantirish`,
        'Dars oxirida faqat uy vazifasini tekshirish',
        'O‘quvchilar o‘rtasidagi muloqotni cheklash',
        'Matnni faqat ovoz chiqarmasdan o‘qish',
      ],
      c: 0,
      explanation: `${method} metodi aynan ${desc} va ${goal} uchun samarali qo‘llaniladi.`,
    });
  }
  return out.slice(0, needed);
}

const MATH_STATIC: BankItem[] = [
  {
    k: 'mc',
    topic: 'Algebra',
    s: 'Agar $x^2 + x + 1 = 14$ bo‘lsa, $x^4 + x^2 + 1$ ifodaning qiymatini toping.',
    o: ['182', '196', '169', '154'],
    c: 0,
    explanation:
      '$x^4 + x^2 + 1 = (x^2+x+1)(x^2-x+1)$. Shartdan $(x^2+x+1)$ ga karrali $14 \\cdot 13 = 182$ hosil bo‘ladi.',
  },
  {
    k: 'mc',
    topic: 'Sonlar nazariyasi',
    s: '$\\overline{abab}$ ko‘rinishidagi to‘rt xonali sonlardan nechtasi $7$ ga qoldiqsiz bo‘linadi?',
    o: ['12', '13', '14', '9'],
    c: 1,
    explanation:
      '$\\overline{abab} = 101 \\cdot \\overline{ab}$. $101$ soni $7$ ga bo‘linmagani uchun $\\overline{ab} \\in \\{14,21,\\dots,98\\}$ — jami $13$ ta.',
  },
  {
    k: 'mc',
    topic: 'Progressiya',
    s: 'O‘suvchi arifmetik progressiya uchun $a_3 + a_7 + a_{14} + a_{18} = 10$ bo‘lsa, dastlabki $20$ ta had yig‘indisini toping.',
    o: ['60', '50', '40', '75'],
    c: 1,
    explanation: '$a_3 + a_{18} = a_7 + a_{14} = a_1 + a_{20} = 5 \\implies S_{20} = 5 \\cdot 10 = 50$.',
  },
  {
    k: 'mc',
    topic: 'Geometriya',
    s: 'To‘g‘ri burchakli uchburchakning gipotenuzasiga tushirilgan balandligi $6\\text{ sm}$, proyeksiyalardan biri $4\\text{ sm}$ bo‘lsa, yuzini toping.',
    o: ['39 sm²', '42 sm²', '36 sm²', '48 sm²'],
    c: 0,
    explanation: '$h^2 = p \\cdot q \\implies q = 9$. Gipotenuzasi $13$, yuzi $\\frac{13 \\cdot 6}{2} = 39\\text{ sm}^2$.',
  },
  {
    k: 'mc',
    topic: 'Trigonometriya',
    s: '$\\sin^2 15^\\circ + \\cos^2 15^\\circ + \\operatorname{tg} 45^\\circ$ ifodaning qiymatini toping.',
    o: ['1', '2', '0', '$\\sqrt{2}$'],
    c: 1,
    explanation: '$1 + 1 = 2$.',
  },
  {
    k: 'mc',
    topic: 'Logarifm',
    s: '$\\log_2(x - 3) = 4$ tenglamaning ildizini toping.',
    o: ['11', '16', '19', '13'],
    c: 2,
    explanation: '$x - 3 = 16 \\implies x = 19$.',
  },
  {
    k: 'mc',
    topic: 'Hosilalar',
    s: '$f(x) = x^3 - 6x^2 + 9x + 2$ funksiyaning $[0; 2]$ kesmadagi eng katta qiymatini toping.',
    o: ['2', '4', '6', '8'],
    c: 2,
    explanation: '$f\'(x)=3(x-1)(x-3)$. $f(0)=2, f(1)=6, f(2)=4 \\implies \\max = 6$.',
  },
  {
    k: 'mc',
    topic: 'Integral',
    s: '$\\int_0^3 (2x + 1)\\,dx$ aniq integralni hisoblang.',
    o: ['9', '12', '10', '15'],
    c: 1,
    explanation: '$(x^2 + x)\\big|_0^3 = 9 + 3 = 12$.',
  },
  {
    k: 'mc',
    topic: 'Kombinatorika',
    s: '$7$ ta har xil kitobdan $2$ tasini necha xil usulda tanlab olish mumkin?',
    o: ['14', '21', '42', '49'],
    c: 1,
    explanation: '$C_7^2 = \\frac{7 \\cdot 6}{2} = 21$.',
  },
  {
    k: 'mc',
    topic: 'Ehtimollik',
    s: 'O‘yin kubigi bir marta tashlanganda $4$ dan katta ochko tushishi ehtimolini toping.',
    o: ['$\\frac{1}{6}$', '$\\frac{1}{3}$', '$\\frac{1}{2}$', '$\\frac{2}{3}$'],
    c: 1,
    explanation: '$5$ va $6$ — jami $2$ ta qulay holat: $\\frac{2}{6} = \\frac{1}{3}$.',
  },
];

function buildMathDynamic(needed: number): BankItem[] {
  const out: BankItem[] = [...MATH_STATIC];
  let k = 0;
  while (out.length < needed) {
    const type = k % 5;
    const p = Math.floor(k / 5) + 2;
    if (type === 0) {
      // Quadratic roots product / sum: (x - r1)(x - r2) = 0 -> sum = r1 + r2
      const r1 = p + 1;
      const r2 = p + 4;
      const b = r1 + r2;
      const c = r1 * r2;
      const ans = r1 * r1 + r2 * r2; // b^2 - 2c
      out.push({
        k: 'mc',
        topic: 'Kvadrat tenglama',
        s: `$x^2 - ${b}x + ${c} = 0$ tenglamaning ildizlari $x_1$ va $x_2$ bo‘lsa, $x_1^2 + x_2^2$ qiymatini toping.`,
        o: [String(ans - 4), String(ans), String(ans + 6), String(b * b)],
        c: 1,
        explanation: `Viyet teoremasiga ko‘ra $x_1+x_2=${b},\\ x_1 x_2=${c} \\implies x_1^2+x_2^2=${b}^2-2\\cdot${c}=${ans}$.`,
      });
    } else if (type === 1) {
      // Arithmetic progression S_n
      const a1 = p;
      const d = 3;
      const n = 8 + p;
      const an = a1 + (n - 1) * d;
      const sn = ((a1 + an) * n) / 2;
      out.push({
        k: 'mc',
        topic: 'Arifmetik progressiya',
        s: `Birinchi hadi $a_1 = ${a1}$, ayirmasi $d = ${d}$ bo‘lgan arifmetik progressiyaning dastlabki $${n}$ ta hadi yig‘indisini toping.`,
        o: [String(sn), String(sn - n), String(sn + d), String(sn + 2 * n)],
        c: 0,
        explanation: `$a_{${n}} = ${a1} + ${n - 1}\\cdot${d} = ${an}$, $S_{${n}} = \\frac{${a1}+${an}}{2}\\cdot${n} = ${sn}$.`,
      });
    } else if (type === 2) {
      // Exponential equation: 2^(x+a) + 2^x = (2^a + 1) * 2^m
      const m = p + 1;
      const factor = 3; // 2^1 + 1
      const rhs = factor * Math.pow(2, m);
      out.push({
        k: 'mc',
        topic: 'Ko‘rsatkichli tenglama',
        s: `$2^{x+1} + 2^x = ${rhs}$ tenglamaning ildizini toping.`,
        o: [String(m - 1), String(m + 1), String(m), String(m + 2)],
        c: 2,
        explanation: `$2^x(2+1) = ${rhs} \\implies 2^x = ${Math.pow(2, m)} \\implies x = ${m}$.`,
      });
    } else if (type === 3) {
      // Derivative at a point: f(x) = a*x^3 - b*x + 5, find f'(2)
      const a = p;
      const b = p + 3;
      const x0 = 2;
      const ans = 3 * a * x0 * x0 - b;
      out.push({
        k: 'mc',
        topic: 'Hosila',
        s: `$f(x) = ${a}x^3 - ${b}x + 5$ funksiyaning $x_0 = ${x0}$ nuqtadagi hosilasi $f'(${x0})$ ni hisoblang.`,
        o: [String(ans - 2), String(ans + 4), String(ans), String(ans + 1)],
        c: 2,
        explanation: `$f'(x) = ${3 * a}x^2 - ${b} \\implies f'(${x0}) = ${3 * a}\\cdot 4 - ${b} = ${ans}$.`,
      });
    } else {
      // Geometry: Triangle area via 2 sides and sin 30°
      const s1 = 2 * p + 2;
      const s2 = 2 * p + 6;
      const area = (s1 * s2) / 4;
      out.push({
        k: 'mc',
        topic: 'Planimetriya',
        s: `Uchburchakning ikki tomoni $${s1}\\text{ sm}$ va $${s2}\\text{ sm}$, ular orasidagi burchak $30^\\circ$ bo‘lsa, uchburchak yuzini ($\\text{sm}^2$) toping.`,
        o: [String(area * 2), String(area), String(area + 3), String(area - 2)],
        c: 1,
        explanation: `$S = \\frac{1}{2}\\cdot ${s1}\\cdot ${s2}\\cdot \\sin 30^\\circ = ${area}\\text{ sm}^2$.`,
      });
    }
    k++;
  }
  return out.slice(0, needed);
}

const PHYSICS_STATIC: BankItem[] = [
  {
    k: 'mc',
    topic: 'Mexanika',
    s: 'Jism boshlang‘ich tezliksiz erkin tushmoqda. $t = 3\\text{ s}$ vaqtda bosib o‘tgan yo‘lini toping ($g = 10\\text{ m/s}^2$).',
    o: ['30 m', '45 m', '15 m', '90 m'],
    c: 1,
    explanation: '$h = \\frac{gt^2}{2} = \\frac{10 \\cdot 9}{2} = 45\\text{ m}$.',
  },
  {
    k: 'mc',
    topic: 'Elektr',
    s: 'Qarshiliklari $4\\ \\Omega$ va $12\\ \\Omega$ bo‘lgan ikki rezistor parallel ulangan. Umumiy qarshilikni toping.',
    o: ['16 Ω', '8 Ω', '3 Ω', '48 Ω'],
    c: 2,
    explanation: '$R = \\frac{4 \\cdot 12}{4 + 12} = 3\\ \\Omega$.',
  },
  {
    k: 'mc',
    topic: 'Optika',
    s: 'Yig‘uvchi linzaning fokus masofasi $F = 0{,}2\\text{ m}$ bo‘lsa, optik kuchini toping.',
    o: ['2 dptr', '5 dptr', '0,2 dptr', '10 dptr'],
    c: 1,
    explanation: '$D = \\frac{1}{0{,}2} = 5\\text{ dptr}$.',
  },
  {
    k: 'mc',
    topic: 'Termodinamika',
    s: 'Izotermik jarayonda ideal gazning hajmi $3$ marta kamaysa, bosimi qanday o‘zgaradi?',
    o: ['3 marta kamayadi', '3 marta ortadi', 'O‘zgarmaydi', '9 marta ortadi'],
    c: 1,
    explanation: 'Boyl-Mariott qonuni: $P_1 V_1 = P_2 V_2 \\implies P$ $3$ marta ortadi.',
  },
  {
    k: 'mc',
    topic: 'Tebranishlar',
    s: 'Matematik mayatnikning uzunligi $4$ marta oshirilsa, tebranish davri qanday o‘zgaradi?',
    o: ['2 marta ortadi', '4 marta ortadi', '2 marta kamayadi', 'O‘zgarmaydi'],
    c: 0,
    explanation: '$T = 2\\pi\\sqrt{l/g} \\implies T \\propto \\sqrt{l}$, ya’ni $2$ marta ortadi.',
  },
];

function buildPhysicsDynamic(needed: number): BankItem[] {
  const out: BankItem[] = [...PHYSICS_STATIC];
  let k = 0;
  while (out.length < needed) {
    const type = k % 5;
    const p = Math.floor(k / 5) + 1;
    if (type === 0) {
      // Kinetic energy: m = 2*p, v = 3 + p
      const m = 2 * p;
      const v = 4 + p;
      const ke = 0.5 * m * v * v;
      out.push({
        k: 'mc',
        topic: 'Ish va energiya',
        s: `Massasi $${m}\\text{ kg}$ bo‘lgan jism $${v}\\text{ m/s}$ tezlik bilan harakatlanmoqda. Uning kinetik energiyasini ($\\text{J}$) toping.`,
        o: [`${ke} J`, `${ke * 2} J`, `${m * v} J`, `${ke + 10} J`],
        c: 0,
        explanation: `$E_k = \\frac{mv^2}{2} = \\frac{${m}\\cdot ${v}^2}{2} = ${ke}\\text{ J}$.`,
      });
    } else if (type === 1) {
      // Uniform acceleration distance: v0 = 0, a = 2*p, t = 4
      const a = 2 * p;
      const t = 3 + (p % 3);
      const s = 0.5 * a * t * t;
      out.push({
        k: 'mc',
        topic: 'Kinematika',
        s: `Tinch holatdan $${a}\\text{ m/s}^2$ tezlanish bilan tekis tezlanuvchan harakat boshlagan jism $${t}\\text{ s}$ da qancha yo‘l ($\\text{m}$) bosadi?`,
        o: [`${a * t} m`, `${s * 2} m`, `${s} m`, `${s + 5} m`],
        c: 2,
        explanation: `$S = \\frac{at^2}{2} = \\frac{${a}\\cdot ${t}^2}{2} = ${s}\\text{ m}$.`,
      });
    } else if (type === 2) {
      // Ohm's law & power: U = 12*p, R = 6
      const R = 6;
      const I = 2 * p;
      const U = I * R;
      const P = U * I;
      out.push({
        k: 'mc',
        topic: 'Elektr toki',
        s: `Qarshiligi $${R}\\ \\Omega$ bo‘lgan o‘tkazgich uchlariga $${U}\\text{ V}$ kuchlanish berildi. Zanjirdan o‘tuvchi tok quvvatini ($\\text{Vt}$) toping.`,
        o: [`${P + R} Vt`, `${P} Vt`, `${Math.max(1, P - I)} Vt`, `${P * 2} Vt`],
        c: 1,
        explanation: `$I = \\frac{U}{R} = ${I}\\text{ A},\\ P = U \\cdot I = ${P}\\text{ Vt}$.`,
      });
    } else if (type === 3) {
      // Hooke's law: F = k*x -> k = 100*p N/m, x = 0.02*(p+1) m
      const stiffness = 100 * p;
      const xCm = 2 + p;
      const F = (stiffness * xCm) / 100;
      out.push({
        k: 'mc',
        topic: 'Dinamika',
        s: `Bikrligi $${stiffness}\\text{ N/m}$ bo‘lgan prujinani $${xCm}\\text{ sm}$ cho‘zish uchun qanday kuch ($\\text{N}$) kerak?`,
        o: [`${F} N`, `${F * 10} N`, `${stiffness / xCm} N`, `${F + 4} N`],
        c: 0,
        explanation: `$F = k\\Delta x = ${stiffness} \\cdot ${(xCm / 100).toFixed(2)} = ${F}\\text{ N}$.`,
      });
    } else {
      // Wave speed: lambda = 2*p, freq = 50 -> v = lambda * f
      const lam = 2 * p;
      const freq = 10 + 5 * p;
      const v = lam * freq;
      out.push({
        k: 'mc',
        topic: 'To‘lqinlar',
        s: `To‘lqin uzunligi $${lam}\\text{ m}$ va chastotasi $${freq}\\text{ Gts}$ bo‘lgan to‘lqinning tarqalish tezligini ($\\text{m/s}$) toping.`,
        o: [`${v / 2} m/s`, `${v + 10} m/s`, `${v} m/s`, `${freq - lam} m/s`],
        c: 2,
        explanation: `$v = \\lambda \\nu = ${lam}\\cdot ${freq} = ${v}\\text{ m/s}$.`,
      });
    }
    k++;
  }
  return out.slice(0, needed);
}

const ONA_TILI_BANK: BankItem[] = [
  {
    k: 'mc',
    topic: 'Imlo qoidalari',
    s: 'Qaysi qatordagi barcha so‘zlar imloviy jihatdan to‘g‘ri yozilgan?',
    o: [
      'muhokama, tashabbus, mas’uliyat',
      'muxokama, tashabus, ma’suliyat',
      'muhokama, tashabbus, ma’suliyat',
      'muxokama, tashabbus, mas’uliyat',
    ],
    c: 0,
    explanation: 'To‘g‘ri imlo: muhokama, tashabbus, mas’uliyat.',
  },
  {
    k: 'mc',
    topic: 'Sintaksis',
    s: 'Gapda kesimga bog‘lanib, ish-harakatning bajarilish o‘rnini bildiruvchi bo‘lak qaysi?',
    o: ['To‘ldiruvchi', 'Aniqlovchi', 'O‘rin holi', 'Ega'],
    c: 2,
    explanation: 'Ish-harakatning o‘rnini bildiruvchi ikkinchi darajali bo‘lak — o‘rin holi.',
  },
  {
    k: 'mc',
    topic: 'Fonetika',
    s: 'O‘zbek adabiy tilida nechta unli tovush mavjud?',
    o: ['5 ta', '6 ta', '8 ta', '10 ta'],
    c: 1,
    explanation: 'O‘zbek tilida 6 ta unli tovush bor: a, i, u, o, e, o‘.',
  },
  {
    k: 'mc',
    topic: 'Morfologiya',
    s: 'Qaysi so‘z turkumi shaxs va narsa nomini bildirib, "kim?", "nima?", "qayer?" so‘roqlariga javob bo‘ladi?',
    o: ['Sifat', 'Ot', 'Olmosh', 'Ravish'],
    c: 1,
    explanation: 'Ot so‘z turkumi predmet va shaxs ma’nosini anglatadi.',
  },
  {
    k: 'mc',
    topic: 'Punktuatsiya',
    s: 'Qaysi gapda uyushiq bo‘laklar orasiga vergul to‘g‘ri qo‘yilgan?',
    o: [
      'Bog‘da olma, nok, shaftoli va giloslar pishdi.',
      'Bog‘da olma nok shaftoli va, giloslar pishdi.',
      'Bog‘da, olma, nok shaftoli va giloslar pishdi.',
      'Bog‘da olma, nok, shaftoli, va giloslar pishdi.',
    ],
    c: 0,
    explanation: 'Yakkalangan "va" bog‘lovchisidan oldin vergul qo‘yilmaydi.',
  },
  {
    k: 'mc',
    topic: 'Adabiyot',
    s: 'Alisher Navoiyning "Xamsa"si tarkibidagi birinchi doston qaysi?',
    o: ['Farhod va Shirin', 'Layli va Majnun', 'Hayrat ul-abror', 'Saddi Iskandariy'],
    c: 2,
    explanation: '"Hayrat ul-abror" (1483) "Xamsa"ning birinchi falsafiy-axloqiy dostoni.',
  },
  {
    k: 'mc',
    topic: 'Leksikologiya',
    s: 'Shakli har xil, ma’nosi bir-biriga yaqin yoki bir xil bo‘lgan so‘zlar nima deb ataladi?',
    o: ['Omonimlar', 'Antonimlar', 'Sinonimlar', 'Paronimlar'],
    c: 2,
    explanation: 'Ma’nodosh so‘zlar — sinonimlar (masalan, chiroyli, go‘zal, ko‘rkam).',
  },
  {
    k: 'mc',
    topic: 'Adabiyot',
    s: 'O‘zbek romanchiligining asoschisi Abdulla Qodiriyning ilk yirik romani qaysi?',
    o: ['Mehrobdan chayon', 'O‘tkan kunlar', 'Obid ketmon', 'Sarob'],
    c: 1,
    explanation: '"O‘tkan kunlar" (1925–1926) — o‘zbek adabiyotidagi ilk milliy roman.',
  },
  {
    k: 'mc',
    topic: 'Morfologiya',
    s: '"Kelishik qo‘shimchalari" o‘zbek tilida nechta?',
    o: ['4 ta', '5 ta', '6 ta', '7 ta'],
    c: 2,
    explanation: '6 ta kelishik bor: bosh, qaratqich, tushum, jo‘nalish, o‘rin-payt, chiqish.',
  },
  {
    k: 'mc',
    topic: 'Imlo qoidalari',
    s: 'Qaysi so‘zda tutuq belgisi (’) noto‘g‘ri ishlatilgan?',
    o: ['ma’no', 'e’lon', 'a’lo', 'ma’orif'],
    c: 3,
    explanation: '"Maorif" so‘zida tutuq belgisi qo‘yilmaydi.',
  },
];

function buildOnaTiliDynamic(needed: number): BankItem[] {
  const extraPairs: [string, string, string, string, string][] = [
    ['Omonimlar', '"O‘t" (maysa) va "o‘t" (olov) so‘zlari o‘zaro qanday munosabatda?', 'Omonim', 'Antonim', 'Paronim'],
    ['Antonimlar', '"Keng" va "tor" so‘zlari o‘zaro qanday ma’no munosabatida?', 'Antonim', 'Sinonim', 'Omonim'],
    ['Sifat darajasi', '"Eng baland" birikmasi sifatning qaysi darajasini bildiradi?', 'Orttirma daraja', 'Qiyosiy daraja', 'Oddiy daraja'],
    ['Fe’l nisbati', '"Kitob o‘qildi" gapidagi fe’l qaysi nisbatda?', 'Majhul nisbat', 'Aniq nisbat', 'Orttirma nisbat'],
    ['Fe’l mayli', '"Darsni o‘z vaqtida tayyorlang" gapidagi fe’l qaysi maylda?', 'Buyruq-istak mayli', 'Shart mayli', 'Xabar mayli'],
    ['Gap bo‘laklari', 'Gapning asosiy mazmunini tashkil etuvchi bosh bo‘laklar qaysilar?', 'Ega va kesim', 'Aniqlovchi va to‘ldiruvchi', 'Hol va kesim'],
    ['Undalma', 'Gapda so‘zlovchining nutqi qaratilgan shaxs yoki narsani bildiruvchi birlik nima?', 'Undalma', 'Kirish so‘z', 'Izohlovchi'],
    ['Qo‘shma gap', '"Bahor keldi va gullar ochildi" — bu qanday qo‘shma gap?', 'Bog‘langan qo‘shma gap', 'Ergashgan qo‘shma gap', 'Sodda yoyiq gap'],
    ['Adabiyot', 'Zahiriddin Muhammad Boburning mashhur memuar asari qaysi?', 'Boburnoma', 'Devoni lug‘otit turk', 'Qutadg‘u bilig'],
    ['Adabiyot', '"Qutadg‘u bilig" asarining muallifi kim?', 'Yusuf Xos Hojib', 'Mahmud Koshg‘ariy', 'Ahmad Yugnakiy'],
    ['Adabiyot', '"Devoni lug‘otit turk" asarini kim yaratgan?', 'Mahmud Koshg‘ariy', 'Alisher Navoiy', 'Lutfiy'],
    ['Adabiyot', 'Cho‘lponning mashhur romani qaysi?', 'Kecha va kunduz', 'Qutlug‘ qon', 'Sinchalak'],
    ['Adabiyot', 'Oybekning Alisher Navoiy hayotiga bag‘ishlangan romani qaysi?', 'Navoiy', 'Ulug‘bek xazinasi', 'Yulduzli tunlar'],
    ['Adabiyot', 'Pirimqul Qodirovning Bobur haqidagi tarixiy romani qaysi?', 'Yulduzli tunlar', 'Avlodlar dovoni', 'Dunyoning ishlari'],
    ['Adabiyot', 'O‘tkir Hoshimovning qissasi qaysi qatorda berilgan?', 'Dunyoning ishlari', 'Ufq', 'Sarob'],
    ['Adabiyot', 'Erkin Vohidovning "O‘zbegim" she’ri qaysi janrda yozilgan?', 'Qasida', 'Ruboiy', 'Tuyuq'],
    ['Adabiyot', 'Ruboiy janri necha misradan iborat bo‘ladi?', '4 misra', '2 misra', '6 misra'],
    ['Adabiyot', 'G‘azal janrining birinchi bayti nima deb ataladi?', 'Matla', 'Maqta', 'Radif'],
    ['Adabiyot', 'G‘azal janrining oxirgi bayti nima deb ataladi?', 'Maqta', 'Matla', 'Qofiya'],
    ['Adabiyot', 'She’rda qofiyadan keyin aynan takrorlanib keladigan so‘z yoki qo‘shimcha nima?', 'Radif', 'Vazn', 'Turoq'],
    ['So‘z yasalishi', '"Kitobxon" so‘zidagi "-xon" qanday qo‘shimcha?', 'So‘z yasovchi', 'Shakl yasovchi', 'Egalik qo‘shimchasi'],
    ['Olmosh', '"Men, sen, u, biz, siz, ular" qaysi olmosh turiga kiradi?', 'Kishilik olmoshi', 'Ko‘rsatish olmoshi', 'So‘roq olmoshi'],
    ['Son turkumi', '"Beshinchi" so‘zi sonning qaysi ma’no turiga kiradi?', 'Tartib son', 'Dona son', 'Chama son'],
    ['Bog‘lovchi', '"Ammo, lekin, biroq" bog‘lovchilari qanday turga kiradi?', 'Zidlov bog‘lovchilari', 'Biriktiruv bog‘lovchilari', 'Ayiruv bog‘lovchilari'],
    ['Uslubiyat', 'Qonunlar, farmonlar va rasmiy hujjatlar qaysi nutq uslubida yoziladi?', 'Rasmiy uslub', 'Badiiy uslub', 'So‘zlashuv uslubi'],
  ];

  const out: BankItem[] = [...ONA_TILI_BANK];
  for (let i = 0; i < extraPairs.length && out.length < needed; i++) {
    const [topic, qText, right, w1, w2] = extraPairs[i];
    const opts = [right, w1, w2, 'Yuqoridagilarning barchasi emas'];
    // deterministic rotation of correct answer index
    const shift = i % 3;
    const rotated = opts.map((_, idx) => opts[(idx - shift + 4) % 4]);
    out.push({
      k: 'mc',
      topic,
      s: qText,
      o: rotated,
      c: shift,
      explanation: `To‘g‘ri javob: ${right}.`,
    });
  }
  return out.slice(0, needed);
}

const INFORMATIKA_STATIC: BankItem[] = [
  {
    k: 'mc',
    topic: 'Sanoq sistemalari',
    s: 'O‘nlik sanoq sistemasidagi $45$ soni ikkilik sanoq sistemasida qanday yoziladi?',
    o: ['101101', '101110', '110101', '100101'],
    c: 0,
    explanation: '$45 = 32 + 8 + 4 + 1 = 101101_2$.',
  },
  {
    k: 'mc',
    topic: 'Algoritmlar',
    s: 'Saralash algoritmlaridan qaysi biri barcha holatlarda $O(n \\log n)$ murakkablikka ega?',
    o: ['Bubble Sort', 'Merge Sort', 'Selection Sort', 'Linear Search'],
    c: 1,
    explanation: 'Merge Sort (Birlashtirib saralash) har doim $O(n \\log n)$ vaqt oladi.',
  },
  {
    k: 'mc',
    topic: 'Tarmoqlar',
    s: 'Veb-brauzer va server o‘rtasida shifrlangan aloqa o‘rnatuvchi protokol qaysi?',
    o: ['HTTP', 'FTP', 'HTTPS', 'SMTP'],
    c: 2,
    explanation: 'HTTPS TLS/SSL shifrlashdan foydalanadi.',
  },
  {
    k: 'mc',
    topic: 'Ma’lumotlar bazasi',
    s: 'SQL da jadvaldan ma’lumotlarni tanlab olish operatori qaysi?',
    o: ['SELECT', 'INSERT', 'DELETE', 'UPDATE'],
    c: 0,
    explanation: '`SELECT` operatori ma’lumotlarni o‘qish/tanlash uchun ishlatiladi.',
  },
  {
    k: 'mc',
    topic: 'Axborot o‘lchovi',
    s: '1 kilobayt (KB) kompyuter xotirasida necha baytga teng?',
    o: ['1000 bayt', '1024 bayt', '512 bayt', '2048 bayt'],
    c: 1,
    explanation: '$1\\text{ KB} = 2^{10} = 1024\\text{ bayt}$.',
  },
];

function buildInformatikaDynamic(needed: number): BankItem[] {
  const out: BankItem[] = [...INFORMATIKA_STATIC];
  let k = 0;
  while (out.length < needed) {
    const type = k % 4;
    const p = Math.floor(k / 4) + 1;
    if (type === 0) {
      const dec = 19 + 5 * p;
      const bin = dec.toString(2);
      const wrong1 = (dec + 1).toString(2);
      const wrong2 = (dec - 2).toString(2);
      const wrong3 = (dec + 4).toString(2);
      out.push({
        k: 'mc',
        topic: 'Sanoq sistemalari',
        s: `O‘nlik sanoq sistemasidagi $${dec}$ sonini ikkilik sanoq sistemasiga o‘tkazing.`,
        o: [bin, wrong1, wrong2, wrong3],
        c: 0,
        explanation: `$${dec}_{10} = ${bin}_2$.`,
      });
    } else if (type === 1) {
      const mb = 2 * p;
      const kb = mb * 1024;
      out.push({
        k: 'mc',
        topic: 'Axborot hajmi',
        s: `$${mb}\\text{ MB}$ hajmli fayl necha kilobaytga ($\\text{KB}$) teng?`,
        o: [`${mb * 1000} KB`, `${kb} KB`, `${mb * 512} KB`, `${kb * 2} KB`],
        c: 1,
        explanation: `$${mb}\\text{ MB} = ${mb} \\cdot 1024 = ${kb}\\text{ KB}$.`,
      });
    } else if (type === 2) {
      const start = p;
      const end = p + 4;
      let sum = 0;
      for (let i = start; i <= end; i++) sum += i;
      out.push({
        k: 'mc',
        topic: 'Python dasturlash',
        s: `Python dasturi bajarilganda ekranga nima chiqadi? \`s = 0; for i in range(${start}, ${end + 1}): s += i; print(s)\``,
        o: [String(sum - end), String(sum + start), String(sum), String(end)],
        c: 2,
        explanation: `\`range(${start}, ${end + 1})\` sikli $${start}$ dan $${end}$ gacha sonlarni qo‘shadi: $${sum}$.`,
      });
    } else {
      const hexVal = 25 + 7 * p;
      const hex = hexVal.toString(16).toUpperCase();
      out.push({
        k: 'mc',
        topic: 'O‘n oltilik sistema',
        s: `O‘n oltilik sanoq sistemasidagi $\\text{${hex}}_{16}$ soni o‘nlik sanoq sistemasida nechaga teng?`,
        o: [String(hexVal), String(hexVal + 16), String(hexVal - 6), String(hexVal + 10)],
        c: 0,
        explanation: `$\\text{${hex}}_{16} = ${hexVal}_{10}$.`,
      });
    }
    k++;
  }
  return out.slice(0, needed);
}

/**
 * Generates authentic Uzbekistan Teacher Attestatsiya questions following the official
 * 50-question structure (35 Mutaxassislik + 5 Kasb standarti + 10 Pedagogika & Psixologiya).
 * Zero duplicate questions are produced.
 */
export function generateDeterministicAttestation(
  subjectId: string,
  count = 50
): Question[] {
  const safeCount = Math.min(50, Math.max(1, Math.round(count) || 50));

  // Scale block distribution proportionally if count < 50; for 50 -> exact 35 / 5 / 10
  const kasbCount =
    safeCount === 50 ? 5 : Math.max(1, Math.round(safeCount * 0.1));
  const pedCount =
    safeCount === 50
      ? 10
      : subjectId === 'pedagogika'
        ? Math.max(2, safeCount - kasbCount - Math.round(safeCount * 0.7))
        : Math.max(1, Math.round(safeCount * 0.2));
  const subjCount = Math.max(1, safeCount - kasbCount - pedCount);

  let subjItems: BankItem[] = [];
  if (subjectId === 'pedagogika') {
    const combinedPed = [...PEDAGOGIKA, ...PEDAGOGIKA_SPECIALTY_EXTRA, ...buildPedagogikaDynamic(30)];
    subjItems = combinedPed.slice(0, subjCount);
    const pedTail = combinedPed.slice(subjCount, subjCount + pedCount);
    const kasbItems = KASB_STANDARTI.slice(0, kasbCount);
    const all = [...subjItems, ...kasbItems, ...pedTail].slice(0, safeCount);
    return all.map((item, i) => ({
      n: String(i + 1),
      k: 'mc',
      s: item.s,
      o: [...item.o],
      c: item.c ?? 0,
      topic: item.topic,
      explanation: item.explanation,
    }));
  }

  switch (subjectId) {
    case 'fizika':
      subjItems = buildPhysicsDynamic(subjCount);
      break;
    case 'ona_tili':
      subjItems = buildOnaTiliDynamic(subjCount);
      break;
    case 'informatika':
      subjItems = buildInformatikaDynamic(subjCount);
      break;
    case 'matematika':
    default:
      subjItems = buildMathDynamic(subjCount);
      break;
  }

  const kasbItems = KASB_STANDARTI.slice(0, kasbCount);
  const pedItems = PEDAGOGIKA.slice(0, pedCount);
  const combined = [...subjItems, ...kasbItems, ...pedItems].slice(0, safeCount);

  return combined.map((item, i) => ({
    n: String(i + 1),
    k: 'mc',
    s: item.s,
    o: [...item.o],
    c: item.c ?? 0,
    topic: item.topic,
    explanation: item.explanation,
  }));
}

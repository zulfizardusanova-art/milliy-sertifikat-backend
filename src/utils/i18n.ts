import type { LanguageCode } from '../types';

export const LANGUAGES: readonly [LanguageCode, string][] = [
  ['uz', 'O‘zbekcha'],
  ['uz_new', 'O‘zbekcha (Ş, Ç)'],
  ['uzc', 'Ўзбекча'],
  ['ru', 'Русский'],
  ['en', 'English'],
];

/**
 * Converts standard Uzbek Latin text into the reformed Uzbek Latin script
 * where `sh` -> `ş` (s with cedilla/hook below) and `ch` -> `ç`.
 */
export function toNewUzbekLatin(input: string): string {
  if (!input || /[@_/]|https?:/.test(input)) return input;
  let out = '';
  let i = 0;
  while (i < input.length) {
    const c = input[i];
    const next = input[i + 1] || '';
    const lc = c.toLowerCase();
    const ln = next.toLowerCase();

    if (lc === 's' && ln === 'h') {
      const isAllCaps = c === 'S' && next === 'H';
      out += c === 'S' ? (isAllCaps ? 'Ş' : 'Ş') : 'ş';
      i += 2;
      continue;
    }
    if (lc === 'c' && ln === 'h') {
      out += c === 'C' ? 'Ç' : 'ç';
      i += 2;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

/**
 * Converts Uzbek Latin text to Uzbek Cyrillic.
 */
export function toUzbekCyrillic(s: string): string {
  if (!s || /[@_/]|https?:/.test(s)) return s;
  const map: Record<string, string> = {
    a: 'а', b: 'б', d: 'д', e: 'е', f: 'ф', g: 'г', h: 'ҳ', i: 'и',
    j: 'ж', k: 'к', l: 'л', m: 'м', n: 'н', o: 'о', p: 'п', q: 'қ',
    r: 'р', s: 'с', t: 'т', u: 'у', v: 'в', x: 'х', y: 'й', z: 'з', c: 'ц',
  };
  const ap = "‘’'ʻ`";
  let o = '';
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    const l = c.toLowerCase();
    const n = s[i + 1] || '';
    const nl = n.toLowerCase();
    const up = c !== l;
    const put = (x: string) => {
      o += up ? x.toUpperCase() : x;
    };
    if ((l === 'o' || l === 'g') && n && ap.includes(n)) {
      put(l === 'o' ? 'ў' : 'ғ');
      i += 2;
      continue;
    }
    if (l === 's' && nl === 'h') {
      put('ш');
      i += 2;
      continue;
    }
    if (l === 'c' && nl === 'h') {
      put('ч');
      i += 2;
      continue;
    }
    if (l === 'c' && nl === 'k') {
      put('к');
      i += 2;
      continue;
    }
    if (l === 'c' && !'eiy'.includes(nl || '-')) {
      put('к');
      i++;
      continue;
    }
    if (l === 'y' && nl === 'e') {
      put('е');
      i += 2;
      continue;
    }
    if (l === 'y' && nl && 'oua'.includes(nl) && !(s[i + 2] && ap.includes(s[i + 2]))) {
      const yMap: Record<string, string> = { o: 'ё', u: 'ю', a: 'я' };
      put(yMap[nl]);
      i += 2;
      continue;
    }
    if (l === 'e' && (i === 0 || !/[a-z‘’']/i.test(s[i - 1]))) {
      put('э');
      i++;
      continue;
    }
    if (ap.includes(c) && i > 0 && /[a-z]/i.test(s[i - 1]) && /[a-z]/i.test(n)) {
      o += 'ъ';
      i++;
      continue;
    }
    if (map[l]) {
      put(map[l]);
      i++;
      continue;
    }
    o += c;
    i++;
  }
  return o;
}

const DICT: Record<string, { ru: string; en: string }> = {
  'Bosh sahifa': { ru: 'Главная', en: 'Home' },
  'Mock testlar': { ru: 'Мок-тесты', en: 'Mock tests' },
  'Attestatsiya': { ru: 'Аттестация', en: 'Attestation' },
  'Olimpiada': { ru: 'Олимпиада', en: 'Olympiad' },
  'Reyting': { ru: 'Рейтинг', en: 'Leaderboard' },
  'Premium': { ru: 'Премиум', en: 'Premium' },
  'Profil va sozlamalar': { ru: 'Профиль и настройки', en: 'Profile & Settings' },
  'Admin panel': { ru: 'Админ-панель', en: 'Admin panel' },
  'Chiqish': { ru: 'Выйти', en: 'Log out' },
  'Mashq va sinov': { ru: 'Практика и тесты', en: 'Practice & Tests' },
  'Boshqaruv': { ru: 'Управление', en: 'Management' },
  'Shaxsiy kabinet': { ru: 'Личный кабинет', en: 'Account' },
  'Kirish': { ru: 'Войти', en: 'Log in' },
  'Ro‘yxatdan o‘tish': { ru: 'Регистрация', en: 'Sign up' },
  'Hisob yaratish': { ru: 'Создать аккаунт', en: 'Create account' },
  'Testni boshlash': { ru: 'Начать тест', en: 'Start test' },
  'Testni yakunlash': { ru: 'Завершить тест', en: 'Finish test' },
  'Davom ettirish': { ru: 'Продолжить', en: 'Continue' },
  'Saqlash': { ru: 'Сохранить', en: 'Save' },
  'Bekor qilish': { ru: 'Отмена', en: 'Cancel' },
  'Tahrirlash': { ru: 'Редактировать', en: 'Edit' },
  'O‘chirish': { ru: 'Удалить', en: 'Delete' },
  'Tasdiqlash': { ru: 'Подтвердить', en: 'Confirm' },
  'Rad etish': { ru: 'Отклонить', en: 'Reject' },
  'Bepul': { ru: 'Бесплатно', en: 'Free' },
  'Pullik': { ru: 'Платный', en: 'Paid' },
  'To‘lov qilish': { ru: 'Оплатить', en: 'Pay now' },
  'Pul tushdi': { ru: 'Оплата получена', en: 'Payment received' },
  'Kutilmoqda': { ru: 'Ожидает', en: 'Pending' },
  'Tasdiqlandi': { ru: 'Подтверждено', en: 'Approved' },
  'Rad etildi': { ru: 'Отклонено', en: 'Rejected' },
  'Butun umrlik': { ru: 'Бессрочно', en: 'Lifetime' },
  'Cheklanmagan vaqt': { ru: 'Без ограничений', en: 'Unlimited time' },
  'yechilgan testlar': { ru: 'решено тестов', en: 'tests solved' },
  'ishlangan vaqt': { ru: 'затрачено времени', en: 'time spent' },
  'o‘rtacha Rasch ball': { ru: 'средний балл Раша', en: 'avg Rasch score' },
  'Oldingi': { ru: 'Назад', en: 'Previous' },
  'Keyingi': { ru: 'Вперёд', en: 'Next' },
  'Savollar ro‘yxati': { ru: 'Список вопросов', en: 'Question list' },
  'Qolgan vaqt': { ru: 'Осталось времени', en: 'Time left' },
  'Sarflangan vaqt': { ru: 'Прошло времени', en: 'Elapsed time' },
  'Yangi boshlovchi': { ru: 'Новичок', en: 'Novice' },
  'Havaskor': { ru: 'Любитель', en: 'Amateur' },
  'Tirishqoq': { ru: 'Старательный', en: 'Diligent' },
  'Izlanuvchi': { ru: 'Исследователь', en: 'Explorer' },
  'Bilimdon': { ru: 'Знаток', en: 'Knowledgeable' },
  'Mohir': { ru: 'Умелый', en: 'Skilled' },
  'Usta': { ru: 'Мастер', en: 'Master' },
  'Alloma': { ru: 'Учёный', en: 'Scholar' },
  'Akademik': { ru: 'Академик', en: 'Academic' },
  'Afsona': { ru: 'Легенда', en: 'Legend' },
  'Boshqaruvchi': { ru: 'Владелец', en: 'Owner' },
  'Admin': { ru: 'Админ', en: 'Admin' },
  'Foydalanuvchi': { ru: 'Пользователь', en: 'User' },
  'Test natijasi va savollar tahlili': { ru: 'Результат теста и разбор вопросов', en: 'Test result & question review' },
  'Savollar bo‘yicha natijalar': { ru: 'Результаты по вопросам', en: 'Question-by-question breakdown' },
  'Sizning javobingiz': { ru: 'Ваш ответ', en: 'Your answer' },
  'To‘g‘ri javob': { ru: 'Правильный ответ', en: 'Correct answer' },
  'Ushbu testdagi o‘rningiz': { ru: 'Место в этом тесте', en: 'Rank in this test' },
  'Yopish': { ru: 'Закрыть', en: 'Close' },
  'Tahlil': { ru: 'Разбор', en: 'Review' },
  'Belgilanmagan': { ru: 'Не отмечено', en: 'Not selected' },
  'Kiritilmagan': { ru: 'Не введено', en: 'Not entered' },
  'Izoh': { ru: 'Пояснение', en: 'Explanation' },
  'O‘tmagan': { ru: 'Не прошёл', en: 'Not passed' },
  'Asosiy Owner': { ru: 'Главный владелец', en: 'Root Owner' },
  'Faqat Asosiy Owner o‘zgartiradi': { ru: 'Меняет только Главный владелец', en: 'Root Owner only' },
  'Login': { ru: 'Логин', en: 'Login' },
  'Parol': { ru: 'Пароль', en: 'Password' },
  'Ism va familiya': { ru: 'Имя и фамилия', en: 'Full name' },
  'Barchasi': { ru: 'Все', en: 'All' },
  'Fan': { ru: 'Предмет', en: 'Subject' },
  'Fan (bo‘lim)': { ru: 'Предмет (раздел)', en: 'Subject (section)' },
  'Fanlar bo‘yicha': { ru: 'По предметам', en: 'By subject' },
  'Matematika': { ru: 'Математика', en: 'Mathematics' },
  'Fizika': { ru: 'Физика', en: 'Physics' },
  'Kimyo': { ru: 'Химия', en: 'Chemistry' },
  'Biologiya': { ru: 'Биология', en: 'Biology' },
  'Ona tili va adabiyot': { ru: 'Родной язык и литература', en: 'Native language & literature' },
  'Tarix': { ru: 'История', en: 'History' },
  'Ingliz tili': { ru: 'Английский язык', en: 'English' },
  'Informatika': { ru: 'Информатика', en: 'Computer Science' },
  'Geografiya': { ru: 'География', en: 'Geography' },
  'Huquq': { ru: 'Право', en: 'Law' },
  'Boshqa fanlar': { ru: 'Другие предметы', en: 'Other subjects' },
  'Ushbu fan bo‘yicha hozircha mock testlar yo‘q.': {
    ru: 'По этому предмету пока нет мок-тестов.',
    en: 'No mock tests in this subject yet.',
  },
  'O‘quv bazasidan tezkor tuzish': {
    ru: 'Быстро создать из базы заданий',
    en: 'Quick create from study bank',
  },
  'Muallif va aloqa (Sayt pastki qismi)': {
    ru: 'Автор и контакты (низ сайта)',
    en: 'Author & contact (site footer)',
  },
  'Zaxira nusxa va Eski Firebase dan tiklash': {
    ru: 'Резервная копия и восстановление из Firebase',
    en: 'Backup & Legacy Firebase restore',
  },
  'Zaxira yuklab olish (JSON)': {
    ru: 'Скачать копию (JSON)',
    en: 'Download backup (JSON)',
  },
  'JSON fayldan birlashtirish': {
    ru: 'Объединить из JSON',
    en: 'Merge from JSON',
  },
  'Jami': { ru: 'Всего', en: 'Total' },
  'Onlayn test va attestatsiya platformasi': {
    ru: 'Онлайн-платформа для тестов и аттестации',
    en: 'Online testing & attestation platform',
  },
};

export function trText(uzText: string, lang: LanguageCode): string {
  if (lang === 'uz') return uzText;
  if (lang === 'uz_new') return toNewUzbekLatin(uzText);
  if (lang === 'uzc') return toUzbekCyrillic(uzText);
  const hit = DICT[uzText];
  if (hit) return hit[lang];
  return uzText;
}

export function formatDurationSpan(seconds: number, lang: LanguageCode = 'uz'): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rem = s % 60;
  if (lang === 'ru') {
    return h ? `${h} ч ${m} мин` : `${m} мин ${rem} сек`;
  }
  if (lang === 'en') {
    return h ? `${h}h ${m}m` : `${m}m ${rem}s`;
  }
  const raw = h ? `${h} soat ${m} daq` : `${m} daq ${rem} son`;
  return trText(raw, lang);
}

export function formatSom(amount: number, lang: LanguageCode = 'uz'): string {
  const formatted = (Number(amount) || 0).toLocaleString('ru-RU');
  if (lang === 'ru') return `${formatted} сум`;
  if (lang === 'en') return `${formatted} UZS`;
  return trText(`${formatted} so‘m`, lang);
}

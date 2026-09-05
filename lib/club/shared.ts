export const MAJORS = [
  'الفيزياء',
  'الكيمياء',
  'الأحياء',
  'الرياضيات',
  'اللغة الإنجليزية',
];
export type ClubEvent = {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  starts_at: number;
  ends_at: number;
  capacity: number;
  points: number;
  badge: string;
  status: string;
  demo: number;
  registered: number;
  /** عدد من سُجّل حضورهم فعليًا (بعد مسح التذكرة). */
  attended: number;
};

/** مشارك حضر فعالية منتهية، كما يظهر في صفحتها. */
export type Attendee = {
  name: string;
  major: string;
  scanned_at: number;
};
export type Member = {
  id: string;
  name: string;
  phone: string;
  major: string;
  /** الرتبة داخل النادي، يكتبها الأدمن. فارغة = عضو بلا رتبة معلنة. */
  title: string | null;
  /** ترتيب الأهمية في قسم الفريق — الأصغر يظهر أولًا. */
  rank_order: number;
  demo: number;
  created_at: number;
};

/** عضو ذو رتبة معلنة، كما يظهر في قسم الفريق العام. */
export type BoardMember = {
  id: string;
  name: string;
  major: string;
  title: string;
  rank_order: number;
};
export type Ticket = {
  id: string;
  token: string;
  created_at: number;
  event_id: string;
  title: string;
  location: string;
  starts_at: number;
  ends_at: number;
  demo: number;
  scanned_at: number | null;
  points: number | null;
  badge: string | null;
  card_id: string | null;
};
export const instagram =
  'https://www.instagram.com/astrospace_club?igsi=MWFpcndhaW0yMTY0Mw%3D%3D&utm_source=qr';
export const whatsapp =
  'https://chat.whatsapp.com/LqK6TvTtbrKCo9in4ywjRQ?s=hd&p=i&mlu=4&ilr=4';
export function dateLabel(value: number, time = false) {
  return new Intl.DateTimeFormat('ar-OM', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...(time ? { hour: 'numeric', minute: '2-digit' } : {}),
    timeZone: 'Asia/Muscat',
  }).format(new Date(value));
}
export function normalizePhone(value: string) {
  const latin = value
    .replace(/[٠-٩]/g, (c) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(c)))
    .replace(/[۰-۹]/g, (c) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c)))
    .replace(/[\s()-]/g, '');
  const phone = latin.startsWith('00')
    ? '+' + latin.slice(2)
    : /^\d{8}$/.test(latin)
      ? '+968' + latin
      : latin;
  if (!/^\+[1-9]\d{7,14}$/.test(phone))
    throw new Error('أدخل رقم جوال صحيحًا مع مفتاح الدولة، مثل +968.');
  return phone;
}

/**
 * نافذة المسح — يستعملها الخادم في شرط SQL، وتستعملها التذكرة في العرض،
 * فلا تقول الواجهة «انتهت» بينما لا يزال الخادم يقبل المسح.
 */
export const SCAN_OPENS_BEFORE = 2 * 60 * 60 * 1000;
export const SCAN_CLOSES_AFTER = 12 * 60 * 60 * 1000;

export function ticketExpired(endsAt: number, demo = 0) {
  return !demo && Date.now() > endsAt + SCAN_CLOSES_AFTER;
}

/**
 * ملف تقويم لفعالية واحدة.
 * البديل المجاني لخاصية relevantDate في بطاقات Wallet: يظهر التذكير
 * في تقويم الجهاز وقت الفعالية بدل شاشة القفل.
 */
export function eventCalendar(event: {
  id: string;
  title: string;
  description: string;
  location: string;
  starts_at: number;
  ends_at: number;
}) {
  const stamp = (ms: number) =>
    new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const escape = (value: string) =>
    value.replace(/([,;\\])/g, '\\$1').replace(/\r?\n/g, '\\n');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Astrospace Club//AR',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${event.id}@astrospace.club`,
    `DTSTAMP:${stamp(Date.now())}`,
    `DTSTART:${stamp(event.starts_at)}`,
    `DTEND:${stamp(event.ends_at)}`,
    `SUMMARY:${escape(event.title)}`,
    `DESCRIPTION:${escape(event.description)}`,
    `LOCATION:${escape(event.location)}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT2H',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escape(event.title)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

/**
 * قوالب الفعاليات — تعبّئ نموذج الإنشاء بقيم واقعية للنوع المختار،
 * فلا يبقى على المنظّم إلا مراجعة الموعد والمكان والحفظ.
 */
export type EventTemplate = {
  key: string;
  name: string;
  title: string;
  category: string;
  location: string;
  description: string;
  capacity: number;
  points: number;
  badge: string;
  /** الساعة المعتادة للبدء بتوقيت عُمان */
  startHour: number;
  durationHours: number;
  /** يوم الأسبوع المفضّل (٠ الأحد) — يُترك فارغًا إن لم يكن للنوع يوم ثابت */
  weekday?: number;
};

export const EVENT_TEMPLATES: EventTemplate[] = [
  {
    key: 'observation',
    name: 'ليلة رصد',
    title: 'ليلة رصد',
    category: 'رصد فلكي',
    location: 'ساحة الرصد — جامعة صحار',
    description:
      'نلتقي تحت سماء صافية لرصد ما تيسّر من أجرام الليلة بتلسكوبات النادي.\n\nنبدأ بجولة بالعين المجردة على الأبراج الظاهرة، ثم نوجّه التلسكوبات. لا يشترط خبرة سابقة، وفريق الرصد يشرح الاستخدام خطوة بخطوة.\n\nأحضر معك جاكيت خفيف وكرسيًا قابلًا للطي إن أمكن.',
    capacity: 60,
    points: 30,
    badge: 'راصد السماء',
    startHour: 20,
    durationHours: 3,
    weekday: 4,
  },
  {
    key: 'workshop',
    name: 'ورشة عملية',
    title: 'ورشة عملية',
    category: 'ورشة',
    location: 'مختبر الابتكار',
    description:
      'ورشة عملية يطبّق فيها كل مشارك بنفسه، بعدد مقاعد محدود لضمان المتابعة الفردية.\n\nنبدأ بالأساس النظري بإيجاز، ثم ينتقل الوقت الأكبر إلى التطبيق. أحضر جهازك إن كانت الورشة تتطلب ذلك.',
    capacity: 30,
    points: 20,
    badge: 'مستكشف السماء',
    startHour: 17,
    durationHours: 2,
  },
  {
    key: 'lecture',
    name: 'محاضرة',
    title: 'محاضرة',
    category: 'محاضرة',
    location: 'قاعة المحاضرات',
    description:
      'محاضرة مفتوحة لكل الطلبة، مبنية على أمثلة بصرية ولا تتطلب خلفية علمية متقدمة.\n\nيتبع المحاضرة نقاش مفتوح للأسئلة.',
    capacity: 100,
    points: 15,
    badge: 'باحث في الفضاء',
    startHour: 18,
    durationHours: 2,
  },
  {
    key: 'trip',
    name: 'رحلة ميدانية',
    title: 'رحلة ميدانية',
    category: 'رحلة',
    location: 'التجمع عند بوابة الجامعة',
    description:
      'رحلة ميدانية بيوم كامل، الانطلاق من بوابة الجامعة والعودة قبل المغرب.\n\nالمقاعد محدودة بعدد الحافلة، والتسجيل يُغلق مبكرًا لترتيب التصاريح. أحضر ماءً وغطاء رأس.',
    capacity: 40,
    points: 40,
    badge: 'مسافر بين النجوم',
    startHour: 7,
    durationHours: 10,
  },
  {
    key: 'contest',
    name: 'مسابقة',
    title: 'مسابقة النادي',
    category: 'مسابقة',
    location: 'المسرح الرئيسي',
    description:
      'مسابقة بنظام الفرق على عدة جولات، تجمع بين المعلومة العامة والتعرّف على الصور الفلكية.\n\nجوائز للمراكز الأولى، والتسجيل بالفريق لا بالفرد.',
    capacity: 60,
    points: 25,
    badge: 'نجم المسابقة',
    startHour: 17,
    durationHours: 3,
  },
];

const OMAN_OFFSET = 4 * 3600000;

/**
 * أقرب موعد مناسب للقالب بتوقيت عُمان.
 * نعمل على حقول UTC بعد إزاحة التوقيت، فلا يتأثر الحساب بتوقيت جهاز المنظّم.
 */
export function templateSlot(template: EventTemplate) {
  const local = new Date(Date.now() + OMAN_OFFSET);
  const slot = new Date(
    Date.UTC(
      local.getUTCFullYear(),
      local.getUTCMonth(),
      local.getUTCDate(),
      template.startHour,
      0,
      0,
    ),
  );
  if (slot.getTime() <= local.getTime())
    slot.setUTCDate(slot.getUTCDate() + 1);
  if (template.weekday !== undefined)
    while (slot.getUTCDay() !== template.weekday)
      slot.setUTCDate(slot.getUTCDate() + 1);
  const starts = slot.getTime() - OMAN_OFFSET;
  return { starts, ends: starts + template.durationHours * 3600000 };
}

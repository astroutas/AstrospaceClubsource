import { all, one, statement, db, config, hash, randomToken } from './db';
import {
  MAJORS,
  SCAN_CLOSES_AFTER,
  SCAN_OPENS_BEFORE,
  normalizePhone,
} from './shared';
import type { Member } from './shared';
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
const fail = (message: string, status = 400): never => {
  throw new HttpError(status, message);
};
export function identity(request: Request) {
  const id = request.headers.get('oai-authenticated-user-id');
  const email = request.headers
    .get('oai-authenticated-user-email')
    ?.toLowerCase();
  return id && email ? { id, email } : null;
}
export async function session(request: Request) {
  const token = request.headers
    .get('cookie')
    ?.match(/(?:^|;\s*)astro_session=([a-f0-9]{64})/)?.[1];
  if (!token) return null;
  const member = await one<Member & { platform_id: string }>(
    `SELECT m.* FROM sessions s JOIN members m ON m.id=s.member_id WHERE s.token_hash=? AND s.expires_at>?`,
    await hash(token),
    Date.now(),
  );
  return member
    ? {
        ...member,
        admin:
          !!config().ADMIN_PHONE && member.phone === config().ADMIN_PHONE,
      }
    : null;
}
export async function requireMember(request: Request) {
  return (await session(request)) || fail('سجّل الدخول إلى عضويتك أولًا.', 401);
}
export async function requireAdmin(request: Request) {
  const m = await requireMember(request);
  if (!m.admin) fail('هذه الصفحة متاحة لإدارة النادي فقط.', 403);
  return m;
}
export function secureMutation(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(request.url).origin)
    fail('تعذّر التحقق من الطلب. أعد فتح الصفحة.', 403);
  if (!request.headers.get('content-type')?.includes('application/json'))
    fail('صيغة الطلب غير صالحة.', 415);
}
export async function rateLimit(key: string, limit: number, seconds: number) {
  const time = Date.now(),
    window = Math.floor(time / (seconds * 1000));
  const record = await statement(
    `INSERT INTO rate_limits(key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count`,
    key + ':' + window,
    time + seconds * 1000,
  ).first<{ count: number }>();
  if ((record?.count || 0) > limit)
    fail('طلبات كثيرة. انتظر قليلًا ثم حاول مجددًا.', 429);
}
function textValue(value: unknown, label: string, max: number, min = 1) {
  if (
    typeof value !== 'string' ||
    value.trim().length < min ||
    value.trim().length > max
  )
    fail(`تحقق من ${label} (من ${min} إلى ${max} حرفًا).`);
  return (value as string).trim();
}
function numberValue(value: unknown, label: string, min: number, max: number) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) fail(`تحقق من ${label}.`);
  return n;
}
function majorValue(value: unknown) {
  if (!MAJORS.includes(String(value))) fail('اختر التخصص من القائمة.');
  return String(value);
}
export async function publicData(request: Request) {
  const [events, majors, board, total, me] = await Promise.all([
    all(
      `SELECT e.*, (SELECT COUNT(*) FROM tickets t WHERE t.event_id=e.id) registered, (SELECT COUNT(*) FROM attendance a JOIN tickets t2 ON t2.id=a.ticket_id WHERE t2.event_id=e.id) attended FROM events e WHERE status!='draft' ORDER BY starts_at ASC`,
    ),
    all(
      `SELECT major,COUNT(*) members FROM members WHERE demo=0 GROUP BY major ORDER BY members DESC,major ASC`,
    ),
    // الفريق: من منحه الأدمن رتبة، مرتّبًا حسب الأهمية ثم الأقدمية
    all(
      `SELECT id,name,major,title,rank_order FROM members WHERE title IS NOT NULL AND TRIM(title)<>'' ORDER BY rank_order ASC,created_at ASC`,
    ),
    one<{ count: number }>(`SELECT COUNT(*) count FROM members WHERE demo=0`),
    session(request),
  ]);
  return {
    events,
    majors,
    board,
    totalMembers: total?.count || 0,
    me,
    platformSignedIn: true,
    now: Date.now(),
  };
}
/**
 * المشاركون في فعالية انتهى وقتها.
 * لا تُكشف الأسماء قبل انتهاء الفعالية حتى لا تتحوّل قائمة الحجز إلى قائمة علنية.
 */
export async function eventAttendees(id: string) {
  const event = await one<{ id: string; ends_at: number; demo: number }>(
    `SELECT id,ends_at,demo FROM events WHERE id=? AND status!='draft'`,
    id,
  );
  if (!event) return fail('الفعالية غير موجودة.', 404);
  if (event.ends_at > Date.now() && !event.demo)
    return { ended: false, attendees: [], attended: 0 };
  const attendees = await all(
    `SELECT m.name,m.major,a.scanned_at FROM attendance a JOIN tickets t ON t.id=a.ticket_id JOIN members m ON m.id=t.member_id WHERE t.event_id=? ORDER BY a.scanned_at ASC`,
    id,
  );
  return { ended: true, attendees, attended: attendees.length };
}
export async function login(
  request: Request,
  body: Record<string, unknown>,
  register = false,
) {
  const ip = request.headers.get('cf-connecting-ip') || 'local';
  await rateLimit('auth:' + (await hash(ip)), 15, 300);
  const phone = normalizePhone(
    typeof body.phone === 'string' ? body.phone : '',
  );
  let member = await one<Member & { platform_id: string }>(
    `SELECT * FROM members WHERE phone=?`,
    phone,
  );
  if (register) {
    const name = textValue(body.name, 'الاسم', 70, 2),
      major = majorValue(body.major);
    if (member) fail('هذا الرقم مسجّل بالفعل. استخدم صفحة الدخول.', 409);
    const id = crypto.randomUUID();
    await statement(
      `INSERT INTO members(id,name,phone,major,platform_id,demo,created_at) VALUES (?,?,?,?,?,0,?)`,
      id,
      name,
      phone,
      major,
      null,
      Date.now(),
    ).run();
    member = await one<Member & { platform_id: string }>(
      `SELECT * FROM members WHERE id=?`,
      id,
    );
  }
  if (!member)
    return fail('لم نعثر على عضوية بهذا الرقم.', 404);
  const token = randomToken();
  await db().batch([
    statement(`DELETE FROM sessions WHERE member_id=?`, member.id),
    statement(
      `INSERT INTO sessions(token_hash,member_id,mode,platform_id,expires_at) VALUES (?,?,'phone',NULL,?)`,
      await hash(token),
      member.id,
      Date.now() + 7 * 86400000,
    ),
  ]);
  const admin = !!config().ADMIN_PHONE && phone === config().ADMIN_PHONE;
  return {
    data: {
      member: { ...member, admin },
      redirect: admin ? '/admin' : '/member',
    },
    token,
  };
}
export async function logout(request: Request) {
  const token = request.headers
    .get('cookie')
    ?.match(/(?:^|;\s*)astro_session=([a-f0-9]{64})/)?.[1];
  if (token)
    await statement(
      `DELETE FROM sessions WHERE token_hash=?`,
      await hash(token),
    ).run();
  return { ok: true };
}
export async function dashboard(request: Request) {
  const me = await requireMember(request);
  const tickets = await all(
    `SELECT t.id,t.token,t.created_at,t.event_id,e.title,e.location,e.starts_at,e.ends_at,e.demo,a.scanned_at,a.points,a.badge,a.card_id FROM tickets t JOIN events e ON e.id=t.event_id LEFT JOIN attendance a ON a.ticket_id=t.id WHERE t.member_id=? ORDER BY e.starts_at DESC`,
    me.id,
  );
  return { me, tickets };
}
export async function updateMember(
  request: Request,
  body: Record<string, unknown>,
) {
  const me = await requireMember(request);
  const name = textValue(body.name, 'الاسم', 70, 2),
    major = majorValue(body.major);
  await statement(
    `UPDATE members SET name=?,major=? WHERE id=?`,
    name,
    major,
    me.id,
  ).run();
  return { ok: true };
}
export async function book(request: Request, body: Record<string, unknown>) {
  const me = await requireMember(request);
  await rateLimit('book:' + me.id, 30, 300);
  const eventId = textValue(body.eventId, 'الفعالية', 100);
  const id = crypto.randomUUID(),
    token = 'ASTRO-' + randomToken();
  await statement(
    `INSERT INTO tickets(id,token,member_id,event_id,created_at) SELECT ?,?,?,e.id,? FROM events e WHERE e.id=? AND e.status='published' AND (e.ends_at>? OR e.demo=1) AND (SELECT COUNT(*) FROM tickets t WHERE t.event_id=e.id)<e.capacity ON CONFLICT(member_id,event_id) DO NOTHING`,
    id,
    token,
    me.id,
    Date.now(),
    eventId,
    Date.now(),
  ).run();
  const ticket = await one<{ id: string }>(
    `SELECT id FROM tickets WHERE member_id=? AND event_id=?`,
    me.id,
    eventId,
  );
  if (!ticket) return fail('التسجيل مغلق أو اكتمل عدد المقاعد.', 409);
  return { id: ticket.id };
}
export async function ticketData(request: Request, id: string) {
  const me = await requireMember(request);
  const ticket = await one(
    `SELECT t.*,e.title,e.description,e.location,e.starts_at,e.ends_at,e.status,e.demo,a.scanned_at,a.points,a.badge,a.card_id,m.name,m.major FROM tickets t JOIN events e ON e.id=t.event_id JOIN members m ON m.id=t.member_id LEFT JOIN attendance a ON a.ticket_id=t.id WHERE t.id=? AND t.member_id=?`,
    id,
    me.id,
  );
  if (!ticket) return fail('التذكرة غير موجودة أو لا تخص حسابك.', 404);
  return ticket;
}
export async function adminData(request: Request) {
  await requireAdmin(request);
  const [events, members, messages, recent] = await Promise.all([
    all(
      `SELECT e.*,(SELECT COUNT(*) FROM tickets t WHERE t.event_id=e.id) registered,(SELECT COUNT(*) FROM attendance a JOIN tickets t ON t.id=a.ticket_id WHERE t.event_id=e.id) attended FROM events e ORDER BY starts_at DESC`,
    ),
    all(
      `SELECT m.*,COALESCE(SUM(CASE WHEN e.demo=0 THEN a.points ELSE 0 END),0) points,COUNT(a.ticket_id) attendance FROM members m LEFT JOIN tickets t ON t.member_id=m.id LEFT JOIN events e ON e.id=t.event_id LEFT JOIN attendance a ON a.ticket_id=t.id GROUP BY m.id ORDER BY m.created_at DESC LIMIT 500`,
    ),
    all(`SELECT * FROM messages ORDER BY created_at DESC LIMIT 100`),
    all(
      `SELECT a.*,m.name,e.title,e.demo FROM attendance a JOIN tickets t ON t.id=a.ticket_id JOIN members m ON m.id=t.member_id JOIN events e ON e.id=t.event_id ORDER BY a.scanned_at DESC LIMIT 30`,
    ),
  ]);
  return { events, members, messages, recent };
}
/** يمنح الأدمن رتبةً لعضو ويحدّد ترتيبه في قسم الفريق. الرتبة الفارغة تُخرجه منه. */
export async function saveMemberRole(
  request: Request,
  body: Record<string, unknown>,
) {
  await requireAdmin(request);
  const id = textValue(body.id, 'العضو', 100);
  const raw = typeof body.title === 'string' ? body.title.trim() : '';
  if (raw.length > 60) fail('الرتبة طويلة. اجعلها ضمن 60 حرفًا.');
  const title = raw || null;
  const order = title ? numberValue(body.rank_order, 'الترتيب', 0, 999) : 0;
  const result = await statement(
    `UPDATE members SET title=?,rank_order=? WHERE id=?`,
    title,
    order,
    id,
  ).run();
  if (!result.meta.changes) fail('العضو غير موجود.', 404);
  return { ok: true };
}
export async function saveEvent(
  request: Request,
  body: Record<string, unknown>,
) {
  await requireAdmin(request);
  const title = textValue(body.title, 'العنوان', 120, 3),
    description = textValue(body.description, 'وصف الفعالية', 4000, 10),
    category = textValue(body.category, 'نوع الفعالية', 40),
    location = textValue(body.location, 'المكان', 160);
  const starts = numberValue(body.starts_at, 'وقت البداية', 0, 9999999999999),
    ends = numberValue(body.ends_at, 'وقت النهاية', 0, 9999999999999);
  if (ends <= starts) fail('نهاية الفعالية يجب أن تكون بعد بدايتها.');
  const capacity = numberValue(body.capacity, 'عدد المقاعد', 1, 10000),
    points = numberValue(body.points, 'النقاط', 0, 1000),
    badge = textValue(body.badge, 'اسم الشارة', 60),
    status = textValue(body.status, 'الحالة', 20);
  if (!['published', 'draft', 'cancelled'].includes(status))
    fail('حالة الفعالية غير صالحة.');
  const id = body.id
    ? textValue(body.id, 'الفعالية', 100)
    : crypto.randomUUID();
  if (body.id) {
    const existing = await one(`SELECT id FROM events WHERE id=?`, id);
    if (!existing) fail('الفعالية غير موجودة.', 404);
    const count = await one<{ n: number }>(
      `SELECT COUNT(*) n FROM tickets WHERE event_id=?`,
      id,
    );
    if ((count?.n || 0) > capacity) fail('السعة أقل من عدد المسجّلين الحالي.');
    await statement(
      `UPDATE events SET title=?,description=?,category=?,location=?,starts_at=?,ends_at=?,capacity=?,points=?,badge=?,status=? WHERE id=?`,
      title,
      description,
      category,
      location,
      starts,
      ends,
      capacity,
      points,
      badge,
      status,
      id,
    ).run();
  } else
    await statement(
      `INSERT INTO events(id,title,description,category,location,starts_at,ends_at,capacity,points,badge,status,demo,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,0,?)`,
      id,
      title,
      description,
      category,
      location,
      starts,
      ends,
      capacity,
      points,
      badge,
      status,
      Date.now(),
    ).run();
  return { id };
}
/**
 * حذف فعالية نهائيًا.
 * نقاط الأعضاء وبطاقات حضورهم مشتقّة من سجلات الحضور المرتبطة بالفعالية،
 * فحذف فعالية حضرها أحد يمحو رصيده. نمنع ذلك ونوجّه إلى حالة «ملغاة».
 */
export async function deleteEvent(
  request: Request,
  body: Record<string, unknown>,
) {
  await requireAdmin(request);
  const id = textValue(body.id, 'الفعالية', 100);
  const event = await one<{ id: string }>(
    `SELECT id FROM events WHERE id=?`,
    id,
  );
  if (!event) return fail('الفعالية غير موجودة.', 404);
  const counts = await one<{ tickets: number; attended: number }>(
    `SELECT (SELECT COUNT(*) FROM tickets WHERE event_id=?) tickets,
            (SELECT COUNT(*) FROM attendance a JOIN tickets t ON t.id=a.ticket_id WHERE t.event_id=?) attended`,
    id,
    id,
  );
  if (counts?.attended)
    return fail(
      'لا يمكن حذف فعالية سُجّل فيها حضور، لأن ذلك يمحو نقاط الأعضاء وبطاقات حضورهم. غيّر حالتها إلى «ملغاة» بدلًا من الحذف.',
      409,
    );
  await db().batch([
    statement(`DELETE FROM tickets WHERE event_id=?`, id),
    statement(`DELETE FROM events WHERE id=?`, id),
  ]);
  return { ok: true, tickets: counts?.tickets || 0 };
}
export async function scan(request: Request, body: Record<string, unknown>) {
  const admin = await requireAdmin(request);
  await rateLimit('scan:' + admin.id, 120, 60);
  const token = textValue(body.token, 'رمز التذكرة', 90),
    eventId = textValue(body.eventId, 'الفعالية', 100);
  if (!/^ASTRO-[a-f0-9]{64}$/.test(token)) fail('رمز التذكرة غير صحيح.');
  const time = Date.now();
  // A single unique attendance row is the points ledger, badge and attendance card.
  // Retrying or concurrent scans cannot create a second reward.
  const result = await statement(
    `INSERT INTO attendance(ticket_id,scanned_by,scanned_at,points,badge,card_id) SELECT t.id,?,?,e.points,e.badge,? FROM tickets t JOIN events e ON e.id=t.event_id WHERE t.token=? AND e.id=? AND e.status='published' AND (e.demo=1 OR (? BETWEEN e.starts_at-? AND e.ends_at+?)) ON CONFLICT(ticket_id) DO NOTHING RETURNING ticket_id`,
    admin.id,
    time,
    'ATT-' + crypto.randomUUID(),
    token,
    eventId,
    time,
    SCAN_OPENS_BEFORE,
    SCAN_CLOSES_AFTER,
  ).first();
  const row = await one<{
    name: string;
    title: string;
    scanned_at: number | null;
    points: number | null;
    badge: string | null;
    card_id: string | null;
    demo: number;
  }>(
    `SELECT m.name,e.title,e.demo,a.scanned_at,a.points,a.badge,a.card_id FROM tickets t JOIN events e ON e.id=t.event_id JOIN members m ON m.id=t.member_id LEFT JOIN attendance a ON a.ticket_id=t.id WHERE t.token=? AND e.id=?`,
    token,
    eventId,
  );
  if (!row) return fail('التذكرة غير موجودة أو تخص فعالية أخرى.', 404);
  if (!row.scanned_at)
    fail('المسح غير متاح: الفعالية ملغاة أو خارج فترة الحضور.', 409);
  return { ...row, duplicate: !result };
}
export async function contact(request: Request, body: Record<string, unknown>) {
  if (body.website) fail('طلب غير صالح.');
  await rateLimit(
    'contact:' +
      (await hash(request.headers.get('cf-connecting-ip') || 'local')),
    4,
    600,
  );
  const name = textValue(body.name, 'الاسم', 70, 2),
    phone = normalizePhone(typeof body.phone === 'string' ? body.phone : ''),
    message = textValue(body.body, 'الرسالة', 2000, 10);
  await statement(
    `INSERT INTO messages(id,name,phone,body,created_at) VALUES (?,?,?,?,?)`,
    crypto.randomUUID(),
    name,
    phone,
    message,
    Date.now(),
  ).run();
  return { ok: true };
}
export async function readMessage(
  request: Request,
  body: Record<string, unknown>,
) {
  await requireAdmin(request);
  await statement(
    `UPDATE messages SET status='read' WHERE id=?`,
    textValue(body.id, 'الرسالة', 100),
  ).run();
  return { ok: true };
}
export async function seedDemo(request: Request) {
  await requireAdmin(request);
  const now = Date.now(),
    day = 86400000;
  const records = [
    [
      'demo-moon',
      'ليلة مع القمر',
      'تجربة توضيحية لفعالية رصد القمر والتعرّف على تفاصيل سطحه. هذه فعالية تجريبية وليست موعدًا معلنًا للنادي.',
      'رصد فلكي',
      'موقع تجريبي — يحدد لاحقًا',
      now + 7 * day,
      now + 7 * day + 7200000,
      40,
      30,
      'راصد القمر',
    ],
    [
      'demo-workshop',
      'خطوتك الأولى في الرصد',
      'ورشة تجريبية للتعرّف على أدوات الرصد وقراءة السماء. مخصّصة لاختبار التسجيل والتذكرة فقط.',
      'ورشة',
      'قاعة تجريبية',
      now + 14 * day,
      now + 14 * day + 7200000,
      30,
      20,
      'مستكشف السماء',
    ],
    [
      'demo-talk',
      'أسئلة تقودنا إلى الفضاء',
      'لقاء تجريبي حول الأسئلة التي يطرحها المهتمون بالفضاء. يمكن تعديل محتوى الفعاليات الحقيقية من الإدارة.',
      'لقاء',
      'لقاء تجريبي عبر الإنترنت',
      now + 21 * day,
      now + 21 * day + 5400000,
      80,
      10,
      'فضول بلا حدود',
    ],
  ];
  await db().batch(
    records.map((r) =>
      statement(
        `INSERT INTO events(id,title,description,category,location,starts_at,ends_at,capacity,points,badge,status,demo,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,'published',1,?) ON CONFLICT(id) DO NOTHING`,
        ...r,
        now,
      ),
    ),
  );
  await statement(
    `INSERT INTO content(id,kind,title,body,published,demo,created_at) VALUES ('demo-news','news','مساحة جديدة للنادي','خبر تجريبي لمعاينة قسم الأخبار. ستظهر هنا أخبار النادي التي تنشرها الإدارة.',1,1,?) ON CONFLICT(id) DO NOTHING`,
    now,
  ).run();
  return { ok: true };
}

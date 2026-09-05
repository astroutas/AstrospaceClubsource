import * as club from '@/lib/club/server';
export const dynamic = 'force-dynamic';
const json = (data: unknown, status = 200, cookie?: string) =>
  Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      ...(cookie ? { 'Set-Cookie': cookie } : {}),
    },
  });
async function pathParts(context: { params: Promise<{ path: string[] }> }) {
  return (await context.params).path;
}
const sessionCookie = (request: Request, token: string, age = 604800) =>
  `astro_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${age}${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`;
export async function GET(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  try {
    const path = await pathParts(context);
    switch (path[0]) {
      case 'public':
        return json(await club.publicData(request));
      case 'member':
        return json(await club.dashboard(request));
      case 'ticket':
        return json(await club.ticketData(request, path[1] || ''));
      case 'event':
        return json(await club.eventAttendees(path[1] || ''));
      case 'admin':
        return json(await club.adminData(request));
      default:
        return json({ error: 'الصفحة غير موجودة.' }, 404);
    }
  } catch (e) {
    return handle(e);
  }
}
export async function POST(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  try {
    club.secureMutation(request);
    if (Number(request.headers.get('content-length') || 0) > 30000)
      throw new club.HttpError(413, 'الطلب كبير جدًا.');
    const raw = await request.text();
    if (raw.length > 30000) throw new club.HttpError(413, 'الطلب كبير جدًا.');
    const body = JSON.parse(raw);
    if (!body || typeof body !== 'object' || Array.isArray(body))
      throw new club.HttpError(400, 'الطلب غير صالح.');
    const path = await pathParts(context);
    switch (path.join('/')) {
      case 'login':
      case 'register': {
        const r = await club.login(request, body, path[0] === 'register');
        return json(r.data, 200, sessionCookie(request, r.token));
      }
      case 'logout':
        return json(
          await club.logout(request),
          200,
          sessionCookie(request, '', 0),
        );
      case 'member':
        return json(await club.updateMember(request, body));
      case 'book':
        return json(await club.book(request, body));
      case 'contact':
        return json(await club.contact(request, body));
      case 'admin/event':
        return json(await club.saveEvent(request, body));
      case 'admin/member':
        return json(await club.saveMemberRole(request, body));
      case 'admin/event/delete':
        return json(await club.deleteEvent(request, body));
      case 'admin/scan':
        return json(await club.scan(request, body));
      case 'admin/message':
        return json(await club.readMessage(request, body));
      case 'admin/demo':
        return json(await club.seedDemo(request));
      default:
        return json({ error: 'المسار غير موجود.' }, 404);
    }
  } catch (e) {
    return handle(e);
  }
}
function handle(e: unknown) {
  if (e instanceof club.HttpError) return json({ error: e.message }, e.status);
  if (e instanceof SyntaxError) return json({ error: 'الطلب غير صالح.' }, 400);
  if (e instanceof Error && e.message.includes('أدخل رقم'))
    return json({ error: e.message }, 400);
  if (e instanceof Error && e.message.includes('UNIQUE'))
    return json(
      { error: 'هذا السجل موجود بالفعل. حدّث الصفحة وحاول مجددًا.' },
      409,
    );
  console.error(
    'Club API request failed',
    e instanceof Error ? e.name : 'UnknownError',
  );
  return json({ error: 'تعذّر إتمام العملية الآن. أعد المحاولة بعد قليل.' }, 500);
}

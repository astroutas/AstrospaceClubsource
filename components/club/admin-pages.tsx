'use client';
import { useState, useEffect, useRef, type SyntheticEvent } from 'react';
import Link from 'next/link';
import {
  ArrowUpLeft,
  Plus,
  ScanLine,
  Camera,
  CheckCircle,
  AlertCircle,
  LogOut,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import {
  type ClubEvent,
  type EventTemplate,
  type Member,
  EVENT_TEMPLATES,
  dateLabel,
  templateSlot,
} from '@/lib/club/shared';
import {
  api,
  useData,
  useClub,
  PageIntro,
  Loading,
  ErrorState,
  EmptyState,
  Field,
  Submit,
  FormNotice,
  Notice,
} from './core';
type AdminData = {
  events: (ClubEvent & { attended: number })[];
  members: (Member & { points: number; attendance: number })[];
  messages: {
    id: string;
    name: string;
    phone: string;
    body: string;
    status: string;
    created_at: number;
  }[];
  recent: {
    name: string;
    title: string;
    scanned_at: number;
    points: number;
    demo: number;
  }[];
};
const inputTime = (time: number) =>
  new Date(time + 4 * 3600000).toISOString().slice(0, 16);
export function AdminView() {
  const { data, error, refresh } = useData<AdminData>('admin'),
    global = useClub();
  const [editor, setEditor] = useState<ClubEvent | 'new' | null>(null),
    [busy, setBusy] = useState(false),
    // الفعالية المرشّحة للحذف — تأكيد صريح قبل عملية لا رجعة فيها
    [pendingDelete, setPendingDelete] = useState<ClubEvent | null>(null),
    [saveError, setSaveError] = useState(''),
    [success, setSuccess] = useState(''),
    [search, setSearch] = useState(''),
    // القالب المختار للفعالية الجديدة — يُعاد بناء النموذج عند تغييره
    [template, setTemplate] = useState<EventTemplate | null>(null);
  async function saveEvent(e: SyntheticEvent<HTMLFormElement, SubmitEvent>) {
    e.preventDefault();
    setBusy(true);
    setSaveError('');
    const formData = new FormData(e.currentTarget);
    const f = Object.fromEntries(formData);
    const startsAt = formData.get('starts_at');
    const endsAt = formData.get('ends_at');
    try {
      await api('admin/event', {
        ...f,
        ...(editor && editor !== 'new' ? { id: editor.id } : {}),
        starts_at: new Date(
          (typeof startsAt === 'string' ? startsAt : '') + '+04:00',
        ).getTime(),
        ends_at: new Date(
          (typeof endsAt === 'string' ? endsAt : '') + '+04:00',
        ).getTime(),
      });
      setEditor(null);
      await refresh();
      await global.refresh();
      setSuccess('تم حفظ الفعالية.');
    } catch (e) {
      setSaveError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function removeEvent() {
    if (!pendingDelete) return;
    setBusy(true);
    setSaveError('');
    try {
      await api('admin/event/delete', { id: pendingDelete.id });
      setPendingDelete(null);
      await refresh();
      await global.refresh();
      setSuccess('حُذفت الفعالية.');
    } catch (e) {
      setSaveError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function saveRole(
    e: SyntheticEvent<HTMLFormElement, SubmitEvent>,
    id: string,
  ) {
    e.preventDefault();
    setBusy(true);
    setSaveError('');
    setSuccess('');
    const form = new FormData(e.currentTarget);
    try {
      await api('admin/member', {
        id,
        title: form.get('title'),
        rank_order: Number(form.get('rank_order') || 0),
      });
      await refresh();
      await global.refresh();
      setSuccess('تم تحديث الرتبة والترتيب.');
    } catch (e) {
      setSaveError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function seed() {
    setBusy(true);
    setSuccess('');
    setSaveError('');
    try {
      await api('admin/demo', {});
      await refresh();
      await global.refresh();
      setSuccess(
        'أضيفت أمثلة الفعاليات والخبر التجريبي. لا تتضمن أعضاء أو أرقامًا وهمية.',
      );
    } catch (e) {
      setSaveError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (error)
    return (
      <section className="wrap page">
        <ErrorState message={error} />
        <Link href="/login" className="button button-primary">
          الدخول إلى حساب الإدارة
        </Link>
      </section>
    );
  if (!data) return <Loading />;
  const edited = editor && editor !== 'new' ? editor : null;
  const slot = !edited && template ? templateSlot(template) : null;
  return (
    <section className="wrap page">
      <PageIntro kicker="إدارة Astrospace" title="مساحة إدارة النادي">
        <div className="action-group">
          <Link className="button button-primary" href="/admin/scan">
            <ScanLine />
            مسح التذاكر
          </Link>
          <Link className="button button-outline" href="/member">
            عضويتي
          </Link>
          <button
            className="icon-button"
            aria-label="تسجيل الخروج"
            onClick={async () => {
              await api('logout', {});
              window.location.assign('/');
            }}
          >
            <LogOut />
          </button>
        </div>
      </PageIntro>
      <div className="stats-strip">
        <div>
          <span>الأعضاء</span>
          <strong>{data.members.length}</strong>
        </div>
        <div>
          <span>الفعاليات الفعلية</span>
          <strong>{data.events.filter((e) => !e.demo).length}</strong>
        </div>
        <div>
          <span>رسائل جديدة</span>
          <strong>
            {data.messages.filter((m) => m.status === 'new').length}
          </strong>
        </div>
      </div>
      <FormNotice
        error={!editor && !pendingDelete ? saveError : ''}
        success={success}
      />
      <Tabs defaultValue="events">
        <TabsList className="club-tabs" variant="line">
          <TabsTrigger value="events">الفعاليات</TabsTrigger>
          <TabsTrigger value="members">الأعضاء</TabsTrigger>
          <TabsTrigger value="messages">الرسائل</TabsTrigger>
        </TabsList>
        <TabsContent value="events">
          <div className="section-top admin-section-top">
            <p className="muted">
              المواعيد بتوقيت عُمان. إلغاء الفعالية يغلق التسجيل والمسح.
            </p>
            <button
              className="button button-outline"
              onClick={() => {
                setSaveError('');
                setTemplate(null);
                setEditor('new');
              }}
            >
              <Plus />
              إضافة فعالية
            </button>
          </div>
          {data.events.length ? (
            <Table className="club-table">
              <TableHeader>
                <TableRow>
                  <TableHead>الفعالية</TableHead>
                  <TableHead>المسجلون / السعة</TableHead>
                  <TableHead>الحضور</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الإجراء</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>
                      <strong>{event.title}</strong>
                      <span className="table-sub">
                        {dateLabel(event.starts_at)}
                        {event.demo ? ' · تجريبية' : ''}
                      </span>
                    </TableCell>
                    <TableCell>
                      {event.registered} / {event.capacity}
                    </TableCell>
                    <TableCell>{event.attended}</TableCell>
                    <TableCell>
                      {
                        {
                          published: 'منشورة',
                          draft: 'مسودة',
                          cancelled: 'ملغاة',
                        }[event.status]
                      }
                    </TableCell>
                    <TableCell>
                      <div className="row-actions">
                        <button
                          className="text-link"
                          onClick={() => {
                            setSaveError('');
                            setTemplate(null);
                            setEditor(event);
                          }}
                        >
                          تعديل
                        </button>
                        <button
                          className="text-link danger"
                          disabled={event.attended > 0}
                          title={
                            event.attended > 0
                              ? 'سُجّل حضور في هذه الفعالية — غيّر حالتها إلى «ملغاة» بدل الحذف.'
                              : 'حذف الفعالية'
                          }
                          onClick={() => {
                            setSaveError('');
                            setPendingDelete(event);
                          }}
                        >
                          حذف
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              title="ابدأ بأول فعالية"
              description="أضف عنوانًا وموعدًا ومكانًا، وحدد السعة ومكافأة الحضور."
            />
          )}
          <div className="demo-controls">
            <p>
              تحتاج تجربة رحلة التسجيل والمسح؟ أضف أمثلة واضحة بعلامة «تجريبية».
              لا تدخل مكافآتها في الرصيد الفعلي.
            </p>
            <button
              disabled={busy}
              className="button button-outline"
              onClick={seed}
            >
              إضافة بيانات تجربة
            </button>
          </div>
        </TabsContent>
        <TabsContent value="members">
          <label className="search-field">
            <span>ابحث عن عضو</span>
            <input
              placeholder="الاسم أو رقم الجوال أو التخصص"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <p className="caption admin-hint">
            اكتب رتبة العضو ليظهر في قسم «فريق النادي»، والترتيب يحدّد أسبقيته
            (الأصغر أولًا). اترك الرتبة فارغة لإخراجه من القسم.
          </p>
          <Table className="club-table">
            <TableHeader>
              <TableRow>
                <TableHead>الاسم</TableHead>
                <TableHead>الجوال</TableHead>
                <TableHead>التخصص</TableHead>
                <TableHead>النقاط الفعلية</TableHead>
                <TableHead>الرتبة والترتيب</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.members
                .filter((m) =>
                  [m.name, m.phone, m.major].some((v) => v.includes(search)),
                )
                .map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{m.name}</TableCell>
                    <TableCell>
                      <bdi>{m.phone}</bdi>
                    </TableCell>
                    <TableCell>{m.major}</TableCell>
                    <TableCell>{m.points}</TableCell>
                    <TableCell>
                      <form
                        className="role-form"
                        onSubmit={(e) => saveRole(e, m.id)}
                      >
                        <input
                          name="title"
                          defaultValue={m.title ?? ''}
                          placeholder="بلا رتبة"
                          maxLength={60}
                          aria-label={`رتبة ${m.name}`}
                        />
                        <input
                          name="rank_order"
                          type="number"
                          min={0}
                          max={999}
                          defaultValue={m.rank_order ?? 0}
                          aria-label={`ترتيب ${m.name}`}
                        />
                        <button
                          type="submit"
                          className="button button-outline"
                          disabled={busy}
                        >
                          حفظ
                        </button>
                      </form>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
          {!data.members.filter((m) =>
            [m.name, m.phone, m.major].some((v) => v.includes(search)),
          ).length && <EmptyState title="لا يوجد أعضاء مطابقون للبحث" />}
        </TabsContent>
        <TabsContent value="messages">
          {data.messages.length ? (
            data.messages.map((m) => (
              <article className="message-row" key={m.id}>
                <div>
                  <h3>{m.name}</h3>
                  <span className="meta">
                    <bdi>{m.phone}</bdi> · {dateLabel(m.created_at)}
                  </span>
                  <p className="preserve-lines">{m.body}</p>
                </div>
                {m.status === 'new' && (
                  <button
                    className="text-link"
                    onClick={async () => {
                      try {
                        await api('admin/message', { id: m.id });
                        await refresh();
                      } catch (e) {
                        setSaveError((e as Error).message);
                      }
                    }}
                  >
                    تحديد كمقروءة
                  </button>
                )}
              </article>
            ))
          ) : (
            <EmptyState
              title="لا توجد رسائل بعد"
              description="تصل رسائل نموذج التواصل إلى هذه المساحة."
            />
          )}
        </TabsContent>
      </Tabs>
      <Dialog
        open={!!pendingDelete}
        onOpenChange={(open) => {
          if (!open && !busy) setPendingDelete(null);
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogTitle>حذف الفعالية؟</DialogTitle>
          <DialogDescription>
            سيُحذف «{pendingDelete?.title}» نهائيًا
            {pendingDelete?.registered
              ? ` مع ${pendingDelete.registered} تذكرة صادرة`
              : ''}
            . لا يمكن التراجع عن هذا الإجراء.
          </DialogDescription>
          <FormNotice error={saveError} />
          <div className="action-group">
            <button
              className="button button-danger"
              disabled={busy}
              onClick={removeEvent}
            >
              {busy ? 'جارٍ الحذف…' : 'نعم، احذفها'}
            </button>
            <button
              className="button button-outline"
              type="button"
              disabled={busy}
              onClick={() => setPendingDelete(null)}
            >
              إلغاء
            </button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!editor}
        onOpenChange={(open) => {
          if (!open && !busy) setEditor(null);
        }}
      >
        <DialogContent className="editor-dialog" showCloseButton={false}>
          <DialogTitle>
            {edited ? 'تعديل الفعالية' : 'فعالية جديدة'}
          </DialogTitle>
          <DialogDescription>
            المواعيد بتوقيت عُمان. مكافآت الحضور السابقة لا تتغير عند تعديل
            النقاط.
          </DialogDescription>
          {!edited && (
            <div className="template-picker">
              <span className="caption">ابدأ من قالب</span>
              <div>
                {EVENT_TEMPLATES.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={
                      'template-chip' +
                      (template?.key === item.key ? ' is-active' : '')
                    }
                    aria-pressed={template?.key === item.key}
                    onClick={() => setTemplate(item)}
                  >
                    {item.name}
                  </button>
                ))}
                <button
                  type="button"
                  className={
                    'template-chip' + (template ? '' : ' is-active')
                  }
                  aria-pressed={!template}
                  onClick={() => setTemplate(null)}
                >
                  من الصفر
                </button>
              </div>
            </div>
          )}
          <form
            key={edited?.id || template?.key || 'blank'}
            className="club-form"
            onSubmit={saveEvent}
          >
            <Field
              label="عنوان الفعالية"
              name="title"
              defaultValue={edited?.title ?? template?.title ?? ''}
              minLength={3}
            />
            <div className="form-columns">
              <Field
                label="نوع الفعالية"
                name="category"
                defaultValue={edited?.category ?? template?.category ?? 'رصد فلكي'}
              />
              <Field
                label="المكان"
                name="location"
                defaultValue={edited?.location ?? template?.location ?? ''}
              />
            </div>
            <label className="field" htmlFor="event-description">
              <span>وصف الفعالية *</span>
              <Textarea
                className="club-input"
                id="event-description"
                name="description"
                defaultValue={edited?.description ?? template?.description ?? ''}
                required
                minLength={10}
                maxLength={4000}
                rows={4}
              />
            </label>
            <div className="form-columns">
              <Field
                label="البداية"
                name="starts_at"
                type="datetime-local"
                defaultValue={
                  edited
                    ? inputTime(edited.starts_at)
                    : slot
                      ? inputTime(slot.starts)
                      : ''
                }
              />
              <Field
                label="النهاية"
                name="ends_at"
                type="datetime-local"
                defaultValue={
                  edited
                    ? inputTime(edited.ends_at)
                    : slot
                      ? inputTime(slot.ends)
                      : ''
                }
              />
              <Field
                label="عدد المقاعد"
                name="capacity"
                type="number"
                defaultValue={String(edited?.capacity ?? template?.capacity ?? 30)}
              />
              <Field
                label="نقاط الحضور"
                name="points"
                type="number"
                defaultValue={String(edited?.points ?? template?.points ?? 20)}
              />
            </div>
            <Field
              label="اسم الشارة"
              name="badge"
              defaultValue={
                edited?.badge ?? template?.badge ?? 'مستكشف السماء'
              }
              maxLength={60}
            />
            <label className="field" htmlFor="event-status">
              <span>الحالة</span>
              <NativeSelect
                className="club-input"
                id="event-status"
                name="status"
                defaultValue={edited?.status || 'published'}
              >
                <NativeSelectOption value="published">
                  منشورة
                </NativeSelectOption>
                <NativeSelectOption value="draft">مسودة</NativeSelectOption>
                <NativeSelectOption value="cancelled">ملغاة</NativeSelectOption>
              </NativeSelect>
            </label>
            {!!edited?.demo && (
              <Notice>
                هذه فعالية تجريبية وستبقى موسومة بذلك. لإنشاء فعالية فعلية، اختر
                «إضافة فعالية».
              </Notice>
            )}
            <FormNotice error={saveError} />
            <div className="action-group">
              <Submit busy={busy}>حفظ الفعالية</Submit>
              <button
                className="button button-outline"
                type="button"
                disabled={busy}
                onClick={() => setEditor(null)}
              >
                إلغاء
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
type ScanResult = {
  name: string;
  title: string;
  scanned_at: number;
  points: number;
  badge: string;
  card_id: string;
  duplicate: boolean;
  demo: number;
};
export function ScannerView() {
  const { data, error } = useData<AdminData>('admin'),
    [eventId, setEventId] = useState(''),
    [running, setRunning] = useState(false),
    [starting, setStarting] = useState(false),
    [cameraError, setCameraError] = useState(''),
    [scanError, setScanError] = useState(''),
    [result, setResult] = useState<ScanResult | null>(null),
    [busy, setBusy] = useState(false),
    [token, setToken] = useState('');
  const video = useRef<HTMLVideoElement>(null),
    stream = useRef<MediaStream | null>(null),
    frame = useRef<number>(0),
    lock = useRef(false),
    generation = useRef(0);
  function stop() {
    generation.current++;
    setStarting(false);
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    cancelAnimationFrame(frame.current);
    setRunning(false);
  }
  useEffect(
    () => () => {
      generation.current++;
      stream.current?.getTracks().forEach((t) => t.stop());
      cancelAnimationFrame(frame.current);
    },
    [],
  );
  async function check(value: string) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setScanError('');
    setResult(null);
    stop();
    try {
      setResult(
        await api<ScanResult>('admin/scan', { eventId, token: value.trim() }),
      );
    } catch (e) {
      setScanError((e as Error).message);
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  async function start() {
    if (starting || running) return;
    const currentGeneration = ++generation.current;
    setStarting(true);
    setCameraError('');
    setResult(null);
    setScanError('');
    if (!eventId) {
      setCameraError('اختر الفعالية قبل تشغيل الكاميرا.');
      setStarting(false);
      return;
    }
    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error(
          'الكاميرا غير متاحة هنا. استخدم جهازًا يدعمها أو أدخل الرمز يدويًا.',
        );
      const acquiredStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
        audio: false,
      });
      if (currentGeneration !== generation.current) {
        acquiredStream.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = acquiredStream;
      setStarting(false);
      setRunning(true);
      if (video.current) {
        video.current.srcObject = stream.current;
        await video.current.play();
      }
      const jsQR = (await import('jsqr')).default;
      const canvas = document.createElement('canvas'),
        context = canvas.getContext('2d', { willReadFrequently: true });
      let previous = 0;
      function loop(now: number) {
        if (!stream.current) return;
        if (
          now - previous > 180 &&
          video.current &&
          video.current.readyState >= 2 &&
          context
        ) {
          previous = now;
          const v = video.current;
          canvas.width = 640;
          canvas.height = Math.round((640 * v.videoHeight) / v.videoWidth);
          context.drawImage(v, 0, 0, canvas.width, canvas.height);
          const image = context.getImageData(0, 0, canvas.width, canvas.height),
            code = jsQR(image.data, image.width, image.height, {
              inversionAttempts: 'dontInvert',
            });
          if (code) {
            void check(code.data);
            return;
          }
        }
        frame.current = requestAnimationFrame(loop);
      }
      frame.current = requestAnimationFrame(loop);
    } catch (e) {
      stop();
      setCameraError(
        (e as Error).name === 'NotAllowedError'
          ? 'لم يُسمح باستخدام الكاميرا. فعّل إذن الكاميرا أو أدخل الرمز يدويًا.'
          : (e as Error).message,
      );
    }
  }
  if (error)
    return (
      <section className="wrap page">
        <ErrorState message={error} />
        <Link href="/login" className="button button-primary">
          الدخول للإدارة
        </Link>
      </section>
    );
  if (!data) return <Loading />;
  return (
    <section className="wrap page">
      <Link href="/admin" className="back-link">
        الإدارة / تسجيل الحضور
      </Link>
      <PageIntro
        kicker="استقبال أعضاء النادي"
        title="مسح التذاكر"
        description="اختر الفعالية ثم امسح QR. يُسجل الحضور وتُمنح المكافأة مرة واحدة."
      />
      <div className="scanner-grid">
        <div>
          <label className="field">
            <span>الفعالية *</span>
            <NativeSelect
              className="club-input"
              value={eventId}
              disabled={starting || running || busy}
              onChange={(e) => {
                stop();
                setEventId(e.target.value);
                setResult(null);
                setScanError('');
              }}
            >
              <NativeSelectOption value="">اختر الفعالية</NativeSelectOption>
              {data.events
                .filter((e) => e.status === 'published')
                .map((e) => (
                  <NativeSelectOption value={e.id} key={e.id}>
                    {e.title}
                    {e.demo ? ' — تجريبية' : ''}
                  </NativeSelectOption>
                ))}
            </NativeSelect>
          </label>
          <div className={'camera-view ' + (running ? 'running' : '')}>
            <video
              ref={video}
              autoPlay
              playsInline
              muted
              aria-label="معاينة الكاميرا لمسح التذاكر"
            />
            {!running && (
              <div>
                <ScanLine size={48} strokeWidth={1} />
                <p>الكاميرا جاهزة عند الحاجة</p>
              </div>
            )}
          </div>
          <div className="action-group">
            {running ? (
              <button className="button button-outline" onClick={stop}>
                إيقاف الكاميرا
              </button>
            ) : (
              <button
                className="button button-primary"
                onClick={start}
                disabled={!eventId || busy || starting}
              >
                <Camera />
                {starting ? 'جارٍ فتح الكاميرا…' : 'تشغيل الكاميرا'}
              </button>
            )}
          </div>
          {cameraError && <ErrorState message={cameraError} />}
          <form
            className="manual-scan"
            onSubmit={(e) => {
              e.preventDefault();
              void check(token);
            }}
          >
            <label className="field">
              <span>أو أدخل رمز التذكرة يدويًا</span>
              <input
                className="club-input"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ASTRO-…"
                dir="ltr"
                required
                maxLength={90}
              />
            </label>
            <button
              className="button button-outline"
              disabled={busy || !eventId}
            >
              {busy ? 'جارٍ التحقق…' : 'تسجيل الحضور'}
            </button>
          </form>
        </div>
        <aside className="scan-result" aria-live="polite">
          {scanError ? (
            <ErrorState message={scanError} />
          ) : result ? (
            <>
              <div
                className={
                  'result-icon ' + (result.duplicate ? 'duplicate' : '')
                }
              >
                {result.duplicate ? <AlertCircle /> : <CheckCircle />}
              </div>
              <p className="eyebrow">
                {result.duplicate ? 'تم المسح سابقًا' : 'تم تسجيل الحضور'}
              </p>
              <h2>{result.name}</h2>
              <p>{result.title}</p>
              <div className="scan-award">
                <strong>{result.points} نقطة</strong>
                <span>شارة {result.badge}</span>
                <p>
                  {result.duplicate
                    ? 'لم تُضف نقاط مرة أخرى.'
                    : 'حُفظت بطاقة الحضور في حساب العضو.'}
                </p>
                {!!result.demo && (
                  <span className="demo-label">حضور تجريبي</span>
                )}
              </div>
              <p className="caption">{dateLabel(result.scanned_at, true)}</p>
              <button
                className="text-link"
                onClick={() => {
                  setResult(null);
                  setToken('');
                }}
              >
                جاهز للتذكرة التالية <ArrowUpLeft />
              </button>
            </>
          ) : (
            <EmptyState
              title="بانتظار التذكرة"
              description="ستظهر بيانات الحضور هنا بعد التحقق من الرمز."
            />
          )}
        </aside>
      </div>
    </section>
  );
}

'use client';
import { useState, useEffect, type SyntheticEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowUpLeft,
  Check,
  Copy,
  Download,
  Award,
  CalendarPlus,
  Ticket as TicketIcon,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  dateLabel,
  eventCalendar,
  ticketExpired,
  type Member,
  type Ticket,
} from '@/lib/club/shared';
import {
  api,
  useClub,
  useData,
  PageIntro,
  Loading,
  ErrorState,
  EmptyState,
  Field,
  MajorField,
  Submit,
  FormNotice,
  Notice,
} from './core';
function nextPath() {
  const n = new URLSearchParams(window.location.search).get('next');
  return n && /^\/(events|member|ticket)(\/|$)/.test(n) ? n : null;
}
export function AuthView({ register = false }: { register?: boolean }) {
  const { refresh } = useClub(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function submit(e: SyntheticEvent<HTMLFormElement, SubmitEvent>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await api<{ redirect: string }>(
        register ? 'register' : 'login',
        Object.fromEntries(new FormData(e.currentTarget)),
      );
      await refresh();
      window.location.assign(nextPath() || result.redirect);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <section className="wrap page auth-page">
      <div className="auth-heading">
        <p className="eyebrow">عضوية Astrospace</p>
        <h1>{register ? 'مكانك بيننا.' : 'أهلًا بعودتك.'}</h1>
        <p>
          {register
            ? 'اسمك، جوالك، وتخصصك. هذه بداية الرحلة.'
            : 'ادخل برقم الجوال الذي سجّلت به عضويتك.'}
        </p>
        <div className="auth-benefits">
          <p>
            <TicketIcon />
            كل تذاكرك في مكان واحد
          </p>
          <p>
            <Award />
            نقاط وشارات لكل حضور
          </p>
        </div>
      </div>
      <div className="auth-surface">
        <Tabs
          value={register ? 'register' : 'login'}
          onValueChange={(v) =>
            window.location.assign(v === 'register' ? '/register' : '/login')
          }
        >
          <TabsList className="club-tabs" variant="line">
            <TabsTrigger value="login">الدخول</TabsTrigger>
            <TabsTrigger value="register">عضوية جديدة</TabsTrigger>
          </TabsList>
        </Tabs>
        <form className="club-form" onSubmit={submit}>
            {register && (
              <Field
                label="الاسم"
                name="name"
                minLength={2}
                maxLength={70}
                autoComplete="name"
              />
            )}
            <Field
              label="رقم الجوال"
              name="phone"
              type="tel"
              placeholder="+968 9XXXXXXX"
              autoComplete="tel"
            />
            {register && <MajorField />}
            <p className="caption">
              يمكن إدخال رقم عُماني من 8 أرقام، أو رقم دولي مع مفتاح الدولة.
            </p>
            <FormNotice error={error} />
            <Submit busy={busy}>
              {register ? 'سجّل عضويتك' : 'دخول النادي'}
            </Submit>
        </form>
      </div>
    </section>
  );
}
export function MemberView() {
  const { data, error, refresh } = useData<{
    me: Member & { admin: boolean };
    tickets: Ticket[];
  }>('member');
  const global = useClub();
  const [busy, setBusy] = useState(false),
    [saveError, setSaveError] = useState(''),
    [success, setSuccess] = useState('');
  if (error)
    return (
      <section className="wrap page">
        <ErrorState message={error} />
        <Link className="button button-primary" href="/login">
          الدخول إلى النادي
        </Link>
      </section>
    );
  if (!data) return <Loading />;
  const attended = data.tickets.filter((t) => t.scanned_at && !t.demo);
  const points = attended.reduce((n, t) => n + (t.points || 0), 0);
  async function save(e: SyntheticEvent<HTMLFormElement, SubmitEvent>) {
    e.preventDefault();
    setBusy(true);
    setSaveError('');
    setSuccess('');
    try {
      await api('member', Object.fromEntries(new FormData(e.currentTarget)));
      await refresh();
      await global.refresh();
      setSuccess('تم تحديث عضويتك.');
    } catch (e) {
      setSaveError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    await api('logout', {});
    window.location.assign('/');
  }
  return (
    <section className="wrap page">
      <PageIntro kicker="مساحتك في النادي" title={'أهلًا، ' + data.me.name}>
        <button className="text-link" onClick={logout}>
          تسجيل الخروج
        </button>
      </PageIntro>
      <div className="stats-strip">
        <div>
          <span>رصيدك</span>
          <strong>
            {points}
            <small> نقطة</small>
          </strong>
        </div>
        <div>
          <span>مرات الحضور</span>
          <strong>{attended.length}</strong>
        </div>
        <div>
          <span>تخصصك</span>
          <strong className="stat-text">{data.me.major}</strong>
        </div>
      </div>
      <Tabs defaultValue="tickets">
        <TabsList className="club-tabs" variant="line">
          <TabsTrigger value="tickets">تذاكري</TabsTrigger>
          <TabsTrigger value="badges">الشارات والحضور</TabsTrigger>
          <TabsTrigger value="profile">بيانات العضوية</TabsTrigger>
        </TabsList>
        <TabsContent value="tickets">
          {data.tickets.length ? (
            <div className="ticket-list">
              {data.tickets.map((t) => (
                <Link
                  className="ticket-row"
                  href={'/ticket/' + t.id}
                  key={t.id}
                >
                  <TicketIcon />
                  <div>
                    <span className="meta">
                      {dateLabel(t.starts_at)}
                      {!!t.demo && <span className="demo-label">تجريبية</span>}
                    </span>
                    <h3>{t.title}</h3>
                    <p>{t.scanned_at ? 'تم تسجيل الحضور' : 'تذكرتك جاهزة'}</p>
                  </div>
                  <ArrowUpLeft />
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              title="أول تجربة تنتظرك"
              description="احجز فعالية لتظهر تذكرتك هنا."
            >
              <Link href="/events" className="button button-primary">
                استكشف الفعاليات
              </Link>
            </EmptyState>
          )}
        </TabsContent>
        <TabsContent value="badges">
          {attended.length ? (
            <div className="badge-list">
              {attended.map((t) => (
                <Link
                  href={'/ticket/' + t.id}
                  key={t.id}
                  className="earned-badge"
                >
                  <Award />
                  <h3>{t.badge}</h3>
                  <p>{t.title}</p>
                  <span>
                    {t.points} نقطة · بطاقة الحضور <ArrowUpLeft size={14} />
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              title="شارة البداية قريبة"
              description="احضر فعالية واطلب من الإدارة مسح تذكرتك. ستظهر الشارة وبطاقة الحضور هنا."
            />
          )}
        </TabsContent>
        <TabsContent value="profile">
          <form className="club-form profile-form" onSubmit={save}>
            <Field
              label="الاسم"
              name="name"
              defaultValue={data.me.name}
              minLength={2}
              maxLength={70}
            />
            <MajorField value={data.me.major} />
            <p className="caption">
              رقم العضوية: <bdi>{data.me.phone}</bdi>
              <br />
              لتغيير رقم الجوال، تواصل مع إدارة النادي.
            </p>
            <FormNotice error={saveError} success={success} />
            <Submit busy={busy}>حفظ التغييرات</Submit>
          </form>
        </TabsContent>
      </Tabs>
    </section>
  );
}
type TicketDetail = Ticket & {
  name: string;
  major: string;
  description: string;
  status: string;
};
export function TicketView({ id }: { id: string }) {
  const { data, error, refresh } = useData<TicketDetail>('ticket/' + id),
    [qr, setQr] = useState(''),
    [qrError, setQrError] = useState(''),
    [copied, setCopied] = useState(false),
    [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!data) return;
    let live = true;
    import('qrcode')
      .then((q) =>
        q.toDataURL(data.token, {
          width: 320,
          margin: 3,
          errorCorrectionLevel: 'M',
          color: { dark: '#080a09', light: '#ffffff' },
        }),
      )
      .then((url) => live && setQr(url))
      .catch(() => live && setQrError('تعذّر إنشاء QR. حدّث الصفحة.'));
    return () => {
      live = false;
    };
  }, [data]);
  if (error)
    return (
      <section className="wrap page">
        <ErrorState message={error} retry={refresh} />
        <Link href="/login" className="text-link">
          الدخول
        </Link>
      </section>
    );
  if (!data) return <Loading />;
  const used = !!data.scanned_at;
  const expired = ticketExpired(data.ends_at, data.demo) && !used;

  /** حفظ التذكرة كصورة — البديل العملي لبطاقة Wallet على أي جهاز. */
  async function saveImage() {
    if (!qr) return;
    setSaving(true);
    try {
      const { drawTicket } = await import('@/lib/club/ticket-image');
      const url = await drawTicket({
        title: data!.title,
        member: data!.name,
        when: dateLabel(data!.starts_at, true),
        place: data!.location,
        points: data!.points ?? 0,
        badge: data!.badge ?? '',
        token: data!.token,
        qr,
        expired,
        used,
      });
      const link = document.createElement('a');
      link.href = url;
      link.download = 'astrospace-ticket.png';
      link.click();
    } catch {
      setQrError('تعذّر حفظ الصورة. جرّب لقطة شاشة.');
    } finally {
      setSaving(false);
    }
  }

  /** إضافة الفعالية لتقويم الجهاز ليصلك تنبيه قبلها بساعتين. */
  function addToCalendar() {
    const file = new Blob([eventCalendar({ ...data!, id: data!.event_id })], {
      type: 'text/calendar;charset=utf-8',
    });
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'astrospace-event.ics';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(data!.token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setQrError('تعذّر النسخ. يمكنك تحديد الرمز ونسخه يدويًا.');
    }
  }
  return (
    <section className="wrap page ticket-page">
      <Link className="back-link" href="/member">
        عضويتي / التذكرة
      </Link>
      <PageIntro kicker="احتفظ بها ليوم الفعالية" title="تذكرتك إلى التجربة" />
      <div className={'admission-ticket' + (expired ? ' is-expired' : '')}>
        <div className="ticket-main">
          <header className="ticket-brand">
            <span dir="ltr">ASTROSPACE CLUB</span>
            <span className="ticket-admit" dir="ltr">
              ADMIT ONE
            </span>
          </header>
          <h2>{data.title}</h2>
          {!!data.demo && <span className="demo-label">تذكرة تجريبية</span>}
          <dl>
            <div>
              <dt>العضو</dt>
              <dd>{data.name}</dd>
            </div>
            <div>
              <dt>الموعد</dt>
              <dd>{dateLabel(data.starts_at, true)}</dd>
            </div>
            <div>
              <dt>المكان</dt>
              <dd>{data.location}</dd>
            </div>
          </dl>
          <footer className="ticket-reward">
            <span>
              <small>عند الحضور</small>
              <strong>{data.points ?? 0} نقطة</strong>
            </span>
            <span>
              <small>الشارة</small>
              <strong>{data.badge || '—'}</strong>
            </span>
          </footer>
        </div>

        <div className="ticket-perf" aria-hidden="true">
          <span className="notch notch-start" />
          <span className="perf-line" />
          <span className="notch notch-end" />
        </div>

        <div className="qr-panel">
          <div className="qr-frame">
            {used && (
              <span className="qr-stamp" aria-hidden="true">
                تم الاستخدام
              </span>
            )}
            {qr ? (
              <Image
                src={qr}
                width={256}
                height={256}
                alt="رمز QR الخاص بتذكرة العضو"
                unoptimized
              />
            ) : qrError ? (
              <ErrorState message={qrError} />
            ) : (
              <Loading />
            )}
          </div>
          <p>
            {used
              ? 'هذا الرمز استُخدم ولا يقبل المسح مرة أخرى.'
              : 'اعرض الرمز على مسؤول الحضور'}
          </p>
          <code className="ticket-code" dir="ltr">
            {data.token}
          </code>
          <span
            className={'ticket-status ' + (data.scanned_at ? 'checked' : '')}
          >
            {used ? (
              <>
                <Check size={16} />
                تم الاستخدام · {dateLabel(data.scanned_at!, true)}
              </>
            ) : data.status === 'cancelled' ? (
              'الفعالية ملغاة'
            ) : expired ? (
              'انتهت صلاحية التذكرة'
            ) : (
              'جاهزة للمسح عند الحضور'
            )}
          </span>
          <div className="qr-actions no-print">
            <button className="text-link" onClick={copy}>
              {copied ? <Check /> : <Copy />}
              {copied ? 'تم النسخ' : 'نسخ الرمز'}
            </button>
          </div>
        </div>
      </div>

      <div className="ticket-keep no-print">
        <p className="caption">
          احفظ التذكرة صورة في جهازك لتفتحها بدون إنترنت في موقع الرصد، أو أضف
          الموعد لتقويمك ليصلك تنبيه قبلها بساعتين.
        </p>
        <div className="ticket-keep-actions">
          <button
            className="button button-primary"
            onClick={saveImage}
            disabled={saving || !qr}
          >
            <Download />
            {saving ? 'جارٍ الحفظ…' : 'حفظ التذكرة صورة'}
          </button>
          <button className="button button-outline" onClick={addToCalendar}>
            <CalendarPlus />
            أضف إلى التقويم
          </button>
        </div>
      </div>
      {data.scanned_at && (
        <article className="attendance-card">
          <div>
            <Award />
            <p className="eyebrow">بطاقة حضور {data.demo ? 'تجريبية' : ''}</p>
            <h2>{data.name}</h2>
            <p>حضر فعالية «{data.title}»</p>
            <p className="muted">{dateLabel(data.scanned_at, true)}</p>
          </div>
          <div>
            <strong>{data.points} نقطة</strong>
            <span>شارة {data.badge}</span>
            <code>{data.card_id}</code>
            <button
              className="button button-outline no-print"
              onClick={() => window.print()}
            >
              طباعة بطاقة الحضور
            </button>
          </div>
        </article>
      )}
      {!!data.demo && (
        <Notice>
          الحضور التجريبي محفوظ للاختبار، ولا يضاف إلى رصيد النقاط الفعلي.
        </Notice>
      )}
    </section>
  );
}

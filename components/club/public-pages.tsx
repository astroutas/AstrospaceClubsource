'use client';
import { useState, type SyntheticEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowUpLeft,
  ArrowDown,
  MapPin,
  Clock,
  Ticket,
  Camera,
  MessageCircle,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  dateLabel,
  instagram,
  whatsapp,
  type Attendee,
} from '@/lib/club/shared';
import {
  useClub,
  PageIntro,
  EmptyState,
  Loading,
  ErrorState,
  EventRows,
  MajorRanking,
  TeamSection,
  Notice,
  Field,
  Submit,
  FormNotice,
  api,
  useData,
} from './core';
export function HomeView() {
  const { data, error, refresh } = useClub();
  return (
    <>
      <section className="hero wrap">
        <div className="hero-copy">
          <p className="eyebrow">
            <span className="tiny-line" />
            الفضول بداية الرحلة
          </p>
          <h1>
            سماء واحدة.
            <br />
            <span>فضولٌ بلا حدود.</span>
          </h1>
          <p className="intro">
            ارفع نظرك إلى أبعد من المألوف.
            <br />
            مساحتك للفلك والفضاء، وتجارب تقترب بها من السماء.
          </p>
          <div className="hero-actions">
            <Link
              className="button button-primary"
              href={data?.me ? '/member' : '/register'}
            >
              {data?.me ? 'إلى عضويتي' : 'كن عضوًا في النادي'}
              <ArrowUpLeft />
            </Link>
            <Link className="text-link" href="/events">
              استكشف الفعاليات <ArrowUpLeft />
            </Link>
          </div>
          <a href="#upcoming" className="scroll-link">
            <ArrowDown />
            ما القادم؟
          </a>
        </div>
        <figure className="moon-figure">
          <div className="moon-frame">
            <Image
              src="/moon.jpg"
              alt="تصوير علمي مفصل للقمر"
              width={1920}
              height={1080}
              priority
            />
          </div>
          <figcaption>
            <span>
              القمر / <bdi>THE MOON</bdi>
            </span>
            <a
              href="https://svs.gsfc.nasa.gov/5587/"
              target="_blank"
              rel="noopener noreferrer"
            >
              تصوير علمي · NASA SVS <ArrowUpLeft />
            </a>
          </figcaption>
        </figure>
      </section>
      <section className="wrap section-divider" id="upcoming">
        <div className="section-top">
          <div>
            <p className="eyebrow">تقويم النادي</p>
            <h2>لقاؤنا القادم</h2>
          </div>
          <Link href="/events" className="text-link">
            كل الفعاليات <ArrowUpLeft />
          </Link>
        </div>
        {error ? (
          <ErrorState message={error} retry={refresh} />
        ) : !data ? (
          <Loading />
        ) : data.events.filter(
            (e) => e.status === 'published' && e.ends_at > data.now,
          ).length ? (
          <EventRows
            events={data.events
              .filter((e) => e.status === 'published' && e.ends_at > data.now)
              .slice(0, 3)}
          />
        ) : (
          <EmptyState
            title="ترقّب الفعاليات القادمة"
            description="تظهر المواعيد والتفاصيل هنا فور إعلانها من إدارة النادي."
          />
        )}
      </section>
      <div className="wrap section-divider">
        <MajorRanking />
      </div>
    </>
  );
}
export function EventsView() {
  const { data, error, refresh } = useClub();
  const [search, setSearch] = useState('');
  const filtered =
    data?.events.filter(
      (e) => e.title.includes(search) || e.category.includes(search),
    ) || [];
  return (
    <section className="wrap page">
      <PageIntro
        kicker="تقويم النادي"
        title="قريبًا من السماء"
        description="اختر تجربتك القادمة، واقرأ التفاصيل، واحجز مقعدك."
      />
      <label className="search-field">
        <span>ابحث في الفعاليات</span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="اسم الفعالية أو نوعها"
        />
      </label>
      {error ? (
        <ErrorState message={error} retry={refresh} />
      ) : !data ? (
        <Loading />
      ) : (
        <Tabs defaultValue="upcoming">
          <TabsList className="club-tabs" variant="line">
            <TabsTrigger value="upcoming">القادمة</TabsTrigger>
            <TabsTrigger value="past">السابقة</TabsTrigger>
          </TabsList>
          {['upcoming', 'past'].map((tab) => {
            const events = filtered.filter((e) =>
              tab === 'upcoming' ? e.ends_at >= data.now : e.ends_at < data.now,
            );
            return (
              <TabsContent key={tab} value={tab}>
                {events.length ? (
                  <EventRows events={events} />
                ) : (
                  <EmptyState
                    title={
                      search
                        ? 'لا توجد نتائج مطابقة'
                        : 'لا توجد فعاليات في هذا القسم'
                    }
                    description={
                      search
                        ? 'جرّب كلمة أخرى أو امسح البحث.'
                        : 'سيظهر جدول الفعاليات هنا عند نشره.'
                    }
                  />
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      )}
    </section>
  );
}
export function EventDetail({ id }: { id: string }) {
  const { data, error, refresh } = useClub(),
    // سجل الحضور يُطلب دائمًا لثبات ترتيب الخطّافات، ولا يُعرض إلا بعد انتهاء الوقت
    roll = useData<{
      ended: boolean;
      attended: number;
      attendees: Attendee[];
    }>('event/' + id),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState('');
  if (error)
    return (
      <section className="wrap page">
        <ErrorState message={error} retry={refresh} />
      </section>
    );
  if (!data) return <Loading />;
  const event = data.events.find((e) => e.id === id);
  if (!event)
    return (
      <section className="wrap page">
        <EmptyState title="الفعالية غير موجودة">
          <Link href="/events" className="text-link">
            العودة إلى الفعاليات
          </Link>
        </EmptyState>
      </section>
    );
  async function register() {
    setBusy(true);
    setNotice('');
    try {
      const t = await api<{ id: string }>('book', { eventId: id });
      window.location.assign('/ticket/' + t.id);
    } catch (e) {
      setNotice((e as Error).message);
      setBusy(false);
    }
  }
  const closed =
    event.status !== 'published' ||
    (!event.demo && event.ends_at < data.now) ||
    event.registered >= event.capacity;
  return (
    <section className="wrap page">
      <Link className="back-link" href="/events">
        الفعاليات / تفاصيل الفعالية
      </Link>
      <PageIntro kicker={event.category} title={event.title} />
      {!!event.demo && (
        <Notice>
          فعالية تجريبية لا تمثّل موعدًا معلنًا. حضورها لا يدخل في رصيدك الفعلي.
        </Notice>
      )}
      <div className="detail-grid">
        <article className="prose">
          <h2>عن التجربة</h2>
          <p className="preserve-lines">{event.description}</p>
          <h3>بعد حضورك</h3>
          <p>
            عند مسح التذكرة من إدارة النادي، تحصل على {event.points} نقطة، وشارة
            «{event.badge}»، وبطاقة حضور محفوظة في عضويتك.
          </p>
        </article>
        <aside className="booking-panel">
          <div className="detail-item">
            <Clock />
            <div>
              <span>الموعد بتوقيت عُمان</span>
              <p>{dateLabel(event.starts_at, true)}</p>
            </div>
          </div>
          <div className="detail-item">
            <MapPin />
            <div>
              <span>المكان</span>
              <p>{event.location}</p>
            </div>
          </div>
          <div className="detail-item">
            <Ticket />
            <div>
              <span>المقاعد المتاحة</span>
              <p>
                {Math.max(0, event.capacity - event.registered)} من{' '}
                {event.capacity}
              </p>
            </div>
          </div>
          {notice && <ErrorState message={notice} />}{' '}
          {closed ? (
            <button className="button button-outline" disabled>
              {event.status === 'cancelled' ? 'الفعالية ملغاة' : 'التسجيل مغلق'}
            </button>
          ) : data.me ? (
            <button
              className="button button-primary"
              onClick={register}
              disabled={busy}
            >
              {busy ? 'جارٍ إصدار التذكرة…' : 'احجز مقعدك'}
              <ArrowUpLeft />
            </button>
          ) : (
            <Link
              className="button button-primary"
              href={'/login?next=' + encodeURIComponent('/events/' + id)}
            >
              ادخل لحجز مقعدك <ArrowUpLeft />
            </Link>
          )}
          <p className="caption">
            تذكرة واحدة لكل عضو. احتفظ بالـ QR ليوم الفعالية.
          </p>
        </aside>
      </div>
      {roll.data?.ended && (
        <section className="roll-call">
          <div className="section-top">
            <div>
              <p className="eyebrow">
                <span className="tiny-line" aria-hidden="true" />
                بعد انتهاء الفعالية
              </p>
              <h2>من حضر معنا</h2>
            </div>
            <span className="roll-count">
              <strong>{roll.data.attended}</strong>
              <span>
                {roll.data.attended === 1 ? 'مشارك' : 'مشاركًا'} من{' '}
                {event.registered} حجزوا
              </span>
            </span>
          </div>
          {roll.data.attendees.length ? (
            <ol className="roll-list">
              {roll.data.attendees.map((a, i) => (
                <li key={a.name + a.scanned_at}>
                  <span className="roll-index" aria-hidden="true">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="roll-name">{a.name}</span>
                  <span className="roll-major">{a.major}</span>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState
              title="لم يُسجَّل حضور في هذه الفعالية"
              description="تظهر الأسماء هنا بعد مسح التذاكر من إدارة النادي."
            />
          )}
        </section>
      )}
    </section>
  );
}
export function AboutView() {
  return (
    <section className="wrap page">
      <PageIntro kicker="عن النادي" title="يجمعنا سؤال. وتلهمنا سماء." />
      <div className="about-grid">
        <div className="prose">
          <h2>مساحة لمن ينظر إلى الأعلى</h2>
          <p>
            Astrospace Club مساحة للمهتمين بالفلك والفضاء. هنا تبدأ الرحلة
            بسؤال، وتستمر بالتعلّم والتجربة ومشاركة الاهتمام مع الآخرين.
          </p>
          <p>
            ليس التخصص حاجزًا. اختلاف الخلفيات يفتح طرقًا جديدة لفهم السماء؛ من
            العلوم والهندسة إلى الفن والعلوم الإنسانية.
          </p>
          <Link className="button button-primary" href="/register">
            كن جزءًا من النادي <ArrowUpLeft />
          </Link>
        </div>
        <div className="principles">
          {[
            ['01', 'فضول يقودنا', 'نترك مساحة للأسئلة، ولتعلّم شيء جديد.'],
            ['02', 'معرفة نتشاركها', 'تجربة تثري الجميع باختلاف تخصصاتهم.'],
            ['03', 'حضور له أثر', 'فعاليات تجمع الأعضاء وذاكرة لكل مشاركة.'],
          ].map(([n, t, d]) => (
            <div key={n}>
              <span>{n}</span>
              <h3>{t}</h3>
              <p>{d}</p>
            </div>
          ))}
        </div>
      </div>
      <TeamSection />
      <MajorRanking />
    </section>
  );
}
export function ContactView() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [success, setSuccess] = useState('');
  async function submit(e: SyntheticEvent<HTMLFormElement, SubmitEvent>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await api('contact', Object.fromEntries(new FormData(form)));
      setSuccess('وصلت رسالتك إلى لوحة إدارة النادي. شكرًا لتواصلك.');
      form.reset();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="wrap page">
      <PageIntro
        kicker="على اتصال"
        title="نسمع منك"
        description="لديك سؤال أو فكرة للنادي؟ اترك لنا رسالة."
      />
      <div className="contact-grid">
        <form className="club-form" onSubmit={submit}>
          <Field
            label="الاسم"
            name="name"
            minLength={2}
            maxLength={70}
            autoComplete="name"
          />
          <Field
            label="رقم الجوال"
            name="phone"
            type="tel"
            placeholder="+968"
            autoComplete="tel"
          />
          <label className="field" htmlFor="contact-body">
            <span>رسالتك *</span>
            <Textarea
              className="club-input"
              id="contact-body"
              name="body"
              minLength={10}
              maxLength={2000}
              required
              rows={5}
            />
          </label>
          <div className="honeypot" aria-hidden="true">
            <input name="website" tabIndex={-1} autoComplete="off" />
          </div>
          <FormNotice error={error} success={success} />
          <Submit busy={busy}>إرسال الرسالة</Submit>
        </form>
        <aside className="contact-channels">
          <h2>أو تجدنا هنا</h2>
          <a href={instagram} target="_blank" rel="noopener noreferrer">
            <Camera />
            <div>
              <h3>إنستغرام</h3>
              <bdi>@astrospace_club</bdi>
            </div>
            <ArrowUpLeft />
          </a>
          <a href={whatsapp} target="_blank" rel="noopener noreferrer">
            <MessageCircle />
            <div>
              <h3>واتساب</h3>
              <p>مجموعة النادي</p>
            </div>
            <ArrowUpLeft />
          </a>
        </aside>
      </div>
    </section>
  );
}

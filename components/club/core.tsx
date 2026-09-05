'use client';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Orbit,
  Menu,
  X,
  LogOut,
  ArrowUpLeft,
  AlertCircle,
  LoaderCircle,
  CalendarDays,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import {
  MAJORS,
  type BoardMember,
  type ClubEvent,
  type Member,
  dateLabel,
} from '@/lib/club/shared';
export async function api<T = unknown>(
  path: string,
  body?: unknown,
): Promise<T> {
  const response = await fetch('/api/club/' + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers:
      body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  });
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok)
    throw Object.assign(new Error(data.error || 'تعذّر تحميل البيانات.'), {
      status: response.status,
    });
  return data;
}
export type PublicData = {
  events: ClubEvent[];
  majors: { major: string; members: number }[];
  board: BoardMember[];
  totalMembers: number;
  me: (Member & { admin: boolean }) | null;
  platformSignedIn: boolean;
  now: number;
};
const Context = createContext<{
  data: PublicData | null;
  error: string;
  refresh: () => Promise<void>;
}>({ data: null, error: '', refresh: async () => {} });
export const useClub = () => useContext(Context);
export function useData<T>(endpoint: string) {
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState('');
  async function refresh() {
    try {
      setError('');
      setData(await api<T>(endpoint));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    let live = true;
    api<T>(endpoint)
      .then((d) => {
        if (live) {
          setData(d);
          setError('');
        }
      })
      .catch((e) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [endpoint]);
  return { data, error, refresh, setData };
}
const navigation = [
  ['/', 'الرئيسية'],
  ['/events', 'الفعاليات'],
  ['/about', 'عن النادي'],
  ['/contact', 'تواصل'],
];
export function SiteShell({ children }: { children: ReactNode }) {
  const path = usePathname(),
    [open, setOpen] = useState(false),
    [leaving, setLeaving] = useState(false),
    { data, error, refresh } = useData<PublicData>('public');

  /** الخروج متاح من أي صفحة، لا من لوحة الحساب وحدها. */
  async function signOut() {
    setLeaving(true);
    try {
      await api('logout', {});
    } finally {
      window.location.assign('/');
    }
  }

  return (
    <Context.Provider value={{ data, error, refresh }}>
      <a className="skip-link" href="#main">
        انتقل إلى المحتوى
      </a>
      <header className="site-header wrap">
        <Link
          className="brand"
          href="/"
          aria-label="Astrospace Club — الرئيسية"
        >
          <Orbit aria-hidden="true" strokeWidth={1.3} />
          <span dir="ltr">
            ASTROSPACE
            <span className="brand-sub">CLUB · نادي الفلك والفضاء</span>
          </span>
        </Link>
        <nav className="desktop-nav" aria-label="التنقل الرئيسي">
          {navigation.map(([href, title]) => (
            <Link
              key={href}
              href={href}
              className={path === href ? 'active' : ''}
              aria-current={path === href ? 'page' : undefined}
              onClick={() => setOpen(false)}
            >
              {title}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <Link
            className="button button-outline header-join"
            href={data?.me ? (data.me.admin ? '/admin' : '/member') : '/login'}
          >
            {data?.me ? 'حسابي' : 'الدخول'}
            <ArrowUpLeft aria-hidden="true" />
          </Link>
          {data?.me && (
            <button
              className="icon-button sign-out"
              onClick={signOut}
              disabled={leaving}
              aria-label="تسجيل الخروج"
              title="تسجيل الخروج"
            >
              <LogOut aria-hidden="true" />
            </button>
          )}
          <button
            className="icon-button menu-toggle"
            onClick={() => setOpen(!open)}
            aria-label={open ? 'إغلاق القائمة' : 'فتح القائمة'}
            aria-expanded={open}
            aria-controls="mobile-nav"
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </header>
      {open && (
        <nav id="mobile-nav" className="mobile-nav wrap" aria-label="القائمة">
          {navigation.map(([href, title]) => (
            <Link
              key={href}
              href={href}
              aria-current={path === href ? 'page' : undefined}
            >
              {title}
            </Link>
          ))}
          {data?.me && (
            <button
              type="button"
              className="mobile-sign-out"
              onClick={signOut}
              disabled={leaving}
            >
              <LogOut aria-hidden="true" size={16} />
              تسجيل الخروج
            </button>
          )}
        </nav>
      )}
      <main id="main">{children}</main>
      <footer className="site-footer wrap">
        <Link className="footer-brand" href="/" dir="ltr">
          ASTROSPACE CLUB
        </Link>
        <span>يجمعنا الفضول، وتلهمنا السماء.</span>
        <Link href="/contact">
          تواصل مع النادي <ArrowUpLeft size={14} />
        </Link>
      </footer>
    </Context.Provider>
  );
}
export function PageIntro({
  kicker,
  title,
  description,
  children,
}: {
  kicker?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <header className="page-intro">
      <div>
        {kicker && <p className="eyebrow">{kicker}</p>}
        <h1>{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      {children}
    </header>
  );
}
export function EmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <Orbit size={28} strokeWidth={1.25} aria-hidden="true" />
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {children}
    </div>
  );
}
export function Loading() {
  return (
    <output className="loading-state">
      <LoaderCircle size={20} />
      <span>جارٍ تحميل البيانات…</span>
    </output>
  );
}
export function ErrorState({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  return (
    <div className="notice notice-error" role="alert">
      <AlertCircle size={20} />
      <div>
        {message}
        {retry && (
          <button className="text-link" onClick={retry}>
            إعادة المحاولة
          </button>
        )}
      </div>
    </div>
  );
}
export function Notice({
  children,
  success = false,
}: {
  children: ReactNode;
  success?: boolean;
}) {
  return (
    <output className={'notice ' + (success ? 'notice-success' : '')}>
      {children}
    </output>
  );
}
export function Field({
  label,
  name,
  defaultValue = '',
  type = 'text',
  required = true,
  maxLength = 120,
  minLength,
  placeholder,
  autoComplete,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
  required?: boolean;
  maxLength?: number;
  minLength?: number;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <label className="field">
      <span>
        {label}
        {required && <span className="required"> *</span>}
      </span>
      <Input
        className="club-input"
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        maxLength={maxLength}
        minLength={minLength}
        placeholder={placeholder}
        autoComplete={autoComplete}
        dir={type === 'tel' ? 'ltr' : undefined}
        inputMode={type === 'tel' ? 'tel' : undefined}
      />
    </label>
  );
}
export function MajorField({ value }: { value?: string }) {
  return (
    <label className="field">
      <span>
        التخصص <span className="required">*</span>
      </span>
      <NativeSelect
        className="club-input"
        name="major"
        required
        defaultValue={value || ''}
      >
        <NativeSelectOption value="" disabled>
          اختر تخصصك
        </NativeSelectOption>
        {MAJORS.map((m) => (
          <NativeSelectOption key={m} value={m}>
            {m}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </label>
  );
}
export function Submit({
  busy,
  children,
}: {
  busy: boolean;
  children: ReactNode;
}) {
  return (
    <button className="button button-primary" type="submit" disabled={busy}>
      {busy ? 'جارٍ الحفظ…' : children}
      {busy ? <LoaderCircle size={18} /> : <ArrowUpLeft size={18} />}
    </button>
  );
}
export function FormNotice({
  error,
  success,
}: {
  error: string;
  success?: string;
}) {
  return (
    <>
      {error && <ErrorState message={error} />}{' '}
      {success && <Notice success>{success}</Notice>}
    </>
  );
}
export function EventRows({ events }: { events: ClubEvent[] }) {
  // الوقت يأتي من الخادم مع بيانات النادي — لا استدعاء غير نقيّ أثناء الرسم
  const { data } = useClub();
  const now = data?.now ?? 0;
  return (
    <div className="event-list">
      {events.map((event) => {
        const ended = event.ends_at < now && !event.demo;
        return (
        <Link className="event-row" key={event.id} href={'/events/' + event.id}>
          <div className="event-date">
            <CalendarDays size={20} />
            <span>{dateLabel(event.starts_at)}</span>
          </div>
          <div className="event-row-title">
            <div className="meta">
              {event.category}
              {!!event.demo && <span className="demo-label">تجريبية</span>}
              {event.status === 'cancelled' && <span>ملغاة</span>}
            </div>
            <h3>{event.title}</h3>
            <p>{event.location}</p>
          </div>
          <span className="event-availability">
            {ended
              ? `حضر ${event.attended} من ${event.registered}`
              : `${Math.max(0, event.capacity - event.registered)} مقعد متاح`}
          </span>
          <ArrowUpLeft size={20} />
        </Link>
        );
      })}
    </div>
  );
}
export function MajorRanking() {
  const { data, error, refresh } = useClub();
  if (error) return <ErrorState message={error} retry={refresh} />;
  if (!data) return <Loading />;
  const max = data.majors[0]?.members || 0,
    leaders = data.majors.filter((m) => m.members === max);
  return (
    <section className="ranking-section">
      <div>
        <p className="eyebrow">التخصصات في النادي</p>
        <h2>
          من يتصدّر
          <br />
          المشهد؟
        </h2>
        <p className="muted">ترتيب حسب عدد الأعضاء، ويُحدّث مع كل عضوية جديدة.</p>
        {max > 0 && (
          <p className="ranking-lead">
            {leaders.length > 1 ? 'صدارة مشتركة' : leaders[0].major}
            <span>{data.totalMembers} عضوًا في النادي</span>
          </p>
        )}
      </div>
      <div>
        {data.majors.length ? (
          <ol className="rank-list">
            {data.majors.map((m) => {
              const rank =
                data.majors.findIndex((x) => x.members === m.members) + 1;
              return (
                <li key={m.major}>
                  <span className="rank-number">
                    {String(rank).padStart(2, '0')}
                  </span>
                  <div>
                    <div className="rank-label">
                      <span>{m.major}</span>
                      <span>
                        {m.members} <small>عضو</small>
                      </span>
                    </div>
                    <progress
                      value={m.members}
                      max={Math.max(1, data.totalMembers)}
                      aria-label={`${m.major}: ${m.members} أعضاء`}
                    />
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <EmptyState
            title="الصدارة تبدأ بأول عضو"
            description="لا توجد عضويات بعد. سجّل عضويتك ليمثّل تخصصك في النادي."
          >
            <Link href="/register" className="text-link">
              سجّل عضويتك <ArrowUpLeft size={16} />
            </Link>
          </EmptyState>
        )}
      </div>
    </section>
  );
}
/**
 * فريق النادي: الأعضاء الذين منحتهم الإدارة رتبة، مرتّبين حسب الأهمية.
 * الترتيب والرتب كلها تُدار من لوحة الإدارة.
 */
export function TeamSection() {
  const { data, error, refresh } = useClub();
  if (error) return <ErrorState message={error} retry={refresh} />;
  if (!data) return <Loading />;
  if (!data.board.length) return null;
  return (
    <section className="team-section">
      <div className="team-head">
        <p className="eyebrow">
          <span className="tiny-line" aria-hidden="true" />
          فريق النادي
        </p>
        <h2>من يقود الرحلة؟</h2>
        <p className="muted">
          الأعضاء الذين يحملون مسؤولية داخل النادي، مرتّبين حسب الدور.
        </p>
      </div>
      <ol className="team-list">
        {data.board.map((m, i) => (
          <li key={m.id}>
            <span className="team-index" aria-hidden="true">
              {String(i + 1).padStart(2, '0')}
            </span>
            <div className="team-body">
              <p className="team-title">{m.title}</p>
              <h3>{m.name}</h3>
              <p className="team-major">{m.major}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
export function AuthGate() {
  return (
    <EmptyState
      title="هذه المساحة لأعضاء النادي"
      description="ادخل برقم الجوال المرتبط بحسابك للوصول إلى عضويتك."
    >
      <Link className="button button-primary" href="/login">
        الدخول إلى النادي
      </Link>
    </EmptyState>
  );
}

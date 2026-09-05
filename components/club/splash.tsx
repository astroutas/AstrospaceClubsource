'use client';
import { useEffect, useRef } from 'react';

/**
 * شاشة الافتتاح — WARP JUMP.
 * سكون، ثم شدّ النجوم إلى خطوط، ثم كبح حاد ووميض يفتح الموقع.
 *
 * قواعد الاستخدام:
 * - تُعرض مرة واحدة لكل جلسة تصفّح، لا مع كل تنقّل.
 * - تُتجاوَز كليًا عند تفعيل «تقليل الحركة»، أو إن فُتح الموقع في تبويب خلفي
 *   (لأن requestAnimationFrame يتوقف هناك وتبقى الطبقة معلّقة).
 * - شبكة أمان زمنية تُخفيها مهما حدث، فلا تحجب الموقع أبدًا.
 * - الموقع مرسوم تحتها من البداية، فلا تؤخّر المحتوى ولا تحجبه عن محركات البحث.
 * - الطبقة تُرسم مخفيّة (hidden) ويكشفها التأثير مباشرة، فلا حالة React ولا إعادة رسم.
 */
const KEY = 'astro-splash-seen';
const RUN = 2400;
const EXIT = 820;

export function Splash() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const labelRef = useRef<HTMLSpanElement | null>(null);
  const valueRef = useRef<HTMLSpanElement | null>(null);
  const copyRef = useRef<HTMLDivElement | null>(null);
  const readoutRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // تبويب خلفي: لا فائدة من عرضٍ لا يراه أحد، ولا نستهلك علامة الجلسة
    if (document.visibilityState !== 'visible') return;
    try {
      if (sessionStorage.getItem(KEY)) return;
      sessionStorage.setItem(KEY, '1');
    } catch {
      return; // التخزين معطّل — نتخطى العرض بدل المخاطرة بتكراره
    }

    const root = rootRef.current;
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!root || !canvas || !context) return;
    root.hidden = false;

    const arabic = (v: string) =>
      v.replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)]).replace('.', '٫');
    const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
    const slice = (p: number, a: number, b: number) => clamp((p - a) / (b - a), 0, 1);
    const easeIn = (t: number) => t * t * t;
    const easeInOut = (t: number) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const TAU = Math.PI * 2;

    let width = 0;
    let height = 0;
    let cx = 0;
    let cy = 0;
    let unit = 1;
    let focal = 1;
    let stars: { x: number; y: number; z: number }[] = [];
    let last = 0;
    let delta = 0;
    let frame = 0;

    const random = (a: number, b: number) => a + Math.random() * (b - a);

    function resize() {
      const w = innerWidth;
      const h = innerHeight;
      let ratio = Math.min(devicePixelRatio || 1, 2);
      const cap = 2_200_000;
      if (w * h * ratio * ratio > cap) ratio = Math.sqrt(cap / (w * h));
      canvas!.width = Math.max(1, Math.round(w * ratio));
      canvas!.height = Math.max(1, Math.round(h * ratio));
      canvas!.style.width = w + 'px';
      canvas!.style.height = h + 'px';
      width = canvas!.width;
      height = canvas!.height;
      cx = width / 2;
      cy = height / 2;
      unit = Math.min(width, height) / 100;
      focal = width * 0.4;
      const count = Math.round(
        Math.min(1000, Math.max(340, (width * height) / 5000)),
      );
      stars = Array.from({ length: count }, () => ({
        x: random(-1, 1),
        y: random(-1, 1),
        z: random(0.04, 1),
      }));
    }

    /** سكون → تسارع → ذروة → كبح حاد */
    function velocity(p: number, boost: number) {
      const up = Math.pow(slice(p, 0.16, 0.66), 2.1);
      const brake = 1 - 0.94 * easeInOut(slice(p, 0.8, 1));
      return (0.018 + 3.6 * up) * brake + boost;
    }

    function field(p: number, boost: number) {
      context!.fillStyle = '#050706';
      context!.fillRect(0, 0, width, height);
      const v = velocity(p, boost);
      const stretch = Math.min(0.92, v * 0.3);
      context!.lineCap = 'round';
      for (const s of stars) {
        s.z -= v * 0.012 * (delta * 60);
        if (s.z <= 0.03) {
          s.x = random(-1, 1);
          s.y = random(-1, 1);
          s.z = 1;
        }
        const k = 1 / s.z;
        const k2 = 1 / (s.z + stretch);
        const x = cx + s.x * k * focal;
        const y = cy + s.y * k * focal;
        if (x < -200 || x > width + 200 || y < -200 || y > height + 200) continue;
        const b = Math.min(1, (1 - s.z) * 1.3);
        if (stretch > 0.01) {
          const x2 = cx + s.x * k2 * focal;
          const y2 = cy + s.y * k2 * focal;
          context!.strokeStyle = `rgba(207,223,157,${b * 0.28})`;
          context!.lineWidth = Math.max(1.4, unit * 0.3);
          context!.beginPath();
          context!.moveTo(x2, y2);
          context!.lineTo(x, y);
          context!.stroke();
          context!.strokeStyle = `rgba(241,243,238,${b * 0.92})`;
          context!.lineWidth = Math.max(0.7, unit * 0.11);
          context!.beginPath();
          context!.moveTo(x2, y2);
          context!.lineTo(x, y);
          context!.stroke();
        } else {
          context!.fillStyle = `rgba(241,243,238,${b})`;
          context!.beginPath();
          context!.arc(x, y, Math.max(0.7, b * unit * 0.2), 0, TAU);
          context!.fill();
        }
      }
      const shade = context!.createRadialGradient(
        cx,
        cy,
        Math.min(width, height) * 0.22,
        cx,
        cy,
        Math.max(width, height) * 0.72,
      );
      shade.addColorStop(0, 'rgba(0,0,0,0)');
      shade.addColorStop(1, 'rgba(0,0,0,0.5)');
      context!.fillStyle = shade;
      context!.fillRect(0, 0, width, height);
      return v;
    }

    function readout(p: number, v: number) {
      if (copyRef.current)
        copyRef.current.style.setProperty('--in', String(slice(p, 0.3, 0.58)));
      if (valueRef.current) valueRef.current.textContent = arabic(v.toFixed(1));
      if (labelRef.current)
        labelRef.current.textContent =
          p < 0.2 ? 'المحرك في وضع السكون' : p < 0.75 ? 'شدّ الضوء' : 'كبح';
    }

    resize();
    const onResize = () => resize();
    addEventListener('resize', onResize);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    let start = 0;
    const step = (now: number) => {
      if (!start) start = now;
      const elapsed = (now - start) / 1000;
      delta = Math.min(0.05, elapsed - last);
      last = elapsed;
      const p = clamp((elapsed * 1000) / RUN, 0, 1);
      const v = field(p, 0);
      readout(p, v);
      if (p < 1) {
        frame = requestAnimationFrame(step);
      } else {
        exitStart = performance.now();
        frame = requestAnimationFrame(exit);
      }
    };

    let exitStart = 0;
    const exit = (now: number) => {
      const k = clamp((now - exitStart) / EXIT, 0, 1);
      field(1, easeIn(k) * 22);
      const flash = slice(k, 0.3, 0.52) * (1 - slice(k, 0.6, 0.9));
      if (flash > 0) {
        const r = Math.hypot(width, height) * (0.2 + k * 1.1);
        const g = context!.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, `rgba(255,255,255,${Math.min(1, flash * 1.7)})`);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        context!.fillStyle = g;
        context!.fillRect(0, 0, width, height);
      }
      const fadeCopy = String(1 - slice(k, 0, 0.28));
      if (copyRef.current) copyRef.current.style.opacity = fadeCopy;
      if (readoutRef.current) readoutRef.current.style.opacity = fadeCopy;
      root.style.opacity = String(1 - slice(k, 0.55, 0.95));
      if (k < 1) {
        frame = requestAnimationFrame(exit);
      } else {
        root.hidden = true;
        document.body.style.overflow = previousOverflow;
      }
    };

    frame = requestAnimationFrame(step);

    // شبكة أمان: مهما تعطّل الرسم، لا تبقى الطبقة فوق الموقع
    const failsafe = setTimeout(() => {
      cancelAnimationFrame(frame);
      root.hidden = true;
      document.body.style.overflow = previousOverflow;
    }, RUN + EXIT + 3000);

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(failsafe);
      removeEventListener('resize', onResize);
      document.body.style.overflow = previousOverflow;
      root.hidden = true;
    };
  }, []);

  return (
    <div className="splash" ref={rootRef} hidden>
      <canvas ref={canvasRef} className="splash-canvas" />
      <div className="splash-copy" ref={copyRef}>
        <h2>نادي الفلك والفضاء</h2>
        <p dir="ltr">WARP JUMP</p>
      </div>
      <div className="splash-readout" ref={readoutRef}>
        <span ref={labelRef}>المحرك في وضع السكون</span>
        <span className="splash-value" ref={valueRef}>
          ٠٫٠
        </span>
      </div>
      <output className="sr-only">جارٍ فتح الموقع</output>
    </div>
  );
}

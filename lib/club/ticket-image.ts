/**
 * يرسم التذكرة صورةً على canvas مباشرة.
 *
 * لماذا لا نلتقط عنصر الصفحة؟ مكتبات التقاط DOM تُضمّن الخطوط بجلبها عبر
 * الشبكة، وتتعلّق إن تعذّر ذلك. الرسم المباشر أخفّ، يعمل بلا إنترنت،
 * ويعطينا تخطيطًا مصمّمًا للحفظ في الألبوم بدل لقطة من الصفحة.
 */
type TicketImage = {
  title: string;
  member: string;
  when: string;
  place: string;
  points: number;
  badge: string;
  token: string;
  qr: string;
  expired: boolean;
  used: boolean;
};

const W = 1080;
const H = 1620;
const PAD = 84;
const BG = '#101311';
const LINE = '#2b312c';
const TEXT = '#f1f3ee';
const MUTED = '#a4aca6';
const ACCENT = '#cfdf9d';
const FONT = 'Tajawal, system-ui, sans-serif';

/**
 * انتظار محدود بمهلة. جاهزية الخطوط وفكّ ترميز الصورة قد لا يستقران
 * إذا كانت الصفحة متوقفة عن الرسم (تبويب خلفي)، فلا نترك الزر معلّقًا.
 */
function within<T>(promise: Promise<T>, ms: number) {
  return Promise.race([
    promise,
    new Promise<undefined>((resolve) => setTimeout(resolve, ms)),
  ]);
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement | undefined>((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(undefined);
    image.src = src;
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** يقسّم النص إلى أسطر تتّسع للعرض المتاح. */
function wrap(ctx: CanvasRenderingContext2D, text: string, max: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? line + ' ' + word : word;
    if (ctx.measureText(next).width > max && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function dashedLine(ctx: CanvasRenderingContext2D, y: number) {
  ctx.save();
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 10]);
  ctx.beginPath();
  ctx.moveTo(PAD, y);
  ctx.lineTo(W - PAD, y);
  ctx.stroke();
  ctx.restore();
}

export async function drawTicket(data: TicketImage): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');

  // ننتظر جاهزية الخط بمهلة؛ إن تأخّر رُسمت العربية بخط احتياطي
  if (document.fonts) await within(document.fonts.ready, 1500);

  ctx.direction = 'rtl';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  // شريط الهوية
  const stripe = ctx.createLinearGradient(0, 0, W, 0);
  stripe.addColorStop(0, 'rgba(207,223,157,0)');
  stripe.addColorStop(0.5, data.expired || data.used ? LINE : ACCENT);
  stripe.addColorStop(1, 'rgba(207,223,157,0)');
  ctx.fillStyle = stripe;
  ctx.fillRect(0, 0, W, 6);

  let y = PAD + 40;

  // الترويسة
  ctx.font = `500 26px ${FONT}`;
  ctx.fillStyle = MUTED;
  ctx.direction = 'ltr';
  ctx.textAlign = 'right';
  ctx.fillText('ASTROSPACE CLUB', W - PAD, y);
  ctx.textAlign = 'left';
  ctx.fillStyle = data.expired ? MUTED : ACCENT;
  ctx.fillText(
    data.used ? 'USED' : data.expired ? 'EXPIRED' : 'ADMIT ONE',
    PAD,
    y,
  );
  ctx.direction = 'rtl';
  ctx.textAlign = 'right';

  // العنوان
  y += 86;
  ctx.fillStyle = TEXT;
  ctx.font = `700 60px ${FONT}`;
  for (const line of wrap(ctx, data.title, W - PAD * 2)) {
    ctx.fillText(line, W - PAD, y);
    y += 78;
  }

  // الحقول
  y += 26;
  const rows: [string, string][] = [
    ['العضو', data.member],
    ['الموعد', data.when],
    ['المكان', data.place],
  ];
  for (const [label, value] of rows) {
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(PAD, y);
    ctx.lineTo(W - PAD, y);
    ctx.stroke();
    y += 44;
    ctx.font = `400 26px ${FONT}`;
    ctx.fillStyle = MUTED;
    ctx.fillText(label, W - PAD, y);
    y += 46;
    ctx.font = `500 36px ${FONT}`;
    ctx.fillStyle = TEXT;
    for (const line of wrap(ctx, value, W - PAD * 2)) {
      ctx.fillText(line, W - PAD, y);
      y += 48;
    }
    y += 18;
  }

  // خط التمزيق
  y += 10;
  dashedLine(ctx, y);
  ctx.fillStyle = BG;
  for (const cx of [PAD - 4, W - PAD + 4]) {
    ctx.beginPath();
    ctx.arc(cx, y, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // رمز QR
  y += 70;
  const qrSize = 380;
  const qrX = (W - qrSize) / 2;
  const image = await within(loadImage(data.qr), 2500);
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, qrX - 26, y - 26, qrSize + 52, qrSize + 52, 20);
  ctx.fill();
  if (image?.naturalWidth) {
    ctx.drawImage(image, qrX, y, qrSize, qrSize);
  }
  // ختم مائل يجعل التذكرة المستخدَمة واضحة من نظرة واحدة
  if (data.used) {
    ctx.save();
    ctx.translate(W / 2, y + qrSize / 2);
    ctx.rotate(-Math.PI / 9);
    ctx.fillStyle = 'rgba(16,19,17,0.86)';
    roundRect(ctx, -210, -46, 420, 92, 12);
    ctx.fill();
    ctx.fillStyle = '#f1f3ee';
    ctx.font = `700 46px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.direction = 'rtl';
    ctx.fillText('تم الاستخدام', 0, 16);
    ctx.restore();
    ctx.textAlign = 'right';
  }
  y += qrSize + 76;

  // الرمز النصّي
  ctx.textAlign = 'center';
  ctx.direction = 'ltr';
  ctx.font = `400 22px ui-monospace, monospace`;
  ctx.fillStyle = MUTED;
  for (const line of wrap(ctx, data.token.replace(/(.{34})/g, '$1 '), W - PAD * 2)) {
    ctx.fillText(line, W / 2, y);
    y += 32;
  }

  // النقاط والشارة
  ctx.direction = 'rtl';
  y = H - PAD - 46;
  dashedLine(ctx, y - 54);
  ctx.textAlign = 'right';
  ctx.font = `400 24px ${FONT}`;
  ctx.fillStyle = MUTED;
  ctx.fillText('عند الحضور', W - PAD, y);
  ctx.textAlign = 'left';
  ctx.fillText('الشارة', PAD, y);
  y += 44;
  ctx.font = `500 34px ${FONT}`;
  ctx.fillStyle = data.expired ? MUTED : ACCENT;
  ctx.textAlign = 'right';
  ctx.fillText(`${data.points} نقطة`, W - PAD, y);
  ctx.textAlign = 'left';
  ctx.fillText(data.badge || '—', PAD, y);

  return canvas.toDataURL('image/png');
}

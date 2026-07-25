// =============================================================================
// AXION STUDIO — Kontaktformular-Mailer (Supabase Edge Function, Deno)
// Sendet die Formular-Anfrage per ROHEM SMTP über TLS an Strato (smtp.strato.de)
// — kein Resend, keine Mailer-Lib (denomailer wrappt multipart, das rendert im
// Strato-Webmail als roher MIME-Quelltext). SINGLE-PART text/html, base64.
// Muster 1:1 von der funktionierenden Curadoma-Function übernommen.
//
// Secrets (Supabase → Project Settings → Edge Functions → Secrets):
//   SMTP_USER  = info@axion-studio.de        (Strato-Postfach-Login)
//   SMTP_PASS  = <Postfach-Passwort>
//   SMTP_HOST  = smtp.strato.de              (optional, default)
//   SMTP_PORT  = 465                         (465 = implizit TLS, 587 = STARTTLS)
//   MAIL_FROM  = Axion Studio <info@axion-studio.de>   (Strato lehnt fremde Absender ab)
//   MAIL_TO    = info@axion-studio.de        (Empfänger der Anfragen)
//
// Deploy mit "Verify JWT" = AUS (öffentliches Formular).
// =============================================================================

import postgres from "https://deno.land/x/postgresjs@v3.4.5/mod.js";

const ALLOWED_ORIGINS = [
  "https://axion-studio.de",
  "https://www.axion-studio.de",
  "https://chaos20140.github.io",
];

function corsHeaders(origin: string | null): Record<string, string> {
  const allow = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
    "Vary": "Origin",
  };
}

// Grenzen für den rohen SMTP-Dialog: pro Lese-/Schreibvorgang und für die
// Gesamtgröße einer Serverantwort.
const SMTP_IO_TIMEOUT_MS = 15_000;
const SMTP_MAX_RESPONSE = 64 * 1024;

// ---- helpers ---------------------------------------------------------------
const headerSafe = (s: string): string => String(s ?? "").replace(/[\r\n\0]/g, " ").trim();
const esc = (s: string): string =>
  String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
// Bewusst enger als RFC 5322: keine Zeichen, die in Header-, mailto- oder
// SMTP-Kontexten Sonderbedeutung haben (< > " ' ? & ; : , Backslash Klammern),
// kein Nicht-ASCII, Gesamtlänge nach RFC 5321 höchstens 254 Zeichen. Das kostet
// eine Handvoll exotischer, praktisch nie vergebener Adressen und schließt dafür
// die mailto-Parameter-Injektion in den Mail-Templates und 501er-RCPT-Fehler aus.
const isEmail = (s: string): boolean =>
  s.length <= 254 && /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,63}$/.test(s);

const base64Utf8 = (s: string): string => {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
};
const chunk76 = (s: string): string => (s.match(/.{1,76}/g) ?? []).join("\r\n");
const extractEmail = (addr: string): string => {
  const m = String(addr).match(/<([^>]+)>/);
  return (m ? m[1] : String(addr)).trim();
};
const rfc2822Date = (d: Date): string => {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const p = (n: number) => String(n).padStart(2, "0");
  return `${days[d.getUTCDay()]}, ${p(d.getUTCDate())} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()} ` +
    `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())} +0000`;
};

// ---- Persistentes Rate-Limit pro IP (Postgres) -----------------------------
// Supabase teilt keinen Speicher zwischen Edge-Instanzen → In-Memory wirkungslos.
// Daher in Postgres (SUPABASE_DB_URL, in Edge Functions auto-injiziert).
// FAIL-OPEN: schlägt die DB fehl, wird NICHT blockiert (Formular bleibt nutzbar).
const RL_WINDOW_MIN = 15;     // Fenster in Minuten
const RL_MAX = 5;             // max. Anfragen pro IP / Fenster
const RL_BURST_MAX = 2;       // max. pro Minute
// Requests ohne verwertbare IP laufen alle gegen EINEN gemeinsamen Zähler.
// Nicht hart blocken (sonst legt ein fehlender Header das Formular lahm),
// aber deutlich strenger als ein identifizierbarer Absender.
const RL_UNKNOWN_MAX = 2;
const RL_UNKNOWN_BURST = 1;

// Nur formal valide IPs als Rate-Limit-Key akzeptieren — X-Forwarded-For ist
// client-beeinflussbar; Garbage-Werte würden sonst als "frische" Keys das
// Limit aushebeln und die Tabelle zumüllen.
const isIp = (s: string): boolean =>
  /^(\d{1,3}\.){3}\d{1,3}$/.test(s) || /^[0-9a-fA-F:]{2,45}$/.test(s);

// X-Forwarded-For wird von jedem Proxy ANGEHÄNGT — ein vom Client selbst
// gesetzter Wert steht deshalb VORNE in der Liste. Nur der LETZTE Eintrag stammt
// vom Proxy direkt vor uns und ist nicht fälschbar. Wer den ersten passenden
// Eintrag nimmt, kann sein Rate-Limit mit einem beliebigen Header aushebeln.
function clientIp(req: Request): string {
  const xff = (req.headers.get("x-forwarded-for") ?? "")
    .split(",").map((s) => s.trim()).filter(Boolean);
  const candidate = xff.at(-1) ?? req.headers.get("x-real-ip") ?? "";
  return isIp(candidate) ? candidate : "unknown";
}

async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode("axion-rl:" + ip);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).slice(0, 16)
    .map((b) => b.toString(16).padStart(2, "0")).join("");
}

let _sql: ReturnType<typeof postgres> | null = null;
let _ready: Promise<unknown> | null = null;
function db() {
  if (_sql) return _sql;
  const url = Deno.env.get("SUPABASE_DB_URL");
  if (!url) return null;
  _sql = postgres(url, { prepare: false, idle_timeout: 20, max: 3 });
  _ready = _sql`create table if not exists public.mail_rate_limits (
    id bigint generated always as identity primary key,
    ip text not null,
    created_at timestamptz not null default now()
  )`.then(() =>
    _sql!`create index if not exists mail_rate_limits_ip_time on public.mail_rate_limits (ip, created_at)`
  ).then(() =>
    // Supabase vergibt im public-Schema per Default-Privileges Rechte an anon und
    // authenticated — ohne diese beiden Zeilen wäre die Tabelle über PostgREST
    // les- und schreibbar und stünde im öffentlichen OpenAPI-Schema. Die Function
    // selbst verbindet als Eigentümer und wird von RLS nicht eingeschränkt.
    _sql!`alter table public.mail_rate_limits enable row level security`
  ).then(() =>
    _sql!`revoke all on public.mail_rate_limits from anon, authenticated`
  ).catch((e) => console.log("rate-limit DDL error:", e));
  return _sql;
}

async function rateLimited(ip: string, max: number, burstMax: number): Promise<boolean> {
  const sql = db();
  if (!sql) return false; // kein DB-URL → fail-open
  try {
    if (_ready) await _ready;
    // Zählen und Buchen MÜSSEN in einer Transaktion mit Advisory-Lock laufen.
    // Ohne den Lock lesen gleichzeitig eintreffende Requests denselben Zähler-
    // stand, bestehen alle die Prüfung und buchen erst danach — das Limit
    // greift dann nur gegen sequentielle Angreifer, nicht gegen parallele.
    // Der Lock gilt pro IP-Hash und wird am Transaktionsende automatisch frei.
    const blocked = await sql.begin(async (tx: typeof sql) => {
      await tx`select pg_advisory_xact_lock(hashtext(${ip}))`;
      const rows = await tx`
        select
          count(*) filter (where created_at > now() - make_interval(mins => ${RL_WINDOW_MIN}))::int as window_n,
          count(*) filter (where created_at > now() - interval '1 minute')::int as burst_n
        from public.mail_rate_limits where ip = ${ip}
      `;
      const { window_n, burst_n } = rows[0] ?? { window_n: 0, burst_n: 0 };
      if (window_n >= max || burst_n >= burstMax) return true;
      await tx`insert into public.mail_rate_limits (ip) values (${ip})`;
      return false;
    });
    // Aufräumen bewusst außerhalb der Transaktion und ohne await — ein Fehler
    // beim Housekeeping darf weder das Ergebnis verfälschen noch den Versand
    // verzögern.
    sql`delete from public.mail_rate_limits where created_at < now() - interval '1 hour'`
      .catch((e: unknown) => console.log("rate-limit cleanup error:", e));
    return blocked;
  } catch (e) {
    console.log("rate-limit DB error (fail-open):", e);
    return false; // DB-Problem darf das Formular nicht lahmlegen
  }
}

function buildRawMessage(
  fromHeader: string, toList: string[], replyTo: string, subject: string, html: string,
): string {
  const subjectHeader = `=?UTF-8?B?${base64Utf8(headerSafe(subject))}?=`;
  const body = chunk76(base64Utf8(html))
    .split("\r\n")
    .map((l) => (l.startsWith(".") ? "." + l : l)) // SMTP dot-stuffing
    .join("\r\n");
  const headers = [
    `From: ${fromHeader}`,
    `To: ${toList.join(", ")}`,
    replyTo ? `Reply-To: ${replyTo}` : null,
    `Subject: ${subjectHeader}`,
    `Date: ${rfc2822Date(new Date())}`,
    `Message-ID: <${crypto.randomUUID()}@axion-studio.de>`,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
  ].filter(Boolean).join("\r\n");
  return `${headers}\r\n\r\n${body}\r\n.\r\n`;
}

async function sendEmail(opts: {
  to: string | string[]; subject: string; html: string; reply_to?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = Deno.env.get("SMTP_USER");
  const pass = Deno.env.get("SMTP_PASS");
  if (!user || !pass) return { ok: false, error: "SMTP_USER/SMTP_PASS sind nicht konfiguriert." };

  const toList = (Array.isArray(opts.to) ? opts.to : [opts.to])
    .filter(Boolean).map((a) => extractEmail(headerSafe(a)));
  if (toList.length === 0) return { ok: false, error: "Kein Empfänger." };

  const hostname = Deno.env.get("SMTP_HOST") ?? "smtp.strato.de";
  const port = Number(Deno.env.get("SMTP_PORT") ?? "465");
  const fromHeader = headerSafe(Deno.env.get("MAIL_FROM") ?? `Axion Studio <${user}>`);
  const fromEmail = extractEmail(fromHeader);
  // Nur eine formal gültige Adresse darf als Reply-To in den Header — sonst
  // landet Freitext in einem Adressfeld und der Header wird unbrauchbar.
  const replyToRaw = opts.reply_to ? extractEmail(headerSafe(opts.reply_to)) : "";
  const replyTo = isEmail(replyToRaw) ? replyToRaw : "";

  let conn: Deno.Conn | null = null;
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const readBuf = new Uint8Array(8192);

  // Ohne Zeit- und Größengrenze kann ein hängender oder bösartiger SMTP-Server
  // die Function bis zum Plattform-Timeout blockieren bzw. den Speicher fluten.
  const withTimeout = async <T>(p: Promise<T>, ms: number, msg: string): Promise<T> => {
    let t: number | undefined;
    try {
      return await Promise.race([
        p,
        new Promise<never>((_, rej) => { t = setTimeout(() => rej(new Error(msg)), ms); }),
      ]);
    } finally {
      if (t !== undefined) clearTimeout(t);
    }
  };

  const readResponse = async (): Promise<{ code: number; text: string }> => {
    let data = "";
    while (true) {
      const n = await withTimeout(conn!.read(readBuf), SMTP_IO_TIMEOUT_MS, "SMTP-Zeitüberschreitung beim Lesen.");
      if (n === null) break;
      data += decoder.decode(readBuf.subarray(0, n));
      if (data.length > SMTP_MAX_RESPONSE) throw new Error("SMTP-Antwort überschreitet das Größenlimit.");
      const lines = data.split("\n").map((l) => l.replace(/\r$/, "")).filter((l) => l.length > 0);
      const last = lines[lines.length - 1] ?? "";
      // "250 OK" schließt die Antwort ab, "250-..." ist eine Fortsetzungszeile.
      // Der Code muss aus DIESER Schlusszeile kommen — ein Match irgendwo im
      // gesamten Puffer träfe sonst auch dreistellige Zahlen aus dem Banner-Text.
      if (/^\d{3} /.test(last)) return { code: Number(last.slice(0, 3)), text: data.trim() };
    }
    const m = data.match(/^(\d{3})/m);
    return { code: m ? Number(m[1]) : 0, text: data.trim() };
  };

  // conn.write() darf laut Deno-API weniger Bytes schreiben als übergeben —
  // ungeprüft würde der DATA-Block stillschweigend abgeschnitten und die Mail
  // käme unvollständig oder gar nicht an.
  const writeAll = async (bytes: Uint8Array): Promise<void> => {
    let off = 0;
    while (off < bytes.length) {
      const n = await withTimeout(
        conn!.write(bytes.subarray(off)), SMTP_IO_TIMEOUT_MS, "SMTP-Zeitüberschreitung beim Senden.",
      );
      if (n <= 0) throw new Error("SMTP-Verbindung hat das Schreiben abgebrochen.");
      off += n;
    }
  };
  const write = (line: string) => writeAll(encoder.encode(line + "\r\n"));
  const expect = (res: { code: number; text: string }, ok: number[]) => {
    if (!ok.includes(res.code)) throw new Error(`SMTP ${res.code}: ${res.text.slice(0, 200)}`);
  };

  try {
    conn = port === 465
      ? await Deno.connectTls({ hostname, port })
      : await Deno.connect({ hostname, port });
    expect(await readResponse(), [220]);
    await write(`EHLO ${hostname}`);
    expect(await readResponse(), [250]);

    if (port !== 465) {
      await write("STARTTLS");
      expect(await readResponse(), [220]);
      conn = await Deno.startTls(conn as Deno.TcpConn, { hostname });
      await write(`EHLO ${hostname}`);
      expect(await readResponse(), [250]);
    }

    await write("AUTH LOGIN");
    expect(await readResponse(), [334]);
    await write(base64Utf8(user));
    expect(await readResponse(), [334]);
    await write(base64Utf8(pass));
    expect(await readResponse(), [235]);

    await write(`MAIL FROM:<${fromEmail}>`);
    expect(await readResponse(), [250]);
    for (const rcpt of toList) {
      await write(`RCPT TO:<${rcpt}>`);
      expect(await readResponse(), [250, 251]);
    }
    await write("DATA");
    expect(await readResponse(), [354]);
    await writeAll(encoder.encode(buildRawMessage(fromHeader, toList, replyTo, opts.subject, opts.html)));
    expect(await readResponse(), [250]);
    await write("QUIT");
    try { await readResponse(); } catch (_) { /* ignore */ }
    try { conn.close(); } catch (_) { /* ignore */ }
    return { ok: true };
  } catch (err) {
    try { conn?.close(); } catch (_) { /* ignore */ }
    console.log("SMTP send error:", err);
    return { ok: false, error: `SMTP-Fehler: ${(err as Error)?.message ?? err}` };
  }
}

// ---- branded email templates (Axion-Look, email-safe tables + inline CSS) --
const BG = "#060305", CARD = "#0c0709", RED = "#ff1f3d", INK = "#f4ecec", MUTE = "#ab9fa0", LINE = "rgba(255,31,61,0.28)";
const FONT = "Arial,Helvetica,sans-serif";
const SITE = "https://axion-studio.de";
const HEADER_IMG = `${SITE}/assets/images/email-header.jpg`;

// Gemeinsames Gerüst: gebrandeter Motorsport-Header (ein gehostetes Bild →
// rendert überall identisch, auch in Outlook) + Marken-Fußleiste. "inner"
// liefert die mittleren <tr>…</tr>-Zeilen, "note" die Footer-Kontextzeile.
function wrap(inner: string, note: string, pre: string): string {
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"></head>
  <body style="margin:0;padding:0;background:#050607;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${pre}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#050607;">
   <tr><td align="center" style="padding:32px 12px;">
    <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background:#090a0b;border:1px solid #2a2c30;box-shadow:0 18px 60px rgba(0,0,0,.45);">
      <tr><td style="height:4px;background:${RED};font-size:0;line-height:0;">&nbsp;</td></tr>
      <tr><td style="padding:0;font-size:0;line-height:0;">
        <img src="${HEADER_IMG}" width="640" alt="Axion Studio — Web-Design-Studio aus Meschede" style="display:block;width:100%;max-width:640px;height:auto;border:0;" />
      </td></tr>
      ${inner}
      <tr><td style="padding:26px 32px;border-top:1px solid ${LINE};">
        <div style="font:800 19px ${FONT};letter-spacing:.06em;text-transform:uppercase;color:${INK};">AXION STUDIO</div>
        <div style="font:700 10px ${FONT};letter-spacing:.22em;text-transform:uppercase;color:${MUTE};margin-top:7px;">WEB DESIGN · DEVELOPMENT · MOTION · HOSTING</div>
        <div style="font:400 13px/1.9 ${FONT};color:${INK};margin-top:16px;">
          <a href="mailto:info@axion-studio.de" style="color:${RED};text-decoration:none;">info@axion-studio.de</a><br>
          Meschede, DE &nbsp;·&nbsp; <a href="tel:+4917676668002" style="color:${INK};text-decoration:none;">+49 176 76668002</a> &nbsp;·&nbsp; <a href="${SITE}" style="color:${INK};text-decoration:none;">axion-studio.de</a>
        </div>
        <div style="font:400 11px/1.7 ${FONT};color:${MUTE};margin-top:18px;border-top:1px solid ${LINE};padding-top:14px;">
          © 2026 Axion Studio · Alle Rechte vorbehalten.<br>${note}
        </div>
      </td></tr>
    </table>
   </td></tr>
  </table></body></html>`;
}

function row(label: string, value: string): string {
  return `<tr>
    <td style="padding:14px 0;border-top:1px solid ${LINE};font:700 11px ${FONT};letter-spacing:.22em;text-transform:uppercase;color:${RED};width:160px;vertical-align:top;">${esc(label)}</td>
    <td style="padding:14px 0;border-top:1px solid ${LINE};font:400 15px/1.6 ${FONT};color:${INK};vertical-align:top;">${value || `<span style="color:${MUTE};">—</span>`}</td>
  </tr>`;
}

function notifyHtml(d: {
  name: string; email: string; company: string; services: string; budget: string; message: string;
}): string {
  const msg = esc(d.message).replace(/\n/g, "<br>");
  const inner = `
      <tr><td style="padding:30px 32px 4px;">
        <div style="font:700 11px ${FONT};letter-spacing:.3em;text-transform:uppercase;color:${RED};">● NEUES SIGNAL — PROJEKT-ANFRAGE</div>
        <div style="font:800 30px/1.04 ${FONT};letter-spacing:.01em;text-transform:uppercase;color:${INK};margin-top:14px;">${esc(d.name)}</div>
        <div style="font:400 14px ${FONT};color:${MUTE};margin-top:6px;">
          <a href="mailto:${esc(d.email)}" style="color:${RED};text-decoration:none;">${esc(d.email)}</a>${d.company ? ` &nbsp;·&nbsp; ${esc(d.company)}` : ""}
        </div>
      </td></tr>
      <tr><td style="padding:16px 32px 8px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${row("Services", esc(d.services))}
          ${row("Budget", esc(d.budget))}
          ${row("Briefing", msg)}
        </table>
      </td></tr>
      <tr><td style="padding:8px 32px 30px;">
        <a href="mailto:${esc(d.email)}" style="display:inline-block;background:${RED};color:#fff;font:700 12px ${FONT};letter-spacing:.18em;text-transform:uppercase;text-decoration:none;padding:14px 26px;">Direkt antworten →</a>
      </td></tr>`;
  return wrap(inner, "Automatische Benachrichtigung vom Kontaktformular auf axion-studio.de.", "Neue Kontaktanfrage über axion-studio.de.");
}

function replyHtml(name: string): string {
  const inner = `
      <tr><td style="padding:34px 32px 8px;">
        <div style="font:700 11px ${FONT};letter-spacing:.3em;text-transform:uppercase;color:${RED};">● SIGNAL EMPFANGEN</div>
        <div style="font:800 34px/1.02 ${FONT};text-transform:uppercase;color:${INK};margin-top:14px;">Danke, ${esc(name)}.</div>
      </td></tr>
      <tr><td style="padding:6px 32px 30px;font:400 16px/1.65 ${FONT};color:${INK};">
        Deine Anfrage ist bei uns <strong style="color:${INK};">eingegangen</strong> und wird bereits bearbeitet. Einer von uns meldet sich in der Regel <strong style="color:${INK};">innerhalb von 24 Stunden</strong> persönlich bei dir.
        <br><br>
        <span style="color:${MUTE};">Bis dahin: Vollgas. 🏁</span>
        <br><br>
        — Tolunay, Axion Studio
      </td></tr>`;
  return wrap(inner, "Du erhältst diese E-Mail, weil du eine Anfrage über axion-studio.de gestellt hast.", "Danke für deine Anfrage bei Axion Studio — wir melden uns in der Regel innerhalb von 24 Stunden.");
}

// ---- request handler -------------------------------------------------------
Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const cors = corsHeaders(origin);

  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), {
      status: 405, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));

    // Honeypot: Bots füllen das versteckte Feld → still als ok abtun.
    if (headerSafe(String(body.website ?? "")) !== "") {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Rate-Limit: schützt vor Spam/Missbrauch des Auto-Reply-Versands.
    // IP wird VOR dem Speichern gehasht (Datenminimierung, Art. 5 DSGVO) —
    // fürs Fenster-Zählen reicht ein stabiler Schlüssel, die rohe IP nicht nötig.
    const ip = clientIp(req);
    const ipKey = ip === "unknown" ? "__unknown__" : await hashIp(ip);
    const rlMax = ip === "unknown" ? RL_UNKNOWN_MAX : RL_MAX;
    const rlBurst = ip === "unknown" ? RL_UNKNOWN_BURST : RL_BURST_MAX;
    if (await rateLimited(ipKey, rlMax, rlBurst)) {
      return new Response(JSON.stringify({
        ok: false,
        error: "Zu viele Anfragen in kurzer Zeit. Bitte versuch es in ein paar Minuten erneut – oder schreib direkt an info@axion-studio.de.",
      }), {
        status: 429,
        headers: { ...cors, "Content-Type": "application/json", "Retry-After": "300" },
      });
    }

    const name = headerSafe(String(body.name ?? "")).slice(0, 120);
    const email = headerSafe(String(body.email ?? "")).slice(0, 160);
    const company = headerSafe(String(body.company ?? "")).slice(0, 160);
    const services = Array.isArray(body.services)
      ? body.services.map((s: unknown) => headerSafe(String(s))).filter(Boolean).join(" · ").slice(0, 200)
      : headerSafe(String(body.services ?? "")).slice(0, 200);
    const budget = headerSafe(String(body.budget ?? "")).slice(0, 60);
    const message = String(body.message ?? "").replace(/\0/g, "").slice(0, 5000).trim();

    if (!name || !email || !message) {
      return new Response(JSON.stringify({ ok: false, error: "Pflichtfelder fehlen (Name, E-Mail, Briefing)." }), {
        status: 422, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if (!isEmail(email)) {
      return new Response(JSON.stringify({ ok: false, error: "Ungültige E-Mail-Adresse." }), {
        status: 422, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const to = Deno.env.get("MAIL_TO") ?? Deno.env.get("SMTP_USER") ?? "";

    // 1) Studio-Benachrichtigung (Pflicht) — Reply-To = Interessent.
    const notify = await sendEmail({
      to,
      subject: `🏁 Projekt-Anfrage von ${name}${company ? " · " + company : ""}`,
      html: notifyHtml({ name, email, company, services, budget, message }),
      // NUR die validierte Adresse, kein Display-Name: der Name ist Freitext und
      // hätte über eingeschmuggelte spitze Klammern die Reply-To-Adresse ersetzen
      // können ("Max <angreifer@example.com>" ⇒ Antwort geht an den Angreifer).
      reply_to: email,
    });
    if (!notify.ok) {
      // Detail nur ins Log — SMTP-Wortlaut (Hosts, Codes, Konfig) gehört nicht an den Client.
      console.log("notify send failed:", notify.error);
      return new Response(JSON.stringify({ ok: false, error: "Senden fehlgeschlagen. Schreib uns direkt an info@axion-studio.de." }), {
        status: 502, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // 2) Auto-Reply an den Interessenten (best-effort — Fehler kippt die Antwort nicht).
    try {
      await sendEmail({
        to: email,
        subject: "Signal empfangen — Axion Studio meldet sich",
        html: replyHtml(name),
      });
    } catch (_) { /* ignore */ }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.log("handler error:", err);
    return new Response(JSON.stringify({ ok: false, error: "Serverfehler. Schreib uns direkt an info@axion-studio.de." }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});

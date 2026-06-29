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

// ---- helpers ---------------------------------------------------------------
const headerSafe = (s: string): string => String(s ?? "").replace(/[\r\n\0]/g, " ").trim();
const esc = (s: string): string =>
  String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const isEmail = (s: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

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
  const replyTo = opts.reply_to ? extractEmail(headerSafe(opts.reply_to)) : "";

  let conn: Deno.Conn | null = null;
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const readBuf = new Uint8Array(8192);

  const readResponse = async (): Promise<{ code: number; text: string }> => {
    let data = "";
    while (true) {
      const n = await conn!.read(readBuf);
      if (n === null) break;
      data += decoder.decode(readBuf.subarray(0, n));
      const lines = data.split("\n").map((l) => l.replace(/\r$/, "")).filter((l) => l.length > 0);
      const last = lines[lines.length - 1] ?? "";
      if (/^\d{3} /.test(last)) break;
    }
    const m = data.match(/(\d{3})/);
    return { code: m ? Number(m[1]) : 0, text: data.trim() };
  };
  const write = (line: string) => conn!.write(encoder.encode(line + "\r\n"));
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
    await conn.write(encoder.encode(buildRawMessage(fromHeader, toList, replyTo, opts.subject, opts.html)));
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
        Deine Anfrage ist bei uns <strong style="color:${INK};">eingegangen</strong> und wird bereits bearbeitet. Einer von uns meldet sich in der Regel <strong style="color:${INK};">innerhalb von 24 Stunden</strong> persönlich bei dir — mit einer ehrlichen Einschätzung, ob wir der richtige Partner sind, was es kostet und wann wir starten können.
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
      reply_to: `${name} <${email}>`,
    });
    if (!notify.ok) {
      return new Response(JSON.stringify({ ok: false, error: notify.error }), {
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
    return new Response(JSON.stringify({ ok: false, error: `Serverfehler: ${(err as Error)?.message ?? err}` }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});

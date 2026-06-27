import { Hono } from 'hono';
import type { AppEnv } from '../index';
import { sendMail } from '../email';
import { enforce, clientIp } from '../ratelimit';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Public support contact form. Relays the user's message to the PRIVATE support inbox
// (env.SUPPORT_EMAIL — a worker secret, never sent to the client) via Resend, with the
// sender's address as reply-to so the team can reply directly. Rate-limited per IP;
// Turnstile will gate this too once wired (backlog #4).
export const supportRoutes = new Hono<AppEnv>();

supportRoutes.post('/api/support/contact', async (c) => {
  const rl = await enforce(c, `support:${clientIp(c)}`, 5, 3600);
  if (rl) return rl;
  const body = (await c.req.json().catch(() => ({}))) as {
    email?: string;
    message?: string;
    subject?: string;
  };
  const email = (body.email ?? '').trim();
  const message = (body.message ?? '').trim();
  if (!EMAIL_RE.test(email)) return c.json({ error: 'A valid email is required' }, 400);
  if (message.length < 5) return c.json({ error: 'Please enter a message' }, 400);
  if (message.length > 5000) return c.json({ error: 'Message is too long (5000 chars max)' }, 400);

  // Not configured (no SUPPORT_EMAIL secret) → accept but no-op, so the UI degrades gracefully.
  if (!c.env.SUPPORT_EMAIL) {
    console.log('[support] SUPPORT_EMAIL not configured; message dropped');
    return c.json({ ok: true, delivered: false });
  }

  const subject = ((body.subject ?? '').trim() || 'Support request').slice(0, 120);
  // Short, human-friendly tracking id — included in both emails and the API response so a request
  // is easy to reference. (Email is the record for now; persist to D1 later for a queryable queue.)
  const ticketId = `TC-${crypto.randomUUID().split('-')[0].toUpperCase()}`;
  const html = `<p><strong>Request ID:</strong> ${ticketId}</p>
    <p><strong>From:</strong> ${escapeHtml(email)}</p>
    <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
    <hr>
    <p style="white-space:pre-wrap">${escapeHtml(message)}</p>`;
  const r = await sendMail(
    c.env,
    c.env.SUPPORT_EMAIL,
    `[Token Circles] ${subject} (${ticketId})`,
    html,
    { replyTo: email }
  );

  // Best-effort acknowledgement back to the user, with their reference id. No reply-to override →
  // replies go to the From (hello@), keeping SUPPORT_EMAIL private. Covered by the 5/h/IP rate limit.
  const ackHtml = `<p>Thanks for reaching out to Token Circles. We've received your message and will get back to you as soon as we can.</p>
    <p>Your reference number is <strong>${ticketId}</strong> — please mention it if you follow up.</p>
    <p style="color:#6b7280;font-size:13px">For your records, here's what you sent:</p>
    <blockquote style="border-left:3px solid #e5e7eb;margin:8px 0;padding:4px 12px;color:#374151;white-space:pre-wrap">${escapeHtml(message)}</blockquote>
    <p style="color:#6b7280;font-size:12px">If you didn't contact us, you can safely ignore this email.</p>`;
  await sendMail(
    c.env,
    email,
    `We received your message (${ticketId}) — Token Circles`,
    ackHtml
  ).catch(() => {
    /* ack is best-effort; the support message already went through */
  });

  return c.json({ ok: true, delivered: r.sent, ticketId });
});

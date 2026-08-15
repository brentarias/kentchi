/**
 * submission-created — auto-acknowledge an order request.
 *
 * The filename is the contract: Netlify invokes a function named
 * `submission-created` automatically on every successful form submission, with
 * the submission in `payload`. No webhook to register, nothing to keep in sync.
 *
 * This is separate from the *notification* email Kent receives. That is a
 * site-level hook configured outside the repo and sends to a fixed address;
 * it cannot reply to the person who submitted. This does that half.
 *
 * Guarantees, in priority order:
 *   1. Never break a submission. The order is already safely stored by the time
 *      this runs, so every failure path returns 200 and logs. A bounced
 *      acknowledgement must never look like a failed order.
 *   2. Never send twice, and never to the wrong person — contact-form
 *      submissions are ignored; only order requests are acknowledged.
 *   3. Say only what is true. The copy promises a personal reply, which Kent
 *      actually sends; it does not pretend to be a receipt or a confirmed sale.
 */

// Kent has no mailbox at kentosborn.studio — the domain has no MX records — so
// the From address can never receive anything. Replies are steered to a real
// inbox instead; people absolutely do reply to these.
const FROM = 'Keyhole Mystic Publishing <orders@kentosborn.studio>';
const REPLY_TO = 'ayahuaskent@gmail.com';

const COPY = {
  en: {
    subject: (id) => `We have your request — ${id}`,
    body: (name, id, summary) => [
      `Hi ${name || 'there'},`,
      ``,
      `Your request reached the studio. Nothing has been charged and nothing is`,
      `committed yet — this simply opens the conversation.`,
      ``,
      `Your reference: ${id}`,
      ``,
      `What you asked about:`,
      summary || '(no items listed)',
      ``,
      `Kent will reply personally with a quote for your country, including`,
      `shipping. If you need to add anything in the meantime, reply to this`,
      `email and mention ${id}.`,
      ``,
      `— Keyhole Mystic Publishing`,
    ].join('\n'),
  },
  es: {
    subject: (id) => `Recibimos tu solicitud — ${id}`,
    body: (name, id, summary) => [
      `Hola ${name || ''},`.trim(),
      ``,
      `Tu solicitud llegó al estudio. No se ha cobrado nada y nada está`,
      `comprometido todavía — esto simplemente inicia la conversación.`,
      ``,
      `Tu número de referencia: ${id}`,
      ``,
      `Lo que solicitaste:`,
      summary || '(no se indicaron artículos)',
      ``,
      `Kent te responderá personalmente con una cotización para tu país,`,
      `incluido el envío. Si necesitas agregar algo mientras tanto, responde a`,
      `este correo y menciona ${id}.`,
      ``,
      `— Keyhole Mystic Publishing`,
    ].join('\n'),
  },
};

export default async (req) => {
  const ok = () => new Response('ok', { status: 200 });

  let payload;
  try {
    ({ payload } = await req.json());
  } catch (err) {
    console.error('submission-created: unreadable body —', err.message);
    return ok();
  }

  const formName = payload?.form_name ?? '';
  // Contact enquiries get a human reply, not an acknowledgement of an order.
  if (!formName.startsWith('order-request')) {
    console.log(`submission-created: ignoring form "${formName}"`);
    return ok();
  }

  const data = payload.data ?? {};
  const to = (data.email ?? '').trim();
  const id = (data.enquiry_id ?? '').trim() || '(no reference)';
  if (!to) {
    console.warn(`submission-created: ${id} has no email address; nothing to acknowledge`);
    return ok();
  }

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error('submission-created: RESEND_API_KEY is not set — acknowledgement skipped');
    return ok();
  }

  // The form name carries the locale, which is exactly why each page declares
  // its own: order-request-es came from the Spanish page.
  const copy = formName.endsWith('-es') ? COPY.es : COPY.en;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM,
        to: [to],
        reply_to: REPLY_TO,
        subject: copy.subject(id),
        text: copy.body(data.name, id, data.order_summary),
      }),
    });
    if (!res.ok) {
      // Body is logged because Resend explains refusals precisely (unverified
      // domain, invalid recipient), and this is the only place that surfaces.
      console.error(`submission-created: ${id} — Resend ${res.status}: ${await res.text()}`);
      return ok();
    }
    console.log(`submission-created: acknowledged ${id} to ${to}`);
  } catch (err) {
    console.error(`submission-created: ${id} — send failed:`, err.message);
  }
  return ok();
};

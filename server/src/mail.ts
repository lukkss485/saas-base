interface SendMailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendMail({ to, subject, html, text }: SendMailOptions): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;

  // Sem chave configurada, o e-mail é só impresso no terminal (desenvolvimento)
  if (!apiKey) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('RESEND_API_KEY não configurada');
  }
  console.log(`\n[e-mail de desenvolvimento]\nPara: ${to}\nAssunto: ${subject}\n${text}\n`);
  return;
}

  const from = process.env.MAIL_FROM;
  if (!from) throw new Error('MAIL_FROM não configurado no .env');

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html, text }),
  });

  if (!resp.ok) {
    throw new Error(`Falha ao enviar e-mail: ${resp.status}`);
  }
}
export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const host = process.env.SMTP_HOST;
  if (!host) {
    console.log('[DEV] パスワードリセットリンク:');
    console.log(`  宛先: ${to}`);
    console.log(`  URL:  ${resetUrl}`);
    console.log('本番環境では SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS を設定してください。');
    return;
  }

  // @ts-ignore -- nodemailer は SMTP 設定時のみ必要なオプション依存
  const nodemailer = await import('nodemailer');
  const transport = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  await transport.sendMail({
    from: process.env.SMTP_FROM || 'noreply@example.com',
    to,
    subject: 'パスワードリセットのご案内',
    text: [
      'パスワードリセットが要求されました。',
      '以下のリンクから新しいパスワードを設定してください。',
      '',
      resetUrl,
      '',
      'このリンクは1時間で失効します。',
      '心当たりがない場合はこのメールを無視してください。',
    ].join('\n'),
  });
}

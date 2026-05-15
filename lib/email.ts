import { Resend } from "resend";

export async function sendProjectEmail(to: string, ownerName: string, url: string) {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    console.info(`Project URL for ${to}: ${url}`);
    return;
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to,
    subject: "Your response letter workspace",
    text: `Hi ${ownerName},\n\nYour response letter workspace is ready:\n${url}\n\nAnyone with this URL can collaborate.`
  });
}

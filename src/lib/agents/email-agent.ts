import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

const ses = new SESv2Client({ region: process.env.AWS_REGION || "eu-west-2" });
const escapeHtml = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

export async function sendClaimInvitation(input: { to: string; recipientName: string; occasion: string; claimUrl: string }) {
  const from = process.env.SES_FROM_EMAIL || "WanderWrap <hi@chatpye.com>";
  const name = escapeHtml(input.recipientName);
  const occasion = escapeHtml(input.occasion.toLowerCase());
  await ses.send(new SendEmailCommand({
    FromEmailAddress: from,
    Destination: { ToAddresses: [input.to] },
    Content: { Simple: {
      Subject: { Data: `${input.recipientName}, your WanderWrap is ready 🎁`, Charset: "UTF-8" },
      Body: {
        Text: { Data: `${input.recipientName}, your friends created a ${input.occasion.toLowerCase()} gift for you. Open it here: ${input.claimUrl}\n\nThis private link expires in 30 days.`, Charset: "UTF-8" },
        Html: { Data: `<!doctype html><html><body style="margin:0;background:#fff8ef;color:#302820;font-family:Arial,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:32px 16px"><table role="presentation" width="100%" style="max-width:560px;background:#2a2240;border-radius:28px;overflow:hidden"><tr><td style="padding:42px 36px;text-align:center;color:#fff"><div style="font-size:14px;font-weight:700;letter-spacing:.08em">WANDERWRAP</div><div style="font-size:64px;margin:25px 0 12px">🎁</div><h1 style="font-family:Georgia,serif;font-size:38px;margin:0 0 14px">Something beautiful is waiting, ${name}.</h1><p style="color:#d8cfe5;line-height:1.6;margin:0 0 28px">Your favourite people wrapped a ${occasion} gift, along with messages they wanted you to keep.</p><a href="${escapeHtml(input.claimUrl)}" style="display:inline-block;background:#f37750;color:#fff;text-decoration:none;padding:16px 24px;border-radius:14px;font-weight:700">Untie the ribbon ✦</a><p style="color:#9f94b2;font-size:12px;margin:28px 0 0">Private link. Expires in 30 days.</p></td></tr></table></td></tr></table></body></html>`, Charset: "UTF-8" },
      },
    } },
  }));
}

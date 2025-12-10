type InviteEmailParams = {
  to: string;
  restaurantName: string;
  inviteLink: string;
  expiresAt: string;
};

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL;

export async function sendInviteEmail({
  to,
  restaurantName,
  inviteLink,
  expiresAt,
}: InviteEmailParams) {
  if (!RESEND_API_KEY || !RESEND_FROM_EMAIL) {
    console.warn("[invite] email not configured");
    return { sent: false, reason: "not_configured" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: RESEND_FROM_EMAIL,
      to: [to],
      subject: `You're invited to manage ${restaurantName}`,
      html: `
        <p>Hello,</p>
        <p>You have been invited to join <strong>${restaurantName}</strong>.</p>
        <p>This invite link will expire at <strong>${new Date(expiresAt).toLocaleString()}</strong>.</p>
        <p><a href="${inviteLink}">Click here to accept your invite</a></p>
        <p>If the link is not working, copy and paste this code inside the onboarding form:</p>
        <p><code>${new URL(inviteLink).searchParams.get("code")}</code></p>
      `,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    console.error("[invite] email failed", message);
    return { sent: false, reason: "request_failed" };
  }

  return { sent: true };
}

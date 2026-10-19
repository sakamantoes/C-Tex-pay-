import envConfig from "../config/constant.js";

const DEFAULT_FRONTEND_URL = "https://www.ctex.online/";
const frontendUrl = envConfig.FRONTEND_URL || DEFAULT_FRONTEND_URL;

function publicUrl(path) {
  try {
    return new URL(path, frontendUrl).toString();
  } catch {
    return new URL(path, DEFAULT_FRONTEND_URL).toString();
  }
}

export const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);

export function renderBrandedEmail({
  preheader,
  title,
  contentHtml,
  actionLabel,
  actionUrl,
  footerText = "This is an automated message from C-TEX PAY.",
}) {
  const logoUrl = escapeHtml(
    envConfig.EMAIL_LOGO_URL || "https://www.ctex.online/Logo-email.png",
  );
  const homeUrl = escapeHtml(publicUrl("/"));
  const action = actionLabel && actionUrl
    ? `
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0 8px">
        <tr><td align="center" bgcolor="#0867ad" style="border-radius:8px">
          <a href="${escapeHtml(actionUrl)}" style="display:inline-block;padding:14px 24px;border:1px solid #0867ad;border-radius:8px;background-color:#0867ad;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;text-decoration:none">${escapeHtml(actionLabel)}</a>
        </td></tr>
      </table>
    `
    : "";

  return `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;padding:0;background-color:#f1f5f9;color:#172b4d;font-family:Arial,Helvetica,sans-serif">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(preheader || title)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f1f5f9">
      <tr><td align="center" style="padding:32px 14px">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;border:1px solid #dce5ef;border-radius:14px;background-color:#ffffff;overflow:hidden">
          <tr><td align="center" style="padding:22px 28px;border-bottom:1px solid #e7edf4;background-color:#ffffff">
            <a href="${homeUrl}" style="display:inline-block;text-decoration:none">
              <img src="${logoUrl}" width="210" height="47" alt="C-TEX PAY" style="display:block;width:210px;height:47px;max-width:100%;border:0;object-fit:contain">
            </a>
          </td></tr>
          <tr><td style="padding:34px 36px 38px">
            <h1 style="margin:0 0 18px;color:#103b68;font-size:24px;line-height:1.3;font-weight:700">${escapeHtml(title)}</h1>
            <div style="color:#40536b;font-size:15px;line-height:1.7">${contentHtml || ""}</div>
            ${action}
          </td></tr>
          <tr><td align="center" style="padding:20px 28px;background-color:#f7faff;border-top:1px solid #e7edf4;color:#728198;font-size:12px;line-height:1.6">
            <p style="margin:0 0 6px">${escapeHtml(footerText)}</p>
            <a href="${homeUrl}" style="color:#0867ad;text-decoration:none">www.ctex.online</a>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

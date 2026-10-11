/** Public-facing details only. Never put credentials in these settings. */
export const publicSite = {
  operator: process.env.NEXT_PUBLIC_SITE_OPERATOR?.trim() || "Early",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || "info@proveearly.xyz",
  xUrl: process.env.NEXT_PUBLIC_X_URL?.trim() || "https://x.com/proveearly",
  telegramUrl: process.env.NEXT_PUBLIC_TELEGRAM_URL?.trim(),
};

export const publicSiteUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://proveearly.xyz");

export const policyReady = Boolean(publicSite.operator && publicSite.supportEmail);

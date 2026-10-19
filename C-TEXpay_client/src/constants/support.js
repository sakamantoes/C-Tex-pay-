export const SUPPORT_WHATSAPP_NUMBER = "2349074705972";

export const SUPPORT_WHATSAPP_URL = (message = "Hello C-TEX PAY Support, I need help with my account.") =>
  `https://wa.me/${SUPPORT_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

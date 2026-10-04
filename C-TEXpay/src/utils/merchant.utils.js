import { Merchant } from "../models/index.js";

export async function generateMerchantCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code;
  let attempts = 0;
  let isUnique = false;
  const maxAttempts = 10;

  while (!isUnique && attempts < maxAttempts) {
    code = "MCTX";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const existing = await Merchant.findOne({
      where: { merchantCode: code },
    });

    if (!existing) {
      isUnique = true;
    }
    attempts++;
  }

  if (!isUnique) {
    throw new Error("Failed to generate unique merchant code");
  }

  return code;
}
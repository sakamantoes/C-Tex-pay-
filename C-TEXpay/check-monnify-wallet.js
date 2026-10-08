import envConfig from "./src/config/constant.js";
import { getAccessToken } from "./src/Provider/monnify/monnify.auth.js";

const accountNumber = envConfig.MONNIFY_PAYOUT_SOURCE_ACCOUNT;

if (!accountNumber) {
  throw new Error("MONNIFY_PAYOUT_SOURCE_ACCOUNT is not configured");
}

const token = await getAccessToken();

const url =
  `${envConfig.MONNIFY_BASE_URL}` +
  `/api/v2/disbursements/wallet-balance?accountNumber=${encodeURIComponent(accountNumber)}`;

console.log("Checking Monnify wallet...");
console.log("Base URL:", envConfig.MONNIFY_BASE_URL);
console.log("Source account:", accountNumber);

const response = await fetch(url, {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
});

const text = await response.text();

console.log("HTTP status:", response.status);
console.log("Response:");
console.log(text);

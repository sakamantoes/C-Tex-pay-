/**
 * Provider Interface (Documentation Only)
 * 
 * All payment providers must implement this contract.
 * 
 * interface PaymentProvider {
 *   async initializePayment(paymentContext: PaymentContext): Promise<ProviderResult>
 * }
 * 
 * PaymentContext (C-TEX PAY internal):
 * {
 *   paymentReference: string,      // C-TEX PAY reference
 *   merchantReference: string|null, // Merchant's order reference
 *   amount: number,                // Smallest unit (kobo for NGN)
 *   currency: string,              // "NGN"
 *   customer: {
 *     email: string,
 *     name: string,                // full name
 *     phone: string|null
 *   },
 *   description: string|null,
 *   metadata: object|null
 * }
 * 
 * ProviderResult (Normalized):
 * {
 *   success: boolean,
 *   providerReference: string,      // Monnify transactionReference
 *   providerStatus: string,         // Normalized status
 *   paymentInstructions: object|null, // Bank transfer details if available
 *   rawResponse: object             // Sanitized (no secrets)
 * }
 */

export {};
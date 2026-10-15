import { loadCheckoutByToken, CheckoutError } from "../service/checkout.service.js";

function mapError(error) {
  if (error instanceof CheckoutError) {
    return { status: error.statusCode, message: error.message };
  }
  if (error.statusCode) {
    return { status: error.statusCode, message: error.message };
  }
  return { status: 500, message: "Unable to load checkout" };
}

/*
|--------------------------------------------------------------------------
| GET /api/v1/public/checkout/:token
|--------------------------------------------------------------------------
| Public endpoint. No auth.
|
| Returns only what the checkout UI needs:
|   - payment reference
|   - status
|   - amount + currency
|   - payment instructions (bank transfer details)
|   - expiry
|
| Never returns provider info, merchant info, or internal IDs.
|--------------------------------------------------------------------------
*/
export const getCheckoutByToken = async (req, res) => {
  try {
    const { token } = req.params;

    const data = await loadCheckoutByToken({ token });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    const { status, message } = mapError(error);
    return res.status(status).json({
      success: false,
      message,
    });
  }
};
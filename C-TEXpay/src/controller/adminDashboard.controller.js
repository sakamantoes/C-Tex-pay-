import { getPlatformDashboardSummary } from "../service/adminDashboard.service.js";

export const getAdminDashboardSummary = async (req, res) => {
  try {
    const summary = await getPlatformDashboardSummary();
    return res.status(200).json({ success: true, data: summary });
  } catch (error) {
    console.error("Platform dashboard summary failed", {
      requestId: req.requestId,
      errorName: error.name,
    });
    return res.status(500).json({
      success: false,
      message: "Unable to retrieve platform dashboard summary",
    });
  }
};

import { Permission } from "../models/index.js";

export const getPermissions = async (req, res) => {
  try {
    const permissions = await Permission.findAll({
      attributes: ["id", "key", "name", "description", "resource", "action"],
      order: [
        ["resource", "ASC"],
        ["action", "ASC"],
      ],
    });

    return res.status(200).json({
      success: true,
      data: {
        permissions,
        count: permissions.length,
      },
    });
  } catch (error) {
    console.error("Get permissions error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get permissions",
    });
  }
};

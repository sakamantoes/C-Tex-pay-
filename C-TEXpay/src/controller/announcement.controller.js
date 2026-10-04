import { Op } from "sequelize";
import { User } from "../models/index.js";
import sequelize from "../config/database.js";
import { createNotifications } from "../service/notification.service.js";

const audienceFilters = { ALL: {}, USERS: { role: "USER" }, MERCHANTS: { role: "MERCHANT" }, ADMINS: { role: "ADMIN" }, SUPER_ADMINS: { role: "SUPER_ADMIN" } };

export const createAnnouncement = async (req, res) => {
  try {
    const { title, message, audience, userIds, data = {} } = req.body;
    const where = audience === "USER_IDS" ? { id: { [Op.in]: userIds } } : audienceFilters[audience];
    const users = await User.findAll({ where: { ...where, status: "ACTIVE" }, attributes: ["id"] });
    await sequelize.transaction((transaction) => createNotifications(users.map(({ id: userId }) => ({ userId, type: "PLATFORM_ANNOUNCEMENT", title, message, data: { ...data, audience, announcedBy: req.user.id } })), { transaction }));
    return res.status(201).json({ success: true, message: "Announcement delivered", data: { recipientCount: users.length } });
  } catch (error) {
    console.error("Create announcement error:", error);
    return res.status(500).json({ success: false, message: "Failed to deliver announcement" });
  }
};

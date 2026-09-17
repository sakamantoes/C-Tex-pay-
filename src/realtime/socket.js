import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import env from "../config/constant.js";
import User from "../models/User.js";

let io;
const origins = () => env.SOCKET_CORS_ORIGINS?.split(",").map((value) => value.trim()).filter(Boolean) || ["http://localhost:5173", "https://ctexpay.vercel.app"];

export const initializeSocketServer = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: origins(),
      credentials: true,
      methods: ["GET", "POST"],
    },
  });

  io.use(async (socket, next) => {
    try {
      const header = socket.handshake.headers.authorization;
      const token = socket.handshake.auth?.token || (header?.startsWith("Bearer ") ? header.slice(7) : null);

      if (!token) {
        return next(new Error("Authentication required"));
      }

      const { sub } = jwt.verify(token, env.JWT_ACCESS_SECRET);
      const user = await User.findByPk(sub, { attributes: ["id", "status"] });

      if (!user || user.status !== "ACTIVE") {
        return next(new Error("Account is not active"));
      }

      socket.data.userId = user.id;
      return next();
    } catch {
      return next(new Error("Invalid access token"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(`user:${socket.data.userId}`);
    socket.emit("realtime:ready", { connectedAt: new Date().toISOString() });

    socket.on("notification:read", async (notificationId) => {
      socket.emit("notification:read:ack", { notificationId, received: true });
    });
  });

  return io;
};

export const getSocketServer = () => io;

export const emitToUser = (userId, event, payload) => {
  if (!userId || !io) return;
  io.to(`user:${userId}`).emit(event, payload);
};

export const emitToUsers = (userIds, event, payload) => {
  if (!Array.isArray(userIds) || userIds.length === 0 || !io) return;

  [...new Set(userIds.filter(Boolean))].forEach((userId) => {
    emitToUser(userId, event, payload);
  });
};

export const emitToRoom = (roomName, event, payload) => {
  if (!roomName || !io) return;
  io.to(roomName).emit(event, payload);
};

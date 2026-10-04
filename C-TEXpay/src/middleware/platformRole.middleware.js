export const requirePlatformRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) return res.status(403).json({ success: false, message: "Insufficient platform privileges" });
  return next();
};

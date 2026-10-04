const getApiKeyPermissions = (apiKey) => {
  if (!apiKey || !Array.isArray(apiKey.permissions)) {
    return [];
  }

  return apiKey.permissions;
};

const hasApiKeyPermission = (apiKeyPermissions, permissionKey) => {
  if (!permissionKey) {
    return false;
  }

  const exactMatch = apiKeyPermissions.some((permission) => permission?.key === permissionKey);
  if (exactMatch) {
    return true;
  }

  const resource = permissionKey.split(".")[0];
  const wildcardKey = `${resource}.*`;
  return apiKeyPermissions.some((permission) => permission?.key === wildcardKey);
};

export const requireApiKeyPermission = (permissionKey) => {
  return (req, res, next) => {
    try {
      if (!req.isApiAuthenticated) {
        return res.status(401).json({
          success: false,
          message: "API authentication required",
        });
      }

      const apiKey = req.apiKey;
      if (!apiKey) {
        return res.status(401).json({
          success: false,
          message: "API key not found",
        });
      }

      const permissions = getApiKeyPermissions(apiKey);
      if (permissions.length === 0) {
        return res.status(403).json({
          success: false,
          message: `Permission denied: ${permissionKey}`,
        });
      }

      const hasPermission = hasApiKeyPermission(permissions, permissionKey);
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: `Permission denied: ${permissionKey}`,
        });
      }

      return next();
    } catch (error) {
      console.error("API Key permission error:", error);
      return res.status(500).json({
        success: false,
        message: "Permission check failed",
      });
    }
  };
};

export const requireAnyApiKeyPermission = (permissionKeys) => {
  return (req, res, next) => {
    try {
      if (!req.isApiAuthenticated) {
        return res.status(401).json({
          success: false,
          message: "API authentication required",
        });
      }

      const apiKey = req.apiKey;
      if (!apiKey) {
        return res.status(401).json({
          success: false,
          message: "API key not found",
        });
      }

      const permissions = getApiKeyPermissions(apiKey);
      if (permissions.length === 0) {
        return res.status(403).json({
          success: false,
          message: "Permission denied",
        });
      }

      const requiredPermissions = Array.isArray(permissionKeys) ? permissionKeys : [];
      const hasPermission = requiredPermissions.some((permissionKey) =>
        hasApiKeyPermission(permissions, permissionKey)
      );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: "Permission denied",
        });
      }

      return next();
    } catch (error) {
      console.error("API Key permission error:", error);
      return res.status(500).json({
        success: false,
        message: "Permission check failed",
      });
    }
  };
};
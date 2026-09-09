export const requireApiKeyPermission = (permissionKey) => {
  return (req, res, next) => {
    try {
      // Check if API authenticated
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

      // Check if API key has the permission
      const hasPermission = apiKey.permissions.some((p) => p.key === permissionKey);

      // Check for wildcard permission (resource.*)
      if (!hasPermission) {
        const resource = permissionKey.split(".")[0];
        const wildcardKey = `${resource}.*`;
        const hasWildcard = apiKey.permissions.some((p) => p.key === wildcardKey);

        if (!hasWildcard) {
          return res.status(403).json({
            success: false,
            message: `Permission denied: ${permissionKey}`,
          });
        }
      }

      next();
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

      // Check if API key has any of the permissions
      const hasPermission = apiKey.permissions.some((p) =>
        permissionKeys.includes(p.key)
      );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: "Permission denied",
        });
      }

      next();
    } catch (error) {
      console.error("API Key permission error:", error);
      return res.status(500).json({
        success: false,
        message: "Permission check failed",
      });
    }
  };
};
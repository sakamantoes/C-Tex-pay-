export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body ?? {});

  if (!result.success) {
    const fields = Object.fromEntries(
      result.error.issues.map((issue) => [
        issue.path.join(".") || "body",
        issue.message,
      ]),
    );

    return res.status(400).json({
      success: false,
      message: "Validation failed",
      fields,
    });
  }

  req.body = result.data;
  next();
};
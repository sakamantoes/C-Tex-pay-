export const validate = (schema, source = "body") => (req, res, next) => {
  const data = req[source] ?? {};
  const result = schema.safeParse(data);

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

  if (source === "query") {
    Object.keys(req.query).forEach((key) => delete req.query[key]);
    Object.assign(req.query, result.data);
  } else {
    req[source] = result.data;
  }
  next();
};
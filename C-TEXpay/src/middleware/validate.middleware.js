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
    Object.defineProperty(req, "query", {
      configurable: true,
      enumerable: true,
      writable: true,
      value: result.data,
    });
  } else {
    req[source] = result.data;
  }
  next();
};
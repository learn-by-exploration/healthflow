/**
 * Reusable Zod validation middleware for HealthFlow routes.
 * Usage: router.post('/api/foo', validate(fooSchema), handler)
 */

function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const issues = result.error.issues || result.error.errors || [];
      const msg = issues.map(e => {
        const field = e.path.join('.');
        return field ? `${field}: ${e.message}` : e.message;
      }).join(', ');
      return res.status(400).json({ error: msg, code: 'VALIDATION_ERROR' });
    }
    req[source] = result.data;
    next();
  };
}

module.exports = { validate };

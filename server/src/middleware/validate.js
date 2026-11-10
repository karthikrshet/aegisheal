import { badRequest } from '../lib/errors.js';

/**
 * Validate and coerce `req.body`, `req.query` and `req.params` with zod schemas.
 * Unknown fields are rejected by `.strict()` schemas, so clients cannot smuggle data.
 */
export function validate(schemas) {
  return (req, _res, next) => {
    for (const part of ['params', 'query', 'body']) {
      if (!schemas[part]) continue;
      const result = schemas[part].safeParse(req[part] ?? {});
      if (!result.success) {
        return next(
          badRequest(
            `Invalid ${part}`,
            result.error.issues.map((i) => ({ field: i.path.join('.') || part, message: i.message })),
          ),
        );
      }
      if (part === 'query') req.validQuery = result.data;
      else req[part] = result.data;
    }
    next();
  };
}

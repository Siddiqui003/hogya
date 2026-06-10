/**
 * Send a standardised success response.
 */
const sendSuccess = (res, data = {}, statusCode = 200, message = 'Success') => {
  return res.status(statusCode).json({
    success: true,
    message,
    ...data,
  });
};

/**
 * Send a standardised error response.
 */
const sendError = (res, message = 'Something went wrong', statusCode = 500, errors = null) => {
  const body = { success: false, message };
  if (errors) body.errors = errors;
  return res.status(statusCode).json(body);
};

/**
 * Async wrapper — eliminates try/catch boilerplate in route handlers.
 * Usage: router.get('/path', catchAsync(async (req, res) => { ... }))
 */
const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Extract Mongoose validation errors into a readable object.
 */
const parseMongooseErrors = (err) => {
  if (err.name !== 'ValidationError') return null;
  const errors = {};
  Object.keys(err.errors).forEach((key) => {
    errors[key] = err.errors[key].message;
  });
  return errors;
};

module.exports = { sendSuccess, sendError, catchAsync, parseMongooseErrors };

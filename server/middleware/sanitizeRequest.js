// A minimal, Express 5-safe replacement for express-mongo-sanitize.
// express-mongo-sanitize tries to reassign `req.query` wholesale, which
// throws under Express 5 (req.query has no setter). This walks objects
// in place instead, stripping any key that starts with "$" or contains
// a ".", which are the characters Mongo/Mongoose operator injection relies on.

const isPlainObject = (val) => val !== null && typeof val === "object" && !Array.isArray(val);

const sanitizeInPlace = (obj) => {
  if (!isPlainObject(obj) && !Array.isArray(obj)) return obj;

  if (Array.isArray(obj)) {
    obj.forEach((item) => sanitizeInPlace(item));
    return obj;
  }

  Object.keys(obj).forEach((key) => {
    if (key.startsWith("$") || key.includes(".")) {
      delete obj[key];
      return;
    }
    const value = obj[key];
    if (isPlainObject(value) || Array.isArray(value)) {
      sanitizeInPlace(value);
    }
  });

  return obj;
};

const sanitizeRequest = (req, res, next) => {
  if (req.body) sanitizeInPlace(req.body);
  if (req.params) sanitizeInPlace(req.params);
  // req.query is read-only as a whole object reference under Express 5, but
  // its contents can still be mutated in place.
  if (req.query) sanitizeInPlace(req.query);
  next();
};

module.exports = sanitizeRequest;

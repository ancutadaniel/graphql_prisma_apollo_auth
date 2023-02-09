import jwt from 'jsonwebtoken';

const JWT_SECRET = Buffer.from(process.env.JWT_SECRET, 'base64');

const getUserId = (req, requireAuth = true) => {
  // req.headers for HTTP requests and req for WebSocket requests
  const header =
    req && req.headers ? req.headers.authorization : req.Authorization;

  if (header) {
    const token = header.replace('Bearer ', '');
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded.sub;
  }

  if (requireAuth) {
    throw new Error('Authentication required');
  }

  return null;
};

export default getUserId;

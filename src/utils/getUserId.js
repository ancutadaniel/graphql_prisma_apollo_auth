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

// eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbGR1bDhuYzEwMDAwNGJpajB2dXNzZGFuIiwiaWF0IjoxNjc1Nzk1Mjc3fQ.1lhFDvjA4X20ke-NuSxVaIkPXy7o7DTfYayQnspkuMQ
// eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbGR1bGJydDMwMDAwNGJsaGFlc2FqMzkxIiwiaWF0IjoxNjc1Nzk1NDIyfQ.e2OLafCqAPmI_iMIPZ9nspfxv55Gu48Uw7rPxmI7cPY

// user test1@test.com password test1234
// Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbGR1bGJydDMwMDAwNGJsaGFlc2FqMzkxIiwiaWF0IjoxNjc1OTY1NTE5LCJleHAiOjE2NzY1NzAzMTl9.mVV1WO1iA8lKdV_jUIoDsazbm5dWfO1DCwfqYctIYVE

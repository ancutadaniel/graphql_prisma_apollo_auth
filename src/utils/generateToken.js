import jwt from 'jsonwebtoken';

const JWT_SECRET = Buffer.from(process.env.JWT_SECRET, 'base64');

const generateToken = (userId) =>
  jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: '7 days' });

export { generateToken as default };

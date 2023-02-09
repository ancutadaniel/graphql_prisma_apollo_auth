import bcrypt from 'bcryptjs';

const hashPassword = async (password) => {
  if (password.length < 8)
    throw new Error('Password must be at least 8 characters long.');

  return await bcrypt.hash(password, 10);
};

export default hashPassword;

import jwt from 'jsonwebtoken';

const getJWTSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return secret;
};

const getRefreshTokenSecret = () => {
  // Fallback to JWT_SECRET if REFRESH_TOKEN_SECRET not set
  return process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET;
};

const JWT_EXPIRES_IN = '24h'; // 24 hours
const REFRESH_TOKEN_EXPIRES_IN = '7d'; // 7 days

/**
 * Generate access token (short-lived)
 */
export const generateAccessToken = (userId) => {
  return jwt.sign(
    { userId, type: 'access' },
    getJWTSecret(),
    { expiresIn: JWT_EXPIRES_IN }
  );
};

/**
 * Generate refresh token (long-lived)
 */
export const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId, type: 'refresh' },
    getRefreshTokenSecret(),
    { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
  );
};

/**
 * Verify and decode token
 */
export const verifyToken = (token, type = 'access') => {
  try {
    const secret = type === 'refresh' ? getRefreshTokenSecret() : getJWTSecret();
    return jwt.verify(token, secret);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    }
    throw error;
  }
};

/**
 * Generate both access and refresh tokens
 */
export const generateTokenPair = (userId) => {
  return {
    accessToken: generateAccessToken(userId),
    refreshToken: generateRefreshToken(userId),
    expiresIn: JWT_EXPIRES_IN
  };
};

/**
 * Extract token from Authorization header
 */
export const extractTokenFromHeader = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7); // Remove 'Bearer ' prefix
};
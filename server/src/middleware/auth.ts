import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';

export type UserRole = 'admin' | 'user';

type AuthTokenPayload = {
  sub: string;
  email: string;
  role: UserRole;
};

declare global {
  namespace Express {
    interface Request {
      auth?: AuthTokenPayload;
    }
  }
}

export class ApiAuthError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'ApiAuthError';
    this.statusCode = statusCode;
  }
}

export const requireAuth = (req: Request, _res: Response, next: NextFunction) => {
  try {
    const token = authTokenFromHeader(req.header('authorization'));

    if (!token) {
      throw new ApiAuthError('Authorization token is required.', 401);
    }

    req.auth = verifyAuthToken(token);
    next();
  } catch (error) {
    next(error);
  }
};

export const requireRole = (...roles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.auth) {
        throw new ApiAuthError('Authorization token is required.', 401);
      }

      if (!roles.includes(req.auth.role)) {
        throw new ApiAuthError('You do not have access to this resource.', 403);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

function authTokenFromHeader(header: string | undefined): string | null {
  if (!header) {
    return null;
  }

  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token;
}

function verifyAuthToken(token: string): AuthTokenPayload {
  const payload = jwt.verify(token, jwtSecret());

  if (!isAuthTokenPayload(payload)) {
    throw new ApiAuthError('Invalid authorization token.', 401);
  }

  return payload;
}

function isAuthTokenPayload(payload: unknown): payload is AuthTokenPayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    typeof (payload as AuthTokenPayload).sub === 'string' &&
    typeof (payload as AuthTokenPayload).email === 'string' &&
    ((payload as AuthTokenPayload).role === 'admin' || (payload as AuthTokenPayload).role === 'user')
  );
}

function jwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (secret) {
    return secret;
  }

  if (process.env.RENDER) {
    throw new Error('JWT_SECRET is required in production.');
  }

  return 'dev-only-change-me';
}

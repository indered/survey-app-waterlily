import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { User, type UserDocument } from '../models/User.js';
import type { LoginDto, SignupDto } from '../dtos/authDto.js';

type AuthUser = {
  id: string;
  fullname: string;
  email: string;
  role: 'admin' | 'user';
};

type AuthResponse = {
  user: AuthUser;
  token: string;
};

export class AuthError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
  }
}

const TOKEN_EXPIRES_IN = '7d';
const PASSWORD_SALT_ROUNDS = 12;

export class AuthService {
  async signup(data: SignupDto): Promise<AuthResponse> {
    ensureDbConnected();
    const email = this.normalizeEmail(data.email);
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      throw new AuthError('An account with this email already exists.', 409);
    }

    const passwordHash = await bcrypt.hash(data.password, PASSWORD_SALT_ROUNDS);
    const user = await User.create({
      fullname: data.fullname || '',
      email,
      passwordHash
    });

    return {
      user: this.formatUser(user),
      token: this.signToken(user)
    };
  }

  async login(data: LoginDto): Promise<AuthResponse> {
    ensureDbConnected();
    const email = this.normalizeEmail(data.email);
    const user = await User.findOne({ email }).select('+passwordHash');

    if (!user) {
      throw new AuthError('Invalid email or password.', 401);
    }

    const passwordMatches = await bcrypt.compare(data.password, user.passwordHash);

    if (!passwordMatches) {
      throw new AuthError('Invalid email or password.', 401);
    }

    return {
      user: this.formatUser(user),
      token: this.signToken(user)
    };
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private formatUser(user: UserDocument): AuthUser {
    return {
      id: user._id.toString(),
      fullname: user.fullname,
      email: user.email,
      role: user.role
    };
  }

  private signToken(user: UserDocument): string {
    return jwt.sign(
      {
        sub: user._id.toString(),
        email: user.email,
        role: user.role
      },
      this.jwtSecret(),
      { expiresIn: TOKEN_EXPIRES_IN }
    );
  }

  private jwtSecret(): string {
    const secret = process.env.JWT_SECRET;

    if (secret) {
      return secret;
    }

    if (process.env.RENDER) {
      throw new Error('JWT_SECRET is required in production.');
    }

    return 'dev-only-change-me';
  }
}

function ensureDbConnected() {
  if (mongoose.connection.readyState !== 1) {
    throw new AuthError('Database is currently unavailable.', 503);
  }
}

import { Injectable, Logger, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { EmailService } from '../email/email.service';
import { PasswordReset } from './entities/password-reset.entity';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly blacklistedTokens = new Set<string>();

  constructor(
    @InjectRepository(PasswordReset)
    private readonly passwordResetRepository: Repository<PasswordReset>,
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const { password: _, ...result } = user;
    return result;
  }

  async login(user: any) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    await this.usersService.updateLastLogin(user.id);

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION') || '7d',
    });

    return {
      accessToken,
      refreshToken,
      mustChangePassword: !!user.mustChangePassword,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.usersService.findOneWithPassword(userId);
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    await this.usersService.changePassword(userId, newPassword);
    return { message: 'Password changed successfully' };
  }

  async refresh(refreshToken: string) {
    try {
      if (this.blacklistedTokens.has(refreshToken)) {
        throw new UnauthorizedException('Token has been revoked');
      }
      const payload = this.jwtService.verify(refreshToken);
      const user = await this.usersService.findOne(payload.sub);
      if (!user || !user.isActive) {
        throw new UnauthorizedException('User not found or inactive');
      }
      // Blacklist the old refresh token to prevent reuse
      this.blacklistedTokens.add(refreshToken);
      const newPayload = { sub: user.id, email: user.email, role: user.role };
      return {
        accessToken: this.jwtService.sign(newPayload),
        refreshToken: this.jwtService.sign(newPayload, {
          expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION') || '7d',
        }),
      };
    } catch (e) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async logout(token: string) {
    if (token) {
      this.blacklistedTokens.add(token);
    }
    return { message: 'Logged out successfully' };
  }

  isTokenBlacklisted(token: string): boolean {
    return this.blacklistedTokens.has(token);
  }

  async getProfile(userId: string) {
    return this.usersService.findOne(userId);
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);
    // Always return success to prevent email enumeration
    if (!user || !user.isActive) {
      return { message: 'If an account with that email exists, a reset link has been sent.' };
    }

    // Invalidate any existing reset tokens for this user
    await this.passwordResetRepository.update(
      { userId: user.id, used: false },
      { used: true },
    );

    // Generate secure token + expiry (1 hour)
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await this.passwordResetRepository.save({
      userId: user.id,
      token,
      expiresAt,
    });

    // Send email (don't let email errors block the response)
    try {
      await this.emailService.sendPasswordResetEmail(user.email, token);
    } catch (err) {
      this.logger.error(`Failed to send password reset email: ${err.message}`);
    }

    return { message: 'If an account with that email exists, a reset link has been sent.' };
  }

  async resetPassword(token: string, newPassword: string) {
    const reset = await this.passwordResetRepository.findOne({
      where: { token, used: false },
    });

    if (!reset) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (new Date() > reset.expiresAt) {
      reset.used = true;
      await this.passwordResetRepository.save(reset);
      throw new BadRequestException('Reset token has expired');
    }

    // Mark token as used and change password
    reset.used = true;
    await this.passwordResetRepository.save(reset);
    await this.usersService.changePassword(reset.userId, newPassword);

    // Clean up old expired tokens (housekeeping)
    await this.passwordResetRepository.delete({
      used: true,
      expiresAt: LessThan(new Date()),
    });

    return { message: 'Password has been reset successfully. You can now log in.' };
  }
}

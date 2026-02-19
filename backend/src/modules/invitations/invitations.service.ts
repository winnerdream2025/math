import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { Invitation } from './entities/invitation.entity';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { User } from '../users/entities/user.entity';
import { EmailService } from '../email/email.service';

@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name);

  constructor(
    @InjectRepository(Invitation)
    private readonly invitationRepository: Repository<Invitation>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly emailService: EmailService,
  ) {}

  async create(dto: CreateInvitationDto, invitedById: string): Promise<Invitation> {
    const existingUser = await this.userRepository.findOne({ where: { email: dto.email } });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const existingInvite = await this.invitationRepository.findOne({ where: { email: dto.email, status: 'PENDING' } });
    if (existingInvite) {
      throw new ConflictException('Pending invitation already exists for this email');
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = this.invitationRepository.create({
      ...dto,
      token,
      invitedById,
      expiresAt,
      status: 'PENDING',
    });

    const saved = await this.invitationRepository.save(invitation);

    // Send invitation email (don't let failure block the response)
    try {
      await this.emailService.sendInvitationEmail(dto.email, dto.firstName, token);
    } catch (err) {
      this.logger.error(`Failed to send invitation email to ${dto.email}: ${err.message}`);
    }

    return saved;
  }

  async findAll(): Promise<Invitation[]> {
    return this.invitationRepository.find({
      relations: ['invitedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async activate(token: string, password: string): Promise<User> {
    const invitation = await this.invitationRepository.findOne({ where: { token, status: 'PENDING' } });
    if (!invitation) {
      throw new NotFoundException('Invalid or expired invitation');
    }
    if (new Date() > invitation.expiresAt) {
      invitation.status = 'EXPIRED';
      await this.invitationRepository.save(invitation);
      throw new NotFoundException('Invitation has expired');
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Check if a user with this email already exists (possibly deactivated)
    const existingUser = await this.userRepository.findOne({
      where: { email: invitation.email },
      withDeleted: true,
    });

    let savedUser: User;
    if (existingUser) {
      // Reactivate and update existing user
      existingUser.password = hashedPassword;
      existingUser.firstName = invitation.firstName;
      existingUser.lastName = invitation.lastName;
      existingUser.role = invitation.role;
      existingUser.employeeNumber = invitation.employeeNumber;
      existingUser.isActive = true;
      existingUser.deletedAt = null as any;
      savedUser = await this.userRepository.save(existingUser);
    } else {
      const user = this.userRepository.create({
        email: invitation.email,
        password: hashedPassword,
        firstName: invitation.firstName,
        lastName: invitation.lastName,
        role: invitation.role,
        employeeNumber: invitation.employeeNumber,
        isActive: true,
      });
      savedUser = await this.userRepository.save(user);
    }

    invitation.status = 'USED';
    await this.invitationRepository.save(invitation);

    return savedUser;
  }

  async resend(id: string): Promise<Invitation> {
    const invitation = await this.invitationRepository.findOne({ where: { id } });
    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }
    if (invitation.status !== 'PENDING') {
      throw new ConflictException('Only pending invitations can be resent');
    }

    // Generate new token and extend expiry
    invitation.token = crypto.randomBytes(32).toString('hex');
    invitation.expiresAt = new Date();
    invitation.expiresAt.setDate(invitation.expiresAt.getDate() + 7);
    const saved = await this.invitationRepository.save(invitation);

    try {
      await this.emailService.sendInvitationEmail(invitation.email, invitation.firstName, invitation.token);
    } catch (err) {
      this.logger.error(`Failed to resend invitation email to ${invitation.email}: ${err.message}`);
    }

    return saved;
  }

  async revoke(id: string): Promise<Invitation> {
    const invitation = await this.invitationRepository.findOne({ where: { id } });
    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }
    invitation.status = 'REVOKED';
    return this.invitationRepository.save(invitation);
  }
}

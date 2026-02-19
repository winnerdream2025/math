import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto';
import { UserRole } from '../../common/enums/user-role.enum';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<{ user: User; tempPassword?: string }> {
    // Check active users for conflicts
    const existing = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });
    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    if (createUserDto.employeeNumber) {
      const empNumExists = await this.userRepository.findOne({
        where: { employeeNumber: createUserDto.employeeNumber },
      });
      if (empNumExists) {
        throw new ConflictException('Employee number is already in use');
      }
    }

    // Permanently remove any soft-deleted users with same email/employee_number
    // so DB unique constraints don't block the insert
    const softDeletedByEmail = await this.userRepository.findOne({
      where: { email: createUserDto.email },
      withDeleted: true,
    });
    if (softDeletedByEmail && softDeletedByEmail.deletedAt) {
      await this.userRepository.delete(softDeletedByEmail.id);
    }
    if (createUserDto.employeeNumber) {
      const softDeletedByEmpNum = await this.userRepository.findOne({
        where: { employeeNumber: createUserDto.employeeNumber },
        withDeleted: true,
      });
      if (softDeletedByEmpNum && softDeletedByEmpNum.deletedAt) {
        await this.userRepository.delete(softDeletedByEmpNum.id);
      }
    }

    // Auto-generate temp password if none provided
    let tempPassword: string | undefined;
    let password = createUserDto.password;
    if (!password) {
      tempPassword = this.generateTempPassword();
      password = tempPassword;
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
      mustChangePassword: !!tempPassword,
    });
    const saved = await this.userRepository.save(user);
    return { user: saved, tempPassword };
  }

  private generateTempPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    const special = '!@#$%';
    let pwd = '';
    for (let i = 0; i < 8; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    pwd += special.charAt(Math.floor(Math.random() * special.length));
    pwd += Math.floor(Math.random() * 10);
    return pwd;
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findAllPaginated(query: PaginationDto): Promise<PaginatedResult<User>> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const [data, total] = await this.userRepository.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return new PaginatedResult(data, total, page, limit);
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findOneWithPassword(id: string): Promise<User> {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.id = :id', { id })
      .getOne();
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();
  }

  async changePassword(id: string, newPassword: string): Promise<void> {
    const user = await this.findOne(id);
    user.password = await bcrypt.hash(newPassword, 12);
    user.mustChangePassword = false;
    await this.userRepository.save(user);
  }

  async updateProfile(id: string, dto: { firstName?: string; lastName?: string }): Promise<User> {
    const user = await this.findOne(id);
    if (dto.firstName !== undefined) user.firstName = dto.firstName;
    if (dto.lastName !== undefined) user.lastName = dto.lastName;
    return this.userRepository.save(user);
  }

  async updateStatus(id: string, dto: UpdateUserStatusDto): Promise<User> {
    const user = await this.findOne(id);
    if (dto.isActive !== undefined) user.isActive = dto.isActive;
    if (dto.role !== undefined) user.role = dto.role;
    return this.userRepository.save(user);
  }

  async findByRole(role: UserRole): Promise<User[]> {
    return this.userRepository.find({ where: { role, isActive: true } });
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.userRepository.update(id, { lastLoginAt: new Date() });
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.userRepository.softRemove(user);
  }
}

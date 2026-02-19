import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  async log(params: {
    userId: string;
    action: string;
    entityType: string;
    entityId: string;
    changes?: any;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<AuditLog> {
    const entry = this.auditLogRepository.create(params);
    return this.auditLogRepository.save(entry);
  }

  async findAll(query: {
    userId?: string;
    action?: string;
    entityType?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 50;

    const qb = this.auditLogRepository
      .createQueryBuilder('audit')
      .leftJoinAndSelect('audit.user', 'user');

    if (query.userId) {
      qb.andWhere('audit.userId = :userId', { userId: query.userId });
    }
    if (query.action) {
      qb.andWhere('audit.action = :action', { action: query.action });
    }
    if (query.entityType) {
      qb.andWhere('audit.entityType = :entityType', { entityType: query.entityType });
    }
    if (query.startDate) {
      qb.andWhere('audit.createdAt >= :startDate', { startDate: query.startDate });
    }
    if (query.endDate) {
      qb.andWhere('audit.createdAt <= :endDate', { endDate: query.endDate });
    }

    qb.orderBy('audit.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}

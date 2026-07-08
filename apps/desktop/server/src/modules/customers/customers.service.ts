import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { SyncStatus } from '@medingen/db';
import { CustomerRepository } from './repository/customer.repository';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CustomerCreatedEvent } from './events/customer.events';

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: CustomerRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(createCustomerDto: CreateCustomerDto) {
    const existing = await this.repo.findUnique({
      where: { mobile: createCustomerDto.mobile },
    });

    if (existing) {
      throw new ConflictException(`Customer with mobile number "${createCustomerDto.mobile}" already exists.`);
    }

    const result = await this.repo.create({
      name: createCustomerDto.name.trim(),
      mobile: createCustomerDto.mobile.trim(),
      syncStatus: SyncStatus.PENDING,
    });

    if (result) {
      this.eventEmitter.emit(
        'customer.created',
        new CustomerCreatedEvent(result.id, result.name, result.mobile),
      );
    }

    return result;
  }

  async findAll(query: { search?: string; page?: number; limit?: number }) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.max(1, query.limit ?? 10);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.search) {
      const searchTrim = query.search.trim();
      where.OR = [
        { name: { contains: searchTrim, mode: 'insensitive' } },
        { mobile: { contains: searchTrim } },
      ];
    }

    const [items, total] = await Promise.all([
      this.repo.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.repo.count(where),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        bills: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID "${id}" not found.`);
    }

    return customer;
  }

  async update(id: string, updateCustomerDto: UpdateCustomerDto) {
    const customer = await this.findOne(id);

    if (updateCustomerDto.mobile) {
      const mobile = updateCustomerDto.mobile.trim();
      const existing = await this.repo.findFirst({
        where: {
          mobile: { equals: mobile },
          id: { not: id },
        },
      });
      if (existing) {
        throw new ConflictException(`Customer with mobile number "${mobile}" already exists.`);
      }
      customer.mobile = mobile;
    }

    return this.repo.update(id, {
      name: updateCustomerDto.name !== undefined ? updateCustomerDto.name.trim() : customer.name,
      mobile: customer.mobile,
      creditBalance: updateCustomerDto.creditBalance !== undefined ? updateCustomerDto.creditBalance : customer.creditBalance,
      syncStatus: SyncStatus.PENDING,
      updatedAt: new Date(),
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.repo.delete(id);
  }
}

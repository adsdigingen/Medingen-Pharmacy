import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SyncStatus } from '@medingen/db';
import { SupplierRepository } from './repository/supplier.repository';

@Injectable()
export class SuppliersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: SupplierRepository,
  ) {}

  async create(createSupplierDto: CreateSupplierDto) {
    const name = createSupplierDto.name.trim();

    // Check if supplier exists (including soft-deleted)
    const existing = await this.repo.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });

    if (existing) {
      if (existing.deletedAt) {
        // Restore soft-deleted
        return this.repo.update(existing.id, {
          deletedAt: null,
          gstin: createSupplierDto.gstin,
          contactPerson: createSupplierDto.contactPerson,
          phone: createSupplierDto.phone,
          email: createSupplierDto.email,
          address: createSupplierDto.address,
          city: createSupplierDto.city,
          state: createSupplierDto.state,
          pincode: createSupplierDto.pincode,
          creditDays: createSupplierDto.creditDays,
          openingBalance: createSupplierDto.openingBalance ?? 0,
          outstandingBalance: createSupplierDto.openingBalance ?? 0,
          notes: createSupplierDto.notes,
          status: createSupplierDto.status ?? true,
          syncStatus: SyncStatus.PENDING,
          updatedAt: new Date(),
        });
      }
      throw new ConflictException(`Supplier with name "${name}" already exists.`);
    }

    return this.repo.create({
      name,
      gstin: createSupplierDto.gstin,
      contactPerson: createSupplierDto.contactPerson,
      phone: createSupplierDto.phone,
      email: createSupplierDto.email,
      address: createSupplierDto.address,
      city: createSupplierDto.city,
      state: createSupplierDto.state,
      pincode: createSupplierDto.pincode,
      creditDays: createSupplierDto.creditDays,
      openingBalance: createSupplierDto.openingBalance ?? 0.0,
      outstandingBalance: createSupplierDto.openingBalance ?? 0.0,
      notes: createSupplierDto.notes,
      status: createSupplierDto.status ?? true,
      syncStatus: SyncStatus.PENDING,
    });
  }

  async findAll(query: { search?: string; status?: string; page?: number; limit?: number }) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.max(1, query.limit ?? 10);
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
    };

    if (query.search) {
      const searchTrim = query.search.trim();
      where.OR = [
        { name: { contains: searchTrim, mode: 'insensitive' } },
        { gstin: { contains: searchTrim, mode: 'insensitive' } },
        { contactPerson: { contains: searchTrim, mode: 'insensitive' } },
        { phone: { contains: searchTrim, mode: 'insensitive' } },
        { city: { contains: searchTrim, mode: 'insensitive' } },
        { state: { contains: searchTrim, mode: 'insensitive' } },
      ];
    }

    if (query.status !== undefined && query.status !== '') {
      where.status = query.status === 'true' || query.status === 'active';
    }

    const [items, total] = await Promise.all([
      this.repo.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.repo.count({ where }),
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
    const supplier = await this.repo.findById(id);

    if (!supplier) {
      throw new NotFoundException(`Supplier with ID "${id}" not found.`);
    }

    return supplier;
  }

  async update(id: string, updateSupplierDto: UpdateSupplierDto) {
    const supplier = await this.findOne(id);

    if (updateSupplierDto.name) {
      const name = updateSupplierDto.name.trim();
      const existing = await this.repo.findFirst({
        where: {
          name: { equals: name, mode: 'insensitive' },
          id: { not: id },
        },
      });

      if (existing) {
        throw new ConflictException(`Supplier with name "${name}" already exists.`);
      }
      supplier.name = name;
    }

    let openingBalance = supplier.openingBalance;
    let outstandingBalance = supplier.outstandingBalance;

    if (updateSupplierDto.openingBalance !== undefined) {
      const diff = updateSupplierDto.openingBalance - supplier.openingBalance;
      openingBalance = updateSupplierDto.openingBalance;
      outstandingBalance = supplier.outstandingBalance + diff;
    }

    return this.repo.update(id, {
      name: supplier.name,
      gstin: updateSupplierDto.gstin !== undefined ? updateSupplierDto.gstin : supplier.gstin,
      contactPerson: updateSupplierDto.contactPerson !== undefined ? updateSupplierDto.contactPerson : supplier.contactPerson,
      phone: updateSupplierDto.phone !== undefined ? updateSupplierDto.phone : supplier.phone,
      email: updateSupplierDto.email !== undefined ? updateSupplierDto.email : supplier.email,
      address: updateSupplierDto.address !== undefined ? updateSupplierDto.address : supplier.address,
      city: updateSupplierDto.city !== undefined ? updateSupplierDto.city : supplier.city,
      state: updateSupplierDto.state !== undefined ? updateSupplierDto.state : supplier.state,
      pincode: updateSupplierDto.pincode !== undefined ? updateSupplierDto.pincode : supplier.pincode,
      creditDays: updateSupplierDto.creditDays !== undefined ? updateSupplierDto.creditDays : supplier.creditDays,
      openingBalance,
      outstandingBalance,
      notes: updateSupplierDto.notes !== undefined ? updateSupplierDto.notes : supplier.notes,
      status: updateSupplierDto.status !== undefined ? updateSupplierDto.status : supplier.status,
      syncStatus: SyncStatus.PENDING,
      updatedAt: new Date(),
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.repo.update(id, {
      deletedAt: new Date(),
      syncStatus: SyncStatus.PENDING,
      updatedAt: new Date(),
    });
  }

  async toggleStatus(id: string) {
    const supplier = await this.findOne(id);

    return this.repo.update(id, {
      status: !supplier.status,
      syncStatus: SyncStatus.PENDING,
      updatedAt: new Date(),
    });
  }
}

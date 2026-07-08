import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateManufacturerDto } from './dto/create-manufacturer.dto';
import { UpdateManufacturerDto } from './dto/update-manufacturer.dto';
import { SyncStatus } from '@medingen/db';

@Injectable()
export class ManufacturersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createManufacturerDto: CreateManufacturerDto) {
    const name = createManufacturerDto.name.trim();

    // Check if manufacturer exists (including soft-deleted)
    const existing = await this.prisma.manufacturer.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });

    if (existing) {
      if (existing.deletedAt) {
        // Restore soft-deleted
        return this.prisma.manufacturer.update({
          where: { id: existing.id },
          data: {
            deletedAt: null,
            contactPerson: createManufacturerDto.contactPerson,
            phone: createManufacturerDto.phone,
            email: createManufacturerDto.email,
            address: createManufacturerDto.address,
            gstNumber: createManufacturerDto.gstNumber,
            status: createManufacturerDto.status ?? true,
            syncStatus: SyncStatus.PENDING,
            updatedAt: new Date(),
          },
        });
      }
      throw new ConflictException(`Manufacturer with name "${name}" already exists.`);
    }

    return this.prisma.manufacturer.create({
      data: {
        name,
        contactPerson: createManufacturerDto.contactPerson,
        phone: createManufacturerDto.phone,
        email: createManufacturerDto.email,
        address: createManufacturerDto.address,
        gstNumber: createManufacturerDto.gstNumber,
        status: createManufacturerDto.status ?? true,
        syncStatus: SyncStatus.PENDING,
      },
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
      where.OR = [
        { name: { contains: query.search.trim(), mode: 'insensitive' } },
        { contactPerson: { contains: query.search.trim(), mode: 'insensitive' } },
        { gstNumber: { contains: query.search.trim(), mode: 'insensitive' } },
      ];
    }

    if (query.status !== undefined && query.status !== '') {
      where.status = query.status === 'true' || query.status === 'active';
    }

    const [items, total] = await Promise.all([
      this.prisma.manufacturer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.manufacturer.count({ where }),
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
    const manufacturer = await this.prisma.manufacturer.findFirst({
      where: { id, deletedAt: null },
    });

    if (!manufacturer) {
      throw new NotFoundException(`Manufacturer with ID "${id}" not found.`);
    }

    return manufacturer;
  }

  async update(id: string, updateManufacturerDto: UpdateManufacturerDto) {
    const manufacturer = await this.findOne(id);

    if (updateManufacturerDto.name) {
      const name = updateManufacturerDto.name.trim();
      const existing = await this.prisma.manufacturer.findFirst({
        where: {
          name: { equals: name, mode: 'insensitive' },
          id: { not: id },
        },
      });

      if (existing) {
        throw new ConflictException(`Manufacturer with name "${name}" already exists.`);
      }
      manufacturer.name = name;
    }

    return this.prisma.manufacturer.update({
      where: { id },
      data: {
        name: manufacturer.name,
        contactPerson: updateManufacturerDto.contactPerson !== undefined ? updateManufacturerDto.contactPerson : manufacturer.contactPerson,
        phone: updateManufacturerDto.phone !== undefined ? updateManufacturerDto.phone : manufacturer.phone,
        email: updateManufacturerDto.email !== undefined ? updateManufacturerDto.email : manufacturer.email,
        address: updateManufacturerDto.address !== undefined ? updateManufacturerDto.address : manufacturer.address,
        gstNumber: updateManufacturerDto.gstNumber !== undefined ? updateManufacturerDto.gstNumber : manufacturer.gstNumber,
        status: updateManufacturerDto.status !== undefined ? updateManufacturerDto.status : manufacturer.status,
        syncStatus: SyncStatus.PENDING,
        updatedAt: new Date(),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.manufacturer.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        syncStatus: SyncStatus.PENDING,
        updatedAt: new Date(),
      },
    });
  }

  async toggleStatus(id: string) {
    const manufacturer = await this.findOne(id);

    return this.prisma.manufacturer.update({
      where: { id },
      data: {
        status: !manufacturer.status,
        syncStatus: SyncStatus.PENDING,
        updatedAt: new Date(),
      },
    });
  }
}

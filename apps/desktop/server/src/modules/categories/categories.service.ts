import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { SyncStatus } from '@medingen/db';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createCategoryDto: CreateCategoryDto) {
    const name = createCategoryDto.name.trim();

    // Check if category already exists (including soft-deleted ones)
    const existing = await this.prisma.category.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });

    if (existing) {
      if (existing.deletedAt) {
        // Restore soft-deleted category
        return this.prisma.category.update({
          where: { id: existing.id },
          data: {
            deletedAt: null,
            status: createCategoryDto.status ?? true,
            syncStatus: SyncStatus.PENDING,
            updatedAt: new Date(),
          },
        });
      }
      throw new ConflictException(`Category with name "${name}" already exists.`);
    }

    return this.prisma.category.create({
      data: {
        name,
        status: createCategoryDto.status ?? true,
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
      where.name = {
        contains: query.search.trim(),
        mode: 'insensitive',
      };
    }

    if (query.status !== undefined && query.status !== '') {
      where.status = query.status === 'true' || query.status === 'active';
    }

    const [items, total] = await Promise.all([
      this.prisma.category.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.category.count({ where }),
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
    const category = await this.prisma.category.findFirst({
      where: { id, deletedAt: null },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID "${id}" not found.`);
    }

    return category;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    const category = await this.findOne(id);

    if (updateCategoryDto.name) {
      const name = updateCategoryDto.name.trim();
      const existing = await this.prisma.category.findFirst({
        where: {
          name: { equals: name, mode: 'insensitive' },
          id: { not: id },
        },
      });

      if (existing) {
        throw new ConflictException(`Category with name "${name}" already exists.`);
      }
      category.name = name;
    }

    if (updateCategoryDto.status !== undefined) {
      category.status = updateCategoryDto.status;
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        name: category.name,
        status: category.status,
        syncStatus: SyncStatus.PENDING,
        updatedAt: new Date(),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.category.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        syncStatus: SyncStatus.PENDING,
        updatedAt: new Date(),
      },
    });
  }

  async toggleStatus(id: string) {
    const category = await this.findOne(id);

    return this.prisma.category.update({
      where: { id },
      data: {
        status: !category.status,
        syncStatus: SyncStatus.PENDING,
        updatedAt: new Date(),
      },
    });
  }
}

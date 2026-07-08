import { Injectable, NotFoundException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto, LoginDto } from './dto/create-user.dto';
import { SyncStatus } from '@medingen/db';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '../../common/domain/jwt.service';


@Injectable()
export class UsersManagementService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });

    if (existing) {
      throw new ConflictException(`User with username "${dto.username}" already exists.`);
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(dto.passwordHash, salt);

    return this.prisma.user.create({
      data: {
        username: dto.username.trim(),
        passwordHash: hash,
        role: dto.role,
        status: true,
        syncStatus: SyncStatus.PENDING,
      },
    });
  }

  async findAll(query: { page?: number; limit?: number }) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.max(1, query.limit ?? 10);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { username: 'asc' },
        select: {
          id: true,
          username: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.user.count(),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found.`);
    }

    let finalPasswordHash = user.passwordHash;
    if (dto.passwordHash) {
      const salt = await bcrypt.genSalt(10);
      finalPasswordHash = await bcrypt.hash(dto.passwordHash, salt);
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        role: dto.role !== undefined ? dto.role : user.role,
        status: dto.status !== undefined ? dto.status : user.status,
        passwordHash: finalPasswordHash,
        syncStatus: SyncStatus.PENDING,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        username: true,
        role: true,
        status: true,
        updatedAt: true,
      },
    });
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        username: {
          equals: dto.username.trim(),
          mode: 'insensitive',
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid username or account is inactive.');
    }

    if (!user.status) {
      throw new UnauthorizedException('This account is disabled. Contact Administrator.');
    }

    let isCorrect = false;
    const isBcryptHash = user.passwordHash && (
      user.passwordHash.startsWith('$2a$') ||
      user.passwordHash.startsWith('$2b$') ||
      user.passwordHash.startsWith('$2y$')
    );

    if (isBcryptHash) {
      try {
        isCorrect = await bcrypt.compare(dto.password, user.passwordHash);
      } catch (err) {
        console.error("Bcrypt check failed on server:", err);
      }
    } else {
      isCorrect = dto.password === user.passwordHash;
    }

    if (!isCorrect) {
      throw new UnauthorizedException('Invalid password. Check credentials and try again.');
    }

    const token = JwtService.sign({
      id: user.id,
      username: user.username,
      role: user.role,
    });

    return {
      id: user.id,
      username: user.username,
      role: user.role,
      token,
    };
  }

  async remove(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found.`);
    }

    return this.prisma.user.delete({
      where: { id },
      select: {
        id: true,
        username: true,
      },
    });
  }
}



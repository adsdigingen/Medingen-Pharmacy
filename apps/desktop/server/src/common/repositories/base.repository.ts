import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../modules/prisma/prisma.service';

/**
 * Abstract base repository providing common CRUD operations.
 * All domain repositories extend this base class.
 */
@Injectable()
export abstract class BaseRepository {
  constructor(protected readonly prisma: PrismaService) {}
}

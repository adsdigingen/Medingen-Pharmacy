import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LicenseService {
  constructor(private readonly prisma: PrismaService) {}

  async getLicense() {
    let license = await this.prisma.licenseInfo.findUnique({
      where: { id: 'license' },
    });

    if (!license) {
      license = await this.prisma.licenseInfo.create({
        data: {
          id: 'license',
          licenseKey: 'DEMO-TRIAL-KEY',
          status: 'ACTIVE',
          activatedAt: new Date(),
          expiresAt: new Date(new Date().getFullYear() + 1, new Date().getMonth(), new Date().getDate()), // 1 year trial
          features: 'ALL_OFFLINE_MODULES',
        },
      });
    }

    // Dynamic checks
    const now = new Date();
    if (license.expiresAt && license.expiresAt < now && license.status !== 'EXPIRED') {
      license = await this.prisma.licenseInfo.update({
        where: { id: 'license' },
        data: { status: 'EXPIRED' },
      });
    }

    return license;
  }

  async activate(licenseKey: string) {
    const keyTrim = licenseKey.trim().toUpperCase();
    
    // Check simple offline validation rule: e.g. must start with "MED-" and be at least 15 chars
    if (!keyTrim.startsWith("MED-") || keyTrim.length < 12) {
      throw new BadRequestException("Invalid License key format. Form must be: MED-XXXX-XXXX-XXXX.");
    }

    const activatedAt = new Date();
    const expiresAt = new Date(activatedAt.getFullYear() + 2, activatedAt.getMonth(), activatedAt.getDate()); // 2 years license on activate

    return this.prisma.licenseInfo.update({
      where: { id: 'license' },
      data: {
        licenseKey: keyTrim,
        status: 'ACTIVE',
        activatedAt,
        expiresAt,
        features: 'ENTERPRISE_EDITION',
      },
    });
  }
}

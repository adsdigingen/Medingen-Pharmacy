import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { SettingsRepository } from './repository/settings.repository';

@Injectable()
export class SystemSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: SettingsRepository,
  ) {}

  async getSettings() {
    let settings = await this.repo.findSingleton();

    if (!settings) {
      settings = await this.repo.createSingleton({
        id: 'singleton',
        storeName: 'Medingen Pharmacy',
        invoicePrefix: 'INV-',
        poPrefix: 'PO-',
        printerType: '80mm',
        backupInterval: 'DAILY',
      });
    }

    return settings;
  }

  async update(dto: UpdateSettingsDto) {
    const settings = await this.getSettings();

    return this.repo.updateSingleton({
      storeName: dto.storeName !== undefined ? dto.storeName : settings.storeName,
      gstin: dto.gstin !== undefined ? dto.gstin : settings.gstin,
      phone: dto.phone !== undefined ? dto.phone : settings.phone,
      email: dto.email !== undefined ? dto.email : settings.email,
      address: dto.address !== undefined ? dto.address : settings.address,
      invoicePrefix: dto.invoicePrefix !== undefined ? dto.invoicePrefix : settings.invoicePrefix,
      poPrefix: dto.poPrefix !== undefined ? dto.poPrefix : settings.poPrefix,
      printerType: dto.printerType !== undefined ? dto.printerType : settings.printerType,
      backupInterval: dto.backupInterval !== undefined ? dto.backupInterval : settings.backupInterval,
    });
  }
}

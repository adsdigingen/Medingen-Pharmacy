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
        invoicePrefix: 'BILL-',
        poPrefix: 'PO-',
        printerType: '80mm',
        backupInterval: 'DAILY',
        defaultOfflineMarkup: 50.0,
        defaultOnlineMarkup: 85.0,
        defaultGst: 12.0,
        defaultRetailDiscount: 0.0,
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
      defaultOfflineMarkup: dto.defaultOfflineMarkup !== undefined ? dto.defaultOfflineMarkup : settings.defaultOfflineMarkup,
      defaultOnlineMarkup: dto.defaultOnlineMarkup !== undefined ? dto.defaultOnlineMarkup : settings.defaultOnlineMarkup,
      defaultGst: dto.defaultGst !== undefined ? dto.defaultGst : settings.defaultGst,
      defaultRetailDiscount: dto.defaultRetailDiscount !== undefined ? dto.defaultRetailDiscount : settings.defaultRetailDiscount,
    });
  }
}

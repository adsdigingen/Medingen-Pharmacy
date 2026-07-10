import { Controller, Get, Post, Body, Param, Query, UseGuards, Request, Res, HttpStatus } from '@nestjs/common';
import * as express from 'express';
import { DrugScheduleRegisterService } from './drug-schedule-register.service';
import { VerifyRegisterDto } from './dto/verify-register.dto';
import { SaveSignatureDto } from './dto/save-signature.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@medingen/db';

@UseGuards(AuthGuard, RolesGuard)
@Controller('drug-schedule-register')
export class DrugScheduleRegisterController {
  constructor(private readonly service: DrugScheduleRegisterService) {}

  @Get()
  @Roles(Role.ADMIN, Role.STORE_MANAGER, Role.PHARMACIST, Role.CASHIER)
  findAll(
    @Query('search') search?: string,
    @Query('scheduleType') scheduleType?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('pharmacist') pharmacist?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAll({
      search,
      scheduleType,
      status,
      startDate,
      endDate,
      pharmacist,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('export-pdf')
  @Roles(Role.ADMIN, Role.STORE_MANAGER, Role.PHARMACIST)
  async exportPdf(
    @Query('search') search: string,
    @Query('scheduleType') scheduleType: string,
    @Query('status') status: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('pharmacist') pharmacist: string,
    @Request() req: any,
    @Res() res: express.Response,
  ) {
    const html = await this.service.generatePrintHtml({
      search,
      scheduleType,
      status,
      startDate,
      endDate,
      pharmacist,
      username: req.user?.username || 'SYSTEM',
    });
    res.setHeader('Content-Type', 'text/html');
    return res.status(HttpStatus.OK).send(html);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.STORE_MANAGER, Role.PHARMACIST, Role.CASHIER)
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post(':id/verify')
  @Roles(Role.ADMIN, Role.PHARMACIST)
  verify(
    @Param('id') id: string,
    @Body() dto: VerifyRegisterDto,
    @Request() req: any,
  ) {
    return this.service.verify(id, dto, req.user?.username || 'SYSTEM');
  }

  @Post(':id/signature')
  @Roles(Role.ADMIN, Role.PHARMACIST)
  saveSignature(
    @Param('id') id: string,
    @Body() dto: SaveSignatureDto,
    @Request() req: any,
  ) {
    return this.service.saveSignature(id, dto, req.user?.username || 'SYSTEM');
  }

  @Post('print')
  @Roles(Role.ADMIN, Role.STORE_MANAGER, Role.PHARMACIST)
  printRegister(
    @Body() body: { ids: string[] },
    @Request() req: any,
  ) {
    return this.service.printRegister(body.ids, req.user?.username || 'SYSTEM');
  }
}

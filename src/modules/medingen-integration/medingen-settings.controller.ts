import {
  Controller,
  Get,
  Post,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ApiKeyService } from './services/api-key.service';

@Controller(['api/settings/integrations/medingen', 'settings/integrations/medingen'])
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class MedingenSettingsController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  /**
   * GET /api/settings/integrations/medingen
   * Retrieves integration status and metadata. Never exposes full key.
   */
  @Get()
  async getIntegrationStatus() {
    return this.apiKeyService.getStatus();
  }

  /**
   * POST /api/settings/integrations/medingen/api-key
   * Creates a new API key. The full secret is returned ONLY here.
   */
  @Post('api-key')
  @HttpCode(HttpStatus.OK)
  async createApiKey(@Req() req: any) {
    const userId = req.user?.id;
    const username = req.user?.username;
    return this.apiKeyService.createKey(userId, username);
  }

  /**
   * POST /api/settings/integrations/medingen/api-key/regenerate
   * Revokes the old key, generates a new key, and returns the new secret once.
   */
  @Post('api-key/regenerate')
  @HttpCode(HttpStatus.OK)
  async regenerateApiKey(@Req() req: any) {
    const userId = req.user?.id;
    const username = req.user?.username;
    return this.apiKeyService.regenerateKey(userId, username);
  }

  /**
   * POST /api/settings/integrations/medingen/api-key/revoke
   * Revokes the active key. Future API calls return 401.
   */
  @Post('api-key/revoke')
  @HttpCode(HttpStatus.OK)
  async revokeApiKey(@Req() req: any) {
    const userId = req.user?.id;
    const username = req.user?.username;
    return this.apiKeyService.revokeKey(userId, username);
  }
}

import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { InvitationsService } from './invitations.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { ActivateAccountDto } from './dto/activate-account.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/user-role.enum';

@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async create(@Body() dto: CreateInvitationDto, @CurrentUser() user: any) {
    return this.invitationsService.create(dto, user.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async findAll() {
    return this.invitationsService.findAll();
  }

  @Post('activate')
  async activate(@Body() dto: ActivateAccountDto) {
    const user = await this.invitationsService.activate(dto.token, dto.password);
    const { password, ...result } = user;
    return result;
  }

  @Post(':id/resend')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async resend(@Param('id') id: string) {
    return this.invitationsService.resend(id);
  }

  @Patch(':id/revoke')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async revoke(@Param('id') id: string) {
    return this.invitationsService.revoke(id);
  }
}

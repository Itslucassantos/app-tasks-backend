import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CreateUserDto } from './dtos/create-user.dto';
import { UsersService } from './users.service';
import { AuthTokenGuard } from 'src/auth/guard/auth-token.guard';
import { TokenPayloadParam } from 'src/auth/param/auth-token.guard';
import { PayloadTokenDto } from 'src/auth/dtos/payload-token.dto';
import { UpdateUserDto } from './dtos/update-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  createUser(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @UseGuards(AuthTokenGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a user by ID' })
  @Patch(':id')
  updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @TokenPayloadParam() tokenPayload: PayloadTokenDto,
  ) {
    return this.usersService.update(id, updateUserDto, tokenPayload);
  }

  @ApiOperation({ summary: 'Get a user by ID' })
  @Get(':id')
  findOneUser(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @UseGuards(AuthTokenGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a user by ID' })
  @Delete(':id')
  deleteUser(
    @Param('id') id: string,
    @TokenPayloadParam() tokenPayload: PayloadTokenDto,
  ) {
    return this.usersService.delete(id, tokenPayload);
  }
}

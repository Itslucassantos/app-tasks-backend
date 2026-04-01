import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AuthTokenGuard } from 'src/auth/guard/auth-token.guard';
import { TokenPayloadParam } from 'src/auth/param/auth-token.guard';
import { CreateTaskDto } from './dtos/create-task.dto';
import { PayloadTokenDto } from 'src/auth/dtos/payload-token.dto';
import { UpdateTaskDto } from './dtos/update-task.dto';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { CompleteTaskDto } from './dtos/complete-task.dto';
import { FindTasksQueryDto } from './dtos/find-tasks-query.dto';

@Controller('tasks')
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @UseGuards(AuthTokenGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new task' })
  @Post()
  createTask(
    @Body() createTaskDto: CreateTaskDto,
    @TokenPayloadParam() tokenPayload: PayloadTokenDto,
  ) {
    return this.tasksService.create(createTaskDto, tokenPayload);
  }

  @UseGuards(AuthTokenGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a task by ID' })
  @Patch(':taskId')
  updateTask(
    @Param('taskId') taskId: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @TokenPayloadParam() tokenPayload: PayloadTokenDto,
  ) {
    return this.tasksService.update(taskId, updateTaskDto, tokenPayload);
  }

  @UseGuards(AuthTokenGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a task by ID' })
  @Delete(':taskId')
  deleteTask(
    @Param('taskId') taskId: string,
    @TokenPayloadParam() tokenPayload: PayloadTokenDto,
  ) {
    return this.tasksService.delete(taskId, tokenPayload);
  }

  @UseGuards(AuthTokenGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get due tasks for current period with pagination' })
  @ApiQuery({
    name: 'limit',
    required: false,
    example: 10,
    description: 'Limit of items to return',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    example: 0,
    description: 'Number of items to skip',
  })
  @Get('due')
  findDueTasks(
    @Query() paginationDto: PaginationDto,
    @TokenPayloadParam() tokenPayload: PayloadTokenDto,
  ) {
    return this.tasksService.findDue(paginationDto, tokenPayload);
  }

  @UseGuards(AuthTokenGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all tasks with filters' })
  @ApiQuery({
    name: 'frequency',
    required: false,
    example: 'DAILY',
    description: 'Filter tasks by frequency',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    example: 'due',
    description: 'Filter tasks by status: due, completed or all',
  })
  @ApiQuery({
    name: 'q',
    required: false,
    example: 'gym',
    description: 'Search by title or category',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    example: 10,
    description: 'Limit of items to return',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    example: 0,
    description: 'Number of items to skip',
  })
  @Get()
  findAllTasks(
    @Query() findTasksQueryDto: FindTasksQueryDto,
    @TokenPayloadParam() tokenPayload: PayloadTokenDto,
  ) {
    return this.tasksService.findAll(findTasksQueryDto, tokenPayload);
  }

  @UseGuards(AuthTokenGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get one task by ID' })
  @Get(':taskId')
  findOneTask(
    @Param('taskId') taskId: string,
    @TokenPayloadParam() tokenPayload: PayloadTokenDto,
  ) {
    return this.tasksService.findOne(taskId, tokenPayload);
  }

  @UseGuards(AuthTokenGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Complete a task by ID' })
  @Post('complete')
  completeTask(
    @Body() completeTaskDto: CompleteTaskDto,
    @TokenPayloadParam() tokenPayload: PayloadTokenDto,
  ) {
    return this.tasksService.complete(completeTaskDto, tokenPayload);
  }
}

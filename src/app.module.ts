import { Module } from '@nestjs/common';
import { DbModule } from './db/db.module.js';
import { SetupService } from './db/setup.service.js';
import { HealthController } from './health.controller.js';
import { StadiumsController } from './stadiums/stadiums.controller.js';
import { StadiumsService } from './stadiums/stadiums.service.js';
import { PostsController } from './posts/posts.controller.js';
import { PostsService } from './posts/posts.service.js';

@Module({
  imports: [DbModule],
  controllers: [HealthController, StadiumsController, PostsController],
  providers: [SetupService, StadiumsService, PostsService],
})
export class AppModule {}

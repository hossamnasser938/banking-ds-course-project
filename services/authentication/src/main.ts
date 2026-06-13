import "reflect-metadata";
import { INestApplication, Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ResponseMetadataInterceptor } from "./infrastructure/http/response-metadata.interceptor";
import { AuthService } from "./modules/identity/application/auth.service";

async function bootstrap() {
  const logger = new Logger("Bootstrap");
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Idempotency-Key"]
  });
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.useGlobalInterceptors(new ResponseMetadataInterceptor());
  await seedDefaultAdminIfRequired(app, logger);
  const port = Number(process.env.PORT ?? 8080);
  await app.listen(port);
}

async function seedDefaultAdminIfRequired(
  app: INestApplication,
  logger: Logger
): Promise<void> {
  const authService = app.get(AuthService, { strict: false });
  if (!authService) {
    return;
  }

  const defaultAdminCreated = await authService.seedDefaultAdminIfEmpty();
  if (defaultAdminCreated) {
    logger.log("Default admin account was created.");
  }
}

void bootstrap();

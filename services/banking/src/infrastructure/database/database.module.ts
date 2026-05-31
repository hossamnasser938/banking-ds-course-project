import { Module } from "@nestjs/common";
import { DATABASE_CLIENT, databaseProviders } from "./database.providers";

@Module({
  providers: [...databaseProviders],
  exports: [DATABASE_CLIENT]
})
export class DatabaseModule {}

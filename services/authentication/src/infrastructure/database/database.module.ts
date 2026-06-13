import { Global, Module } from "@nestjs/common";
import { DATABASE_CLIENT, databaseProviders } from "./database.providers";

@Global()
@Module({
  providers: [...databaseProviders],
  exports: [DATABASE_CLIENT]
})
export class DatabaseModule {}

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";

@Injectable()
export class InternalApiGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest() as {
      headers: Record<string, string | undefined>;
    };
    const providedApiKey = request.headers["x-internal-api-key"];
    const expectedApiKey = process.env.AUTH_INTERNAL_API_KEY ?? "dev-internal-api-key";

    if (!providedApiKey || providedApiKey !== expectedApiKey) {
      throw new UnauthorizedException("Unauthorized internal access");
    }

    return true;
  }
}

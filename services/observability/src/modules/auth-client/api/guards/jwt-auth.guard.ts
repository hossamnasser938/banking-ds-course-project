import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { AuthClientService } from "../../application/auth-client.service";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly authClientService: AuthClientService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest() as {
      headers: Record<string, string | undefined>;
      user?: { userId: string; username: string; email: string; role: "user" | "admin" };
    };
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing bearer token");
    }
    const token = authHeader.replace("Bearer ", "");
    request.user = await this.authClientService.verifyToken(token);
    return true;
  }
}

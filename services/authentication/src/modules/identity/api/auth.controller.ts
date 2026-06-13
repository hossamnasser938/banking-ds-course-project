import { Body, Controller, Get, Post, UnauthorizedException, UseGuards } from "@nestjs/common";
import { AuthService } from "../application/auth.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { InternalApiGuard } from "./guards/internal-api.guard";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  async register(@Body() body: RegisterDto) {
    return this.authService.register(body);
  }

  @Post("login")
  async login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }

  @Post("internal/verify")
  @UseGuards(InternalApiGuard)
  async verify(@Body() body: { token?: string }) {
    if (!body.token) {
      throw new UnauthorizedException("Token is required");
    }
    return this.authService.verifyTokenWithIdentity(body.token);
  }

  @Get("internal/users")
  @UseGuards(InternalApiGuard)
  async listUsers() {
    return this.authService.listUsers();
  }
}

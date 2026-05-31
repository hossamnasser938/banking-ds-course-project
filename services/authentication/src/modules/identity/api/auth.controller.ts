import { Body, Controller, Get, Post, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "../application/auth.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  register(@Body() body: RegisterDto) {
    return this.authService.register(body);
  }

  @Post("login")
  login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }

  @Post("internal/verify")
  verify(@Body() body: { token?: string }) {
    if (!body.token) {
      throw new UnauthorizedException("Token is required");
    }
    return this.authService.verifyTokenWithIdentity(body.token);
  }

  @Get("internal/users")
  listUsers() {
    return this.authService.listUsers();
  }
}

import { Injectable } from "@nestjs/common";

@Injectable()
export class ConfigService {
  get(key: string, fallback = ""): string {
    return process.env[key] ?? fallback;
  }

  getPort(): number {
    return Number(this.get("PORT", "8080"));
  }

  getNodeId(): string {
    return this.get("NODE_ID", "api-local-1");
  }

  getZone(): string {
    return this.get("ZONE", "local-zone-a");
  }
}

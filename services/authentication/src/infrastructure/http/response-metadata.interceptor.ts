import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor
} from "@nestjs/common";
import { map, Observable } from "rxjs";

@Injectable()
export class ResponseMetadataInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const nodeId = process.env.NODE_ID ?? "api-local-1";
    const zone = process.env.ZONE ?? "local-zone-a";
    return next.handle().pipe(
      map((data) => ({
        ...((data as Record<string, unknown>) ?? {}),
        metadata: {
          nodeId,
          zone,
          timestamp: new Date().toISOString()
        }
      }))
    );
  }
}

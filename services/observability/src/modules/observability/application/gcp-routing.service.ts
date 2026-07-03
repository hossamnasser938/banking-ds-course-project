import { BadRequestException, Injectable } from "@nestjs/common";
import { SetRoutingTargetDto } from "../api/dto/set-routing-target.dto";

type TrafficTarget = {
  revision?: string;
  tag?: string;
  percent?: number;
  type?: string;
};

type CloudRunServiceResponse = {
  [key: string]: unknown;
  name?: string;
  traffic?: TrafficTarget[];
};

@Injectable()
export class GcpRoutingService {
  private readonly projectId =
    process.env.GCP_PROJECT_ID ??
    process.env.GOOGLE_CLOUD_PROJECT ??
    process.env.GCLOUD_PROJECT ??
    "";
  private readonly region = process.env.GCP_REGION ?? process.env.REGION ?? "us-central1";
  private readonly bankingCloudRunService =
    process.env.BANKING_CLOUD_RUN_SERVICE ?? "banking-banking";
  private readonly bankingTagA = process.env.BANKING_TRAFFIC_TAG_A ?? "tag-a";
  private readonly bankingTagB = process.env.BANKING_TRAFFIC_TAG_B ?? "tag-b";
  private readonly cloudRunApiBase = "https://run.googleapis.com/v2";
  private readonly routingPropagationWaitMs = Number(
    process.env.ROUTING_PROPAGATION_WAIT_MS ?? 90000
  );

  async getRoutingStatus(): Promise<{
    provider: "gcp";
    bankingAEnabled: boolean;
    bankingBEnabled: boolean;
    bankingAWeight: number;
    bankingBWeight: number;
    urlMapName: string;
  }> {
    const service = await this.getCloudRunService();
    const { bankingAWeight, bankingBWeight } = this.extractWeights(service);
    return {
      provider: "gcp",
      bankingAEnabled: bankingAWeight > 0,
      bankingBEnabled: bankingBWeight > 0,
      bankingAWeight,
      bankingBWeight,
      urlMapName: this.bankingCloudRunService
    };
  }

  async setBankingRouting(input: SetRoutingTargetDto): Promise<{
    provider: "gcp";
    bankingAEnabled: boolean;
    bankingBEnabled: boolean;
    bankingAWeight: number;
    bankingBWeight: number;
    urlMapName: string;
  }> {
    if (!this.projectId) {
      throw new Error("GCP project is not configured on observability service");
    }

    if (!input.bankingAEnabled && !input.bankingBEnabled) {
      throw new BadRequestException("At least one banking service must stay enabled");
    }

    const desiredWeights = this.resolveWeights(input);
    const service = await this.getCloudRunService();
    const currentWeights = this.extractWeights(service);

    if (
      currentWeights.bankingAWeight === desiredWeights.bankingAWeight &&
      currentWeights.bankingBWeight === desiredWeights.bankingBWeight
    ) {
      return {
        provider: "gcp",
        bankingAEnabled: desiredWeights.bankingAWeight > 0,
        bankingBEnabled: desiredWeights.bankingBWeight > 0,
        bankingAWeight: desiredWeights.bankingAWeight,
        bankingBWeight: desiredWeights.bankingBWeight,
        urlMapName: this.bankingCloudRunService
      };
    }

    const updatedTraffic = this.withUpdatedTrafficTargets(service, desiredWeights);
    await this.patchCloudRunTrafficWithRetry(updatedTraffic);
    if (this.routingPropagationWaitMs > 0) {
      await this.delay(this.routingPropagationWaitMs);
    }

    return {
      provider: "gcp",
      bankingAEnabled: desiredWeights.bankingAWeight > 0,
      bankingBEnabled: desiredWeights.bankingBWeight > 0,
      bankingAWeight: desiredWeights.bankingAWeight,
      bankingBWeight: desiredWeights.bankingBWeight,
      urlMapName: this.bankingCloudRunService
    };
  }

  private async getCloudRunService(): Promise<CloudRunServiceResponse> {
    return await this.callCloudRunApi(
      "GET",
      `/projects/${this.projectId}/locations/${this.region}/services/${this.bankingCloudRunService}`
    );
  }

  private resolveWeights(input: SetRoutingTargetDto): {
    bankingAWeight: number;
    bankingBWeight: number;
  } {
    if (input.bankingAEnabled && input.bankingBEnabled) {
      return { bankingAWeight: 50, bankingBWeight: 50 };
    }
    if (input.bankingAEnabled) {
      return { bankingAWeight: 100, bankingBWeight: 0 };
    }
    return { bankingAWeight: 0, bankingBWeight: 100 };
  }

  private extractWeights(service: CloudRunServiceResponse): {
    bankingAWeight: number;
    bankingBWeight: number;
  } {
    let bankingAWeight = 0;
    let bankingBWeight = 0;
    for (const target of service.traffic ?? []) {
      if (target.tag === this.bankingTagA) {
        bankingAWeight = target.percent ?? 0;
      }
      if (target.tag === this.bankingTagB) {
        bankingBWeight = target.percent ?? 0;
      }
    }
    return { bankingAWeight, bankingBWeight };
  }

  private withUpdatedTrafficTargets(
    service: CloudRunServiceResponse,
    weights: { bankingAWeight: number; bankingBWeight: number }
  ): TrafficTarget[] {
    const currentTraffic = service.traffic ?? [];
    const taggedA = currentTraffic.find((target) => target.tag === this.bankingTagA);
    const taggedB = currentTraffic.find((target) => target.tag === this.bankingTagB);
    if (!taggedA || !taggedB) {
      throw new Error(
        `Cloud Run service '${this.bankingCloudRunService}' must have traffic tags '${this.bankingTagA}' and '${this.bankingTagB}'`
      );
    }
    if (!taggedA.revision || !taggedB.revision) {
      throw new Error(
        `Cloud Run tagged traffic entries for '${this.bankingCloudRunService}' must reference concrete revisions`
      );
    }

    // Keep traffic policy deterministic by only writing explicit tagged targets.
    // This avoids leaving stale untagged split entries that can still receive traffic.
    return [
      {
        revision: taggedA.revision,
        tag: this.bankingTagA,
        percent: weights.bankingAWeight,
        type: taggedA.type
      },
      {
        revision: taggedB.revision,
        tag: this.bankingTagB,
        percent: weights.bankingBWeight,
        type: taggedB.type
      }
    ];
  }

  private async callCloudRunApi<T>(
    method: "GET" | "PATCH" | "POST" | "PUT",
    path: string,
    body?: unknown
  ): Promise<T> {
    const accessToken = await this.getAccessToken();
    const response = await fetch(`${this.cloudRunApiBase}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: body ? JSON.stringify(body) : undefined
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Cloud Run API ${method} ${path} failed (${response.status}): ${text}`);
    }
    return (await response.json()) as T;
  }

  private async patchCloudRunTrafficWithRetry(traffic: TrafficTarget[]): Promise<void> {
    const maxAttempts = 5;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this.callCloudRunApi(
          "PATCH",
          `/projects/${this.projectId}/locations/${this.region}/services/${this.bankingCloudRunService}?updateMask=traffic`,
          {
            name: `projects/${this.projectId}/locations/${this.region}/services/${this.bankingCloudRunService}`,
            traffic
          }
        );
        return;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const retryable = message.includes("ABORTED") || message.includes("FAILED_PRECONDITION");
        if (!retryable || attempt === maxAttempts) {
          throw error;
        }
        await this.delay(400 * attempt);
      }
    }
  }

  private async getAccessToken(): Promise<string> {
    const metadataUrl =
      "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token";
    const response = await fetch(metadataUrl, {
      headers: {
        "Metadata-Flavor": "Google"
      }
    });
    if (!response.ok) {
      throw new Error("Failed to obtain GCP metadata access token");
    }
    const payload = (await response.json()) as { access_token?: string };
    if (!payload.access_token) {
      throw new Error("GCP metadata token response missing access_token");
    }
    return payload.access_token;
  }

  private async delay(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}

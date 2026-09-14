export const socialConnectors = [
  {
    id: "instagram",
    name: "Instagram",
    state: "export_only",
    requirements:
      "Professional-account eligibility, Meta OAuth, app review and current scopes must be verified before connection.",
  },
  {
    id: "facebook",
    name: "Facebook",
    state: "export_only",
    requirements:
      "Pages publishing eligibility and Meta app review required. A personal professional dashboard does not establish API access.",
  },
  {
    id: "tiktok",
    name: "TikTok",
    state: "export_only",
    requirements:
      "Creator OAuth, video.publish approval, posting UI requirements and audit. Unreviewed clients are restricted to private posts.",
  },
  {
    id: "youtube",
    name: "YouTube",
    state: "export_only",
    requirements:
      "Channel OAuth, resumable uploads and API project verification. Unverified uploads remain private.",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    state: "export_only",
    requirements:
      "Export copy and media. No LinkedIn publishing adapter is installed.",
  },
] as const;
export interface SocialConnector {
  capabilities(): { publish: boolean; schedule: boolean; analytics: string[] };
  publish(input: {
    accountId: string;
    versionId: string;
    caption: string;
    idempotencyKey: string;
  }): Promise<{
    receipt: string;
    state: "processing" | "published";
    url?: string;
  }>;
  status(
    receipt: string,
  ): Promise<{ state: "processing" | "published" | "failed"; url?: string }>;
  metrics(input: {
    accountId: string;
    externalId: string;
    start: string;
    end: string;
  }): Promise<{ metric: string; value: number; definition: string }[]>;
}
export function publishingAvailable() {
  return false;
}

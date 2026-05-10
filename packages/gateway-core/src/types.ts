export type GatewayPlatform = "telegram" | "slack" | "discord";

export interface GatewayAttachment {
  kind: "image" | "audio" | "file";
  localPath: string;
  mimeType?: string;
  originalName?: string;
}

export interface GatewayInboundEvent {
  platform: GatewayPlatform;
  chatId: string;
  userId: string;
  threadId?: string;
  messageId: string;
  text?: string;
  attachments: GatewayAttachment[];
  timestamp: string;
  raw: unknown;
}

export interface GatewayOutboundMessage {
  platform: GatewayPlatform;
  targetChatId: string;
  targetThreadId?: string;
  text: string;
  deliveryMode: "final" | "status" | "approval";
}

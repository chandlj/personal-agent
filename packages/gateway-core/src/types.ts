export type GatewayPlatform = "telegram" | "slack" | "discord";

export type GatewayRouteScope = "dm" | "group" | "channel" | "thread";

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
  scope?: GatewayRouteScope;
  threadId?: string;
  messageId: string;
  text?: string;
  attachments: GatewayAttachment[];
  timestamp: string;
  raw: unknown;
}

export type GatewayHandledPlatform = "telegram";

export type GatewayHandledInboundEvent = GatewayInboundEvent & {
  platform: GatewayHandledPlatform;
};

export type GatewayDeliveryMode = "final" | "status" | "approval";

export interface GatewayOutboundAttachment {
  kind: "image" | "audio" | "file";
  localPath: string;
  mimeType?: string;
  originalName?: string;
}

export interface GatewayOutboundMessage {
  platform: GatewayPlatform;
  targetChatId: string;
  targetThreadId?: string;
  text: string;
  attachments?: GatewayOutboundAttachment[];
  replyToMessageId?: string;
  deliveryMode?: GatewayDeliveryMode;
}

export interface GatewayRoute {
  agentId: string;
  platform: GatewayPlatform;
  scope: GatewayRouteScope;
  chatId: string;
  threadId?: string;
  sessionKey: string;
}

export interface GatewayHandleResult {
  route: GatewayRoute;
  workspaceId: string;
  sessionId: string;
  userEntryId: string;
  assistantEntryId: string;
  outbound: GatewayOutboundMessage;
}

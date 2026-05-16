export type WebtopMessage = {
  subject: string;
  sender: string;
  date: string; // ISO
  hasRead: boolean;
  hasAttachments: boolean;
  messageId: string;
};

export type MessagesState = {
  messages: WebtopMessage[];
  totalCount: number;
  updatedAt: number;
};

export const DEFAULT_MESSAGES: MessagesState = {
  messages: [],
  totalCount: 0,
  updatedAt: 0,
};

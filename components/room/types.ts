export type ChatMessage = {
  id: string;
  roomId: string;
  token?: string;
  sender: string;
  text: string;
  timestamp: number;
};


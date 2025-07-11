export interface IMessagePublisher {
  connect(): Promise<void>;
  publish(eventType: string, payload: any): Promise<void>;
  disconnect(): Promise<void>;
}

export interface IMessageConsumer {
  connect(): Promise<void>;
  startListening(): Promise<void>;
  disconnect(): Promise<void>;
}

export interface MessageEvent {
  type: string;
  payload: any;
}

declare module 'ws' {
  import { EventEmitter } from 'events';

  class WebSocket extends EventEmitter {
    static WebSocket: typeof WebSocket;
    static WebSocketServer: any;
    static Server: any;
    constructor(address: string | URL, protocols?: string | string[], options?: any);
    send(data: any, cb?: (err?: Error) => void): void;
    close(code?: number, data?: string | Buffer): void;
    terminate(): void;
    ping(data?: any, mask?: boolean, cb?: (err?: Error) => void): void;
    pong(data?: any, mask?: boolean, cb?: (err?: Error) => void): void;
    readyState: number;
    url: string;
  }

  export = WebSocket;
}

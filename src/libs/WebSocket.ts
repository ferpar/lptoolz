import { ethers } from 'ethers';

const WEBSOCKET_PING_INTERVAL = 10000;
const WEBSOCKET_PONG_TIMEOUT = 5000;
const WEBSOCKET_RECONNECT_DELAY = 100;

const WebSocketProviderClass = (): new () => ethers.providers.WebSocketProvider => (class {} as never);

export class WebSocketProvider extends WebSocketProviderClass() {
  private provider?: ethers.providers.WebSocketProvider;
  private events: ethers.providers.WebSocketProvider['_events'] = [];
  private requests: ethers.providers.WebSocketProvider['_requests'] = {};

  private handler = {
    get(target: WebSocketProvider, prop: string, receiver: unknown) {
      const value = target.provider && Reflect.get(target.provider, prop, receiver);

      return value instanceof Function ? value.bind(target.provider) : value;
    },
  };

  constructor(private providerUrl: string) {
    super();
    this.create();

    return new Proxy(this, this.handler);
  }

  private create() {
    if (this.provider) {
      this.events = [...this.events, ...this.provider._events];
      this.requests = { ...this.requests, ...this.provider._requests };
    }

    const provider = new ethers.providers.WebSocketProvider(this.providerUrl, this.provider?.network?.chainId);
    let pingInterval: NodeJS.Timeout | undefined;
    let pongTimeout: NodeJS.Timeout | undefined;

    provider._websocket.on('open', () => {
      pingInterval = setInterval(() => {
        provider._websocket.ping();

        pongTimeout = setTimeout(() => { provider._websocket.terminate(); }, WEBSOCKET_PONG_TIMEOUT);
      }, WEBSOCKET_PING_INTERVAL);

      let event;
      while ((event = this.events.pop())) {
        provider._events.push(event);
        provider._startEvent(event);
      }

      for (const key in this.requests) {
        provider._requests[key] = this.requests[key];
        provider._websocket.send(this.requests[key].payload);
        delete this.requests[key];
      }
    });

    provider._websocket.on('pong', () => {
      if (pongTimeout) clearTimeout(pongTimeout);
    });

    provider._websocket.on('close', (code: number) => {
      provider._wsReady = false;

      if (pingInterval) clearInterval(pingInterval);
      if (pongTimeout) clearTimeout(pongTimeout);

      if (code !== 1000) {
        setTimeout(() => this.create(), WEBSOCKET_RECONNECT_DELAY);
      }
    });

    this.provider = provider;
  }
}
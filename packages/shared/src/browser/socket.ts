/**
 * En WebSocket der selv genforbinder (telefoner går i dvale, wifi hakker...).
 * Kun til browseren – importeres via '@samigame/shared/browser'.
 */
export class ReconnectingSocket<In, Out> {
  private socket: WebSocket | null = null;
  private retryMs = 500;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private closed = false;

  onOpen: () => void = () => {};
  onMessage: (msg: In) => void = () => {};
  onStatus: (connected: boolean) => void = () => {};

  constructor(private readonly url: string) {}

  connect(): void {
    this.closed = false;
    this.open();
  }

  get connected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  send(msg: Out): void {
    if (this.connected) this.socket!.send(JSON.stringify(msg));
  }

  close(): void {
    this.closed = true;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.socket?.close();
  }

  private open(): void {
    const socket = new WebSocket(this.url);
    this.socket = socket;

    socket.addEventListener('open', () => {
      this.retryMs = 500;
      this.onStatus(true);
      this.onOpen();
    });
    socket.addEventListener('message', (event) => {
      try {
        this.onMessage(JSON.parse(String(event.data)) as In);
      } catch {
        // Ignorer beskeder vi ikke kan læse.
      }
    });
    socket.addEventListener('close', () => {
      if (this.socket !== socket) return;
      this.onStatus(false);
      if (this.closed) return;
      this.retryTimer = setTimeout(() => this.open(), this.retryMs);
      this.retryMs = Math.min(this.retryMs * 2, 5000);
    });
  }
}

/** ws://<samme vært>/ws – dev-serverne proxyer /ws videre til spilserveren. */
export function defaultSocketUrl(): string {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${location.host}/ws`;
}

import net from 'node:net';

export function assertPortFree(port: number, owner: string, variable: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', (error: NodeJS.ErrnoException) => {
      reject(
        error.code === 'EADDRINUSE'
          ? new Error(`Port ${port} (${owner}) is already in use. Free it or set ${variable} to another port.`)
          : error,
      );
    });
    probe.listen(port, '127.0.0.1', () => probe.close(() => resolve()));
  });
}

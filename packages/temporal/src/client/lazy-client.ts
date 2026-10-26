import { Client, type ClientOptions, Connection, type ConnectionOptions } from '@temporalio/client';

// A client factory for TemporalWorkflowEngine that leaves nothing open behind a failed attempt.
// The engine calls it again after each failure, and Connection.connect keeps the channel of a
// failed check open, so every call during an outage would leak one.
export function lazyClient(
  connectionOptions: ConnectionOptions,
  clientOptions: Omit<ClientOptions, 'connection'> = {},
): () => Promise<Client> {
  return async () => {
    const connection = Connection.lazy(connectionOptions);
    try {
      await connection.ensureConnected();
    } catch (error) {
      await connection.close();
      throw error;
    }
    return new Client({ ...clientOptions, connection });
  };
}

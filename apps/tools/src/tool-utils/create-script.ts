import { Logger } from './logger';

const logger = new Logger('Scripts');

export function runScript(name: string, scriptFunction: ScriptFunction) {
  const script = createScript(name, scriptFunction);

  return script();
}

function createScript(name: string, scriptFunction: ScriptFunction) {
  return async () => {
    const startTime = performance.now();

    try {
      await scriptFunction({ logger });
    } catch (error) {
      if (!(error instanceof Error)) {
        return;
      }

      logger.taskFailure(name, error.message);
    }

    const endTime = performance.now();
    const elapsedTime = endTime - startTime;
    logger.taskSuccess(name, elapsedTime);
  };
}

type ScriptFunction = (context: ScriptContext) => Promise<void>;
type ScriptContext = {
  logger: Logger;
};

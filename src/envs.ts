import { Logger } from "winston";

export const makeGetRequiredENVVar = (logger: Logger) => (
  envName: string
): string => {
  const envVal = process.env[envName];
  if (envVal === undefined) {
    logger.error("Missing %s required environment variable", envName);
    return process.exit(1);
  } else {
    return envVal;
  }
};

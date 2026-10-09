export class EarlyError extends Error {
  constructor(public code: string, message: string, public status = 400) {
    super(message);
  }
}

export function requireSetting(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new EarlyError("NOT_CONFIGURED", `Missing ${name}.`, 503);
  return value;
}

export function ensure(condition: unknown, code: string, message: string, status = 400): asserts condition {
  if (!condition) throw new EarlyError(code, message, status);
}

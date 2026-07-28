export class AppError extends Error {
  constructor(
    readonly code: string,
    readonly status: 400 | 401 | 403 | 404 | 409 | 413 | 422 | 500 | 502 | 503,
    message: string,
    readonly expose = false,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

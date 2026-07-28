import { AppError } from "../errors";
import type { VoiceRequest } from "../schema";
import { canonicalVoiceRequest } from "./canonical";
import { verifyHmac } from "./hmac";

type VoiceAuthEnvironment = {
  ALLOWED_DEVICE_IDS: string;
  COMMAND_MAX_AGE_SECONDS: string;
  SIGNING_SECRET: string;
};

export async function authenticateVoiceRequest(
  request: VoiceRequest,
  env: VoiceAuthEnvironment,
  now = new Date(),
) {
  const allowedDevices = new Set(
    env.ALLOWED_DEVICE_IDS.split(",")
      .map((device) => device.trim())
      .filter(Boolean),
  );
  if (!allowedDevices.has(request.device)) {
    throw new AppError("unauthorized", 401, "Voice request rejected.");
  }

  const requestedAt = new Date(request.timestamp);
  const maximumAgeMs = Number(env.COMMAND_MAX_AGE_SECONDS) * 1_000;
  if (
    !Number.isFinite(maximumAgeMs) ||
    maximumAgeMs < 30_000 ||
    Math.abs(now.getTime() - requestedAt.getTime()) > maximumAgeMs
  ) {
    throw new AppError("unauthorized", 401, "Voice request rejected.");
  }

  const { signature, ...unsigned } = request;
  const canonical = await canonicalVoiceRequest(unsigned);
  if (!(await verifyHmac(env.SIGNING_SECRET, canonical, signature))) {
    throw new AppError("unauthorized", 401, "Voice request rejected.");
  }
}

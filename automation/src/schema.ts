import { z } from "zod";

const commandName = z
  .string()
  .trim()
  .toLowerCase()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9]+(?:[ -][a-z0-9]+)*$/);

export const voiceRequestSchema = z.object({
  command: commandName,
  device: z
    .string()
    .trim()
    .min(3)
    .max(80)
    .regex(/^[A-Za-z0-9._-]+$/),
  timestamp: z.string().datetime({ offset: true }),
  nonce: z
    .string()
    .min(16)
    .max(128)
    .regex(/^[A-Za-z0-9_-]+$/),
  signature: z.string().regex(/^v1=[a-f0-9]{64}$/),
  payload: z.record(z.string(), z.unknown()).default({}),
});

export type VoiceRequest = z.infer<typeof voiceRequestSchema>;

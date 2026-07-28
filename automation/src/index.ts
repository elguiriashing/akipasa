import { Hono } from "hono";
import { secureHeaders } from "hono/secure-headers";
import { AppError } from "./errors";
import type { AppEnvironment, Bindings } from "./bindings";
import { voiceRequestSchema } from "./schema";
import { authenticateVoiceRequest } from "./security/voice-auth";
import { reserveNonce } from "./security/replay";
import {
  describeCommand,
  listCommands,
  resolveCommand,
} from "./command-router";
import {
  finishExecution,
  startExecution,
  type ExecutionRecord,
} from "./execution-log";
import {
  clearDashboardSession,
  createDashboardSession,
  hasSameOrigin,
  isDashboardAuthenticated,
  setDashboardSession,
  verifyDashboardPassword,
} from "./dashboard/auth";
import { loadDashboardData } from "./dashboard/data";
import {
  activityHtml,
  commandDetailHtml,
  commandHubHtml,
  commandResultHtml,
  dashboardHtml,
  loginHtml,
} from "./dashboard/html";
import { runMaintenance } from "./maintenance";
import { executeOperatorCommand } from "./operator-command";
import { handleTelegramWebhook } from "./telegram-webhook";

const app = new Hono<AppEnvironment>();
const maximumBodyBytes = 16_384;

app.use("*", async (context, next) => {
  context.set("requestId", crypto.randomUUID());
  await next();
});
app.use(
  "*",
  secureHeaders({
    contentSecurityPolicy: {
      defaultSrc: ["'none'"],
      styleSrc: ["'unsafe-inline'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      baseUri: ["'none'"],
    },
    strictTransportSecurity: "max-age=31536000; includeSubDomains",
    referrerPolicy: "no-referrer",
  }),
);

app.get("/", (context) => context.redirect("/dashboard", 302));

app.get("/health", async (context) => {
  const database = await context.env.AUTOMATION_DB.prepare(
    "SELECT 1 AS healthy",
  ).first<{ healthy: number }>();
  return context.json(
    {
      ok: database?.healthy === 1,
      service: context.env.APP_NAME,
      version: context.env.APP_VERSION,
      timestamp: new Date().toISOString(),
    },
    database?.healthy === 1 ? 200 : 503,
  );
});

app.post("/voice", async (context) => {
  const contentLength = Number(context.req.header("content-length") || 0);
  if (contentLength > maximumBodyBytes) {
    return context.json({ ok: false, error: "request-too-large" }, 413);
  }

  const rawBody = await context.req.text();
  if (new TextEncoder().encode(rawBody).byteLength > maximumBodyBytes) {
    return context.json({ ok: false, error: "request-too-large" }, 413);
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawBody);
  } catch {
    return context.json({ ok: false, error: "invalid-request" }, 400);
  }
  const parsed = voiceRequestSchema.safeParse(parsedJson);
  if (!parsed.success) {
    return context.json({ ok: false, error: "invalid-request" }, 400);
  }

  const voiceRequest = parsed.data;
  let execution: ExecutionRecord | null = null;
  try {
    await authenticateVoiceRequest(voiceRequest, context.env);
    execution = await startExecution(context.env, {
      requestId: context.get("requestId"),
      command: voiceRequest.command,
      caller: `device:${voiceRequest.device}`,
    });
    await reserveNonce(voiceRequest, context.env);
    const command = resolveCommand(voiceRequest.command);
    const result = await command.execute({
      env: context.env,
      request: voiceRequest,
      execution,
      now: new Date(),
    });
    await finishExecution(context.env, execution, {
      success: true,
      data: result.data,
    });
    return context.json({
      ok: true,
      requestId: context.get("requestId"),
      command: command.name,
      summary: result.summary,
      data: result.data,
    });
  } catch (error) {
    const appError =
      error instanceof AppError
        ? error
        : new AppError("internal-error", 500, "Automation execution failed.");
    if (execution) {
      try {
        await finishExecution(context.env, execution, {
          success: false,
          code: appError.code,
          error,
        });
      } catch (loggingError) {
        console.error(
          JSON.stringify({
            event: "execution_log_failure",
            requestId: context.get("requestId"),
            executionId: execution.id,
            message:
              loggingError instanceof Error
                ? loggingError.message
                : "Unknown logging error",
          }),
        );
      }
    }
    return context.json(
      {
        ok: false,
        requestId: context.get("requestId"),
        error: appError.code,
        ...(appError.expose ? { message: appError.message } : {}),
      },
      appError.status,
    );
  }
});

app.post("/telegram/webhook", (context) =>
  handleTelegramWebhook(context.req.raw, context.env, context.get("requestId")),
);

app.get("/dashboard/login", async (context) => {
  if (await isDashboardAuthenticated(context)) {
    return context.redirect("/dashboard", 303);
  }
  return context.html(loginHtml(context.req.query("error") === "1"));
});

app.post("/dashboard/login", async (context) => {
  if (!hasSameOrigin(context)) {
    return context.text("Forbidden", 403);
  }
  const form = await context.req.parseBody();
  const password = typeof form.password === "string" ? form.password : "";
  if (!(await verifyDashboardPassword(context.env, password))) {
    return context.redirect("/dashboard/login?error=1", 303);
  }
  setDashboardSession(
    context,
    await createDashboardSession(context.env, new Date()),
  );
  return context.redirect("/dashboard", 303);
});

app.post("/dashboard/logout", (context) => {
  if (!hasSameOrigin(context)) {
    return context.text("Forbidden", 403);
  }
  clearDashboardSession(context);
  return context.redirect("/dashboard/login", 303);
});

app.get("/dashboard", async (context) => {
  if (!(await isDashboardAuthenticated(context))) {
    return context.redirect("/dashboard/login", 303);
  }
  const data = await loadDashboardData(context.env);
  return context.html(
    dashboardHtml(
      data,
      context.env.APP_NAME,
      Boolean(
        context.env.TELEGRAM_BOT_TOKEN &&
          /^-?\d+$/.test(context.env.TELEGRAM_CHAT_ID),
      ),
    ),
  );
});

app.get("/dashboard/commands", async (context) => {
  if (!(await isDashboardAuthenticated(context))) {
    return context.redirect("/dashboard/login", 303);
  }
  return context.html(commandHubHtml(listCommands()));
});

app.get("/dashboard/commands/:name", async (context) => {
  if (!(await isDashboardAuthenticated(context))) {
    return context.redirect("/dashboard/login", 303);
  }
  try {
    return context.html(
      commandDetailHtml(
        describeCommand(resolveCommand(context.req.param("name"))),
      ),
    );
  } catch {
    return context.text("Command not found", 404);
  }
});

app.post("/dashboard/commands/:name/run", async (context) => {
  if (!(await isDashboardAuthenticated(context)) || !hasSameOrigin(context)) {
    return context.text("Forbidden", 403);
  }

  let command;
  try {
    command = resolveCommand(context.req.param("name"));
  } catch {
    return context.text("Command not found", 404);
  }
  const descriptor = describeCommand(command);
  const form = await context.req.parseBody();
  const operationId =
    typeof form.operationId === "string" ? form.operationId : "";
  if (
    form.confirmation !== command.name ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      operationId,
    )
  ) {
    return context.text("Confirmation required", 400);
  }

  try {
    const result = await executeOperatorCommand(
      context.env,
      command.name,
      context.get("requestId"),
      operationId,
    );
    return context.html(commandResultHtml(descriptor, result));
  } catch (error) {
    const message =
      error instanceof AppError && error.expose
        ? error.message
        : "The command could not be completed.";
    return context.html(commandResultHtml(descriptor, null, message), 500);
  }
});

app.get("/dashboard/activity", async (context) => {
  if (!(await isDashboardAuthenticated(context))) {
    return context.redirect("/dashboard/login", 303);
  }
  return context.html(activityHtml(await loadDashboardData(context.env)));
});

app.notFound((context) => context.json({ ok: false, error: "not-found" }, 404));

app.onError((error, context) => {
  console.error(
    JSON.stringify({
      event: "unhandled_error",
      requestId: context.get("requestId"),
      message: error.message,
    }),
  );
  return context.json(
    {
      ok: false,
      requestId: context.get("requestId"),
      error: "internal-error",
    },
    500,
  );
});

export { app };

export default {
  fetch: app.fetch,
  scheduled(
    _controller: ScheduledController,
    env: Bindings,
    context: ExecutionContext,
  ) {
    context.waitUntil(runMaintenance(env));
  },
} satisfies ExportedHandler<Bindings>;

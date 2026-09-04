"use client";

import { useMemo, useState, type FormEvent } from "react";
import styles from "./ai-team.module.css";

type Agent = {
  id: string;
  agent_key: string;
  display_name: string;
  role_description: string;
  system_instructions: string;
  permissions: string[];
  provider: string;
  model: string;
  status: "idle" | "working" | "waiting" | "failed";
  enabled: boolean;
  last_active_at: string | null;
  last_error: string | null;
};

type ChatMessage = {
  id: string;
  agent_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

type AgentReference = { agent_key: string; display_name: string } | null;
type Task = {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: number;
  result: string | null;
  error: string | null;
  created_at: string;
  assigned: AgentReference;
};
type Approval = {
  id: string;
  tool_name: string;
  arguments: Record<string, unknown>;
  reason: string;
  status: string;
  requested_at: string;
  error: string | null;
  agent: AgentReference;
};
type Activity = {
  id: string;
  event_type: string;
  level: "info" | "warning" | "error";
  message: string;
  details: Record<string, unknown>;
  created_at: string;
  agent: AgentReference;
};
type Budget = {
  monthly_limit_eur: number;
  hard_cap_enabled: boolean;
  requests_per_minute: number;
  requests_per_hour: number;
  max_concurrent_requests: number;
};
type Usage = {
  id: string;
  agent_id: string | null;
  provider: string;
  model: string;
  request_kind: string;
  status: string;
  input_tokens: number | null;
  output_tokens: number | null;
  reserved_cost_eur: number;
  actual_cost_eur: number | null;
  error_code: string | null;
  created_at: string;
};
type Schedule = {
  id: string;
  name: string;
  prompt: string;
  interval_minutes: number;
  enabled: boolean;
  next_run_at: string;
  last_run_at: string | null;
  last_error: string | null;
  agent: AgentReference;
};

type DashboardData = {
  agents: Agent[];
  messages: ChatMessage[];
  tasks: Task[];
  approvals: Approval[];
  activity: Activity[];
  budget: Budget | null;
  usage: Usage[];
  schedules: Schedule[];
};

const sections = ["team", "tasks", "approvals", "activity", "usage"] as const;
type Section = (typeof sections)[number];

function money(value: number) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: value < 0.01 ? 4 : 2,
  }).format(value);
}

function dateTime(value: string, locale: string) {
  return new Date(value).toLocaleString(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

async function postAction(body: Record<string, unknown>) {
  const response = await fetch("/api/ai-team/actions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = (await response.json()) as { ok?: boolean; message?: string };
  if (!response.ok || !result.ok)
    throw new Error(result.message || "Action failed");
  return result;
}

export function AITeamDashboard({
  locale,
  providerConfigured,
  setupError,
  initial,
}: {
  locale: "es" | "en";
  providerConfigured: boolean;
  setupError: string | null;
  initial: DashboardData;
}) {
  const es = locale === "es";
  const [section, setSection] = useState<Section>("team");
  const [agents, setAgents] = useState(initial.agents);
  const [messages, setMessages] = useState(initial.messages);
  const [selectedAgentId, setSelectedAgentId] = useState(
    initial.agents[0]?.id || "",
  );
  const [chatInput, setChatInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const selectedAgent =
    agents.find((agent) => agent.id === selectedAgentId) || agents[0];
  const selectedMessages = messages.filter(
    (message) => message.agent_id === selectedAgent?.id,
  );
  const pendingApprovals = initial.approvals.filter(
    (item) => item.status === "pending",
  );
  const activeTasks = initial.tasks.filter((item) =>
    ["queued", "in_progress", "waiting"].includes(item.status),
  );
  const errors = initial.activity.filter((item) => item.level === "error");
  const spend = initial.usage.reduce(
    (total, item) =>
      total + Number(item.actual_cost_eur ?? item.reserved_cost_eur ?? 0),
    0,
  );
  const budgetLimit = Number(initial.budget?.monthly_limit_eur || 4);
  const budgetPercent =
    budgetLimit > 0 ? Math.min(100, (spend / budgetLimit) * 100) : 100;
  const agentById = useMemo(
    () => new Map(agents.map((agent) => [agent.id, agent])),
    [agents],
  );

  async function sendChat(event: FormEvent) {
    event.preventDefault();
    if (!selectedAgent || !chatInput.trim() || busy) return;
    const content = chatInput.trim();
    const temporaryId = crypto.randomUUID();
    setMessages((current) => [
      ...current,
      {
        id: temporaryId,
        agent_id: selectedAgent.id,
        role: "user",
        content,
        created_at: new Date().toISOString(),
      },
    ]);
    setChatInput("");
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/ai-team/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentKey: selectedAgent.agent_key,
          message: content,
        }),
      });
      const result = (await response.json()) as {
        ok?: boolean;
        text?: string;
        status?: Agent["status"];
        message?: string;
      };
      if (!response.ok || !result.ok || !result.text) {
        throw new Error(result.message || "AI request failed");
      }
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          agent_id: selectedAgent.id,
          role: "assistant",
          content: result.text || "",
          created_at: new Date().toISOString(),
        },
      ]);
      setAgents((current) =>
        current.map((agent) =>
          agent.id === selectedAgent.id
            ? { ...agent, status: result.status || "idle" }
            : agent,
        ),
      );
    } catch (error) {
      setMessages((current) =>
        current.filter((message) => message.id !== temporaryId),
      );
      setNotice(error instanceof Error ? error.message : "AI request failed");
    } finally {
      setBusy(false);
    }
  }

  async function act(body: Record<string, unknown>) {
    setBusy(true);
    setNotice(null);
    try {
      await postAction(body);
      window.location.reload();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Action failed");
      setBusy(false);
    }
  }

  if (setupError && initial.agents.length === 0) {
    return (
      <section className={`${styles.alert} ${styles.error}`}>
        <strong>
          {es
            ? "Falta la migración del Equipo de IA"
            : "AI Team migration required"}
        </strong>
        <p>{setupError}</p>
        <code>database/migrations/0034_ai_team.sql</code>
      </section>
    );
  }

  return (
    <div className={styles.dashboard}>
      {!providerConfigured && (
        <section className={styles.alert}>
          <strong>
            {es
              ? "Proveedor aún no configurado"
              : "Provider not configured yet"}
          </strong>
          <p>
            {es
              ? "El sistema está listo, pero las llamadas pagadas seguirán bloqueadas hasta guardar OPENAI_API_KEY como secreto del Worker."
              : "The system is ready, but paid calls remain blocked until OPENAI_API_KEY is stored as a Worker secret."}
          </p>
        </section>
      )}
      {notice && (
        <section className={`${styles.alert} ${styles.error}`}>
          {notice}
        </section>
      )}

      <section className={styles.metrics} aria-label="AI Team summary">
        <article>
          <span>{es ? "Agentes" : "Agents"}</span>
          <strong>{agents.length}</strong>
          <small>
            {agents.filter((agent) => agent.enabled).length}{" "}
            {es ? "activos" : "enabled"}
          </small>
        </article>
        <article>
          <span>{es ? "Tareas activas" : "Active tasks"}</span>
          <strong>{activeTasks.length}</strong>
          <small>
            {initial.tasks.length} {es ? "totales" : "total"}
          </small>
        </article>
        <article>
          <span>{es ? "Aprobaciones" : "Approvals"}</span>
          <strong>{pendingApprovals.length}</strong>
          <small>{es ? "pendientes" : "waiting"}</small>
        </article>
        <article>
          <span>{es ? "Gasto mensual" : "Monthly spend"}</span>
          <strong>{money(spend)}</strong>
          <small>
            {money(Math.max(0, budgetLimit - spend))}{" "}
            {es ? "disponible" : "remaining"}
          </small>
        </article>
        <article>
          <span>{es ? "Errores" : "Errors"}</span>
          <strong>{errors.length}</strong>
          <small>{es ? "en el historial" : "in activity"}</small>
        </article>
      </section>

      <nav className={styles.tabs} aria-label="AI Team dashboard sections">
        {sections.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setSection(item)}
            aria-current={section === item ? "page" : undefined}
          >
            {
              {
                team: es ? "Equipo y chat" : "Team & chat",
                tasks: es ? "Tareas y horarios" : "Tasks & schedules",
                approvals: es ? "Aprobaciones" : "Approvals",
                activity: es ? "Actividad" : "Activity",
                usage: es ? "Uso y presupuesto" : "Usage & budget",
              }[item]
            }
          </button>
        ))}
      </nav>

      {section === "team" && selectedAgent && (
        <section className={styles.teamLayout}>
          <aside className={styles.roster}>
            {agents.map((agent) => (
              <button
                key={agent.id}
                type="button"
                onClick={() => setSelectedAgentId(agent.id)}
                className={
                  agent.id === selectedAgent.id ? styles.selected : undefined
                }
              >
                <span
                  className={`${styles.statusDot} ${styles[agent.status]}`}
                />
                <span>
                  <strong>{agent.display_name}</strong>
                  <small>
                    {agent.status} · {agent.model}
                  </small>
                </span>
              </button>
            ))}
          </aside>
          <div className={styles.agentWorkspace}>
            <header className={styles.agentHeader}>
              <div>
                <span
                  className={`${styles.statusPill} ${styles[selectedAgent.status]}`}
                >
                  {selectedAgent.status}
                </span>
                <h2>{selectedAgent.display_name}</h2>
                <p>{selectedAgent.role_description}</p>
              </div>
              <details>
                <summary>
                  {es ? "Modelo y permisos" : "Model & permissions"}
                </summary>
                <AgentSettings
                  agent={selectedAgent}
                  busy={busy}
                  onSave={act}
                  es={es}
                />
              </details>
            </header>
            <div className={styles.chatLog} aria-live="polite">
              {selectedMessages.length === 0 && (
                <p className={styles.empty}>
                  {es
                    ? "Inicia una conversación. El historial y la memoria persistirán en el CRM."
                    : "Start a conversation. History and memory persist in the CRM."}
                </p>
              )}
              {selectedMessages.map((message) => (
                <article
                  key={message.id}
                  className={
                    message.role === "user"
                      ? styles.userMessage
                      : styles.agentMessage
                  }
                >
                  <small>
                    {message.role === "user"
                      ? es
                        ? "Tú"
                        : "You"
                      : selectedAgent.display_name}
                  </small>
                  <p>{message.content}</p>
                </article>
              ))}
              {busy && (
                <p className={styles.thinking}>
                  {selectedAgent.display_name}{" "}
                  {es ? "está trabajando…" : "is working…"}
                </p>
              )}
            </div>
            <form className={styles.chatComposer} onSubmit={sendChat}>
              <label htmlFor="ai-chat-input">
                {es ? "Mensaje" : "Message"}
              </label>
              <textarea
                id="ai-chat-input"
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                maxLength={8000}
                rows={3}
                placeholder={
                  es
                    ? "Pide un análisis, una tarea o una acción…"
                    : "Ask for analysis, a task, or an action…"
                }
              />
              <button
                type="submit"
                disabled={busy || !chatInput.trim() || !selectedAgent.enabled}
              >
                {busy
                  ? es
                    ? "Trabajando…"
                    : "Working…"
                  : es
                    ? "Enviar"
                    : "Send"}
              </button>
            </form>
          </div>
        </section>
      )}

      {section === "tasks" && (
        <section className={styles.split}>
          <div>
            <h2>{es ? "Tareas" : "Tasks"}</h2>
            <TaskForm agents={agents} busy={busy} onCreate={act} es={es} />
            <div className={styles.list}>
              {initial.tasks.map((task) => (
                <article key={task.id}>
                  <header>
                    <strong>{task.title}</strong>
                    <span className={styles.statusPill}>{task.status}</span>
                  </header>
                  <p>{task.description}</p>
                  <small>
                    {task.assigned?.display_name ||
                      (es ? "Sin asignar" : "Unassigned")}{" "}
                    · P{task.priority} · {dateTime(task.created_at, locale)}
                  </small>
                  {(task.error || task.result) && (
                    <details>
                      <summary>
                        {task.error
                          ? es
                            ? "Error"
                            : "Error"
                          : es
                            ? "Resultado"
                            : "Result"}
                      </summary>
                      <p>{task.error || task.result}</p>
                    </details>
                  )}
                </article>
              ))}
            </div>
          </div>
          <div>
            <h2>{es ? "Trabajos recurrentes" : "Recurring jobs"}</h2>
            <ScheduleForm agents={agents} busy={busy} onCreate={act} es={es} />
            <div className={styles.list}>
              {initial.schedules.map((schedule) => (
                <article key={schedule.id}>
                  <header>
                    <strong>{schedule.name}</strong>
                    <span className={styles.statusPill}>
                      {schedule.enabled
                        ? es
                          ? "activo"
                          : "enabled"
                        : es
                          ? "pausado"
                          : "paused"}
                    </span>
                  </header>
                  <p>{schedule.prompt}</p>
                  <small>
                    {schedule.agent?.display_name} · {es ? "cada" : "every"}{" "}
                    {schedule.interval_minutes} min · {es ? "próximo" : "next"}{" "}
                    {dateTime(schedule.next_run_at, locale)}
                  </small>
                  {schedule.last_error && (
                    <p className={styles.errorText}>{schedule.last_error}</p>
                  )}
                  <button
                    className={styles.secondaryButton}
                    disabled={busy}
                    onClick={() =>
                      act({
                        action: "toggle_schedule",
                        scheduleId: schedule.id,
                        enabled: !schedule.enabled,
                      })
                    }
                  >
                    {schedule.enabled
                      ? es
                        ? "Pausar"
                        : "Pause"
                      : es
                        ? "Activar"
                        : "Enable"}
                  </button>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {section === "approvals" && (
        <section>
          <h2>{es ? "Acciones sensibles" : "Sensitive actions"}</h2>
          <p className={styles.sectionIntro}>
            {es
              ? "Ninguna acción de esta cola se ejecuta hasta que la apruebes aquí."
              : "Nothing in this queue executes until you approve it here."}
          </p>
          <div className={styles.list}>
            {initial.approvals.map((approval) => (
              <article key={approval.id}>
                <header>
                  <strong>{approval.tool_name}</strong>
                  <span className={styles.statusPill}>{approval.status}</span>
                </header>
                <p>{approval.reason}</p>
                <pre>{JSON.stringify(approval.arguments, null, 2)}</pre>
                <small>
                  {approval.agent?.display_name} ·{" "}
                  {dateTime(approval.requested_at, locale)}
                </small>
                {approval.error && (
                  <p className={styles.errorText}>{approval.error}</p>
                )}
                {approval.status === "pending" && (
                  <div className={styles.actions}>
                    <button
                      disabled={busy}
                      onClick={() =>
                        act({
                          action: "decide_approval",
                          approvalId: approval.id,
                          decision: "approve",
                          note: "Approved in AI Team dashboard",
                        })
                      }
                    >
                      {es ? "Aprobar y ejecutar" : "Approve & execute"}
                    </button>
                    <button
                      className={styles.dangerButton}
                      disabled={busy}
                      onClick={() =>
                        act({
                          action: "decide_approval",
                          approvalId: approval.id,
                          decision: "reject",
                          note: "Rejected in AI Team dashboard",
                        })
                      }
                    >
                      {es ? "Rechazar" : "Reject"}
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {section === "activity" && (
        <section className={styles.split}>
          <div>
            <h2>{es ? "Actividad reciente" : "Recent activity"}</h2>
            <div className={styles.timeline}>
              {initial.activity.map((item) => (
                <article key={item.id} className={styles[item.level]}>
                  <span />
                  <div>
                    <strong>{item.message}</strong>
                    <p>
                      {item.agent?.display_name || "System"} · {item.event_type}
                    </p>
                    <time>{dateTime(item.created_at, locale)}</time>
                  </div>
                </article>
              ))}
            </div>
          </div>
          <div>
            <h2>{es ? "Errores" : "Errors"}</h2>
            <div className={styles.list}>
              {errors.length === 0 ? (
                <p className={styles.empty}>
                  {es ? "No hay errores registrados." : "No recorded errors."}
                </p>
              ) : (
                errors.map((item) => (
                  <article key={item.id}>
                    <strong>{item.message}</strong>
                    <p>{String(item.details?.error || item.event_type)}</p>
                    <small>{dateTime(item.created_at, locale)}</small>
                  </article>
                ))
              )}
            </div>
          </div>
        </section>
      )}

      {section === "usage" && initial.budget && (
        <section className={styles.split}>
          <div>
            <h2>{es ? "Presupuesto mensual" : "Monthly budget"}</h2>
            <div className={styles.budgetCard}>
              <div>
                <strong>{money(spend)}</strong>
                <span>/ {money(budgetLimit)}</span>
              </div>
              <div className={styles.progress}>
                <i style={{ width: `${budgetPercent}%` }} />
              </div>
              <p>
                {initial.budget.hard_cap_enabled
                  ? es
                    ? "Límite duro activo: al agotarse, las llamadas pagadas se bloquean."
                    : "Hard cap active: paid calls are blocked when exhausted."
                  : es
                    ? "Límite duro desactivado."
                    : "Hard cap disabled."}
              </p>
            </div>
            <BudgetForm
              budget={initial.budget}
              busy={busy}
              onSave={act}
              es={es}
            />
          </div>
          <div>
            <h2>{es ? "Registro de uso" : "Usage ledger"}</h2>
            <div className={styles.list}>
              {initial.usage.map((item) => (
                <article key={item.id}>
                  <header>
                    <strong>
                      {agentById.get(item.agent_id || "")?.display_name ||
                        "System"}
                    </strong>
                    <span className={styles.statusPill}>{item.status}</span>
                  </header>
                  <p>
                    {item.provider} / {item.model} · {item.request_kind}
                  </p>
                  <small>
                    {(item.input_tokens || 0).toLocaleString()} in ·{" "}
                    {(item.output_tokens || 0).toLocaleString()} out ·{" "}
                    {money(
                      Number(item.actual_cost_eur ?? item.reserved_cost_eur),
                    )}{" "}
                    · {dateTime(item.created_at, locale)}
                  </small>
                  {item.error_code && (
                    <p className={styles.errorText}>{item.error_code}</p>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function AgentSettings({
  agent,
  busy,
  onSave,
  es,
}: {
  agent: Agent;
  busy: boolean;
  onSave: (body: Record<string, unknown>) => void;
  es: boolean;
}) {
  const [provider, setProvider] = useState(agent.provider);
  const [model, setModel] = useState(agent.model);
  const [enabled, setEnabled] = useState(agent.enabled);
  return (
    <form
      className={styles.compactForm}
      onSubmit={(event) => {
        event.preventDefault();
        onSave({
          action: "update_agent",
          agentId: agent.id,
          provider,
          model,
          enabled,
        });
      }}
    >
      <label>
        {es ? "Proveedor" : "Provider"}
        <input
          value={provider}
          onChange={(event) => setProvider(event.target.value)}
        />
      </label>
      <label>
        {es ? "Modelo" : "Model"}
        <input
          value={model}
          onChange={(event) => setModel(event.target.value)}
        />
      </label>
      <label className={styles.check}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
        />
        {es ? "Agente activo" : "Agent enabled"}
      </label>
      <button disabled={busy}>{es ? "Guardar" : "Save"}</button>
      <div className={styles.permissions}>
        {agent.permissions.map((permission) => (
          <code key={permission}>{permission}</code>
        ))}
      </div>
    </form>
  );
}

function TaskForm({
  agents,
  busy,
  onCreate,
  es,
}: {
  agents: Agent[];
  busy: boolean;
  onCreate: (body: Record<string, unknown>) => void;
  es: boolean;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedAgentId, setAssignedAgentId] = useState(agents[0]?.id || "");
  const [priority, setPriority] = useState(3);
  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault();
        onCreate({
          action: "create_task",
          title,
          description,
          assignedAgentId,
          priority,
        });
      }}
    >
      <label>
        {es ? "Título" : "Title"}
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
          minLength={2}
        />
      </label>
      <label>
        {es ? "Descripción" : "Description"}
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          required
          minLength={2}
          rows={3}
        />
      </label>
      <div className={styles.formRow}>
        <label>
          {es ? "Asignar" : "Assign"}
          <select
            value={assignedAgentId}
            onChange={(event) => setAssignedAgentId(event.target.value)}
          >
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.display_name}
              </option>
            ))}
          </select>
        </label>
        <label>
          {es ? "Prioridad" : "Priority"}
          <select
            value={priority}
            onChange={(event) => setPriority(Number(event.target.value))}
          >
            {[1, 2, 3, 4, 5].map((value) => (
              <option key={value} value={value}>
                P{value}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button disabled={busy}>{es ? "Crear tarea" : "Create task"}</button>
    </form>
  );
}

function ScheduleForm({
  agents,
  busy,
  onCreate,
  es,
}: {
  agents: Agent[];
  busy: boolean;
  onCreate: (body: Record<string, unknown>) => void;
  es: boolean;
}) {
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [agentId, setAgentId] = useState(agents[0]?.id || "");
  const [intervalMinutes, setIntervalMinutes] = useState(1440);
  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault();
        onCreate({
          action: "create_schedule",
          name,
          prompt,
          agentId,
          intervalMinutes,
        });
      }}
    >
      <label>
        {es ? "Nombre" : "Name"}
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          minLength={2}
        />
      </label>
      <label>
        {es ? "Instrucción recurrente" : "Recurring instruction"}
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          required
          minLength={5}
          rows={3}
        />
      </label>
      <div className={styles.formRow}>
        <label>
          {es ? "Agente" : "Agent"}
          <select
            value={agentId}
            onChange={(event) => setAgentId(event.target.value)}
          >
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.display_name}
              </option>
            ))}
          </select>
        </label>
        <label>
          {es ? "Cada (min)" : "Every (min)"}
          <input
            type="number"
            min={5}
            max={43200}
            value={intervalMinutes}
            onChange={(event) => setIntervalMinutes(Number(event.target.value))}
          />
        </label>
      </div>
      <button disabled={busy}>
        {es ? "Crear horario" : "Create schedule"}
      </button>
    </form>
  );
}

function BudgetForm({
  budget,
  busy,
  onSave,
  es,
}: {
  budget: Budget;
  busy: boolean;
  onSave: (body: Record<string, unknown>) => void;
  es: boolean;
}) {
  const [limit, setLimit] = useState(Number(budget.monthly_limit_eur));
  const [hardCap, setHardCap] = useState(budget.hard_cap_enabled);
  const [minute, setMinute] = useState(budget.requests_per_minute);
  const [hour, setHour] = useState(budget.requests_per_hour);
  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault();
        onSave({
          action: "update_budget",
          monthlyLimitEur: limit,
          hardCapEnabled: hardCap,
          requestsPerMinute: minute,
          requestsPerHour: hour,
        });
      }}
    >
      <label>
        {es ? "Límite mensual (€)" : "Monthly limit (€)"}
        <input
          type="number"
          min={0}
          max={100000}
          step="0.01"
          value={limit}
          onChange={(event) => setLimit(Number(event.target.value))}
        />
      </label>
      <div className={styles.formRow}>
        <label>
          {es ? "Solicitudes/min" : "Requests/min"}
          <input
            type="number"
            min={1}
            max={300}
            value={minute}
            onChange={(event) => setMinute(Number(event.target.value))}
          />
        </label>
        <label>
          {es ? "Solicitudes/hora" : "Requests/hour"}
          <input
            type="number"
            min={1}
            max={10000}
            value={hour}
            onChange={(event) => setHour(Number(event.target.value))}
          />
        </label>
      </div>
      <label className={styles.check}>
        <input
          type="checkbox"
          checked={hardCap}
          onChange={(event) => setHardCap(event.target.checked)}
        />
        {es ? "Bloquear al alcanzar el límite" : "Block at the limit"}
      </label>
      <button disabled={busy}>
        {es ? "Guardar controles" : "Save controls"}
      </button>
    </form>
  );
}

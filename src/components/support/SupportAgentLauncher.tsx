"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import styles from "./support-agent.module.css";

type SupportSurface = "business_application" | "site_contact";
type Message = { role: "user" | "assistant"; content: string };

function fieldValue(id: string) {
  const field = document.getElementById(id) as
    | HTMLInputElement
    | HTMLTextAreaElement
    | HTMLSelectElement
    | null;
  return field?.value.trim() || undefined;
}

function businessFormContext() {
  return {
    businessName: fieldValue("business-name"),
    locality: fieldValue("business-locality"),
    website: fieldValue("business-website"),
    about: fieldValue("business-about"),
  };
}

export function SupportAgentLauncher({
  locale,
  surface,
  label,
  className,
  signedIn,
  captureBusinessForm = false,
}: {
  locale: "en" | "es";
  surface: SupportSurface;
  label: string;
  className?: string;
  signedIn: boolean;
  captureBusinessForm?: boolean;
}) {
  const es = locale === "es";
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mailSubject = es ? "Ayuda con AkiPasa" : "Help with AkiPasa";
  const mailHref =
    "mailto:support@akipasa.com?subject=" + encodeURIComponent(mailSubject);

  useEffect(() => {
    if (!open) return;
    textareaRef.current?.focus();
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  async function send(event: FormEvent) {
    event.preventDefault();
    const question = input.trim();
    if (!question || busy) return;
    setMessages((current) => [...current, { role: "user", content: question }]);
    setInput("");
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/support-agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: question,
          locale,
          surface,
          pagePath: window.location.pathname,
          formContext: captureBusinessForm ? businessFormContext() : {},
        }),
      });
      const result = (await response.json()) as {
        ok?: boolean;
        text?: string;
        message?: string;
      };
      if (!response.ok || !result.ok || !result.text) {
        throw new Error(
          result.message ||
            (es
              ? "El asistente no está disponible ahora."
              : "The assistant is not available right now."),
        );
      }
      setMessages((current) => [
        ...current,
        { role: "assistant", content: result.text || "" },
      ]);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : es
            ? "No se pudo enviar la pregunta."
            : "The question could not be sent.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (!signedIn) {
    return (
      <a className={className} href={mailHref}>
        {label}
      </a>
    );
  }

  return (
    <>
      <button
        type="button"
        className={[styles.trigger, className].filter(Boolean).join(" ")}
        onClick={() => setOpen(true)}
      >
        {label}
      </button>
      {open && (
        <div className={styles.backdrop} onMouseDown={() => setOpen(false)}>
          <section
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="support-agent-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <span className={styles.badge}>
                  {es ? "Asistente con IA" : "AI assistant"}
                </span>
                <h2 id="support-agent-title">
                  {es ? "Habla con Soporte" : "Chat with Support"}
                </h2>
                <p>
                  {es
                    ? "Puede orientarte sobre esta página. No envía formularios ni cambia tu cuenta."
                    : "It can guide you on this page. It cannot submit forms or change your account."}
                </p>
              </div>
              <button
                type="button"
                className={styles.close}
                onClick={() => setOpen(false)}
                aria-label={es ? "Cerrar ayuda" : "Close help"}
              >
                ×
              </button>
            </header>

            <div className={styles.messages} aria-live="polite">
              {messages.length === 0 && (
                <p className={styles.welcome}>
                  {surface === "business_application"
                    ? es
                      ? "Dime qué parte del formulario te cuesta. También puedo ayudarte a redactar la descripción con tus propios datos."
                      : "Tell me which part of the form is difficult. I can also help draft the description using your facts."
                    : es
                      ? "¿En qué podemos ayudarte con AkiPasa?"
                      : "What can we help you with on AkiPasa?"}
                </p>
              )}
              {messages.map((message, index) => (
                <article
                  key={index}
                  className={
                    message.role === "user"
                      ? styles.userMessage
                      : styles.agentMessage
                  }
                >
                  <strong>
                    {message.role === "user"
                      ? es
                        ? "Tú"
                        : "You"
                      : es
                        ? "Soporte"
                        : "Support"}
                  </strong>
                  <p>{message.content}</p>
                </article>
              ))}
              {busy && (
                <p className={styles.thinking}>
                  {es ? "Soporte está respondiendo…" : "Support is replying…"}
                </p>
              )}
            </div>

            <form className={styles.composer} onSubmit={send}>
              <label htmlFor={"support-question-" + surface}>
                {es ? "Tu pregunta" : "Your question"}
              </label>
              <textarea
                ref={textareaRef}
                id={"support-question-" + surface}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                maxLength={2000}
                rows={3}
                required
                placeholder={
                  es
                    ? "Por ejemplo: ayúdame a describir mi negocio"
                    : "For example: help me describe my business"
                }
              />
              {error && (
                <p className={styles.error} role="alert">
                  {error}
                </p>
              )}
              <div className={styles.actions}>
                <a href={mailHref}>
                  {es ? "Contactar con una persona" : "Contact a person"}
                </a>
                <button type="submit" disabled={busy || !input.trim()}>
                  {es ? "Enviar" : "Send"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}

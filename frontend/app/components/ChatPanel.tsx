import { FormEvent, useState } from "react";
import { labels, Language } from "../i18n";
import { analyzeDesign, Project } from "../lib/api";
import { ResultCard } from "./ResultCard";

export function ChatPanel({
  language,
  apiUrl,
  project,
  onError,
}: {
  language: Language;
  apiUrl: string | null;
  project: Project | null;
  onError: (message: string) => void;
}) {
  const copy = labels[language];
  const [message, setMessage] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [messages, setMessages] = useState<{ role: "assistant" | "user"; text: string }[]>([]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isAnalyzing) return;
    setMessages((current) => [...current, { role: "user", text: trimmed }]);
    setMessage("");
    setIsAnalyzing(true);
    onError("");

    if (!apiUrl) {
      setMessages((current) => [...current, { role: "assistant", text: copy.backendUnavailable }]);
      setIsAnalyzing(false);
      return;
    }

    try {
      await analyzeDesign(apiUrl, trimmed, language);
    } catch (error) {
      const text =
        error instanceof Error && error.message === "meta_not_connected"
          ? copy.notConnected
          : copy.backendUnavailable;
      setMessages((current) => [...current, { role: "assistant", text }]);
      onError(text);
    } finally {
      setIsAnalyzing(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(message);
  }

  return (
    <div className="chat-panel">
      <div className="chat-heading">
        <div className="assistant-avatar">✦</div>
        <div>
          <strong>{copy.assistantName}</strong>
          <span>● {language === "fr" ? "Prêt à analyser" : "Ready to analyse"}</span>
        </div>
      </div>
      <div className="messages">
        <div className="message assistant-message">
          <div className="message-avatar">✦</div>
          <p>{copy.assistantIntro}</p>
        </div>
        {messages.map((item, index) => (
          <div className={`message ${item.role === "user" ? "user-message" : "assistant-message"}`} key={`${item.role}-${index}`}>
            {item.role === "assistant" && <div className="message-avatar">✦</div>}
            <p>{item.text}</p>
          </div>
        ))}
        <ResultCard language={language} project={project} />
      </div>
      <div className="suggestions">
        {copy.suggestions.map((suggestion) => (
          <button key={suggestion} onClick={() => void sendMessage(suggestion)}>
            {suggestion}
          </button>
        ))}
      </div>
      <form className="composer" onSubmit={submit}>
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder={copy.inputPlaceholder}
          rows={1}
          aria-label={copy.inputPlaceholder}
        />
        <button type="submit" aria-label={copy.send} disabled={isAnalyzing}>↑</button>
      </form>
      {isAnalyzing && <p className="designing-status">{copy.designing}</p>}
      <small className="composer-note">{copy.footer}</small>
    </div>
  );
}

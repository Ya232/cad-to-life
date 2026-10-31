import { FormEvent, useState } from "react";
import { labels, Language } from "../i18n";
import { analyzeDesign, AnalyzeResponse, generateDesign, GenerateResult, Project } from "../lib/api";
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
  const [questions, setQuestions] = useState<AnalyzeResponse & { status: "needs_clarification" } | null>(null);
  const [spec, setSpec] = useState<AnalyzeResponse & { status: "ready" } | null>(null);
  const [lastDescription, setLastDescription] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [generated, setGenerated] = useState<GenerateResult | null>(null);
  const [workingMode, setWorkingMode] = useState<"analysis" | "generation" | null>(null);

  async function sendMessage(text: string, nextAnswers: Record<string, string> | null = null) {
    const trimmed = text.trim();
    if (!trimmed || isAnalyzing) return;
    setMessages((current) => [...current, { role: "user", text: trimmed }]);
    setMessage("");
    setIsAnalyzing(true);
    setWorkingMode("analysis");
    onError("");

    if (!apiUrl) {
      setMessages((current) => [...current, { role: "assistant", text: copy.backendUnavailable }]);
      setIsAnalyzing(false);
      return;
    }

    try {
      const response = await analyzeDesign(apiUrl, trimmed, language, nextAnswers);
      setQuestions(response.status === "needs_clarification" ? response : null);
      setSpec(response.status === "ready" ? response : null);
      setLastDescription(trimmed);
      if (response.status === "ready") {
        setMessages((current) => [
          ...current,
          { role: "assistant", text: copy.readyTitle },
        ]);
      }
    } catch (error) {
      const text =
        error instanceof Error && error.message === "meta_not_connected"
          ? copy.notConnected
          : copy.backendUnavailable;
      setMessages((current) => [...current, { role: "assistant", text }]);
      onError(text);
    } finally {
      setIsAnalyzing(false);
      setWorkingMode(null);
    }
  }

  async function answerQuestion(questionId: string, option: string) {
    const nextAnswers = { ...answers, [questionId]: option };
    setAnswers(nextAnswers);
    if (lastDescription) {
      await sendMessage(lastDescription, nextAnswers);
    }
  }

  async function generate() {
    if (!apiUrl || !spec || isAnalyzing) return;
    setIsAnalyzing(true);
    setWorkingMode("generation");
    onError("");
    try {
      setGenerated(await generateDesign(apiUrl, spec.spec));
    } catch {
      onError(copy.backendUnavailable);
    } finally {
      setIsAnalyzing(false);
      setWorkingMode(null);
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
        {questions && (
          <div className="question-card">
            <div className="question-block">
              <span className="question-kicker">{language === "fr" ? "Question suivante" : "Next question"}</span>
              <strong>{questions.questions[0].text}</strong>
              <div className="question-options">
                {questions.questions[0].options.map((option) => (
                  <button
                    key={option}
                    onClick={() => void answerQuestion(questions.questions[0].id, option)}
                    disabled={isAnalyzing}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        {spec && (
          <article className="spec-card">
            <strong>{copy.readyTitle}: {spec.spec.name}</strong>
            <p>{spec.spec.part_type}</p>
            <strong>{copy.components}</strong>
            <ul>
              {spec.spec.components.map((component) => (
                <li key={component.query}>{component.query}</li>
              ))}
            </ul>
            <strong>{copy.constraints}</strong>
            <p>{spec.spec.constraints.notes || spec.spec.constraints.mounting}</p>
            <button className="primary" onClick={() => void generate()} disabled={isAnalyzing || !apiUrl}>
              {language === "fr" ? "Générer le STL" : "Generate STL"}
            </button>
          </article>
        )}
        {generated && (
          <article className="spec-card">
            <strong>{language === "fr" ? "STL généré" : "STL generated"}</strong>
            <p>
              {generated.bounding_box_mm.join(" × ")} mm
            </p>
            {generated.warnings.map((warning) => <p className="status" key={warning}>{warning}</p>)}
            <a
              className="primary download-link"
              href={`${apiUrl}${generated.files.stl_url}`}
              download
            >
              {language === "fr" ? "Télécharger le STL" : "Download STL"}
            </a>
          </article>
        )}
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
      {isAnalyzing && (
        <div className="thinking-indicator" role="status" aria-live="polite">
          <span className="thinking-orb" aria-hidden="true">✦</span>
          <span>
            {workingMode === "generation"
              ? (language === "fr" ? "Je prépare la géométrie 3D" : "Preparing the 3D geometry")
              : (language === "fr" ? "J’analyse votre demande" : "Analysing your request")}
          </span>
          <span className="thinking-dots" aria-hidden="true"><i /><i /><i /></span>
        </div>
      )}
      <small className="composer-note">{copy.footer}</small>
    </div>
  );
}

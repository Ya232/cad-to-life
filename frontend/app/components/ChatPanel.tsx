import { FormEvent, useState } from "react";
import { labels, Language } from "../i18n";
import { analyzeDesign, AnalyzeResponse, generateDesign, GenerateResult, Project } from "../lib/api";
import { ResultCard } from "./ResultCard";
import { StlViewer } from "./StlViewer";

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

  async function sendMessage(
    text: string,
    nextAnswers: Record<string, string> | null = null,
    displayText = text,
  ) {
    const trimmed = text.trim();
    if (!trimmed || isAnalyzing) return;
    setMessages((current) => [...current, { role: "user", text: displayText.trim() }]);
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
        error instanceof Error && error.name === "meta_not_connected"
          ? error.message
          : error instanceof Error && error.message !== "analysis_failed"
            ? error.message
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
      await sendMessage(lastDescription, nextAnswers, option);
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
          <div className="assistant-title-row">
            <strong>{copy.assistantName}</strong>
            <span className={`connection-badge ${apiUrl ? "connected" : "offline"}`}>
              <i />{apiUrl ? (language === "fr" ? "En ligne" : "Online") : (language === "fr" ? "Hors ligne" : "Offline")}
            </span>
          </div>
          <span className="assistant-subtitle">
            {isAnalyzing
              ? (language === "fr" ? "Travail en cours..." : "Working...")
              : (language === "fr" ? "Analyse paramétrique et génération 3D" : "Parametric analysis and 3D generation")}
          </span>
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
            <div className="card-title-row">
              <div>
                <span className="card-kicker">{language === "fr" ? "Analyse terminée" : "Analysis complete"}</span>
                <strong>{spec.spec.name}</strong>
              </div>
              <span className="spec-type">{spec.spec.part_type}</span>
            </div>
            <div className="spec-grid">
              <div><span>{copy.components}</span><strong>{spec.spec.components.length || "—"}</strong></div>
              <div><span>{copy.constraints}</span><strong>{spec.spec.constraints.mounting}</strong></div>
            </div>
            {spec.spec.components.length > 0 && (
              <ul>
                {spec.spec.components.map((component) => <li key={component.query}>{component.query}</li>)}
              </ul>
            )}
            {spec.spec.constraints.notes && <p>{spec.spec.constraints.notes}</p>}
            <button className="primary" onClick={() => void generate()} disabled={isAnalyzing || !apiUrl}>
              <span>{language === "fr" ? "Générer le STL" : "Generate STL"}</span><span>↗</span>
            </button>
          </article>
        )}
        {generated && (
          <article className="spec-card">
            <div className="card-title-row">
              <div>
                <span className="card-kicker">{language === "fr" ? "Conception prête" : "Design ready"}</span>
                <strong>{language === "fr" ? "STL généré" : "STL generated"}</strong>
              </div>
              <span className="result-check">✓</span>
            </div>
            {apiUrl && <StlViewer url={`${apiUrl}${generated.files.stl_url}`} />}
            <div className="dimension-pill"><span>{language === "fr" ? "Dimensions" : "Dimensions"}</span>{generated.bounding_box_mm.join(" × ")} mm</div>
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

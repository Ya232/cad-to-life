"use client";

import { FormEvent, useEffect, useState } from "react";

type PartType = "enclosure" | "bracket" | "mounting_plate" | "spacer";
type Language = "fr" | "en";

type Project = {
  id: string;
  name: string;
  description: string;
  part_type: PartType;
  width_mm: number;
  depth_mm: number;
  height_mm: number;
  printable: boolean;
  warnings: string[];
};

const labels = {
  fr: {
    eyebrow: "Assistant de conception paramétrique",
    title: "Du composant à la pièce imprimable.",
    description:
      "Décris une pièce électronique ou mécanique et prépare une première conception vérifiable.",
    projectName: "Nom du projet",
    projectDescription: "Description",
    partType: "Type de pièce",
    dimensions: "Dimensions (mm)",
    create: "Créer une prévisualisation",
    start: "Commencer",
    back: "Retour à l’accueil",
    features: "Conception paramétrique, vérifications et historique dans un seul espace.",
    history: "Projets récents",
    empty: "Aucun projet sauvegardé.",
    saved: "Projet sauvegardé",
    enclosure: "Boîtier",
    bracket: "Équerre / support",
    mounting_plate: "Plaque de fixation",
    spacer: "Entretoise",
    printable: "Prêt pour la suite",
    review: "À vérifier",
    assistantName: "CAD-to-Life AI",
    assistantIntro:
      "Décris ce que tu veux fabriquer. Je t’aiderai à choisir la forme, les dimensions et les contraintes.",
    inputPlaceholder: "Décris la pièce que tu veux concevoir...",
    send: "Envoyer",
    suggestions: ["Boîtier pour un ESP32", "Support pour une caméra", "Entretoise de 20 mm"],
    design: "Paramètres de conception",
    generate: "Générer la conception",
    collapseHistory: "Réduire les projets",
    expandHistory: "Afficher les projets",
    designStarted: "Voici une première conception paramétrique basée sur ta demande.",
    designing: "Conception en cours...",
    resultTitle: "Première conception",
    resultDetails: "Base paramétrique créée",
  },
  en: {
    eyebrow: "Parametric design assistant",
    title: "From component to printable part.",
    description:
      "Describe an electronic or mechanical part and prepare a verifiable first design.",
    projectName: "Project name",
    projectDescription: "Description",
    partType: "Part type",
    dimensions: "Dimensions (mm)",
    create: "Create preview",
    start: "Get started",
    back: "Back to home",
    features: "Parametric design, verification and project history in one workspace.",
    history: "Recent projects",
    empty: "No saved projects yet.",
    saved: "Saved project",
    enclosure: "Enclosure",
    bracket: "Bracket / support",
    mounting_plate: "Mounting plate",
    spacer: "Spacer",
    printable: "Ready for next step",
    review: "Needs review",
    assistantName: "CAD-to-Life AI",
    assistantIntro:
      "Describe what you want to make. I will help choose the shape, dimensions and constraints.",
    inputPlaceholder: "Describe the part you want to design...",
    send: "Send",
    suggestions: ["Enclosure for an ESP32", "Camera support", "20 mm spacer"],
    design: "Design parameters",
    generate: "Generate design",
    collapseHistory: "Collapse projects",
    expandHistory: "Show projects",
    designStarted: "Here is a first parametric design based on your request.",
    designing: "Designing...",
    resultTitle: "First design",
    resultDetails: "Parametric base created",
  },
};

const defaultApiCandidates = [
  process.env.NEXT_PUBLIC_API_URL,
  "http://localhost:8000",
  "http://127.0.0.1:8000",
  "http://localhost:8001",
  "http://127.0.0.1:8001",
].filter((value): value is string => Boolean(value));

async function detectApiBaseUrl() {
  for (const apiUrl of defaultApiCandidates) {
    try {
      const response = await fetch(`${apiUrl}/api/health`, { cache: "no-store" });
      if (response.ok) {
        return apiUrl;
      }
    } catch {
      // Try the next backend port.
    }
  }
  return defaultApiCandidates[0] ?? "http://localhost:8000";
}

export default function Home() {
  const [language, setLanguage] = useState<Language>("fr");
  const [projects, setProjects] = useState<Project[]>([]);
  const [apiUrl, setApiUrl] = useState<string>(defaultApiCandidates[0] ?? "http://localhost:8000");
  const [form, setForm] = useState({
    name: "",
    description: "",
    part_type: "enclosure" as PartType,
    width_mm: 80,
    depth_mm: 50,
    height_mm: 30,
  });
  const [error, setError] = useState("");
  const [started, setStarted] = useState(false);
  const [message, setMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<
    { role: "assistant" | "user"; text: string }[]
  >([]);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [isDesigning, setIsDesigning] = useState(false);
  const [latestProject, setLatestProject] = useState<Project | null>(null);
  const copy = labels[language];

  useEffect(() => {
    let ignore = false;

    async function loadProjects() {
      const detectedApiUrl = await detectApiBaseUrl();
      if (ignore) return;
      setApiUrl(detectedApiUrl);

      try {
        const response = await fetch(`${detectedApiUrl}/api/projects`, { cache: "no-store" });
        if (!response.ok) {
          throw new Error("projects_unavailable");
        }
        const data = (await response.json()) as Project[];
        setProjects(data);
      } catch {
        setError(
          language === "fr"
            ? "Le backend n’est pas encore disponible. Lance le serveur FastAPI sur le port 8000 ou 8001."
            : "The backend is not available yet. Start the FastAPI server on port 8000 or 8001.",
        );
      }
    }

    void loadProjects();
    return () => {
      ignore = true;
    };
  }, [language]);

  function inferDesignContext(prompt: string) {
    const normalized = prompt.toLowerCase();
    let detectedType: PartType = form.part_type;

    if (normalized.includes("boîtier") || normalized.includes("boitier") || normalized.includes("enclosure") || normalized.includes("box")) {
      detectedType = "enclosure";
    } else if (normalized.includes("support") || normalized.includes("bracket") || normalized.includes("camera") || normalized.includes("mount")) {
      detectedType = "bracket";
    } else if (normalized.includes("plaque") || normalized.includes("plate") || normalized.includes("mounting")) {
      detectedType = "mounting_plate";
    } else if (normalized.includes("entretoise") || normalized.includes("spacer") || normalized.includes("distance")) {
      detectedType = "spacer";
    }

    const numbers = Array.from(prompt.matchAll(/(\d+(?:[.,]\d+)?)\s*(?:mm|mm\b|x|×)?/g))
      .map((match) => Number(match[1].replace(",", ".")))
      .filter((value) => Number.isFinite(value) && value > 0);

    const width = numbers[0] ?? form.width_mm;
    const depth = numbers[1] ?? form.depth_mm;
    const height = numbers[2] ?? form.height_mm;

    const missing: string[] = [];
    if (width === form.width_mm && !normalized.match(/\d/)) missing.push(language === "fr" ? "largeur" : "width");
    if (depth === form.depth_mm && !normalized.match(/\d/)) missing.push(language === "fr" ? "profondeur" : "depth");
    if (height === form.height_mm && !normalized.match(/\d/)) missing.push(language === "fr" ? "hauteur" : "height");

    return {
      part_type: detectedType,
      width_mm: width,
      depth_mm: depth,
      height_mm: height,
      hasEnoughDimensions: numbers.length >= 2,
      missing,
    };
  }

  function buildAssistantReply(prompt: string, context: ReturnType<typeof inferDesignContext>, kind: "clarify" | "design") {
    const labelsByLanguage = {
      fr: {
        clarify: `J’ai compris qu’il s’agit d’un ${copy[context.part_type]} mais il me manque encore ${context.missing.length ? context.missing.join(" et ") : "quelques dimensions clés"}. Donne-moi un ordre de grandeur comme “${Math.round(context.width_mm || 80)} x ${Math.round(context.depth_mm || 50)} x ${Math.round(context.height_mm || 30)} mm” pour que je puisse lancer la première conception.`,
        design: `J’ai interprété ta demande comme un ${copy[context.part_type]} avec une base de ${Math.round(context.width_mm)} × ${Math.round(context.depth_mm)} × ${Math.round(context.height_mm)} mm. Je lance la première conception et je vérifie les contraintes d’impression et de stabilité.`,
      },
      en: {
        clarify: `I understand this is a ${copy[context.part_type]} but I still need ${context.missing.length ? context.missing.join(" and ") : "a few key dimensions"}. Give me a rough size like “${Math.round(context.width_mm || 80)} x ${Math.round(context.depth_mm || 50)} x ${Math.round(context.height_mm || 30)} mm” so I can launch the first concept.`,
        design: `I interpreted your request as a ${copy[context.part_type]} based on ${Math.round(context.width_mm)} × ${Math.round(context.depth_mm)} × ${Math.round(context.height_mm)} mm. I’m launching the first concept and checking printability and structural constraints.`,
      },
    };

    const base = labelsByLanguage[language][kind];
    if (kind === "clarify") {
      return base;
    }

    const structuralHints = [
      language === "fr" ? "je vérifie l’épaisseur de paroi" : "I’m checking wall thickness",
      language === "fr" ? "la stabilité du montage" : "mounting stability",
      language === "fr" ? "la compatibilité d’impression" : "print compatibility",
    ];

    return `${base} ${structuralHints[0]} / ${structuralHints[1]} / ${structuralHints[2]}.`;
  }

  async function sendMessage(text = message) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const context = inferDesignContext(trimmed);
    if (!context.hasEnoughDimensions) {
      setError("");
      setChatMessages((current) => [
        ...current,
        { role: "user", text: trimmed },
        {
          role: "assistant",
          text: buildAssistantReply(trimmed, context, "clarify"),
        },
      ]);
      setMessage("");
      return;
    }

    setError("");
    setIsDesigning(true);
    setChatMessages((current) => [
      ...current,
      { role: "user", text: trimmed },
    ]);

    const request = {
      ...form,
      description: trimmed,
      name: form.name || trimmed.slice(0, 40),
      part_type: context.part_type,
      width_mm: context.width_mm,
      depth_mm: context.depth_mm,
      height_mm: context.height_mm,
    };
    setForm(request);
    setMessage("");
    try {
      const response = await fetch(`${apiUrl}/api/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      if (!response.ok) throw new Error("design_request_failed");
      const project = (await response.json()) as Project;
      setProjects((current) => [project, ...current]);
      setLatestProject(project);
      setChatMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: buildAssistantReply(trimmed, context, "design"),
        },
      ]);
    } catch {
      setError(
        language === "fr"
          ? "Impossible de créer la conception. Vérifie que le backend tourne sur le port 8000."
          : "The design could not be created. Check that the backend is running on port 8000.",
      );
    } finally {
      setIsDesigning(false);
    }
  }

  function updateDescription(text: string) {
    setForm((current) => ({
      ...current,
      description: text,
    }));
  }

  if (!started) {
    return (
      <main className="landing shell">
        <nav className="nav">
          <strong>CAD-to-Life</strong>
          <button
            className="language"
            onClick={() => setLanguage(language === "fr" ? "en" : "fr")}
          >
            {language === "fr" ? "EN" : "FR"}
          </button>
        </nav>
        <section className="landing-hero">
          <div className="landing-copy">
            <p className="eyebrow">{copy.eyebrow}</p>
            <h1>{copy.title}</h1>
            <p className="lead">{copy.description}</p>
            <p className="landing-features">{copy.features}</p>
            <button className="primary start-button" onClick={() => setStarted(true)}>
              {copy.start} <span aria-hidden="true">→</span>
            </button>
          </div>
          <div className="landing-visual" aria-hidden="true">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="landing-shape" />
            <span className="visual-label">CAD / AI / PRINT</span>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="workspace-shell">
      <nav className="nav">
        <strong>CAD-to-Life</strong>
        <div className="nav-actions">
          <button className="back-button" onClick={() => setStarted(false)}>
            {copy.back}
          </button>
          <button
            className="language"
            onClick={() => setLanguage(language === "fr" ? "en" : "fr")}
          >
            {language === "fr" ? "EN" : "FR"}
          </button>
        </div>
      </nav>
      <section className="chat-layout">
        <aside className={`history-sidebar ${historyOpen ? "" : "collapsed"}`}>
          <div className="history-sidebar-heading">
            {historyOpen && <strong>{copy.history}</strong>}
            <button
              className="history-toggle"
              onClick={() => setHistoryOpen((open) => !open)}
              aria-label={historyOpen ? copy.collapseHistory : copy.expandHistory}
            >
              {historyOpen ? "‹" : "›"}
            </button>
          </div>
          {historyOpen && (
            <div className="sidebar-projects">
              {projects.length === 0 ? (
                <p className="muted">{copy.empty}</p>
              ) : (
                projects.map((project) => (
                  <button className="sidebar-project" key={project.id}>
                    <strong>{project.name.slice(0, 32)}</strong>
                    <span>{copy[project.part_type]}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </aside>
        <div className="chat-panel">
          <div className="chat-heading">
            <div className="assistant-avatar">✦</div>
            <div>
              <strong>{copy.assistantName}</strong>
              <span>● {language === "fr" ? "Prêt à concevoir" : "Ready to design"}</span>
            </div>
          </div>
          <div className="messages">
            <div className="message assistant-message">
              <div className="message-avatar">✦</div>
              <p>{copy.assistantIntro}</p>
            </div>
            {chatMessages.map((chatMessage, index) => (
              <div
                className={`message ${chatMessage.role === "user" ? "user-message" : "assistant-message"}`}
                key={`${chatMessage.role}-${index}`}
              >
                {chatMessage.role === "assistant" && <div className="message-avatar">✦</div>}
                <p>{chatMessage.text}</p>
              </div>
            ))}
            {latestProject && (
              <article className="design-result">
                <div className="result-heading">
                  <span className="result-icon">✓</span>
                  <div>
                    <strong>{copy.resultTitle}</strong>
                    <span>{copy.resultDetails}</span>
                  </div>
                </div>
                <div className="result-preview">
                  <div className="shape" />
                  <div>
                    <strong>{latestProject.name}</strong>
                    <p>{latestProject.width_mm} × {latestProject.depth_mm} × {latestProject.height_mm} mm</p>
                    <span className={latestProject.printable ? "status good" : "status"}>
                      {latestProject.printable ? copy.printable : copy.review}
                    </span>
                  </div>
                </div>
              </article>
            )}
          </div>
          <div className="suggestions">
            {copy.suggestions.map((suggestion) => (
              <button key={suggestion} onClick={() => void sendMessage(suggestion)}>
                {suggestion}
              </button>
            ))}
          </div>
          <form
            className="composer"
            onSubmit={(event) => {
              event.preventDefault();
              void sendMessage();
            }}
          >
            <textarea
              value={message}
              onChange={(event) => {
                setMessage(event.target.value);
                updateDescription(event.target.value);
              }}
              placeholder={copy.inputPlaceholder}
              rows={1}
              aria-label={copy.inputPlaceholder}
            />
            <button type="submit" aria-label={copy.send} disabled={isDesigning}>↑</button>
          </form>
          {isDesigning && <p className="designing-status">{copy.designing}</p>}
          {error && <p className="error">{error}</p>}
          <small className="composer-note">
            {language === "fr" ? "CAD-to-Life peut faire des erreurs. Vérifie toujours les cotes." : "CAD-to-Life can make mistakes. Always verify dimensions."}
          </small>
        </div>
      </section>
    </main>
  );
}

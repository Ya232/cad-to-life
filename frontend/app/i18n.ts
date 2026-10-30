export type Language = "fr" | "en";

export const labels = {
  fr: {
    eyebrow: "Assistant de conception paramétrique",
    title: "Du composant à la pièce imprimable.",
    description:
      "Décris une pièce électronique ou mécanique et prépare une première conception vérifiable.",
    start: "Commencer",
    back: "Retour à l’accueil",
    features: "Conception paramétrique, vérifications et historique dans un seul espace.",
    history: "Projets récents",
    empty: "Aucun projet sauvegardé.",
    assistantName: "CAD-to-Life AI",
    assistantIntro:
      "Décris ce que tu veux fabriquer. L’analyse IA sera disponible dès que le backend Meta sera connecté.",
    inputPlaceholder: "Décris la pièce que tu veux concevoir...",
    send: "Envoyer",
    suggestions: ["Boîtier pour un ESP32", "Support pour une caméra", "Entretoise de 20 mm"],
    collapseHistory: "Réduire les projets",
    expandHistory: "Afficher les projets",
    notConnected:
      "L’analyse IA n’est pas encore connectée. Lance la phase d’intégration Meta Model API pour continuer.",
    backendUnavailable:
      "Le backend n’est pas disponible. Lance le serveur FastAPI sur le port 8000 ou 8001.",
    selectedProject: "Projet sélectionné",
    placeholderResult: "Le résultat 3D apparaîtra ici après une vraie génération.",
    designing: "Analyse en cours...",
    footer: "CAD-to-Life peut faire des erreurs. Vérifie toujours les cotes.",
  },
  en: {
    eyebrow: "Parametric design assistant",
    title: "From component to printable part.",
    description:
      "Describe an electronic or mechanical part and prepare a verifiable first design.",
    start: "Get started",
    back: "Back to home",
    features: "Parametric design, verification and project history in one workspace.",
    history: "Recent projects",
    empty: "No saved projects yet.",
    assistantName: "CAD-to-Life AI",
    assistantIntro:
      "Describe what you want to make. AI analysis will be available once the Meta backend is connected.",
    inputPlaceholder: "Describe the part you want to design...",
    send: "Send",
    suggestions: ["Enclosure for an ESP32", "Camera support", "20 mm spacer"],
    collapseHistory: "Collapse projects",
    expandHistory: "Show projects",
    notConnected:
      "AI analysis is not connected yet. Complete the Meta Model API integration phase to continue.",
    backendUnavailable:
      "The backend is not available. Start the FastAPI server on port 8000 or 8001.",
    selectedProject: "Selected project",
    placeholderResult: "The 3D result will appear here after a real generation.",
    designing: "Analysing...",
    footer: "CAD-to-Life can make mistakes. Always verify dimensions.",
  },
} as const;

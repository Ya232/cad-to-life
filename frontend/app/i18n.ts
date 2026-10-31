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
      "Décris ce que tu veux fabriquer. Je vais analyser la demande, poser les questions nécessaires, puis préparer une géométrie paramétrique.",
    inputPlaceholder: "Décris la pièce que tu veux concevoir...",
    send: "Envoyer",
    suggestions: ["Boîtier pour un ESP32", "Support pour une caméra", "Entretoise de 20 mm"],
    collapseHistory: "Réduire les projets",
    expandHistory: "Afficher les projets",
    notConnected:
      "Le backend Meta ne répond pas sur le serveur sélectionné. Vérifie que le backend est lancé sur le port 8000, puis recharge la page.",
    backendUnavailable:
      "Le backend n’est pas disponible. Lance le serveur FastAPI sur le port 8000 ou 8001.",
    selectedProject: "Projet sélectionné",
    placeholderResult: "Le résultat 3D apparaîtra ici après une vraie génération.",
    designing: "Analyse en cours...",
    footer: "CAD-to-Life peut faire des erreurs. Vérifie toujours les cotes.",
    generateDisabled: "La génération 3D sera disponible à la prochaine phase.",
    readyTitle: "Spécification prête",
    components: "Composants",
    constraints: "Contraintes",
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
      "Describe what you want to make. I’ll analyse the request, ask the necessary questions, then prepare parametric geometry.",
    inputPlaceholder: "Describe the part you want to design...",
    send: "Send",
    suggestions: ["Enclosure for an ESP32", "Camera support", "20 mm spacer"],
    collapseHistory: "Collapse projects",
    expandHistory: "Show projects",
    notConnected:
      "The Meta backend is not responding on the selected server. Start the backend on port 8000, then reload the page.",
    backendUnavailable:
      "The backend is not available. Start the FastAPI server on port 8000 or 8001.",
    selectedProject: "Selected project",
    placeholderResult: "The 3D result will appear here after a real generation.",
    designing: "Analysing...",
    footer: "CAD-to-Life can make mistakes. Always verify dimensions.",
    generateDisabled: "3D generation will be enabled in the next phase.",
    readyTitle: "Specification ready",
    components: "Components",
    constraints: "Constraints",
  },
} as const;

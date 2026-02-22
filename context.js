/* =========================================================
   CONTEXT — Intent V2
   Gestion du check-in et du moment actuel
   ========================================================= */

const CONTEXT_KEY = "intent_context";

// Valeurs possibles pour chaque dimension du check-in
const ENERGY_LEVELS = ["high", "medium", "low"];
const TIME_SLOTS    = ["10", "30", "60"];   // minutes
const MOODS         = ["move", "relax", "inspire", "social"];

const Context = {

  // Retourne le contexte actuel (moment en cours)
  get() {
    return Storage.get(CONTEXT_KEY, null);
  },

  // Démarre un nouveau moment via check-in
  // energy: "high"|"medium"|"low"
  // time:   "10"|"30"|"60"
  // mood:   "move"|"relax"|"inspire"|"social"
  start({ energy, time, mood }) {
    if (!ENERGY_LEVELS.includes(energy)) return null;
    if (!TIME_SLOTS.includes(time))      return null;
    if (!MOODS.includes(mood))           return null;

    const now = Date.now();
    const hour = new Date().getHours();
    const day  = new Date().getDay(); // 0=dim, 6=sam

    const context = {
      energy,
      time: Number(time),
      mood,

      // Enrichissement automatique
      hour,
      isWeekend: day === 0 || day === 6,
      isDaytime: hour >= 8 && hour < 20,
      isEvening: hour >= 20,
      isMorning: hour >= 6 && hour < 12,

      // État de la session
      status: "active",      // "active" | "completed" | "switched"
      path: null,            // chemin choisi après proposition
      startedAt: now,
      endedAt: null,

      // Feedback post-session (sport)
      feedback: null         // "easy" | "good" | "hard"
    };

    Storage.set(CONTEXT_KEY, context);
    return context;
  },

  // Choisit un chemin après la proposition de l'assistant
  // path: "sport" | "relax" | "inspire" | "social"
  setPath(path) {
    const ctx = this.get();
    if (!ctx) return null;
    const updated = { ...ctx, path, status: "active" };
    Storage.set(CONTEXT_KEY, updated);
    return updated;
  },

  // Termine le moment en cours (volontairement ou switch)
  end(reason = "completed") {
    const ctx = this.get();
    if (!ctx) return null;
    const updated = {
      ...ctx,
      status: reason, // "completed" | "switched"
      endedAt: Date.now()
    };
    Storage.set(CONTEXT_KEY, updated);
    return updated;
  },

  // Enregistre le feedback post-séance sport
  setFeedback(feedback) {
    const ctx = this.get();
    if (!ctx) return null;
    const updated = { ...ctx, feedback };
    Storage.set(CONTEXT_KEY, updated);
    return updated;
  },

  // Vérifie si un moment est en cours
  isActive() {
    const ctx = this.get();
    return ctx?.status === "active";
  },

  // Efface le contexte actuel
  clear() {
    Storage.remove(CONTEXT_KEY);
  },

  // Labels lisibles pour l'UI
  labels: {
    energy: { high: "Pleine forme 🔋", medium: "Correct 😐", low: "Fatigué 🥱" },
    time:   { "10": "10-15 min ⚡", "30": "30 min 🕐", "60": "1h+ 🕑" },
    mood:   { move: "Bouger 💪", relax: "Me détendre 🧘", inspire: "Surprise ✨", social: "Réseaux 📱" }
  }

};

window.Context  = Context;
window.ENERGY_LEVELS = ENERGY_LEVELS;
window.TIME_SLOTS    = TIME_SLOTS;
window.MOODS         = MOODS;

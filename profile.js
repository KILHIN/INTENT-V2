/* =========================================================
   PROFILE — Intent V2
   Profil utilisateur fixe — matériel, préférences, niveaux
   Chargé une fois, mis à jour manuellement
   ========================================================= */

const PROFILE_KEY = "intent_profile";

const DEFAULT_PROFILE = {

  // Matériel sport disponible
  equipment: {
    treadmill:   { available: true, maxSpeed: 14, maxIncline: 10 },
    bench:       { available: true },
    kettlebells: { available: true, sizes: ["small", "medium", "large"] },
    dumbbells:   { available: true, size: "small" },
    pullupBar:   { available: true },
    pushupBars:  { available: true }
  },

  // Niveau sport par type — ajusté après chaque séance
  fitnessLevel: {
    cardio:    3, // 1-10
    strength:  3,
    mobility:  3,
    yoga:      3
  },

  // Activités rares à suggérer en mode Inspiration
  inspiration: [
    "Lire un chapitre",
    "Appeler quelqu'un",
    "Écrire quelque chose"
  ],

  // Préférences générales
  preferences: {
    language: "fr",
    defaultRestDuration: 30 // minutes
  },

  // Métadonnées
  createdAt: null,
  updatedAt: null

};

const Profile = {

  get() {
    return Storage.get(PROFILE_KEY, null);
  },

  // Initialise le profil si premier lancement
  init() {
    const existing = this.get();
    if (existing) return existing;

    const profile = {
      ...DEFAULT_PROFILE,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    Storage.set(PROFILE_KEY, profile);
    return profile;
  },

  // Met à jour une partie du profil
  update(patch) {
    const current = this.get() || DEFAULT_PROFILE;
    const updated = {
      ...current,
      ...patch,
      updatedAt: Date.now()
    };
    Storage.set(PROFILE_KEY, updated);
    return updated;
  },

  // Ajuste le niveau fitness après feedback post-séance
  // feedback: "easy" | "good" | "hard"
  adjustLevel(type, feedback) {
    const profile = this.get();
    if (!profile) return;

    const current = profile.fitnessLevel[type] ?? 3;
    let next = current;

    if (feedback === "easy") next = Math.min(10, current + 0.5);
    if (feedback === "hard") next = Math.max(1,  current - 0.5);
    // "good" → niveau stable

    return this.update({
      fitnessLevel: {
        ...profile.fitnessLevel,
        [type]: Math.round(next * 10) / 10
      }
    });
  },

  // Ajoute une activité inspiration
  addInspiration(activity) {
    const profile = this.get();
    if (!profile) return;
    const list = profile.inspiration || [];
    if (list.includes(activity)) return profile;
    return this.update({ inspiration: [...list, activity] });
  },

  reset() {
    Storage.remove(PROFILE_KEY);
  }

};

window.Profile = Profile;

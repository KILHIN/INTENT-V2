/* =========================================================
   ASSISTANT — Intent V2
   Cerveau de décision — reçoit contexte + profil
   et propose 1 ou 2 chemins adaptés
   ========================================================= */

const Assistant = {

  // Point d'entrée principal
  // Retourne 1 ou 2 propositions
  propose(context, profile) {
    if (!context || !profile) return [];

    const { energy, time, mood, isMorning, isEvening, isWeekend, hour } = context;

    // Mood explicite → proposition directe
    if (mood === "move")    return this._proposeSport(energy, time, profile);
    if (mood === "relax")   return this._proposeRelax(energy, time, profile);
    if (mood === "social")  return this._proposeSocial(time);
    if (mood === "inspire") return this._proposeInspire(context, profile);

    return [];
  },

  // ---------------------------------------------------------
  // SPORT
  // ---------------------------------------------------------

  _proposeSport(energy, time, profile) {
    const level = profile.fitnessLevel;
    const eq    = profile.equipment;

    if (time <= 10) {
      // Court → mobilité ou pompes
      return [{
        path: "sport",
        type: "quick",
        label: "Séance express",
        description: "Pompes + gainage — 10 min chrono",
        icon: "⚡",
        params: { exercises: ["pushups", "plank"], duration: 10, level: level.strength }
      }];
    }

    if (energy === "low") {
      // Fatigué → marche ou mobilité légère
      return [{
        path: "sport",
        type: "cardio_light",
        label: "Marche active",
        description: `Tapis ${time} min — allure légère`,
        icon: "🚶",
        params: { equipment: "treadmill", duration: time, speed: 5, incline: 2 }
      }];
    }

    if (energy === "high" && time >= 30) {
      // Pleine forme → muscu ou cardio intense
      return [
        {
          path: "sport",
          type: "strength",
          label: "Musculation",
          description: this._strengthDescription(time, level.strength, eq),
          icon: "💪",
          params: { type: "strength", duration: time, level: level.strength }
        },
        {
          path: "sport",
          type: "cardio",
          label: "Cardio tapis",
          description: `${time} min — intervalles`,
          icon: "🏃",
          params: { equipment: "treadmill", duration: time, level: level.cardio }
        }
      ];
    }

    // Défaut — séance équilibrée
    return [{
      path: "sport",
      type: "balanced",
      label: "Séance équilibrée",
      description: this._strengthDescription(time, level.strength, eq),
      icon: "🏋️",
      params: { type: "balanced", duration: time, level: level.strength }
    }];
  },

  _strengthDescription(time, level, eq) {
    if (level <= 3) return `Circuit débutant ${time} min — haltères légers + traction assistée`;
    if (level <= 6) return `Circuit intermédiaire ${time} min — kettlebell + pompes`;
    return `Circuit avancé ${time} min — kettlebell lourd + traction + bench`;
  },

  // ---------------------------------------------------------
  // DÉTENTE
  // ---------------------------------------------------------

  _proposeRelax(energy, time, profile) {
    const props = [];

    if (time <= 10) {
      props.push({
        path: "relax",
        type: "breathing",
        label: "Respiration",
        description: "Cycle 4/6 — 5 min pour redescendre",
        icon: "🌬️",
        params: { inhale: 4, exhale: 6, duration: 5 }
      });
      return props;
    }

    if (energy === "low" || time <= 30) {
      props.push({
        path: "relax",
        type: "yoga",
        label: "Yoga doux",
        description: `${time} min — étirements et respiration`,
        icon: "🧘",
        params: { type: "yin", duration: time, level: profile.fitnessLevel.yoga }
      });
    } else {
      props.push(
        {
          path: "relax",
          type: "yoga",
          label: "Yoga / mobilité",
          description: `${time} min — flux guidé`,
          icon: "🧘",
          params: { type: "flow", duration: time, level: profile.fitnessLevel.yoga }
        },
        {
          path: "relax",
          type: "breathing",
          label: "Respiration guidée",
          description: "Cycle animé — détente profonde",
          icon: "🌬️",
          params: { inhale: 4, exhale: 6, duration: time }
        }
      );
    }

    return props;
  },

  // ---------------------------------------------------------
  // RÉSEAUX SOCIAUX
  // ---------------------------------------------------------

  _proposeSocial(time) {
    return [{
      path: "social",
      type: "conscious",
      label: "Réseaux — intention claire",
      description: `${time} min · Tu sais pourquoi tu y vas`,
      icon: "📱",
      params: { duration: time }
    }];
  },

  // ---------------------------------------------------------
  // INSPIRATION
  // ---------------------------------------------------------

  _proposeInspire(context, profile) {
    const { time, isMorning, isEvening } = context;
    const list = profile.inspiration || [];

    // Lecture en priorité le soir ou si temps suffisant
    if ((isEvening || time >= 30) && list.includes("Lire un chapitre")) {
      return [{
        path: "inspire",
        type: "reading",
        label: "Lire",
        description: "Un chapitre sur ta table de chevet",
        icon: "📖",
        params: { duration: time }
      }];
    }

    // Sinon pioche aléatoirement dans la liste
    const pick = list[Math.floor(Math.random() * list.length)];
    if (pick) {
      return [{
        path: "inspire",
        type: "random",
        label: pick,
        description: "Une activité que tu fais rarement",
        icon: "✨",
        params: { duration: time }
      }];
    }

    // Fallback
    return [{
      path: "inspire",
      type: "walk",
      label: "Sortir marcher",
      description: "Sans destination, sans téléphone",
      icon: "🚶",
      params: { duration: time }
    }];
  }

};

window.Assistant = Assistant;

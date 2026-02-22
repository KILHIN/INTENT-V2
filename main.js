/* =========================================================
   MAIN — Intent V2
   Orchestrateur — init, navigation, événements
   ========================================================= */

/* ---------------------------------------------------------
   ÉTAT LOCAL
   --------------------------------------------------------- */

let _checkin = { energy: null, time: null, mood: null };

/* ---------------------------------------------------------
   NAVIGATION — 4 écrans
   --------------------------------------------------------- */

function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.add("hidden"));
  const el = document.getElementById(id);
  if (el) el.classList.remove("hidden");
}

/* ---------------------------------------------------------
   ÉCRAN ACTIF — moment en cours
   --------------------------------------------------------- */

function renderActive() {
  const ctx = Context.get();
  if (!ctx || ctx.status !== "active" || !ctx.path) {
    showScreen("screenCheckin");
    return;
  }

  const icons = { sport: "💪", relax: "🧘", inspire: "✨", social: "📱" };
  const labels = { sport: "Sport", relax: "Détente", inspire: "Inspiration", social: "Réseaux" };

  document.getElementById("activePath").textContent =
    `${icons[ctx.path] || "▶"} ${labels[ctx.path] || ctx.path}`;

  document.getElementById("activeDesc").textContent =
    ctx.proposalLabel || "";

  // Timer — temps écoulé
  if (ctx.startedAt) {
    const elapsed = Math.round((Date.now() - ctx.startedAt) / 60000);
    document.getElementById("activeTimer").textContent =
      `${elapsed} min écoulées sur ${ctx.time} min prévues`;
  }

  // Feedback sport
  const feedback = document.getElementById("feedbackBlock");
  if (ctx.path === "sport" && ctx.status === "active") {
    feedback.classList.remove("hidden");
  } else {
    feedback.classList.add("hidden");
  }

  showScreen("screenActive");
}

/* ---------------------------------------------------------
   ÉCRAN CHECK-IN
   --------------------------------------------------------- */

function startCheckin() {
  // Clôture le moment en cours si il y en a un
  if (Context.isActive()) {
    Context.end("switched");
  }

  // Reset check-in
  _checkin = { energy: null, time: null, mood: null };

  // Affiche seulement la première question
  document.getElementById("stepEnergy").classList.remove("hidden");
  document.getElementById("stepTime").classList.add("hidden");
  document.getElementById("stepMood").classList.add("hidden");

  // Reset visuel des boutons
  document.querySelectorAll(".btnCheckin").forEach(b => b.classList.remove("selected"));

  showScreen("screenCheckin");
}

function handleCheckinTap(btn) {
  const group = btn.dataset.group;
  const value = btn.dataset.value;

  // Highlight sélection
  document.querySelectorAll(`.btnCheckin[data-group="${group}"]`)
    .forEach(b => b.classList.remove("selected"));
  btn.classList.add("selected");

  _checkin[group] = value;

  // Progression — question suivante
  if (group === "energy") {
    setTimeout(() => {
      document.getElementById("stepTime").classList.remove("hidden");
      document.getElementById("stepTime").scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 250);
  }

  if (group === "time") {
    setTimeout(() => {
      document.getElementById("stepMood").classList.remove("hidden");
      document.getElementById("stepMood").scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 250);
  }

  if (group === "mood") {
    // Check-in complet → propose
    setTimeout(() => submitCheckin(), 300);
  }
}

function submitCheckin() {
  const { energy, time, mood } = _checkin;
  if (!energy || !time || !mood) return;

  const ctx = Context.start({ energy, time, mood });
  if (!ctx) return;

  renderProposals(ctx);
}

/* ---------------------------------------------------------
   ÉCRAN PROPOSITIONS
   --------------------------------------------------------- */

function renderProposals(ctx) {
  const profile  = Profile.get() || Profile.init();
  const proposals = Assistant.propose(ctx, profile);

  const el = document.getElementById("proposals");

  if (!proposals.length) {
    el.innerHTML = `<p class="noProposal">Aucune proposition disponible.</p>`;
    showScreen("screenPropose");
    return;
  }

  el.innerHTML = proposals.map((p, i) => `
    <div class="proposalCard" data-index="${i}">
      <div class="proposalIcon">${p.icon}</div>
      <div class="proposalBody">
        <div class="proposalLabel">${p.label}</div>
        <div class="proposalDesc">${p.description}</div>
      </div>
      <button class="btnChoose" data-index="${i}">Choisir</button>
    </div>
  `).join("");

  // Stocke les proposals pour y accéder au clic
  window._currentProposals = proposals;

  showScreen("screenPropose");
}

function chooseProposal(index) {
  const proposals = window._currentProposals || [];
  const p = proposals[index];
  if (!p) return;

  Context.setPath(p.path);

  // Enrichit le contexte avec le label choisi
  const ctx = Context.get();
  if (ctx) {
    Storage.set("intent_context", { ...ctx, proposalLabel: p.description });
  }

  if (p.path === "social") {
    renderSocial(p);
  } else {
    renderActive();
  }
}

/* ---------------------------------------------------------
   ÉCRAN SOCIAL
   --------------------------------------------------------- */

function renderSocial(proposal) {
  document.getElementById("socialTitle").textContent =
    proposal ? `${proposal.icon} ${proposal.label}` : "Session réseaux";
  document.getElementById("socialDesc").textContent =
    proposal ? proposal.description : "";
  showScreen("screenSocial");
}

/* ---------------------------------------------------------
   DEBUG
   --------------------------------------------------------- */

function refreshDebug() {
  const ctx     = Context.get();
  const profile = Profile.get();
  const kb      = Storage.sizeKB();

  const info = {
    "💾 Storage": kb + " KB",
    "⚡ Contexte": ctx
      ? `${ctx.mood} · ${ctx.energy} · ${ctx.time}min · path:${ctx.path || "none"} · ${ctx.status}`
      : "aucun",
    "🏋️ Niveaux": profile
      ? Object.entries(profile.fitnessLevel).map(([k,v]) => `${k}:${v}`).join(" · ")
      : "profil manquant"
  };

  const el = document.getElementById("debugOutput");
  if (el) {
    el.textContent = Object.entries(info)
      .map(([k, v]) => k + "\n  " + v)
      .join("\n\n");
  }
}

function resetAll() {
  const ok = confirm("Reset complet — toutes les données effacées ?");
  if (!ok) return;
  Storage.clearAll();
  location.reload();
}

/* ---------------------------------------------------------
   INIT
   --------------------------------------------------------- */

(function init() {
  try {
    // Initialise le profil si premier lancement
    Profile.init();

    // Routing initial
    const ctx = Context.get();
    if (ctx && ctx.status === "active" && ctx.path) {
      renderActive();
    } else {
      showScreen("screenCheckin");
      startCheckin();
    }

    // Bouton flottant — Nouveau moment
    document.getElementById("btnNewMoment")
      .addEventListener("click", startCheckin);

    // Bouton switch depuis écran actif
    document.getElementById("btnSwitch")
      .addEventListener("click", startCheckin);

    // Bouton recommencer depuis propositions
    document.getElementById("btnRedo")
      .addEventListener("click", startCheckin);

    // Boutons check-in
    document.querySelectorAll(".btnCheckin").forEach(btn => {
      btn.addEventListener("click", () => handleCheckinTap(btn));
    });

    // Boutons choisir proposition
    document.getElementById("proposals").addEventListener("click", e => {
      const btn = e.target.closest(".btnChoose");
      if (btn) chooseProposal(Number(btn.dataset.index));
    });

    // Boutons apps directes
    document.querySelectorAll(".btnApp").forEach(btn => {
      btn.addEventListener("click", () => {
        const app = btn.dataset.app;
        renderSocial({ icon: "📱", label: app, description: `Session ${app}` });
      });
    });

    // Feedback sport
    document.querySelectorAll(".btnFeedback").forEach(btn => {
      btn.addEventListener("click", () => {
        const feedback = btn.dataset.feedback;
        Context.setFeedback(feedback);
        Profile.adjustLevel("strength", feedback);
        startCheckin();
      });
    });

    // Social — terminer
    document.getElementById("btnSocialStop")
      .addEventListener("click", () => {
        Context.end("completed");
        startCheckin();
      });

    document.getElementById("btnSocialSwitch")
      .addEventListener("click", startCheckin);

    // Debug
    document.getElementById("btnDebugRefresh")
      .addEventListener("click", refreshDebug);
    document.getElementById("btnResetAll")
      .addEventListener("click", resetAll);

    refreshDebug();

  } catch(e) {
    document.body.innerHTML =
      `<div style="padding:24px;color:#fff;background:#08090c;min-height:100vh;font-family:-apple-system,sans-serif;">
        <h2>Intent V2 — erreur</h2>
        <pre style="background:rgba(255,255,255,.06);padding:14px;border-radius:12px;font-size:13px;white-space:pre-wrap;">${String(e)}</pre>
      </div>`;
  }
})();

/* =========================================================
   MAIN — Intent V2
   ========================================================= */

const PROXY = "https://api.allorigins.win/get?url=";

let _checkin = { energy: null, time: null, mood: null };

/* ---------------------------------------------------------
   NAVIGATION
   --------------------------------------------------------- */

function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.add("hidden"));
  const el = document.getElementById(id);
  if (el) el.classList.remove("hidden");
}

/* ---------------------------------------------------------
   ÉCRAN ACTIF
   --------------------------------------------------------- */

function renderActive() {
  const ctx = Context.get();
  if (!ctx || ctx.status !== "active" || !ctx.path) {
    showScreen("screenCheckin");
    return;
  }
  const icons  = { sport:"💪", relax:"🧘", inspire:"✨", social:"📱" };
  const labels = { sport:"Sport", relax:"Détente", inspire:"Inspiration", social:"Réseaux" };
  document.getElementById("activePath").textContent =
    (icons[ctx.path] || "▶") + " " + (labels[ctx.path] || ctx.path);
  document.getElementById("activeDesc").textContent = ctx.proposalLabel || "";
  if (ctx.startedAt) {
    const elapsed = Math.round((Date.now() - ctx.startedAt) / 60000);
    document.getElementById("activeTimer").textContent =
      elapsed + " min écoulées sur " + ctx.time + " min prévues";
  }
  const fb = document.getElementById("feedbackBlock");
  if (ctx.path === "sport") fb.classList.remove("hidden");
  else fb.classList.add("hidden");
  showScreen("screenActive");
}

/* ---------------------------------------------------------
   CHECK-IN
   --------------------------------------------------------- */

function startCheckin() {
  if (Context.isActive()) Context.end("switched");
  _checkin = { energy: null, time: null, mood: null };
  document.getElementById("stepEnergy").classList.remove("hidden");
  document.getElementById("stepTime").classList.add("hidden");
  document.getElementById("stepMood").classList.add("hidden");
  document.querySelectorAll(".btnCheckin").forEach(b => b.classList.remove("selected"));
  showScreen("screenCheckin");
}

function handleCheckinTap(btn) {
  const group = btn.dataset.group;
  const value = btn.dataset.value;
  document.querySelectorAll('.btnCheckin[data-group="' + group + '"]')
    .forEach(b => b.classList.remove("selected"));
  btn.classList.add("selected");
  _checkin[group] = value;
  if (group === "energy") {
    setTimeout(() => {
      document.getElementById("stepTime").classList.remove("hidden");
      document.getElementById("stepTime").scrollIntoView({ behavior:"smooth", block:"nearest" });
    }, 250);
  }
  if (group === "time") {
    setTimeout(() => {
      document.getElementById("stepMood").classList.remove("hidden");
      document.getElementById("stepMood").scrollIntoView({ behavior:"smooth", block:"nearest" });
    }, 250);
  }
  if (group === "mood") setTimeout(() => submitCheckin(), 300);
}

function submitCheckin() {
  const { energy, time, mood } = _checkin;
  if (!energy || !time || !mood) return;
  const ctx = Context.start({ energy, time, mood });
  if (!ctx) return;
  renderProposals(ctx);
}

/* ---------------------------------------------------------
   PROPOSITIONS
   --------------------------------------------------------- */

function renderProposals(ctx) {
  const profile   = Profile.get() || Profile.init();
  const proposals = Assistant.propose(ctx, profile);
  const el        = document.getElementById("proposals");
  if (!proposals.length) {
    el.innerHTML = '<p class="noProposal">Aucune proposition disponible.</p>';
    showScreen("screenPropose");
    return;
  }
  el.innerHTML = proposals.map((p, i) =>
    '<div class="proposalCard">' +
      '<div class="proposalIcon">' + p.icon + '</div>' +
      '<div class="proposalBody">' +
        '<div class="proposalLabel">' + p.label + '</div>' +
        '<div class="proposalDesc">' + p.description + '</div>' +
      '</div>' +
      '<button class="btnChoose" data-index="' + i + '">Choisir</button>' +
    '</div>'
  ).join("");
  window._currentProposals = proposals;
  showScreen("screenPropose");
}

function chooseProposal(index) {
  const p = (window._currentProposals || [])[index];
  if (!p) return;
  Context.setPath(p.path);
  const ctx = Context.get();
  if (ctx) Storage.set("intent_context", { ...ctx, proposalLabel: p.description });
  if (p.path === "social") renderSocial(p);
  else renderActive();
}

/* ---------------------------------------------------------
   SOCIAL
   --------------------------------------------------------- */

function renderSocial(proposal) {
  document.getElementById("socialTitle").textContent =
    proposal ? proposal.icon + " " + proposal.label : "Session réseaux";
  document.getElementById("socialDesc").textContent =
    proposal ? proposal.description : "";
  showScreen("screenSocial");
}

/* ---------------------------------------------------------
   NEWS WIDGET — inline sur chaque écran
   --------------------------------------------------------- */





/* ---------------------------------------------------------
   DEBUG
   --------------------------------------------------------- */

function refreshDebug() {
  const ctx     = Context.get();
  const profile = Profile.get();
  const el = document.getElementById("debugOutput");
  if (!el) return;
  el.textContent =
    "💾 Storage: " + Storage.sizeKB() + " KB\n\n" +
    "⚡ Contexte: " + (ctx
      ? ctx.mood + " · " + ctx.energy + " · " + ctx.time + "min · path:" + (ctx.path||"none") + " · " + ctx.status
      : "aucun") + "\n\n" +
    "🏋️ Niveaux: " + (profile
      ? Object.entries(profile.fitnessLevel).map(([k,v]) => k+":"+v).join(" · ")
      : "profil manquant");
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
    Profile.init();
    const ctx = Context.get();
    if (ctx && ctx.status === "active" && ctx.path) renderActive();
    else startCheckin();

    document.getElementById("btnNewMoment").addEventListener("click", startCheckin);
    document.getElementById("btnSwitch").addEventListener("click", startCheckin);
    document.getElementById("btnRedo").addEventListener("click", startCheckin);

    document.querySelectorAll(".btnCheckin").forEach(btn =>
      btn.addEventListener("click", () => handleCheckinTap(btn))
    );

    document.getElementById("proposals").addEventListener("click", e => {
      const btn = e.target.closest(".btnChoose");
      if (btn) chooseProposal(Number(btn.dataset.index));
    });

    document.querySelectorAll(".btnApp").forEach(btn =>
      btn.addEventListener("click", () =>
        renderSocial({ icon:"📱", label: btn.dataset.app, description: "Session " + btn.dataset.app })
      )
    );

    document.querySelectorAll(".btnFeedback").forEach(btn =>
      btn.addEventListener("click", () => {
        const feedback = btn.dataset.feedback;
        Context.setFeedback(feedback);
        Profile.adjustLevel("strength", feedback);
        startCheckin();
      })
    );

    document.getElementById("btnSocialStop").addEventListener("click", () => {
      Context.end("completed");
      startCheckin();
    });

    document.getElementById("btnSocialSwitch").addEventListener("click", startCheckin);
    document.getElementById("btnDebugRefresh").addEventListener("click", refreshDebug);
    document.getElementById("btnResetAll").addEventListener("click", resetAll);

    refreshDebug();

  } catch(e) {
    document.body.innerHTML =
      '<div style="padding:24px;color:#fff;background:#08090c;min-height:100vh;font-family:-apple-system,sans-serif;">' +
        '<h2>Intent V2 — erreur</h2>' +
        '<pre style="background:rgba(255,255,255,.06);padding:14px;border-radius:12px;font-size:13px;white-space:pre-wrap;">' + String(e) + '</pre>' +
      '</div>';
  }
})();

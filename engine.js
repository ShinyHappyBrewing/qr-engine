// Prevent double-loading of engine.js
if (window.__engineLoaded) {
  console.log("Engine already loaded, skipping duplicate execution.");
} else {
  window.__engineLoaded = true;
}

console.log("Engine loaded");

// --- Initialize Supabase client (single source of truth) ---
if (!window.client) {
  window.client = supabase.createClient(
    "https://wowdmkxuwysuihgoklki.supabase.co",
    "sb_publishable_nlHqvZhnjR3PO-HsqgY2qw_aCw2yF4Y"
  );
}

// Use the same client everywhere
const client = window.client;

// ----------------------------------------------------------
// SCORE ENGINE (FINAL)
// ----------------------------------------------------------
// NOTE: scores.user_id is now TEXT and stores shiny_side_id

async function addScore(user_id, source_type, source_id, points) {
  if (!user_id) {
    console.error("addScore called without user_id");
    return;
  }

  const { data, error } = await client
    .from("scores")
    .insert([{ user_id, source_type, source_id, points }])
    .select("id, user_id, source_type, source_id, points, created")
    .single();

  if (error) {
    console.error("Error adding score:", error);
  } else {
    console.log("Score added:", data);
  }

  return data;
}

// ----------------------------------------------------------
// EXPERIENCE RUNNER (FINAL)
// ----------------------------------------------------------
// Uses shiny_side_id as the identity key everywhere

window.runExperience = async function (payload) {
  console.log("Running experience:", payload);

  const userData = await showShinySideModal();
  const shinySideID = userData.shiny_side_id;

  const score = await addScore(
    shinySideID,
    payload.source_type,
    payload.source_id,
    payload.points
  );

  console.log("Experience complete for:", shinySideID);
  return score;
};

// ----------------------------------------------------------
// NEW GLOBAL HELPERS (PRESERVED)
// ----------------------------------------------------------

// Get current ShinySide ID
window.getCurrentShinySideId = function () {
  return localStorage.getItem("shiny_side_id");
};

// Beer toast animation
window.showBeerToast = function (points) {
  const toast = document.createElement("div");
  toast.className = "beer-toast";
  toast.textContent = `🍺 +${points} points! Cheers!`;
  toast.style.position = "fixed";
  toast.style.bottom = "20px";
  toast.style.left = "50%";
  toast.style.transform = "translateX(-50%)";
  toast.style.background = "rgba(255,255,255,0.1)";
  toast.style.color = "#fff";
  toast.style.padding = "1rem 2rem";
  toast.style.borderRadius = "12px";
  toast.style.backdropFilter = "blur(6px)";
  toast.style.fontSize = "1.2rem";
  toast.style.zIndex = "9999";
  toast.style.animation = "fadeInOut 3s ease";

  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
};

// Cooldown checker
// Uses scores.user_id (text shiny_side_id) and scores.created

window.hasScanCooldown = async function (shinySideId, sourceId) {
  const today = new Date().toISOString().split("T")[0];

  const { data } = await client
    .from("scores")
    .select("*")
    .eq("user_id", shinySideId)
    .eq("source_id", sourceId)
    .gte("created", today + "T00:00:00");

  return data && data.length > 0;
};

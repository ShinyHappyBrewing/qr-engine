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
// SHINYSIDE ID MODAL LOGIC (FINAL)
// ----------------------------------------------------------

async function showShinySideModal() {
  const existingID = localStorage.getItem("shiny_side_id");

  if (existingID) {
    // Check if this ID actually exists in the database
    const { data, error } = await client
      .from("users")
      .select("*")
      .eq("shiny_side_id", existingID)
      .single();

    if (data) {
      console.log("Valid ShinySide ID found:", existingID);
      return data; // includes id (UUID), shiny_side_id, claimed, etc.
    }

    // If it doesn't exist, clear it and force modal
    console.warn("Stale ShinySide ID removed:", existingID);
    localStorage.removeItem("shiny_side_id");
  }

  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.id = "shinySideOverlay";
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.background = "rgba(0,0,0,0.8)";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.zIndex = "9999";

    const modal = document.createElement("div");
    modal.id = "shinySideModal";
    modal.style.background = "var(--sh-card)";
    modal.style.color = "var(--sh-white)";
    modal.style.padding = "2rem";
    modal.style.borderRadius = "12px";
    modal.style.boxShadow = "0 0 20px rgba(255,255,255,0.2)";
    modal.style.textAlign = "center";
    modal.style.width = "90%";
    modal.style.maxWidth = "400px";

    const title = document.createElement("h2");
    title.textContent = "Choose Your ShinySide ID";
    title.style.marginBottom = "1rem";
    modal.appendChild(title);

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Enter your ShinySide ID";
    input.style.width = "100%";
    input.style.padding = "0.75rem";
    input.style.border = "2px solid var(--sh-blue)";
    input.style.borderRadius = "8px";
    input.style.marginBottom = "1rem";
    input.style.fontSize = "1rem";
    input.style.textAlign = "center";
    modal.appendChild(input);

    const indicator = document.createElement("div");
    indicator.style.marginBottom = "1rem";
    indicator.style.fontSize = "0.9rem";
    modal.appendChild(indicator);

    const suggestions = document.createElement("div");
    suggestions.style.display = "flex";
    suggestions.style.flexWrap = "wrap";
    suggestions.style.justifyContent = "center";
    suggestions.style.gap = "0.5rem";

    ["ShinyHero", "GoldenHop", "BrewMaster", "HappyTraveler", "LuckyPour"].forEach((s) => {
      const btn = document.createElement("button");
      btn.textContent = s;
      btn.style.background = "var(--sh-blue)";
      btn.style.color = "var(--sh-white)";
      btn.style.border = "none";
      btn.style.borderRadius = "6px";
      btn.style.padding = "0.5rem 1rem";
      btn.style.cursor = "pointer";
      btn.onclick = () => {
        input.value = s;
        checkAvailability(s);
      };
      suggestions.appendChild(btn);
    });

    modal.appendChild(suggestions);

    async function checkAvailability(id) {
      indicator.textContent = "Checking availability...";
      const { data, error } = await client
        .from("users")
        .select("shiny_side_id")
        .eq("shiny_side_id", id)
        .single();

      if (error && error.code === "PGRST116") {
        indicator.textContent = "✅ Available!";
        indicator.style.color = "var(--sh-blue)";
        return true;
      } else if (!data) {
        indicator.textContent = "✅ Available!";
        indicator.style.color = "var(--sh-blue)";
        return true;
      } else {
        indicator.textContent = "❌ Already taken.";
        indicator.style.color = "red";
        return false;
      }
    }

    const button = document.createElement("button");
    button.textContent = "Confirm";
    button.style.background = "var(--sh-blue)";
    button.style.color = "var(--sh-white)";
    button.style.border = "none";
    button.style.borderRadius = "8px";
    button.style.padding = "0.75rem 2rem";
    button.style.cursor = "pointer";
    button.style.fontSize = "1rem";
    modal.appendChild(button);

    button.onclick = async () => {
      const id = input.value.trim();
      if (!id) {
        indicator.textContent = "Please enter an ID.";
        indicator.style.color = "red";
        return;
      }
      const available = await checkAvailability(id);
      if (!available) return;

      localStorage.setItem("shiny_side_id", id);

      const { data, error } = await client
        .from("users")
        .insert([{ shiny_side_id: id, claimed: false }])
        .select()
        .single();

      if (error) {
        console.error("Error creating temporary user:", error);
        indicator.textContent = "Error creating user.";
        indicator.style.color = "red";
        return;
      }

      modal.style.border = "2px solid var(--sh-blue)";
      modal.style.boxShadow = "0 0 20px var(--sh-blue)";
      title.textContent = `Welcome to the ShinySide, ${id}!`;
      indicator.textContent = "✨ ID created successfully!";
      setTimeout(() => {
        overlay.remove();
        resolve(data); // full user row, including shiny_side_id
      }, 1000);
    };

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  });
}

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

console.log("Engine loaded");

// --- Safety check: Supabase client from experience.html ---
if (!window.client) {
  console.error("Supabase client not found. Make sure experience.html initializes `client` first.");
}

// Use the same client everywhere
const client = window.client;

// -----------------------------
// SCORE ENGINE
// -----------------------------

/**
 * Add a score entry for a user.
 * @param {string} user_id - UUID from users table
 * @param {string} source_type - e.g. "cornhole", "trivia", "guestbook"
 * @param {string|null} source_id - optional specific game/round/id
 * @param {number} points - integer points to award
 */
async function addScore(user_id, source_type, source_id, points) {
  if (!user_id) {
    console.error("addScore called without user_id");
    return;
  }

  const { data, error } = await client
    .from("scores")
    .insert([
      {
        user_id,
        source_type,
        source_id,
        points,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Error adding score:", error);
  } else {
    console.log("Score added:", data);
  }

  return data;
}

/**
 * Get total points for a user (all time).
 * @param {string} user_id
 */
async function getTotalPoints(user_id) {
  if (!user_id) {
    console.error("getTotalPoints called without user_id");
    return 0;
  }

  const { data, error } = await client
    .from("scores")
    .select("points")
    .eq("user_id", user_id);

  if (error) {
    console.error("Error fetching total points:", error);
    return 0;
  }

  const total = (data || []).reduce((sum, row) => sum + (row.points || 0), 0);
  console.log("Total points for user", user_id, "=", total);
  return total;
}

/**
 * Get all‑time leaderboard (top N users).
 * Joins users + scores and aggregates.
 * @param {number} limit
 */
async function getAllTimeLeaderboard(limit = 10) {
  const { data, error } = await client.rpc("get_all_time_leaderboard", {
    limit_count: limit,
  });

  if (error) {
    console.error("Error fetching all‑time leaderboard:", error);
    return [];
  }

  console.log("All‑time leaderboard:", data);
  return data;
}

/**
 * Get daily leaderboard (top N users for today).
 * @param {number} limit
 */
async function getDailyLeaderboard(limit = 10) {
  const { data, error } = await client.rpc("get_daily_leaderboard", {
    limit_count: limit,
  });

  if (error) {
    console.error("Error fetching daily leaderboard:", error);
    return [];
  }

  console.log("Daily leaderboard:", data);
  return data;
}

// -----------------------------
// ACTIVITY / EXPERIENCE HOOKS
// -----------------------------

/**
 * Log a generic activity and optionally award points.
 * This is the function your QR experiences can call.
 *
 * @param {object} options
 *  - user_id: string (required)
 *  - source_type: string (required)
 *  - source_id: string|null
 *  - points: number (optional, default 0)
 *  - payload: any (optional, for future logging)
 */
async function logActivity(options) {
  const {
    user_id,
    source_type,
    source_id = null,
    points = 0,
    payload = null,
  } = options || {};

  if (!user_id || !source_type) {
    console.error("logActivity missing user_id or source_type", options);
    return;
  }

  console.log("Logging activity:", options);

  // 1) Award points if any
  let scoreRow = null;
  if (points && points !== 0) {
    scoreRow = await addScore(user_id, source_type, source_id, points);
  }

  // 2) (Optional) In the future, you can also log payloads to another table

  return {
    scoreRow,
  };
}

// -----------------------------
// PUBLIC ENTRY POINT
// -----------------------------

/**
 * Main entry point called from outside (e.g. iframe, QR, HubSpot, etc.)
 * This is where you wire specific experiences to scoring.
 *
 * Example payload shape (you can evolve this over time):
 * {
 *   user_id: "uuid-from-users-table",
 *   experience: "cornhole",
 *   round_id: "abc123",
 *   points: 50
 * }
 */
window.runExperience = async function (payload) {
  console.log("Running experience with payload:", payload);

  if (!payload || !payload.user_id || !payload.experience) {
    console.error("runExperience missing required fields (user_id, experience). Payload:", payload);
    return;
  }

  const user_id = payload.user_id;
  const source_type = payload.experience;
  const source_id = payload.round_id || null;
  const points = payload.points || 0;

  // Log activity + award points
  await logActivity({
    user_id,
    source_type,
    source_id,
    points,
    payload,
  });

  // Optionally, you can fetch and log updated totals:
  const total = await getTotalPoints(user_id);
  console.log(`User ${user_id} now has total points:`, total);

  // In the future, you can also:
  // - Update on‑screen UI
  // - Trigger confetti
  // - Show rank, etc.
};

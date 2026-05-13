console.log("Engine loaded");

// --- Supabase Client ---
const SUPABASE_URL = "https://YOURPROJECT.supabase.co";
const SUPABASE_KEY = "YOUR_PUBLIC_ANON_KEY";

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- Example: Write to Supabase ---
async function saveScan(data) {
  const { error } = await db
    .from("scans")
    .insert([{ payload: data, created_at: new Date().toISOString() }]);

  if (error) console.error("Supabase insert error:", error);
  else console.log("Scan saved");
}

// --- Example: Read from Supabase ---
async function getScans() {
  const { data, error } = await db.from("scans").select("*");

  if (error) console.error("Supabase read error:", error);
  return data;
}

// --- HubSpot Trigger Example ---
window.runExperience = async function (payload) {
  console.log("Running experience with:", payload);

  await saveScan(payload);

  const scans = await getScans();
  console.log("All scans:", scans);
};

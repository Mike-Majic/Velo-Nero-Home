const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getBaseUrl() {
  if (!SUPABASE_URL) throw new Error("Missing SUPABASE_URL");
  return SUPABASE_URL.replace(/\/$/, "");
}

function getKey(service = true) {
  const key = service ? SUPABASE_SERVICE_ROLE_KEY : SUPABASE_ANON_KEY;
  if (!key) throw new Error(service ? "Missing SUPABASE_SERVICE_ROLE_KEY" : "Missing SUPABASE_ANON_KEY");
  return key;
}

export async function supabaseRequest(path, { method = "GET", body, service = true, headers = {} } = {}) {
  const key = getKey(service);
  const res = await fetch(`${getBaseUrl()}${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...headers
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.message || data?.error_description || data?.error || `Supabase ${res.status}`);
  return data;
}

export function qs(params = {}) {
  const out = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") out.set(k, String(v));
  }
  return out.toString();
}

export async function signInWithPassword(email, password) {
  if (!SUPABASE_ANON_KEY) throw new Error("Missing SUPABASE_ANON_KEY");
  return supabaseRequest("/auth/v1/token?grant_type=password", {
    method: "POST",
    service: false,
    body: { email, password }
  });
}

export async function ensureProfile(user, extras = {}) {
  const email = String(user?.email || extras.email || "").toLowerCase();
  if (!email) throw new Error("Missing email");
  const existing = await supabaseRequest(`/rest/v1/profiles?email=eq.${encodeURIComponent(email)}&select=*`);
  if (existing?.[0]) return existing[0];
  const role = email === "m.colurci@gmail.com" ? "admin" : "none";
  const rows = await supabaseRequest("/rest/v1/profiles", {
    method: "POST",
    body: [{
      id: user?.id,
      email,
      username: extras.username || user?.user_metadata?.username || user?.user_metadata?.name || "",
      name: extras.name || user?.user_metadata?.name || "",
      picture: extras.picture || user?.user_metadata?.avatar_url || "",
      role
    }]
  });
  return rows?.[0];
}

export function appRole(role) {
  const r = String(role || "none").toLowerCase();
  if (r === "admin" || r === "owner") return "owner";
  return r;
}

export async function logActivity(event) {
  return supabaseRequest("/rest/v1/activity_logs", { method: "POST", body: [event] });
}

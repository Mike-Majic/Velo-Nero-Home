
const vnRemoteStore = window.vnRemoteStore || (() => {
  function request(method, url, body) {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url, false);
    xhr.withCredentials = true;
    if (body !== undefined) xhr.setRequestHeader("Content-Type", "application/json");
    try {
      xhr.send(body === undefined ? undefined : JSON.stringify(body));
      if (xhr.status < 200 || xhr.status >= 300) return null;
      return xhr.responseText ? JSON.parse(xhr.responseText) : null;
    } catch {
      return null;
    }
  }
  return {
    getItem(key) {
      const out = request("GET", `/api/storage/get?key=${encodeURIComponent(key)}`);
      return out && out.ok ? out.value : null;
    },
    setItem(key, value) {
      request("POST", "/api/storage/set", { key, value: String(value ?? "") });
    },
    removeItem(key) {
      request("POST", "/api/storage/remove", { key });
    }
  };
})();
window.vnRemoteStore = vnRemoteStore;


function roleLabelFromApi(role) {
  const r = String(role || "none").toLowerCase();
  if (r === "owner" || r === "admin") return "Owner";
  if (r === "boss") return "Boss";
  if (r === "vice") return "Vice Boss";
  if (r === "member") return "Soldato";
  return "";
}

// =========================
// LOGIN FLOW
// =========================
let pendingEmail = null;
let pendingUser = null;

function showLoginStep(stepId) {
  ["stepEmail", "stepPassword", "stepRegister", "step2FA"].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.classList.remove("active");
      el.style.display = "none";
    }
  });

  const step = document.getElementById(stepId);
  if (step) {
    step.classList.add("active");
    step.style.display = "block";
  }
}

function backToEmail() {
  pendingEmail = null;
  pendingUser = null;

  if (typeof window.updateChromeForAuth === "function") {
    window.updateChromeForAuth();
  }

  const loginEmail = document.getElementById("loginEmail");
  const pwResetBox = document.getElementById("pwResetBox");

  if (loginEmail) loginEmail.value = "";
  if (pwResetBox) pwResetBox.style.display = "none";

  show2FASetupUI(false);
  showLoginStep("stepEmail");
}

function backToPasswordOrEmail() {
  if (!pendingEmail) {
    backToEmail();
    return;
  }
  showLoginStep("stepPassword");
}

function finishLogin(user) {
  if (!user) return;

  const users = loadUsers();
  const email = String(user.email || "").toLowerCase();
  const ownerEmail = String(window.OWNER_EMAIL || "m.colurci@gmail.com").toLowerCase();
  let ref = users.find(x => (x.email || "").toLowerCase() === email);
  if (!ref) {
    ref = { id: typeof uid === "function" ? uid() : Math.random().toString(16).slice(2), email, blocked: false, passwordHash: null, totpSecret: null, totpNeedsSetup: false };
    users.push(ref);
  }
  ref.gameName = user.gameName || user.name || ref.gameName || email;
  ref.role = email === ownerEmail ? "Owner" : roleLabelFromApi(user.role || user.roleApi || user.apiRole);
  saveUsers(users);

  saveSession({ email });
  setHeaderUser();
  if (typeof window.updateChromeForAuth === "function") {
    window.updateChromeForAuth();
  }

  const loginPassword = document.getElementById("loginPassword");
  const login2fa = document.getElementById("login2fa");

  if (loginPassword) loginPassword.value = "";
  if (login2fa) login2fa.value = "";

  show2FASetupUI(false);

  if (typeof initAfterLogin === "function") {
    initAfterLogin();
  } else {
    showOnly("dashboard");
  }
}

function loginStepEmail() {
  const email = (document.getElementById("loginEmail")?.value || "").trim().toLowerCase();

  if (!email || !email.includes("@")) {
    alert("Inserisci un'email valida");
    return;
  }

  pendingEmail = email;

  const pwEmail = document.getElementById("pwEmail");
  const loginPassword = document.getElementById("loginPassword");
  const pwResetBox = document.getElementById("pwResetBox");

  if (pwEmail) pwEmail.value = email;
  if (loginPassword) loginPassword.value = "";
  if (pwResetBox) pwResetBox.style.display = "none";
  showLoginStep("stepPassword");
}

function registerAccount() {
  if (!pendingEmail) {
    backToEmail();
    return;
  }

  const gameName = (document.getElementById("regGameName")?.value || "").trim();
  const p1 = document.getElementById("regPassword")?.value || "";
  const p2 = document.getElementById("regPassword2")?.value || "";

  if (!gameName) {
    alert("Inserisci il tuo nome utente in game");
    return;
  }

  if (!p1 || p1.length < 6) {
    alert("Password troppo corta (min 6)");
    return;
  }

  if (p1 !== p2) {
    alert("Le password non coincidono");
    return;
  }

  const u = upsertUser(pendingEmail, p1, gameName);
  const users = loadUsers();
  const ref = users.find(x => x.email === u.email);

  if (!ref) {
    alert("Errore creazione account");
    return;
  }

  ref.totpSecret = generateTotpSecret();
  ref.totpNeedsSetup = true;
  saveUsers(users);
  pendingUser = ref;

  const twofaEmailInline = document.getElementById("twofaEmailInline");
  const twofaSecretInline = document.getElementById("twofaSecretInline");
  const twofaHintInline = document.getElementById("twofaHintInline");
  const login2fa = document.getElementById("login2fa");
  const rememberDevice = document.getElementById("rememberDevice");

  if (twofaEmailInline) twofaEmailInline.value = ref.email;
  if (twofaSecretInline) twofaSecretInline.value = ref.totpSecret;

  generate2FAQRCode(ref.email, ref.totpSecret);
  show2FASetupUI(true);

  if (twofaHintInline) {
    twofaHintInline.textContent = "Scansiona il QR (o inserisci la chiave), poi inserisci il codice 2FA.";
  }
  if (login2fa) login2fa.value = "";
  if (rememberDevice) rememberDevice.checked = true;

  showLoginStep("step2FA");
}

async function loginStepPassword() {
  if (!pendingEmail) {
    backToEmail();
    return;
  }

  const pw = document.getElementById("loginPassword")?.value || "";

  if (!pw) {
    alert("Inserisci la password");
    return;
  }

  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email: pendingEmail, password: pw })
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok || !out.ok) throw new Error(out.error || "Email o password errata");
    pendingUser = {
      email: out.user.email,
      gameName: out.user.name || out.user.email,
      roleApi: out.user.role || "none"
    };
    finishLogin(pendingUser);
  } catch (err) {
    alert(err?.message || "Email o password errata");
  }
}

async function loginStep2FA() {
  if (!pendingUser?.email) {
    backToEmail();
    return;
  }

  const fresh = findUserByEmail(pendingUser.email);

  if (!fresh) {
    backToEmail();
    return;
  }

  if (fresh.blocked) {
    alert("Account bloccato.");
    return;
  }

  if (!fresh.totpSecret) {
    alert("2FA non configurato.");
    return;
  }

  if (fresh.totpNeedsSetup) {
    const chk = document.getElementById("confirmAdded");
    if (chk && !chk.checked) {
      alert("Prima aggiungi l’account nell’app Authenticator e spunta la conferma.");
      return;
    }
  }

  const code = (document.getElementById("login2fa")?.value || "").trim();

  if (!/^\d{6}$/.test(code)) {
    alert("Inserisci il codice 2FA a 6 cifre");
    return;
  }

  const ok = await verifyTotp(fresh.totpSecret, code);

  if (!ok) {
    alert("Codice 2FA non valido.\nControlla data/ora del PC (automatiche) e riprova.");
    return;
  }

  if (fresh.totpNeedsSetup) {
    const users = loadUsers();
    const u = users.find(x => x.email === fresh.email);
    if (u) {
      u.totpNeedsSetup = false;
      saveUsers(users);
    }
  }

  const rememberDevice = document.getElementById("rememberDevice");
  if (rememberDevice?.checked) {
    setTrustedForEmail(fresh.email, 30);
  }

  finishLogin(findUserByEmail(fresh.email));
}

// =========================
// STARTUP
// =========================
function boot() {
  if (typeof ensureDemoUsersIfEmpty === "function") ensureDemoUsersIfEmpty();
  if (typeof setHeaderUser === "function") setHeaderUser();
  if (typeof window.updateChromeForAuth === "function") window.updateChromeForAuth();
  if (typeof syncSelectedTagsUI === "function") syncSelectedTagsUI();

  const s = loadSession();

  if (!s?.email) {
    if (typeof showOnly === "function") showOnly("login");
    showLoginStep("stepEmail");
    return;
  }

  const u = getMyUser();
  if (u?.blocked) {
    alert("Account bloccato.");
    logout();
    return;
  }

  if (typeof initAfterLogin === "function") {
    initAfterLogin();
  } else if (typeof showOnly === "function") {
    showOnly("dashboard");
  }
}

document.addEventListener("DOMContentLoaded", boot);


// Helpers pronti per eventuale integrazione UI esterna
const moneyAnimState = window.moneyAnimState || {};
window.moneyAnimState = moneyAnimState;
window.animateMoneyValue = window.animateMoneyValue || function(el, nextValue, formatter){
  if (!el) return;
  const target = Number(nextValue || 0);
  const key = el.id || Math.random().toString(36).slice(2);
  const prev = Number(moneyAnimState[key] ?? 0);
  moneyAnimState[key] = target;
  const fmt = typeof formatter === "function" ? formatter : (n => `$${Number(n || 0).toLocaleString("it-IT")}`);
  const start = performance.now();
  const duration = 650;
  function step(ts){
    const progress = Math.min(1, (ts - start) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = prev + ((target - prev) * eased);
    el.textContent = fmt(Math.round(value));
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = fmt(target);
  }
  requestAnimationFrame(step);
};


/* money counter animation */
function animateMoney(el,val){
  const start=0;
  const duration=700;
  const startTime=performance.now();
  function step(t){
    const p=Math.min((t-startTime)/duration,1);
    const v=Math.floor(p*val);
    el.textContent="$"+v;
    if(p<1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

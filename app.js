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

  const loginEmail = document.getElementById("loginEmail");
  const pwResetBox = document.getElementById("pwResetBox");

  if (loginEmail) loginEmail.value = "";
  if (pwResetBox) pwResetBox.style.display = "none";

  show2FASetupUI(false);
  showLoginStep("stepEmail");
}

function backToPasswordOrEmail() {
  showLoginStep("stepPassword");
}

function finishLogin(user) {
  if (!user) return;

  saveSession({ email: user.email });
  setHeaderUser();

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

  const existing = findUserByEmail(email);

  if (!existing) {
    const regEmail = document.getElementById("regEmail");
    const regGameName = document.getElementById("regGameName");
    const regPassword = document.getElementById("regPassword");
    const regPassword2 = document.getElementById("regPassword2");

    if (regEmail) regEmail.value = email;
    if (regGameName) regGameName.value = "";
    if (regPassword) regPassword.value = "";
    if (regPassword2) regPassword2.value = "";

    showLoginStep("stepRegister");
    return;
  }

  if (existing.blocked) {
    alert("Account bloccato.");
    return;
  }

  const pwEmail = document.getElementById("pwEmail");
  const loginPassword = document.getElementById("loginPassword");
  const pwResetBox = document.getElementById("pwResetBox");

  if (pwEmail) pwEmail.value = email;
  if (loginPassword) loginPassword.value = "";
  if (pwResetBox) pwResetBox.style.display = existing.passwordHash ? "none" : "block";

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

function loginStepPassword() {
  if (!pendingEmail) {
    backToEmail();
    return;
  }

  const existing = findUserByEmail(pendingEmail);

  if (!existing) {
    backToEmail();
    return;
  }

  if (existing.blocked) {
    alert("Account bloccato.");
    return;
  }

  if (!existing.passwordHash) {
    const pwResetBox = document.getElementById("pwResetBox");
    if (pwResetBox) pwResetBox.style.display = "block";
    alert("Devi impostare una nuova password (reset admin).");
    return;
  }

  const pw = document.getElementById("loginPassword")?.value || "";

  if (!pw) {
    alert("Inserisci la password");
    return;
  }

  if (!passwordMatches(pw, existing.passwordHash)) {
    alert("Email o password errata");
    return;
  }

  pendingUser = existing;

  if (!existing.totpNeedsSetup && isTrustedForEmail(existing.email)) {
    finishLogin(existing);
    return;
  }

  const twofaEmailInline = document.getElementById("twofaEmailInline");
  const twofaSecretInline = document.getElementById("twofaSecretInline");
  const twofaHintInline = document.getElementById("twofaHintInline");
  const login2fa = document.getElementById("login2fa");
  const rememberDevice = document.getElementById("rememberDevice");

  if (twofaEmailInline) twofaEmailInline.value = existing.email;

  if (!existing.totpSecret) {
    const users = loadUsers();
    const u = users.find(x => x.email === existing.email);
    if (u) {
      u.totpSecret = generateTotpSecret();
      u.totpNeedsSetup = true;
      saveUsers(users);
      pendingUser = u;
    }
  }

  const fresh = findUserByEmail(existing.email);

  if (fresh?.totpNeedsSetup) {
    if (twofaSecretInline) twofaSecretInline.value = fresh.totpSecret;
    generate2FAQRCode(fresh.email, fresh.totpSecret);
    show2FASetupUI(true);

    if (twofaHintInline) {
      twofaHintInline.textContent = "Setup 2FA richiesto: scansiona QR/chiave e inserisci il codice.";
    }
  } else {
    show2FASetupUI(false);
    if (twofaHintInline) {
      twofaHintInline.textContent = "Inserisci il codice 2FA.";
    }
  }

  if (login2fa) login2fa.value = "";
  if (rememberDevice) rememberDevice.checked = true;

  showLoginStep("step2FA");
}

function saveNewPassword() {
  if (!pendingEmail) {
    backToEmail();
    return;
  }

  const users = loadUsers();
  const u = users.find(x => (x.email || "").toLowerCase() === pendingEmail.toLowerCase());

  if (!u) {
    backToEmail();
    return;
  }

  const p1 = document.getElementById("newPassword")?.value || "";
  const p2 = document.getElementById("newPassword2")?.value || "";

  if (!p1 || p1.length < 6) {
    alert("Password troppo corta (min 6)");
    return;
  }

  if (p1 !== p2) {
    alert("Le password non coincidono");
    return;
  }

  u.passwordHash = simpleHash(normalizePasswordInput(p1));
  saveUsers(users);

  const newPassword = document.getElementById("newPassword");
  const newPassword2 = document.getElementById("newPassword2");
  const pwResetBox = document.getElementById("pwResetBox");
  const twofaEmailInline = document.getElementById("twofaEmailInline");
  const twofaSecretInline = document.getElementById("twofaSecretInline");
  const twofaHintInline = document.getElementById("twofaHintInline");
  const login2fa = document.getElementById("login2fa");
  const rememberDevice = document.getElementById("rememberDevice");

  if (newPassword) newPassword.value = "";
  if (newPassword2) newPassword2.value = "";
  if (pwResetBox) pwResetBox.style.display = "none";

  pendingUser = u;

  if (!u.totpNeedsSetup && isTrustedForEmail(u.email)) {
    finishLogin(u);
    return;
  }

  if (twofaEmailInline) twofaEmailInline.value = u.email;

  if (!u.totpSecret) {
    u.totpSecret = generateTotpSecret();
    u.totpNeedsSetup = true;
    saveUsers(users);
  }

  if (u.totpNeedsSetup) {
    if (twofaSecretInline) twofaSecretInline.value = u.totpSecret;
    generate2FAQRCode(u.email, u.totpSecret);
    show2FASetupUI(true);

    if (twofaHintInline) {
      twofaHintInline.textContent = "Setup 2FA richiesto: scansiona QR/chiave e inserisci il codice.";
    }
  } else {
    show2FASetupUI(false);
    if (twofaHintInline) {
      twofaHintInline.textContent = "Inserisci il codice 2FA.";
    }
  }

  if (login2fa) login2fa.value = "";
  if (rememberDevice) rememberDevice.checked = true;

  showLoginStep("step2FA");
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

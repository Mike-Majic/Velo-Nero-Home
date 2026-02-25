import { SignJWT, jwtVerify } from "jose";

function getSecret() {
const secret = process.env.AUTH_SECRET;
if (!secret) throw new Error("Missing AUTH_SECRET on Vercel");
return new TextEncoder().encode(secret);
}

export function createToken(payload, expiresIn = "7d") {
const secret = getSecret();
return new SignJWT(payload)
.setProtectedHeader({ alg: "HS256", typ: "JWT" })
.setIssuedAt()
.setExpirationTime(expiresIn)
.sign(secret);
}

export async function verifyToken(token) {
const secret = getSecret();
const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
return payload;
}

export function parseCookies(req) {
const header = req.headers?.cookie || "";
const out = {};
header.split(";").forEach((part) => {
const [k, ...v] = part.trim().split("=");
if (!k) return;
out[k] = decodeURIComponent(v.join("=") || "");
});
return out;
}

export function setCookie(res, name, value, opts = {}) {
const {
maxAge = 60 * 60 * 24 * 7,
path = "/",
httpOnly = true,
sameSite = "Lax",
secure = true
} = opts;

const parts = [
${name}=${encodeURIComponent(value)},
Path=${path},
Max-Age=${maxAge},
SameSite=${sameSite}
];
if (httpOnly) parts.push("HttpOnly");
if (secure) parts.push("Secure");

res.setHeader("Set-Cookie", parts.join("; "));
}

export function clearCookie(res, name) {
res.setHeader(
"Set-Cookie",
${name}=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly; Secure
);
}

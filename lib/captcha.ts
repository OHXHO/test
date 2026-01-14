import { db } from "@/lib/db";
import { randomUUID } from "crypto";

export type CaptchaPurpose = "login" | "register";

const CAPTCHA_LENGTH = 4;
const CAPTCHA_EXPIRE_MS = 5 * 60 * 1000;

const generateCode = () => {
  let code = "";
  for (let i = 0; i < CAPTCHA_LENGTH; i += 1) {
    code += Math.floor(Math.random() * 10).toString();
  }
  return code;
};

const svgEscape = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const randomBetween = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const generateCaptchaSvg = (code: string) => {
  const width = 120;
  const height = 44;
  const bg1 = `rgb(${randomBetween(230, 245)}, ${randomBetween(230, 245)}, ${randomBetween(230, 245)})`;
  const bg2 = `rgb(${randomBetween(210, 235)}, ${randomBetween(210, 235)}, ${randomBetween(210, 235)})`;
  const lines = Array.from({ length: 4 })
    .map(
      () =>
        `<line x1="${randomBetween(0, width)}" y1="${randomBetween(0, height)}" x2="${randomBetween(
          0,
          width
        )}" y2="${randomBetween(0, height)}" stroke="rgba(120,120,120,0.4)" stroke-width="1" />`
    )
    .join("");
  const chars = code.split("").map((char, index) => {
    const x = 16 + index * 24 + randomBetween(-2, 2);
    const y = 30 + randomBetween(-4, 4);
    const rotate = randomBetween(-15, 15);
    return `<text x="${x}" y="${y}" font-size="22" fill="rgb(60,60,60)" font-family="Arial, sans-serif" transform="rotate(${rotate} ${x} ${y})">${svgEscape(
      char
    )}</text>`;
  });
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${bg1}" />
          <stop offset="100%" stop-color="${bg2}" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" rx="8" ry="8" fill="url(#bg)" />
      ${lines}
      ${chars.join("")}
    </svg>
  `;
};

const cleanupExpired = () => {
  const now = new Date().toISOString();
  db.prepare("DELETE FROM captcha_codes WHERE expires_at <= ?").run(now);
};

export const createCaptcha = (purpose: CaptchaPurpose) => {
  cleanupExpired();
  const token = randomUUID();
  const code = generateCode();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + CAPTCHA_EXPIRE_MS);
  db.prepare(
    "INSERT INTO captcha_codes (token, code, purpose, created_at, expires_at) VALUES (?, ?, ?, ?, ?)"
  ).run(token, code, purpose, now.toISOString(), expiresAt.toISOString());

  const svg = generateCaptchaSvg(code);
  const image = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  return { token, image, expiresAt: expiresAt.toISOString() };
};

export const verifyCaptcha = (input: {
  token: string;
  code: string;
  purpose: CaptchaPurpose;
}): boolean => {
  cleanupExpired();
  const record = db
    .prepare("SELECT * FROM captcha_codes WHERE token = ? AND purpose = ?")
    .get(input.token, input.purpose) as
    | { code: string; expires_at: string }
    | undefined;

  if (!record) return false;
  const now = new Date();
  if (new Date(record.expires_at).getTime() <= now.getTime()) {
    db.prepare("DELETE FROM captcha_codes WHERE token = ?").run(input.token);
    return false;
  }

  const isValid = record.code.toLowerCase() === input.code.trim().toLowerCase();
  if (isValid) {
    db.prepare("DELETE FROM captcha_codes WHERE token = ?").run(input.token);
  }
  return isValid;
};

#!/usr/bin/env node
// scripts/update-readme.mjs
//
// Regenerates every data-bearing section of README.md between marker comments.
//
//  1. AUTO-TAGLINE       - the typing-animation line, from data/profile.json's "taglines"
//  2. AUTO-TECH-STACK    - the Tech Stack table, from GitHub's per-repo language stats,
//                          each repo's package.json dependencies (root + subfolders like
//                          backend/, server/, frontend/), its "homepage" URL (deployment
//                          platform), and marker files (.github/workflows for CI,
//                          nbproject/ for NetBeans, sonar-project.properties for SonarQube)
// Resume-backed identity, About, credentials, contact, and declared skills come from the
// resume repository. Featured projects use its shared code-derived ranking. Repository
// scanning supplements the declared skill set with additional evidence-backed technology.
//
// To recognize a new technology automatically, add one line to CATALOG (or DEPLOY_DOMAINS)
// below with its match key and Shields.io badge URL.
//
// Run manually:   GITHUB_TOKEN=xxxx GEMINI_API_KEY=yyyy node scripts/update-readme.mjs
// Run in Actions: the workflow supplies both automatically.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USERNAME = "MuhammadHussain2004";
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const README_PATH = path.join(__dirname, "..", "README.md");
const PROFILE_DATA_PATH = path.join(__dirname, "..", "data", "profile.json");
const RESUME_URL = "https://raw.githubusercontent.com/MuhammadHussain2004/resume/master/Muhammad_Hussain_Resume.tex";
const ANALYSIS_URL = "https://raw.githubusercontent.com/MuhammadHussain2004/resume/master/data/repo-analysis.json";

const MARKERS = {
  header: ["<!-- AUTO-HEADER:START -->", "<!-- AUTO-HEADER:END -->"],
  tagline: ["<!-- AUTO-TAGLINE:START -->", "<!-- AUTO-TAGLINE:END -->"],
  techStack: ["<!-- AUTO-TECH-STACK:START -->", "<!-- AUTO-TECH-STACK:END -->"],
  about: ["<!-- AUTO-ABOUT:START -->", "<!-- AUTO-ABOUT:END -->"],
  highlights: ["<!-- AUTO-RESUME-HIGHLIGHTS:START -->", "<!-- AUTO-RESUME-HIGHLIGHTS:END -->"],
  featured: ["<!-- AUTO-FEATURED-PROJECTS:START -->", "<!-- AUTO-FEATURED-PROJECTS:END -->"],
  contact: ["<!-- AUTO-CONTACT:START -->", "<!-- AUTO-CONTACT:END -->"],
};

const badge = (label, color, logo, logoColor = "white") =>
  `https://img.shields.io/badge/-${encodeURIComponent(label)}-${color}?style=flat${logo ? `&logo=${logo}` : ""}&logoColor=${logoColor}`;

// category -> match key (lowercase language name, or lowercase npm package name)
const CATALOG = [
  // Languages (matched against GitHub's per-repo language stats)
  { category: "Languages", match: "javascript", label: "JavaScript", badge: badge("JavaScript", "F7DF1E", "javascript", "black") },
  { category: "Languages", match: "typescript", label: "TypeScript", badge: badge("TypeScript", "3178C6", "typescript") },
  { category: "Languages", match: "html", label: "HTML5", badge: badge("HTML5", "E34F26", "html5") },
  { category: "Languages", match: "css", label: "CSS3", badge: badge("CSS3", "1572B6", "css3") },
  { category: "Languages", match: "c++", label: "C++", badge: badge("C++", "00599C", "cplusplus") },
  { category: "Languages", match: "c", label: "C", badge: badge("C", "00599C", "c") },
  { category: "Languages", match: "java", label: "Java", badge: badge("Java", "ED8B00", "openjdk") },
  { category: "Languages", match: "python", label: "Python", badge: badge("Python", "3776AB", "python") },
  { category: "Languages", match: "php", label: "PHP", badge: badge("PHP", "777BB4", "php") },
  { category: "Languages", match: "shell", label: "Shell", badge: badge("Shell", "4EAA25", "gnubash") },

  // Frontend (matched against package.json dependencies + devDependencies)
  { category: "Frontend", match: "react", label: "React", badge: badge("React", "61DAFB", "react", "black") },
  { category: "Frontend", match: "react-dom", label: "React DOM", badge: badge("React_DOM", "61DAFB", "react", "black") },
  { category: "Frontend", match: "next", label: "Next.js", badge: badge("Next.js", "000000", "nextdotjs") },
  { category: "Frontend", match: "@reduxjs/toolkit", label: "Redux Toolkit", badge: badge("Redux_Toolkit", "764ABC", "redux") },
  { category: "Frontend", match: "react-redux", label: "React Redux", badge: badge("React_Redux", "764ABC", "redux") },
  { category: "Frontend", match: "react-router-dom", label: "React Router", badge: badge("React_Router", "CA4245", "reactrouter") },
  { category: "Frontend", match: "tailwindcss", label: "Tailwind CSS", badge: badge("Tailwind_CSS", "38B2AC", "tailwind-css") },
  { category: "Frontend", match: "vite", label: "Vite", badge: badge("Vite", "646CFF", "vite") },
  { category: "Frontend", match: "framer-motion", label: "Framer Motion", badge: badge("Framer_Motion", "0055FF", "framer") },

  // Backend
  { category: "Backend", match: "express", label: "Express.js", badge: badge("Express.js", "000000", "express") },
  { category: "Backend", match: "socket.io", label: "Socket.IO", badge: badge("Socket.IO", "010101", "socketdotio") },
  { category: "Backend", match: "bcrypt", label: "bcrypt", badge: badge("bcrypt", "333333", "") },
  { category: "Backend", match: "bcryptjs", label: "bcrypt", badge: badge("bcrypt", "333333", "") },
  { category: "Backend", match: "jsonwebtoken", label: "JWT", badge: badge("JWT", "000000", "jsonwebtokens") },
  { category: "Backend", match: "cors", label: "CORS", badge: badge("CORS", "555555", "") },
  { category: "Backend", match: "dotenv", label: "dotenv", badge: badge("dotenv", "ECD53F", "dotenv", "black") },
  { category: "Backend", match: "multer", label: "Multer", badge: badge("Multer", "333333", "") },

  // Databases
  { category: "Databases", match: "mongoose", label: "Mongoose", badge: badge("Mongoose", "880000", "mongoose") },
  { category: "Databases", match: "mongodb", label: "MongoDB", badge: badge("MongoDB", "47A248", "mongodb") },
  { category: "Databases", match: "mysql2", label: "MySQL", badge: badge("MySQL", "4479A1", "mysql") },
  { category: "Databases", match: "mysql", label: "MySQL", badge: badge("MySQL", "4479A1", "mysql") },
  { category: "Databases", match: "@libsql/client", label: "Turso (libSQL)", badge: badge("Turso", "4FF8D2", "turso", "black") },
  { category: "Databases", match: "pg", label: "PostgreSQL", badge: badge("PostgreSQL", "4479A1", "postgresql") },
  { category: "Databases", match: "sequelize", label: "Sequelize", badge: badge("Sequelize", "52B0E7", "sequelize") },
  { category: "Databases", match: "prisma", label: "Prisma", badge: badge("Prisma", "2D3748", "prisma") },

  // Testing & Code Quality
  { category: "Testing & Code Quality", match: "mocha", label: "Mocha", badge: badge("Mocha", "8D6748", "mocha") },
  { category: "Testing & Code Quality", match: "chai", label: "Chai", badge: badge("Chai", "A30701", "chai") },
  { category: "Testing & Code Quality", match: "jest", label: "Jest", badge: badge("Jest", "C21325", "jest") },
  { category: "Testing & Code Quality", match: "eslint", label: "ESLint", badge: badge("ESLint", "4B32C3", "eslint") },
  { category: "Testing & Code Quality", match: "eslint-plugin-react-hooks", label: "React Hooks ESLint", badge: badge("React_Hooks_ESLint", "4B32C3", "eslint") },
  { category: "Tools", match: "nodemon", label: "Nodemon", badge: badge("Nodemon", "76D04B", "nodemon", "black") },
];

// Deployment platforms, detected from a repo's "homepage" URL
const DEPLOY_DOMAINS = [
  { domain: "vercel.app", label: "Vercel", badge: badge("Vercel", "000000", "vercel") },
  { domain: "netlify.app", label: "Netlify", badge: badge("Netlify", "00C7B7", "netlify") },
  { domain: "railway.app", label: "Railway", badge: badge("Railway", "0B0D0E", "railway") },
  { domain: "render.com", label: "Render", badge: badge("Render", "46E3B7", "render") },
  { domain: "surge.sh", label: "Surge", badge: badge("Surge", "FFCD00", "", "black") },
  { domain: "github.io", label: "GitHub Pages", badge: badge("GitHub_Pages", "222222", "github") },
];

// Tools that can't be detected from repo scans (editors, AI assistants).
// Edit this list by hand when it changes; it's merged into the same "Tools"
// row as anything auto-detected (e.g. NetBeans), so it survives every run.
const MANUAL_TOOLS = [
  { label: "VS Code", badge: badge("VS_Code", "007ACC", "visualstudiocode") },
  { label: "Postman", badge: badge("Postman", "FF6C37", "postman") },
  { label: "Cursor", badge: badge("Cursor", "000000", "") },
  { label: "GitHub Copilot", badge: badge("GitHub_Copilot", "181717", "github") },
  { label: "Claude Code", badge: badge("Claude_Code", "D97757", "") },
];

// Skills explicitly declared in the authoritative resume. Repository scanning
// can add more evidence-backed technologies, while these entries ensure that
// built-in APIs and workflow tools (which package.json cannot reveal) survive.
const RESUME_DECLARED_TECH = [
  ["Languages", "JSX", "jsx", badge("JSX", "61DAFB", "react", "black")],
  ["Frontend", "React DOM", "react dom", badge("React_DOM", "61DAFB", "react", "black")],
  ["Frontend", "Context API", "context api", badge("Context_API", "61DAFB", "react", "black")],
  ["Frontend", "React Redux", "react redux", badge("React_Redux", "764ABC", "redux")],
  ["Backend", "Socket.IO", "socket.io", badge("Socket.IO", "010101", "socketdotio")],
  ["Backend", "bcrypt", "bcrypt", badge("bcrypt", "333333", "")],
  ["Backend", "JWT", "jwt", badge("JWT", "000000", "jsonwebtokens")],
  ["Backend", "CORS", "cors", badge("CORS", "555555", "")],
  ["Backend", "dotenv", "dotenv", badge("dotenv", "ECD53F", "dotenv", "black")],
  ["Backend", "Multer", "multer", badge("Multer", "333333", "")],
  ["Backend", "Node.js http", "node.js http", badge("Node.js_http", "339933", "nodedotjs")],
  ["Backend", "fs/promises", "fs/promises", badge("fs/promises", "339933", "nodedotjs")],
  ["Backend", "path", "path, json", badge("path", "339933", "nodedotjs")],
  ["Backend", "JSON", "json", badge("JSON", "000000", "json")],
  ["Databases", "MongoDB Atlas", "mongodb atlas", badge("MongoDB_Atlas", "47A248", "mongodb")],
  ["Databases", "Mongoose", "mongoose", badge("Mongoose", "880000", "mongoose")],
  ["Databases", "PostgreSQL", "postgresql", badge("PostgreSQL", "4169E1", "postgresql")],
  ["Databases", "pg", ", pg,", badge("node--postgres_(pg)", "4169E1", "postgresql")],
  ["Databases", "Sequelize", "sequelize", badge("Sequelize", "52B0E7", "sequelize")],
  ["Tools", "npm", "npm,", badge("npm", "CB3837", "npm")],
  ["Tools", "Docker", "docker,", badge("Docker", "2496ED", "docker")],
  ["Tools", "Dockerfile", "dockerfile", badge("Dockerfile", "2496ED", "docker")],
  ["Tools", "Nodemon", "nodemon", badge("Nodemon", "76D04B", "nodemon", "black")],
  ["Testing & Code Quality", "ESLint", "eslint", badge("ESLint", "4B32C3", "eslint")],
  ["Testing & Code Quality", "React Hooks ESLint", "react hooks eslint", badge("React_Hooks_ESLint", "4B32C3", "eslint")],
];

async function gh(apiPath) {
  const res = await fetch(`https://api.github.com${apiPath}`, {
    headers: {
      Accept: "application/vnd.github+json",
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`GET ${apiPath} -> ${res.status} ${await res.text()}`);
  return res.json();
}

async function ghOptional(apiPath) {
  const res = await fetch(`https://api.github.com${apiPath}`, {
    headers: {
      Accept: "application/vnd.github+json",
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
    },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GET ${apiPath} -> ${res.status}`);
  return res.json();
}

async function fetchAllRepos() {
  const all = [];
  for (let page = 1; ; page++) {
    const batch = await gh(`/users/${USERNAME}/repos?per_page=100&page=${page}&type=owner`);
    all.push(...batch);
    if (batch.length < 100) break;
  }
  return all.filter((r) => !r.fork && !r.archived);
}

function replaceBetween(content, [start, end], newInner) {
  const startIdx = content.indexOf(start);
  const endIdx = content.indexOf(end);
  if (startIdx === -1 || endIdx === -1) {
    throw new Error(`Markers not found in README.md: ${start} / ${end}`);
  }
  const before = content.slice(0, startIdx + start.length);
  const after = content.slice(endIdx);
  return `${before}\n${newInner}\n${after}`;
}

function buildTaglineLine(taglines) {
  const encoded = taglines.map((t) => encodeURIComponent(t).replace(/%20/g, "+")).join(";");
  const url =
    "https://readme-typing-svg.demolab.com?font=Fira+Code&size=22&duration=3000&pause=1000" +
    `&color=00D9FF&center=true&vCenter=true&width=600&lines=${encoded}`;
  return `[![Typing SVG](${url})](https://git.io/typing-svg)`;
}

function buildAboutBlock(profile) {
  const bullets = profile.aboutBullets
    .map((b) => typeof b === "string" ? `- ${b}` : `- ${b.emoji || ""} ${b.text}`.trimEnd())
    .join("\n");
  return `${profile.aboutIntro}\n\n${bullets}`;
}

function parseResumeContact(resumeTex) {
  const name = /\\textbf\{\\Huge \\scshape ([^}]+)\}/.exec(resumeTex)?.[1] || "Muhammad Hussain Khan Lodhi";
  const email = /\\href\{mailto:([^}]+)\}/.exec(resumeTex)?.[1] || "muhammadhussaintech@gmail.com";
  const urls = [...resumeTex.matchAll(/\\href\{(https:\/\/[^}]+)\}/g)].map((m) => m[1]);
  return {
    name,
    email,
    github: urls.find((url) => url.includes("github.com/MuhammadHussain2004") && !url.includes("/resume/")) || `https://github.com/${USERNAME}`,
    linkedin: urls.find((url) => url.includes("linkedin.com/in/")) || "",
    portfolio: urls.find((url) => url.includes("github.io/My-Portfolio")) || "",
  };
}

function buildHeader(contact) {
  return `# <img src="https://raw.githubusercontent.com/ABSphreak/ABSphreak/master/gifs/Hi.gif" width="30"> Hey, I'm ${contact.name}`;
}

function buildContactBlock(contact) {
  const links = [];
  if (contact.portfolio) links.push(`[![Portfolio](https://img.shields.io/badge/-Portfolio-00D9FF?style=for-the-badge&logo=vercel&logoColor=white)](${contact.portfolio})`);
  if (contact.linkedin) links.push(`[![LinkedIn](https://img.shields.io/badge/-LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](${contact.linkedin})`);
  if (contact.github) links.push(`[![GitHub](https://img.shields.io/badge/-GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](${contact.github})`);
  if (contact.email) links.push(`[![Email](https://img.shields.io/badge/-Email-D14836?style=for-the-badge&logo=gmail&logoColor=white)](mailto:${contact.email})`);
  return links.join("\n");
}

function buildHighlightsBlock(profile) {
  return (profile.resumeHighlights || [])
    .map((item) => {
      const title = item.link ? `[${item.title}](${item.link})` : item.title;
      const period = item.period ? ` · ${item.period}` : "";
      return `- **${item.category}: ${title}**${period} — ${item.description}`;
    })
    .join("\n");
}

function evidenceDescription(project) {
  const features = (project.feature_domains || []).slice(0, 4);
  const technologies = (project.technologies || []).slice(0, 5);
  const kind = project.full_stack ? "Full-stack application" : "Software project";
  const featureText = features.length ? ` implementing ${features.join(", ")}` : " built from a substantive codebase";
  const stackText = technologies.length ? ` with ${technologies.join(", ")}` : "";
  return `${kind}${featureText}${stackText}.`;
}

function buildFeaturedBlock(repoAnalysis, profile) {
  const featured = (repoAnalysis.projects || [])
    .filter((project) => project.eligible && project.overall_rank <= 3)
    .sort((a, b) => a.overall_rank - b.overall_rank);

  if (featured.length === 0) throw new Error("Shared analysis contains no featured projects");

  return featured
    .map((project) => {
      const name = profile.projectNameOverrides?.[project.name] || project.name;
      const link = project.homepage || project.url;
      const tag = project.full_stack ? " (Full-Stack)" : "";
      return `**[${name}](${link})**${tag}: ${evidenceDescription(project)}\n[Code](${project.url})`;
    })
    .join("\n\n");
}

// --- Gemini-assisted "About Me" refresh -------------------------------
//
// Everything else in this file is deterministic (a repo scan, a badge
// lookup table) - there's nothing to "get wrong". The About Me bullets are
// different: facts like a new certification or job can't be detected from a
// repo scan at all, only from the person's own GitHub profile bio. So this
// step asks Gemini to reconcile the current bullets (data/profile.json)
// against the live bio, but only touches profile.json - the actual Tech
// Stack / Featured Projects / Tagline rendering above never goes through an
// LLM. If GEMINI_API_KEY isn't set, or anything about the call goes wrong,
// this quietly falls back to the existing profile.json unchanged - a
// broken/missing key should never break the weekly tech-stack update.

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function resolveGeminiModels() {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`
  );
  if (!res.ok) throw new Error(`ListModels failed: ${res.status}`);
  const data = await res.json();
  const candidates = (data.models || [])
    .filter((m) => (m.supportedGenerationMethods || []).includes("generateContent"))
    .map((m) => m.name.split("/").pop());

  const versionRe = /(\d+)(?:\.(\d+))?/;
  const rank = (name) => {
    let score = 0;
    if (name.includes("latest")) score += 1000;
    const m = versionRe.exec(name);
    if (m) score += parseInt(m[1], 10) * 100 + parseInt(m[2] || "0", 10);
    if (name.includes("flash")) score += 20;
    if (name.includes("pro")) score += 10;
    if (/(exp|preview|thinking)/.test(name)) score -= 500;
    if (/(vision|embedding|tts|image|audio)/.test(name)) score -= 10000;
    return -score;
  };
  candidates.sort((a, b) => rank(a) - rank(b));
  return candidates;
}

async function callGemini(model, systemText, userText) {
  for (const apiVersion of ["v1beta", "v1"]) {
    const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
    let res;
    for (let attempt = 0; attempt < 3; attempt++) {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemText }] },
          contents: [{ role: "user", parts: [{ text: userText }] }],
          generationConfig: {
            maxOutputTokens: 2048,
            temperature: 0.2,
            responseMimeType: "application/json",
          },
        }),
      });
      if ((res.status === 429 || res.status === 503) && attempt < 2) {
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
        continue;
      }
      break;
    }
    if (res.status === 404) continue;
    if (!res.ok) throw new Error(`Gemini ${apiVersion} ${res.status}: ${(await res.text()).slice(0, 500)}`);
    const data = await res.json();
    const parts = data.candidates?.[0]?.content?.parts || [];
    const text = parts.map((p) => p.text || "").join("");
    if (text.trim()) return text;
    throw new Error(`Gemini returned empty text: ${JSON.stringify(data).slice(0, 500)}`);
  }
  throw new Error(`MODEL_UNAVAILABLE:${model}`);
}

function stripCodeFences(text) {
  const t = text.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(t);
  if (fenced) return fenced[1].trim();

  // Some models add a short sentence around otherwise valid JSON despite the
  // response-format instruction. Extract the outer JSON object defensively.
  const firstBrace = t.indexOf("{");
  const lastBrace = t.lastIndexOf("}");
  return firstBrace !== -1 && lastBrace > firstBrace
    ? t.slice(firstBrace, lastBrace + 1)
    : t;
}

async function refreshAboutViaGemini(profile, bio) {
  if (!GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY not set - leaving About Me as-is.");
    return profile;
  }

  const system = `You maintain the "About Me" section of a GitHub profile README, stored as JSON: {"aboutIntro": string, "aboutBullets": [{"emoji": string, "text": string}]}.
You will be given the CURRENT aboutIntro/aboutBullets and the person's live GitHub profile bio text.
Hard rules (a program will verify these mechanically before accepting your output):
- Only change or add a bullet if the GitHub bio text explicitly supports it. If the bio doesn't mention anything new, return aboutIntro/aboutBullets completely UNCHANGED.
- Never invent a degree, employer, certification, or fact that isn't present in the bio or already in the current bullets.
- Keep the exact same JSON shape.
- Keep the existing markdown bold (**text**) style for names/orgs, and keep each bullet's emoji.
- Output ONLY raw JSON. No markdown fences, no commentary.`;

  const user = `CURRENT (JSON):\n${JSON.stringify(
    { aboutIntro: profile.aboutIntro, aboutBullets: profile.aboutBullets },
    null,
    2
  )}\n\nGITHUB BIO TEXT:\n${bio || "(empty)"}`;

  let models;
  try {
    models = await resolveGeminiModels();
  } catch (e) {
    console.error(`Could not list Gemini models, leaving About Me as-is: ${e.message}`);
    return profile;
  }

  let raw = null;
  for (const model of models) {
    try {
      raw = await callGemini(model, system, user);
      console.error(`Used Gemini model: ${model}`);
      break;
    } catch (e) {
      if (String(e.message).startsWith("MODEL_UNAVAILABLE")) {
        console.error(`Skipping ${model}: ${e.message}`);
        continue;
      }
      console.error(`Gemini call failed (${model}), leaving About Me as-is: ${e.message}`);
      return profile;
    }
  }
  if (!raw) {
    console.error("No working Gemini model found, leaving About Me as-is.");
    return profile;
  }

  let parsed;
  try {
    parsed = JSON.parse(stripCodeFences(raw));
  } catch (e) {
    console.error(`Gemini output wasn't valid JSON, leaving About Me as-is: ${e.message}`);
    return profile;
  }
  if (typeof parsed.aboutIntro !== "string" || !Array.isArray(parsed.aboutBullets)) {
    console.error("Gemini output missing required fields, leaving About Me as-is.");
    return profile;
  }

  // Mechanical fabrication guard: every bullet that wasn't already present
  // must have at least one distinctive word actually appear in the bio text.
  const oldTexts = new Set(profile.aboutBullets.map((b) => b.text));
  const newBullets = parsed.aboutBullets.filter((b) => !oldTexts.has(b.text));
  const bioLower = (bio || "").toLowerCase();
  const unverified = newBullets.filter((b) => {
    const words = b.text.replace(/\*\*/g, "").toLowerCase().match(/[a-z]{4,}/g) || [];
    return !words.some((w) => bioLower.includes(w));
  });
  if (unverified.length > 0) {
    console.error(
      `Rejecting Gemini About Me update - new bullet(s) not traceable to the bio text: ${JSON.stringify(unverified)}`
    );
    return profile;
  }

  return { ...profile, aboutIntro: parsed.aboutIntro, aboutBullets: parsed.aboutBullets };
}

async function refreshProfileFromResume(profile, resumeTex) {
  if (!GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY not set - keeping the last resume-derived profile data.");
    return profile;
  }

  const system = `You synchronize a GitHub profile README from an authoritative LaTeX resume.
Return JSON with exactly this shape:
{"taglines":[string],"aboutIntro":string,"aboutBullets":[{"emoji":string,"text":string}],"resumeHighlights":[{"category":string,"title":string,"period":string,"description":string,"link":string}]}
Rules:
- The resume is the only source of truth. Never invent or retain a stale fact that conflicts with it.
- taglines: 4-6 concise professional identity/qualification lines derived from Summary, Education, Experience, and Certifications.
- aboutIntro: one concise paragraph derived from Summary.
- aboutBullets: 5-8 concise bullets covering the strongest current education, certification, experience, project/engineering focus, and contact facts. Use fitting emoji and Markdown bold sparingly.
- resumeHighlights: one entry for every Experience, Education, and Certification entry. Category must be Experience, Education, or Certification. Preserve dates/periods and factual meaning. Use a URL only when the entry has an explicit \\href URL; otherwise use an empty string.
- Projects and Technical Skills are rendered separately from code analysis, so summarize rather than duplicate whole sections.
- Output raw JSON only.`;
  const user = `AUTHORITATIVE RESUME (.tex):\n\n${resumeTex}`;

  const models = await resolveGeminiModels();
  for (const model of models) {
    try {
      const raw = await callGemini(model, system, user);
      const parsed = JSON.parse(stripCodeFences(raw));
      if (
        !Array.isArray(parsed.taglines) || parsed.taglines.length < 4 ||
        typeof parsed.aboutIntro !== "string" ||
        !Array.isArray(parsed.aboutBullets) || parsed.aboutBullets.length < 4 ||
        !parsed.aboutBullets.every((item) =>
          typeof item === "string" ||
          (item && typeof item === "object" && typeof item.text === "string")
        ) ||
        !Array.isArray(parsed.resumeHighlights) || parsed.resumeHighlights.length < 3
      ) {
        throw new Error("resume-derived JSON failed structural validation");
      }

      const outputText = JSON.stringify(parsed);
      const unsupportedUrls = [...outputText.matchAll(/https:\/\/[^"\s]+/g)]
        .map((match) => match[0])
        .filter((url) => !resumeTex.includes(url));
      if (unsupportedUrls.length) {
        throw new Error(`invented URL(s): ${unsupportedUrls.join(", ")}`);
      }

      return {
        ...profile,
        taglines: parsed.taglines,
        aboutIntro: parsed.aboutIntro,
        aboutBullets: parsed.aboutBullets.map((item) =>
          typeof item === "string" ? { emoji: "", text: item } : item
        ),
        resumeHighlights: parsed.resumeHighlights,
      };
    } catch (error) {
      console.error(`Profile sync model ${model} failed: ${error.message}`);
    }
  }
  console.error("All profile-sync models failed; preserving the last valid resume-derived content.");
  return profile;
}

async function run() {
  console.error(`Scanning repos for ${USERNAME}...`);
  const repos = await fetchAllRepos();
  console.error(`Found ${repos.length} non-fork, non-archived repos.`);

  const [resumeResponse, analysisResponse] = await Promise.all([
    fetch(RESUME_URL, { signal: AbortSignal.timeout(30000) }),
    fetch(ANALYSIS_URL, { signal: AbortSignal.timeout(30000) }),
  ]);
  if (!resumeResponse.ok) throw new Error(`Resume fetch failed: ${resumeResponse.status}`);
  if (!analysisResponse.ok) throw new Error(`Shared analysis fetch failed: ${analysisResponse.status}`);
  const resumeTex = await resumeResponse.text();
  const repoAnalysis = await analysisResponse.json();
  if (resumeTex.length < 500 || !Array.isArray(repoAnalysis.projects)) {
    throw new Error("Resume or shared analysis response was malformed");
  }

  let profile = JSON.parse(readFileSync(PROFILE_DATA_PATH, "utf8"));
  profile = await refreshProfileFromResume(profile, resumeTex);
  writeFileSync(PROFILE_DATA_PATH, JSON.stringify(profile, null, 2) + "\n");

  const detected = new Map(); // category -> Map(label -> badgeUrl)
  const add = (category, label, badgeUrl) => {
    if (!badgeUrl) return;
    if (!detected.has(category)) detected.set(category, new Map());
    detected.get(category).set(label, badgeUrl);
  };

  let hasWorkflow = false;
  let hasNetBeansProject = false;
  let hasNodeProject = false;

  for (const repo of repos) {
    try {
      const langs = await gh(`/repos/${USERNAME}/${repo.name}/languages`);
      for (const langName of Object.keys(langs)) {
        const entry = CATALOG.find((c) => c.category === "Languages" && c.match === langName.toLowerCase());
        if (entry) add(entry.category, entry.label, entry.badge);
      }
    } catch (e) {
      console.error(`  languages failed for ${repo.name}: ${e.message}`);
    }

    let hasSonarConfig = false;
    try {
      // Walk the whole repo tree (not just the root) since MERN repos here are
      // commonly split into backend/, server/, frontend/, dashboard/, etc.,
      // each with its own package.json.
      const branch = repo.default_branch || "main";
      const tree = await ghOptional(`/repos/${USERNAME}/${repo.name}/git/trees/${branch}?recursive=1`);
      const paths = (tree?.tree || []).filter((n) => n.type === "blob").map((n) => n.path);

      const pkgPaths = paths.filter((p) => /(^|\/)package\.json$/.test(p) && !p.includes("node_modules"));
      for (const pkgPath of pkgPaths) {
        const pkg = await ghOptional(`/repos/${USERNAME}/${repo.name}/contents/${pkgPath}`);
        if (!pkg || !pkg.content) continue;
        hasNodeProject = true;
        const json = JSON.parse(Buffer.from(pkg.content, "base64").toString("utf8"));
        const deps = { ...(json.dependencies || {}), ...(json.devDependencies || {}) };
        for (const depName of Object.keys(deps)) {
          const key = depName.toLowerCase();
          const entry = CATALOG.find((c) => c.category !== "Languages" && c.match === key);
          if (entry) add(entry.category, entry.label, entry.badge);
        }
      }

      if (paths.some((p) => /(^|\/)sonar-project\.properties$/.test(p))) hasSonarConfig = true;
    } catch (e) {
      console.error(`  tree scan failed for ${repo.name}: ${e.message}`);
    }
    if (hasSonarConfig) add("Testing & Code Quality", "SonarQube", badge("SonarQube", "4E9BCD", "sonarqube"));

    if (repo.homepage) {
      for (const d of DEPLOY_DOMAINS) {
        if (repo.homepage.includes(d.domain)) add("Deployment", d.label, d.badge);
      }
    }

    if (!hasWorkflow) {
      try {
        const wf = await ghOptional(`/repos/${USERNAME}/${repo.name}/contents/.github/workflows`);
        if (Array.isArray(wf) && wf.length > 0) hasWorkflow = true;
      } catch { /* ignore */ }
    }

    if (!hasNetBeansProject) {
      try {
        const nb = await ghOptional(`/repos/${USERNAME}/${repo.name}/contents/nbproject`);
        if (nb) hasNetBeansProject = true;
      } catch { /* ignore */ }
    }
  }

  if (hasNodeProject) add("Backend", "Node.js", badge("Node.js", "339933", "nodedotjs"));
  if (hasWorkflow) add("Version Control & CI/CD", "GitHub Actions", badge("GitHub_Actions", "2088FF", "githubactions"));
  add("Version Control & CI/CD", "Git", badge("Git", "F05032", "git"));
  add("Version Control & CI/CD", "GitHub", badge("GitHub", "181717", "github"));
  if (hasNetBeansProject) add("Tools", "NetBeans", badge("NetBeans", "1B6AC6", "apachenetbeanside"));
  for (const t of MANUAL_TOOLS) add("Tools", t.label, t.badge);
  const normalizedResume = resumeTex.toLowerCase();
  for (const [category, label, resumeMatch, badgeUrl] of RESUME_DECLARED_TECH) {
    if (normalizedResume.includes(resumeMatch)) add(category, label, badgeUrl);
  }

  const order = ["Languages", "Frontend", "Backend", "Databases", "Version Control & CI/CD", "Deployment", "Testing & Code Quality", "Tools"];
  let table = '<table>\n<tr>\n  <td><b>Property</b></td>\n  <td><b>Data</b></td>\n</tr>\n';
  for (const cat of order) {
    const items = detected.get(cat);
    if (!items || items.size === 0) continue;
    const badges = [...items.values()].map((b) => `    <img src="${b}" />`).join("\n");
    table += `<tr>\n  <td><b>${cat}</b></td>\n  <td>\n${badges}\n  </td>\n</tr>\n`;
  }
  table += "</table>";

  let readme = readFileSync(README_PATH, "utf8");
  const original = readme;
  const contact = parseResumeContact(resumeTex);

  readme = replaceBetween(readme, MARKERS.header, buildHeader(contact));
  readme = replaceBetween(readme, MARKERS.tagline, buildTaglineLine(profile.taglines));
  readme = replaceBetween(readme, MARKERS.techStack, table);
  readme = replaceBetween(readme, MARKERS.about, buildAboutBlock(profile));
  readme = replaceBetween(readme, MARKERS.highlights, buildHighlightsBlock(profile));
  readme = replaceBetween(readme, MARKERS.featured, buildFeaturedBlock(repoAnalysis, profile));
  readme = replaceBetween(readme, MARKERS.contact, buildContactBlock(contact));

  writeFileSync(README_PATH, readme);
  console.error(readme === original ? "No changes." : "README.md updated.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

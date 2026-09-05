#!/usr/bin/env node
// scripts/update-readme.mjs
//
// Regenerates four parts of README.md, each between its own marker comments:
//
//  1. AUTO-TAGLINE       - the typing-animation line, from data/profile.json's "taglines"
//  2. AUTO-TECH-STACK    - the Tech Stack table, from GitHub's per-repo language stats,
//                          each repo's package.json dependencies (root + subfolders like
//                          backend/, server/, frontend/), its "homepage" URL (deployment
//                          platform), and marker files (.github/workflows for CI,
//                          nbproject/ for NetBeans, sonar-project.properties for SonarQube)
//  3. AUTO-ABOUT         - the About Me intro + bullets, from data/profile.json. If
//                          GEMINI_API_KEY is set, refreshAboutViaGemini() first asks Gemini
//                          to reconcile these bullets against the live GitHub profile bio
//                          and persists any accepted change back to profile.json - but only
//                          a bullet traceable to actual bio text is accepted (see that
//                          function). Without the key, or if anything about the call fails,
//                          this step is skipped and profile.json is used as-is.
//  4. AUTO-FEATURED-PROJECTS - any repo tagged with the GitHub topic "featured" (add the
//                          topic on GitHub.com to showcase a new project; add "mern-stack"
//                          too to get the "(MERN Stack)" tag). Display name and preferred
//                          order can be tuned via profile.json's "projectNameOverrides"
//                          and "featuredOrder" - everything else (description, links) comes
//                          straight from the repo itself.
//
// Facts that don't live in any repo and aren't in the GitHub bio (CGPA, certificates,
// internships) can't be detected automatically - edit data/profile.json directly to change
// those; this script only handles formatting/rendering, consistently, every run.
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

const MARKERS = {
  tagline: ["<!-- AUTO-TAGLINE:START -->", "<!-- AUTO-TAGLINE:END -->"],
  techStack: ["<!-- AUTO-TECH-STACK:START -->", "<!-- AUTO-TECH-STACK:END -->"],
  about: ["<!-- AUTO-ABOUT:START -->", "<!-- AUTO-ABOUT:END -->"],
  featured: ["<!-- AUTO-FEATURED-PROJECTS:START -->", "<!-- AUTO-FEATURED-PROJECTS:END -->"],
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
  { category: "Frontend", match: "next", label: "Next.js", badge: badge("Next.js", "000000", "nextdotjs") },
  { category: "Frontend", match: "@reduxjs/toolkit", label: "Redux Toolkit", badge: badge("Redux_Toolkit", "764ABC", "redux") },
  { category: "Frontend", match: "react-router-dom", label: "React Router", badge: badge("React_Router", "CA4245", "reactrouter") },
  { category: "Frontend", match: "tailwindcss", label: "Tailwind CSS", badge: badge("Tailwind_CSS", "38B2AC", "tailwind-css") },
  { category: "Frontend", match: "vite", label: "Vite", badge: badge("Vite", "646CFF", "vite") },
  { category: "Frontend", match: "framer-motion", label: "Framer Motion", badge: badge("Framer_Motion", "0055FF", "framer") },

  // Backend
  { category: "Backend", match: "express", label: "Express.js", badge: badge("Express.js", "000000", "express") },

  // Databases
  { category: "Databases", match: "mongoose", label: "MongoDB", badge: badge("MongoDB", "47A248", "mongodb") },
  { category: "Databases", match: "mongodb", label: "MongoDB", badge: badge("MongoDB", "47A248", "mongodb") },
  { category: "Databases", match: "mysql2", label: "MySQL", badge: badge("MySQL", "4479A1", "mysql") },
  { category: "Databases", match: "mysql", label: "MySQL", badge: badge("MySQL", "4479A1", "mysql") },
  { category: "Databases", match: "@libsql/client", label: "Turso (libSQL)", badge: badge("Turso", "4FF8D2", "turso", "black") },
  { category: "Databases", match: "pg", label: "PostgreSQL", badge: badge("PostgreSQL", "4479A1", "postgresql") },
  { category: "Databases", match: "prisma", label: "Prisma", badge: badge("Prisma", "2D3748", "prisma") },

  // Testing & Code Quality
  { category: "Testing & Code Quality", match: "mocha", label: "Mocha", badge: badge("Mocha", "8D6748", "mocha") },
  { category: "Testing & Code Quality", match: "chai", label: "Chai", badge: badge("Chai", "A30701", "chai") },
  { category: "Testing & Code Quality", match: "jest", label: "Jest", badge: badge("Jest", "C21325", "jest") },
  { category: "Testing & Code Quality", match: "eslint", label: "ESLint", badge: badge("ESLint", "4B32C3", "eslint") },
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
  const bullets = profile.aboutBullets.map((b) => `- ${b.emoji} ${b.text}`).join("\n");
  return `${profile.aboutIntro}\n\n${bullets}`;
}

function buildFeaturedBlock(repos, profile) {
  const featured = repos.filter((r) => (r.topics || []).includes("featured"));

  const order = profile.featuredOrder || [];
  featured.sort((a, b) => {
    const ia = order.indexOf(a.name);
    const ib = order.indexOf(b.name);
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    return new Date(b.pushed_at) - new Date(a.pushed_at);
  });

  if (featured.length === 0) {
    return "_No projects tagged \"featured\" yet - add that GitHub topic to a repo to showcase it here._";
  }

  return featured
    .map((r) => {
      const name = profile.projectNameOverrides?.[r.name] || r.name;
      const isMern = (r.topics || []).includes("mern-stack");
      const tag = isMern ? " (MERN Stack)" : "";
      const link = r.homepage || r.html_url;
      // Repo descriptions are meant for GitHub's own UI and sometimes carry an
      // em dash; swap it for a comma so this reads like the rest of the README.
      const rawDesc = (r.description || "").replace(/\s*[—–]\s*/g, ", ");
      const desc = rawDesc ? `: ${rawDesc}` : "";
      return `**[${name}](${link})**${tag}${desc}\n[Code](${r.html_url})`;
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
          generationConfig: { maxOutputTokens: 2048, temperature: 0.3 },
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
  const m = /^```(?:json)?\n([\s\S]*)\n```$/.exec(t);
  return m ? m[1] : t;
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

async function run() {
  console.error(`Scanning repos for ${USERNAME}...`);
  const repos = await fetchAllRepos();
  console.error(`Found ${repos.length} non-fork, non-archived repos.`);

  let profile = JSON.parse(readFileSync(PROFILE_DATA_PATH, "utf8"));

  const liveUser = await ghOptional(`/users/${USERNAME}`);
  const bio = liveUser?.bio || "";
  profile = await refreshAboutViaGemini(profile, bio);
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

  readme = replaceBetween(readme, MARKERS.tagline, buildTaglineLine(profile.taglines));
  readme = replaceBetween(readme, MARKERS.techStack, table);
  readme = replaceBetween(readme, MARKERS.about, buildAboutBlock(profile));
  readme = replaceBetween(readme, MARKERS.featured, buildFeaturedBlock(repos, profile));

  writeFileSync(README_PATH, readme);
  console.error(readme === original ? "No changes." : "README.md updated.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

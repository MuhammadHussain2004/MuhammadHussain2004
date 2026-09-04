#!/usr/bin/env node
// scripts/update-readme.mjs
//
// Regenerates the "Tech Stack & Tools" table in README.md between the
// AUTO-TECH-STACK markers, based on what is actually detected across all of
// USERNAME's public, non-fork repos: GitHub's own per-repo language stats,
// dependencies listed in each repo's root package.json, the repo's
// "homepage" URL (for deployment platforms), and the presence of
// .github/workflows (CI) or an nbproject folder (NetBeans).
//
// To recognize a new technology automatically in the future, add one line
// to CATALOG (or DEPLOY_DOMAINS) below with its match key and Shields.io
// badge URL.
//
// Run manually:   GITHUB_TOKEN=xxxx node scripts/update-readme.mjs
// Run in Actions: the workflow supplies GITHUB_TOKEN automatically.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USERNAME = "MuhammadHussain2004";
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const README_PATH = path.join(__dirname, "..", "README.md");

const START_MARKER = "<!-- AUTO-TECH-STACK:START -->";
const END_MARKER = "<!-- AUTO-TECH-STACK:END -->";

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

function main() {
  return run();
}

async function run() {
  console.error(`Scanning repos for ${USERNAME}...`);
  const repos = await fetchAllRepos();
  console.error(`Found ${repos.length} non-fork, non-archived repos.`);

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
  if (hasNetBeansProject) add("IDEs", "NetBeans", badge("NetBeans", "1B6AC6", "apachenetbeanside"));

  const order = ["Languages", "Frontend", "Backend", "Databases", "Version Control & CI/CD", "Deployment", "Testing & Code Quality", "IDEs"];
  let table = '<table>\n<tr>\n  <td><b>Property</b></td>\n  <td><b>Data</b></td>\n</tr>\n';
  for (const cat of order) {
    const items = detected.get(cat);
    if (!items || items.size === 0) continue;
    const badges = [...items.values()].map((b) => `    <img src="${b}" />`).join("\n");
    table += `<tr>\n  <td><b>${cat}</b></td>\n  <td>\n${badges}\n  </td>\n</tr>\n`;
  }
  table += "</table>";

  const readme = readFileSync(README_PATH, "utf8");
  const startIdx = readme.indexOf(START_MARKER);
  const endIdx = readme.indexOf(END_MARKER);
  if (startIdx === -1 || endIdx === -1) {
    throw new Error("README markers not found; add AUTO-TECH-STACK:START/END HTML comments around the tech table.");
  }
  const before = readme.slice(0, startIdx + START_MARKER.length);
  const after = readme.slice(endIdx);
  const updated = `${before}\n${table}\n${after}`;

  writeFileSync(README_PATH, updated);
  console.error(updated === readme ? "No changes." : "README.md updated.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

#!/usr/bin/env node
/*
Usage:
  # PowerShell
  $env:RENDER_API_KEY="<token>"; node scripts/watch-render-deploy.js srv-xxxx --interval=8
  $env:RENDER_API_KEY="<token>"; node scripts/watch-render-deploy.js srv-xxxx --once

  # Bash
  export RENDER_API_KEY=<token>
  node scripts/watch-render-deploy.js srv-xxxx --interval=8
  node scripts/watch-render-deploy.js srv-xxxx --once
*/

const API = "https://api.render.com/v1";
const apiKey = process.env.RENDER_API_KEY;

if (!apiKey) {
  console.error("Missing RENDER_API_KEY env var. Create one in Render > Account/Team Settings > API Keys.");
  process.exit(1);
}

const args = process.argv.slice(2);
const serviceId = args.find((a) => !a.startsWith("--")) || process.env.SERVICE_ID;
const intervalOpt = args.find((a) => a.startsWith("--interval"));
const intervalSec = intervalOpt ? Number(intervalOpt.split("=")[1] || 8) : 8;
const once = args.includes("--once");

if (!serviceId) {
  console.error("Usage: node scripts/watch-render-deploy.js <service-id> [--interval=8] [--once]");
  process.exit(1);
}

async function api(pathname) {
  const res = await fetch(`${API}${pathname}`, {
    headers: {
      accept: "application/json",
      authorization: `Bearer ${apiKey}`,
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} on ${pathname}: ${text}`);
  }
  return res.json();
}

function normalizeDeployList(list) {
  if (!list) return [];
  const arr = Array.isArray(list) ? list : list.data || [];
  // Items may be {deploy: {...}} or the deploy object itself
  return arr.map((it) => (it && it.deploy ? it.deploy : it)).filter(Boolean);
}

async function getLatestDeploy() {
  const list = await api(`/services/${serviceId}/deploys`);
  const items = normalizeDeployList(list);
  return items[0] || null;
}

async function getDeploy(deployId) {
  return api(`/services/${serviceId}/deploys/${deployId}`);
}

function printSummary(d) {
  if (!d) {
    console.log("No deploys found for this service yet.");
    return;
  }
  const id = d.id || d.deployId || "unknown";
  const status = d.status || d.state || "unknown";
  const commit = d.commitId || d.commitHash || (d.commit && (d.commit.id || d.commit.hash)) || "?";
  const created = d.createdAt || d.created_at;
  const updated = d.updatedAt || d.updated_at;
  const finished = d.finishedAt || d.finished_at;
  console.log(`\nDeploy ${id} | status=${status} | commit=${commit}`);
  console.log(`created=${created} updated=${updated} finished=${finished}`);
  if (d.failed) console.log("failed=", d.failed);
  if (d.message) console.log("message=", d.message);
}

(async () => {
  if (once) {
    const latest = await getLatestDeploy();
    printSummary(latest);
    return;
  }

  console.log(`Watching service ${serviceId} every ${intervalSec}s...`);
  let current = await getLatestDeploy();
  let lastStatus = current ? current.status : "";
  if (current) printSummary(current); else console.log("No deploys yet...");

  setInterval(async () => {
    try {
      const latest = await getLatestDeploy();
      if (!latest) return;
      if (!current || latest.id !== current.id) {
        current = latest;
        lastStatus = "";
        console.log("\nNew deploy detected:");
      }
      if (latest.status !== lastStatus) {
        printSummary(latest);
        lastStatus = latest.status;
      }
    } catch (err) {
      console.error("Error:", err.message);
    }
  }, intervalSec * 1000);
})();

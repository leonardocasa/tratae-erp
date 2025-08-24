#!/usr/bin/env node
/*
Usage:
  # PowerShell
  $env:RENDER_API_KEY="<token>"; node scripts/watch-render-deploy.js srv-xxxx --interval 8

  # Bash
  export RENDER_API_KEY=<token>
  node scripts/watch-render-deploy.js srv-xxxx --interval 8
*/

const API = "https://api.render.com/v1";
const apiKey = process.env.RENDER_API_KEY;

if (!apiKey) {
  console.error("Missing RENDER_API_KEY env var. Create one in Render > Team/Account Settings > API Keys.");
  process.exit(1);
}

const args = process.argv.slice(2);
const serviceId = args.find((a) => !a.startsWith("--")) || process.env.SERVICE_ID;
const intervalOpt = args.find((a) => a.startsWith("--interval"));
const intervalSec = intervalOpt ? Number(intervalOpt.split("=")[1] || 8) : 8;

if (!serviceId) {
  console.error("Usage: node scripts/watch-render-deploy.js <service-id> [--interval=8]");
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

async function getLatestDeployId() {
  // List recent deploys. API returns an array (most recent first).
  const list = await api(`/services/${serviceId}/deploys`);
  const items = Array.isArray(list) ? list : list?.data || [];
  return items[0]?.id || null;
}

async function getDeploy(deployId) {
  // Fetch details for a specific deploy
  return api(`/services/${serviceId}/deploys/${deployId}`);
}

function printSummary(d) {
  const key = (k) => (d && k in d ? d[k] : undefined);
  console.log(
    `\nDeploy ${key("id") || "unknown"} | status=${key("status")} | commit=${key("commitId") || key("commitHash") || "?"}`
  );
  console.log(
    `created=${key("createdAt") || key("created_at")} updated=${key("updatedAt") || key("updated_at")} finished=${key("finishedAt") || key("finished_at")}`
  );
  if (key("failed")) console.log("failed=", key("failed"));
  if (key("message")) console.log("message=", key("message"));
}

(async () => {
  console.log(`Watching service ${serviceId} every ${intervalSec}s...`);
  let currentId = await getLatestDeployId();
  let lastStatus = "";

  if (!currentId) {
    console.log("No deploys found for this service yet.");
  }

  setInterval(async () => {
    try {
      const latestId = await getLatestDeployId();
      if (latestId && latestId !== currentId) {
        currentId = latestId;
        lastStatus = "";
        console.log("\nNew deploy detected:");
      }
      if (!currentId) return;
      const d = await getDeploy(currentId);
      const status = d?.status || d?.state || "unknown";
      if (status !== lastStatus) {
        printSummary(d);
        lastStatus = status;
      }
    } catch (err) {
      console.error("Error:", err.message);
    }
  }, intervalSec * 1000);
})();

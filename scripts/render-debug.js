#!/usr/bin/env node
const API = "https://api.render.com/v1";
const apiKey = process.env.RENDER_API_KEY;
if (!apiKey) {
  console.error("Missing RENDER_API_KEY env var.");
  process.exit(1);
}

const args = process.argv.slice(2);
const serviceId = args[0];

async function api(path) {
  const res = await fetch(API + path, {
    headers: { accept: "application/json", authorization: `Bearer ${apiKey}` },
  });
  const text = await res.text();
  try { return { status: res.status, json: JSON.parse(text) }; } catch { return { status: res.status, text }; }
}

(async () => {
  if (!serviceId) {
    const all = await api('/services');
    console.log('Services status:', all.status);
    console.log(all.json || all.text);
    return;
  }
  const svc = await api(`/services/${serviceId}`);
  console.log('Service detail status:', svc.status);
  console.log(svc.json || svc.text);

  const deps = await api(`/services/${serviceId}/deploys`);
  console.log('\nDeploys list status:', deps.status);
  console.log(deps.json || deps.text);
})();

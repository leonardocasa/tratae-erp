/**
=========================================================
* Material Dashboard 2 React - v2.1.0
=========================================================

* Product Page: https://www.creative-tim.com/product/material-dashboard-react
* Copyright 2022 Creative Tim (https://www.creative-tim.com)

Coded by www.creative-tim.com

 =========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
*/

/**
  The hexToRgb() function converts a color into an "r, g, b" string.
  Supports:
  - 6-digit hex (#RRGGBB)
  - 3-digit hex (#RGB)
  - rgb(...) strings (returns the first three components)
*/

function hexToRgb(color) {
  if (typeof color !== "string" || color.length === 0) return "0, 0, 0";

  // If already rgb/rgba, extract the first three numeric components
  const rgbMatch = color.trim().match(/^rgba?\(([^)]+)\)/i);
  if (rgbMatch) {
    const parts = rgbMatch[1]
      .split(",")
      .map((p) => p.trim())
      .map((p) => p.replace(/%/g, ""));
    const r = parseFloat(parts[0]) || 0;
    const g = parseFloat(parts[1]) || 0;
    const b = parseFloat(parts[2]) || 0;
    return `${r}, ${g}, ${b}`;
  }

  // Normalize hex
  let hex = color.trim();
  if (hex.startsWith("#")) hex = hex.slice(1);

  if (hex.length === 3) {
    const r = parseInt(hex[0] + hex[0], 16);
    const g = parseInt(hex[1] + hex[1], 16);
    const b = parseInt(hex[2] + hex[2], 16);
    if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) {
      return `${r}, ${g}, ${b}`;
    }
  }

  if (hex.length === 6) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) {
      return `${r}, ${g}, ${b}`;
    }
  }

  // Fallback
  return "0, 0, 0";
}

export default hexToRgb;

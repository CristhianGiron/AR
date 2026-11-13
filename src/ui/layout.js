import * as THREE from "three";
import { $ } from "./dom.js";
import { clamp } from "../core/math.js";

export function createLayout(app) {
  const state = app.state;
  const menuBounds = new THREE.Box3();

  const projected = new THREE.Vector3();
  const badge = document.querySelector('.mode-badge');

  function positionBadge() {
    // Measure the original slot even while hidden, so clearing an overlap cannot flicker.
    const rect = badge.getBoundingClientRect();
    let obstructed = false;
    if (!state.hudHidden && rect.width && rect.height) {
      const canvas = app.engine.canvas.getBoundingClientRect();
      for (const item of state.entries) {
        if (!item.anchor.visible || !item.tag.visible) continue;
        item.tag.updateWorldMatrix(true, false);
        let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity, visible = false;
        // Project the billboard itself, not its larger world-aligned bounding box.
        for (let i = 0; i < 4; i++) {
          projected.set((i & 1) - .5, (i >> 1) - .5, 0).applyMatrix4(item.tag.matrixWorld).project(app.engine.camera);
          visible ||= projected.z >= -1 && projected.z <= 1;
          const x = canvas.left + (projected.x + 1) * canvas.width / 2;
          const y = canvas.top + (1 - projected.y) * canvas.height / 2;
          left = Math.min(left, x); right = Math.max(right, x);
          top = Math.min(top, y); bottom = Math.max(bottom, y);
        }
        if (visible && left < rect.right + 6 && right > rect.left - 6 && top < rect.bottom + 6 && bottom > rect.top - 6) { obstructed = true; break; }
      }
    }
    badge.toggleAttribute('data-label-overlap', obstructed);
  }

  function screenBounds(object) {
    menuBounds.setFromObject(object);
    const bounds = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity, visible: false };
    for (let i = 0; i < 8; i++) {
      projected.set(i & 1 ? menuBounds.max.x : menuBounds.min.x,
        i & 2 ? menuBounds.max.y : menuBounds.min.y,
        i & 4 ? menuBounds.max.z : menuBounds.min.z).project(app.engine.camera);
      if (projected.z >= -1 && projected.z <= 1) bounds.visible = true;
      const x = (projected.x + 1) * app.engine.canvas.clientWidth / 2;
      const y = (1 - projected.y) * app.engine.canvas.clientHeight / 2;
      bounds.left = Math.min(bounds.left, x); bounds.right = Math.max(bounds.right, x);
      bounds.top = Math.min(bounds.top, y); bounds.bottom = Math.max(bounds.bottom, y);
    }
    return bounds;
  }

  function positionMenu() {
    if (!state.chosen || state.collectionMode || app.hud?.isBlocking()) { $("tools").hidden = true; return; }
    const tools = $("tools");
    const { left, right, top, bottom, visible } = screenBounds(state.chosen.mesh);
    tools.hidden = !visible || right < 0 || left > innerWidth || bottom < 0 || top > innerHeight;
    if (tools.hidden) return;
    const w = tools.offsetWidth, gap = 16;
    const minY = $("header").getBoundingClientRect().bottom + 12;
    const guide = $("scene-guide").getBoundingClientRect();
    const bottomEdge = Math.min($("bar").getBoundingClientRect().top, guide.height && getComputedStyle($("scene-guide")).visibility !== "hidden" ? guide.top : innerHeight);
    tools.style.maxHeight = Math.max(90, bottomEdge - minY - 12) + "px";
    const h = tools.offsetHeight;
    const maxY = Math.max(minY, bottomEdge - h - 12);
    if (innerWidth >= 1100 && innerHeight >= 650) {
      const rail = state.navigationExpanded ? $("workspace-panel").getBoundingClientRect().right + 16 : 24;
      const edge = app.hud.isDocked() ? app.hud.dockedPanel().getBoundingClientRect().left - 16 : innerWidth - 100;
      tools.style.left = clamp((rail + edge - w) / 2, rail, Math.max(rail, edge - w)) + "px";
      tools.style.top = (innerHeight - 118) + "px";
      return;
    }
    const obstacles = state.entries.filter((item) => item.anchor.visible)
      .flatMap((item) => [screenBounds(item.mesh), screenBounds(item.tag)])
      .map((rect) => ({ rect, weight: 1 }));
    for (const id of ["header", "workspace-panel", "bar", "scene-guide", "undo-remove"]) {
      const element = $(id);
      if (getComputedStyle(element).display !== "none" && getComputedStyle(element).visibility !== "hidden") obstacles.push({ rect: element.getBoundingClientRect(), weight: 50 });
    }
    const overlap = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
      Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    const candidates = [
      { x: right + gap, y: (top + bottom - h) / 2 },
      { x: left - gap - w, y: (top + bottom - h) / 2 },
      { x: (left + right - w) / 2, y: bottom + gap },
      { x: (left + right - w) / 2, y: top - h - gap },
    ].map((point, index) => {
      const x = clamp(point.x, 12, Math.max(12, innerWidth - w - 12));
      const y = clamp(point.y, minY, maxY);
      const bounds = { left: x - 4, right: x + w + 4, top: y - 4, bottom: y + h + 4 };
      return { x, y, score: obstacles.reduce((sum, obstacle) => sum + overlap(bounds, obstacle.rect) * obstacle.weight, 0) + index };
    });
    candidates.sort((a, b) => a.score - b.score);
    tools.style.left = candidates[0].x + "px";
    tools.style.top = candidates[0].y + "px";
  }

  return { positionMenu, positionBadge };
}

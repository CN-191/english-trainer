(function (TT) {
  'use strict';

  // mulberry32: kleiner, seedbarer Zufallsgenerator (für Tests reproduzierbar)
  function makeRng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function pick(arr, rng) {
    return arr[Math.floor((rng || Math.random)() * arr.length)];
  }

  function shuffle(arr, rng) {
    const a = arr.slice();
    const r = rng || Math.random;
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function weightedPick(items, weightFn, rng) {
    const weights = items.map(weightFn);
    const total = weights.reduce((s, w) => s + w, 0);
    let r = (rng || Math.random)() * total;
    for (let i = 0; i < items.length; i++) {
      r -= weights[i];
      if (r < 0 && weights[i] > 0) return items[i];
    }
    for (let i = items.length - 1; i >= 0; i--) if (weights[i] > 0) return items[i];
    return items[items.length - 1];
  }

  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ESC[c]);
  }

  function capitalize(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  }

  TT.util = { makeRng, pick, shuffle, weightedPick, escapeHtml, capitalize };
})(globalThis.TT = globalThis.TT || {});

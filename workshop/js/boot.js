/* boot.js — runs synchronously in <head>, before first paint.
   Decides between the 3D workshop and the text version so neither flashes.
   No Three.js here; nothing is stored or sent. */
(function () {
  'use strict';
  var html = document.documentElement;
  var params = new URLSearchParams(window.location.search);
  var view = params.get('view');
  var reason = '';

  html.classList.add('ws-js');

  /* ?debug=1 only: keep CSP reports in memory so they can be inspected locally. */
  if (params.get('debug') === '1') {
    window.__csp = [];
    document.addEventListener('securitypolicyviolation', function (e) {
      window.__csp.push({ directive: e.violatedDirective, sample: e.sample, source: e.sourceFile, line: e.lineNumber, column: e.columnNumber });
    });
  }

  if (view === 'text') {
    reason = 'chosen';
  } else if (params.get('webgl') === '0') {
    reason = 'forced';
  } else {
    try {
      var probe = document.createElement('canvas');
      var gl = probe.getContext('webgl2');
      if (!gl) {
        reason = 'no-webgl2';
      } else {
        var lose = gl.getExtension('WEBGL_lose_context');
        if (lose) lose.loseContext();
      }
    } catch (err) {
      reason = 'no-webgl2';
    }
  }

  if (reason) {
    html.classList.add('ws-text');
    html.setAttribute('data-ws-reason', reason);
  } else {
    html.classList.add('ws-3d');
  }

  /* Motion preference: system setting, optionally overridden by ?motion= (allowlisted). */
  var motion = params.get('motion');
  var reduce = motion === 'reduce' ||
    (motion !== 'full' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  if (reduce) html.classList.add('ws-reduced');
})();

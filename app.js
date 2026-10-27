/* Dr. Kaldawi patient guide: loads the content files, renders the library pages,
   the tracking scores, and the plan builder. No server and no patient data is stored. */
(function () {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const FRAMED = (() => { try { return window.top !== window.self; } catch (e) { return true; } })();
  const BASE = location.href.split(/[?#]/)[0];
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  };
  function toast(msg) {
    const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; t.setAttribute('role', 'status');
    document.body.appendChild(t); setTimeout(() => t.remove(), 2200);
  }
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); toast('Copied'); }
    catch (e) { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); toast('Copied'); } catch (_) { toast('Select the text to copy it'); } ta.remove(); }
  }

  /* ------------------------------------------------------------------ markdown */
  function inline(s) {
    const keep = [];
    const hold = (html) => { keep.push(html); return '\u0000' + (keep.length - 1) + '\u0000'; };
    s = s.replace(/<<F:(.*?)>>/g, (m, v) => hold('<span class="filled">' + esc(v) + '</span>'));
    s = s.replace(/\\([\\`*_{}\[\]()#+\-.!|>~])/g, (m, c) => hold(c === '_' ? '\u0001' : esc(c)));
    s = s.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, (m, t, u) => hold('<a href="' + esc(u) + '" target="_blank" rel="noopener">' + inline(t) + '</a>'));
    s = s.replace(/(^|[\s(*])(https?:\/\/[^\s*)<]+[^\s*)<.,;:])/g, (m, p, u) => p + hold('<a href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(u.replace(/^https?:\/\//, '')) + '</a>'));
    s = esc(s);
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[^*\w])\*(?!\s)([^*]+?)\*(?!\w)/g, '$1<em>$2</em>');
    s = s.replace(/ {2,}$/gm, '<br>');
    s = s.replace(/\u0000(\d+)\u0000/g, (m, i) => keep[+i]);
    s = s.replace(/\u0001{3,}|_{4,}/g, '<span class="blank" aria-label="blank"></span>').replace(/\u0001/g, '_');
    return s;
  }
  function md(src) {
    src = src.replace(/<!--[\s\S]*?-->/g, '');
    const lines = src.split('\n');
    let out = '', i = 0;
    const isList = (l) => /^\s*([-*+]|\d+\.)\s+/.test(l);
    while (i < lines.length) {
      const l = lines[i];
      if (!l.trim()) { i++; continue; }
      let m;
      if ((m = l.match(/^(#{1,6})\s+(.*)$/))) { const n = m[1].length; out += `<h${n}>${inline(m[2].replace(/\s*\{[^}]*\}\s*$/, ''))}</h${n}>`; i++; continue; }
      if (/^\s*\|/.test(l) && lines[i + 1] && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1])) {
        const cells = (r) => r.trim().replace(/^\|/, '').replace(/\|$/, '').split(/(?<!\\)\|/).map((c) => c.trim());
        const head = cells(l); i += 2; const rows = [];
        while (i < lines.length && /^\s*\|/.test(lines[i])) rows.push(cells(lines[i++]));
        out += '<div class="tbl"><table><thead><tr>' + head.map((c) => '<th>' + inline(c) + '</th>').join('') + '</tr></thead><tbody>' +
          rows.map((r) => '<tr>' + r.map((c) => '<td>' + inline(c) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
        continue;
      }
      if (isList(l)) {
        const items = [];
        while (i < lines.length) {
          const x = lines[i];
          if (isList(x)) { const mm = x.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/); items.push({ ind: mm[1].length, ord: /\d/.test(mm[2]), text: mm[3], extra: [] }); i++; continue; }
          if (!x.trim()) { let j = i; while (j < lines.length && !lines[j].trim()) j++; if (j < lines.length && (isList(lines[j]) || /^\s{2,}\S/.test(lines[j]))) { i = j; continue; } break; }
          if (/^\s{2,}\S/.test(x) && items.length) { items[items.length - 1].extra.push(x.trim()); i++; continue; }
          if (items.length && !/^\s*(#|\|)/.test(x)) { items[items.length - 1].text += ' ' + x.trim(); i++; continue; }
          break;
        }
        out += renderList(items);
        continue;
      }
      if (/^\s*>/.test(l)) { const q = []; while (i < lines.length && /^\s*>/.test(lines[i])) q.push(lines[i++].replace(/^\s*>\s?/, '')); out += '<blockquote>' + md(q.join('\n')) + '</blockquote>'; continue; }
      const p = [];
      while (i < lines.length && lines[i].trim() && !/^(#{1,6})\s/.test(lines[i]) && !isList(lines[i]) && !/^\s*\|/.test(lines[i])) p.push(lines[i++]);
      out += '<p>' + inline(p.join('\n')) + '</p>';
    }
    return out;
  }
  function renderList(items) {
    let html = '', stack = [];
    const open = (it) => { stack.push(it); html += it.ord ? '<ol>' : '<ul>'; };
    const close = () => { const it = stack.pop(); html += '</li>' + (it.ord ? '</ol>' : '</ul>'); };
    items.forEach((it, k) => {
      if (!stack.length) open(it);
      else if (it.ind > stack[stack.length - 1].ind) open(it);
      else {
        while (stack.length > 1 && it.ind < stack[stack.length - 1].ind) close();
        html += '</li>';
        if (stack[stack.length - 1].ord !== it.ord) { const top = stack.pop(); html += top.ord ? '</ol>' : '</ul>'; open(it); }
      }
      let t = it.text, cls = '';
      if (/^\[[ xX]\]\s/.test(t)) { cls = ' class="task"'; t = t.slice(4); }
      html += `<li${cls}><span>${inline(t)}${it.extra.map((e) => '<br>' + inline(e)).join('')}</span>`;
    });
    while (stack.length) close();
    return html.replace(/<\/li><\/li>/g, '</li>');
  }

  /* ------------------------------------------------------------------ content */
  const C = { meds: {}, medById: {}, life: {}, res: [], rules: '', c1: '', before: '' };
  const parseAttrs = (s) => {
    const a = {}; if (!s) return a;
    s.trim().split(/\s+/).forEach((t) => { if (t[0] === '#') a.id = t.slice(1); else if (t.includes('=')) { const [k, v] = t.split('='); a[k] = v.split(','); } else a[t] = true; });
    return a;
  };
  function parseMedFile(text, file) {
    const lines = text.split('\n'); let title = ''; const blocks = []; let cur = { kind: 'intro', title: '', lines: [] };
    const push = () => { if (cur.title || cur.lines.some((l) => l.trim())) blocks.push(cur); };
    for (const l of lines) {
      const m = l.match(/^(#{1,3})\s+(.*?)\s*(?:\{([^}]*)\})?\s*$/);
      if (m && m[1] === '#') { title = m[2]; continue; }
      if (m && m[1] === '##') { push(); const at = parseAttrs(m[3]); cur = { kind: 'med', id: at.id, title: m[2], lines: [], file }; continue; }
      if (m && m[1] === '###') { push(); const at = parseAttrs(m[3]); cur = { kind: at.applies ? 'shared' : 'intro', applies: at.applies || [], title: m[2], lines: [], file }; continue; }
      cur.lines.push(l);
    }
    push();
    blocks.forEach((b) => { b.parts = splitParts(b.lines); });
    return { file, title, blocks };
  }
  function splitParts(lines) {
    const parts = []; let cur = { type: 'md', lines: [] }; let ci = 0;
    for (const l of lines) {
      const m = l.match(/^####\s+(.*?)\s*(?:\{([^}]*)\})?\s*$/);
      if (m) {
        parts.push(cur); const at = parseAttrs(m[2]);
        if (at.choice) cur = { type: 'choice', idx: ci++, title: m[1], when: at.when || [], def: !!at.default, lines: [] };
        else cur = { type: 'md', lines: [l] };
        continue;
      }
      cur.lines.push(l);
    }
    parts.push(cur);
    return parts.filter((p) => p.type === 'choice' || p.lines.some((l) => l.trim()));
  }
  async function loadContent() {
    const get = (p) => fetch(p).then((r) => { if (!r.ok) throw new Error(p); return r.text(); });
    const files = window.PLAN_CONFIG.medFiles;
    const [meds, rules, c1, before, gen, seeds, pots, res] = await Promise.all([
      Promise.all(files.map((f) => get(`content/medications/${f}.md`))),
      get('content/medications/a-rules.md'), get('content/medications/c1.md'), get('content/medications/before-you-message.md'),
      get('content/lifestyle/general.md'), get('content/lifestyle/seeds.md'), get('content/lifestyle/oh-pots.md'), get('content/resources.md'),
    ]);
    const hos = await Promise.all(window.PLAN_CONFIG.handouts.map((x) => get(`content/handouts/${x.file}.md`)));
    C.handouts = {}; window.PLAN_CONFIG.handouts.forEach((x, i) => { C.handouts[x.id] = hos[i]; });
    files.forEach((f, i) => { const s = parseMedFile(meds[i], f); C.meds[f] = s; s.blocks.filter((b) => b.kind === 'med').forEach((b) => { C.medById[b.id] = b; }); });
    C.rules = rules; C.c1 = c1; C.before = before; C.life = { general: gen, seeds, pots };
    const cats = res.split(/\n(?=## )/); C.resTitle = cats.shift().replace(/^#\s+/, '').trim();
    C.res = cats.map((c) => { const m = c.match(/^##\s+(.*?)\s*\{#([^}]+)\}\s*\n([\s\S]*)$/); return m ? { title: m[1], id: m[2], body: m[3] } : null; }).filter(Boolean);
  }
  const stripH1 = (t) => t.replace(/^#\s+.*\n/, '');
  const h1Of = (t) => (t.match(/^#\s+(.*)$/m) || [])[1] || '';

  function blockHTML(b, opt = {}) {
    const lvl = b.kind === 'med' ? 'h2' : 'h3';
    let h = `<section class="${b.kind === 'med' ? 'medcard' : 'stack'}" id="${opt.anchor ? 'm-' + b.id : ''}">`;
    if (b.title) h += `<${lvl}>${inline(b.title)}</${lvl}>`;
    for (const p of b.parts) {
      let lines = p.lines.join('\n');
      if (opt.dose && p === b.parts.find((q) => /My (dose|doses and times|medicine and dose|medicine and schedule|medicine|product and dose)\b[^:]*:\s*(\\_)+/.test(q.lines.join('\n')))) {
        lines = lines.replace(/(My (?:dose|doses and times|medicine and dose|medicine and schedule|medicine|product and dose)\b[^:]*:\s*)(\\_)+/, (m, a) => a + '<<F:' + opt.dose.replace(/>>/g, '') + '>>');
      }
      if (p.type === 'choice') {
        if (opt.choices && !opt.choices.includes(p.idx)) continue;
        h += `<div class="choice"><h4>${opt.choices ? '' : '<span class="muted">Option: </span>'}${inline(p.title)}</h4>${md(lines)}</div>`;
      } else h += md(lines);
    }
    return h + '</section>';
  }

  /* ------------------------------------------------------------------ router */
  const views = ['home', 'plan', 'myplan', 'scores', 'score', 'medicines', 'lifestyle', 'resources', 'handouts'];
  function route() {
    const h = location.hash.slice(1);
    let v = 'home', arg = '';
    if (PLAN_FROM_URL && (!h || h === 'myplan')) v = 'myplan';
    else if (h.startsWith('score-')) { v = 'score'; arg = h.slice(6); }
    else if (h.startsWith('meds-')) { v = 'medicines'; arg = h.slice(5); }
    else if (h.startsWith('lifestyle-')) { v = 'lifestyle'; arg = h.slice(10); }
    else if (h.startsWith('handouts-')) { v = 'handouts'; arg = h.slice(9); }
    else if (views.includes(h)) v = h;
    views.forEach((x) => { const el = $('#view-' + x); if (el) el.hidden = x !== v; });
    $$('.nav a').forEach((a) => a.setAttribute('aria-current', a.dataset.v === (v === 'score' ? 'scores' : v) ? 'page' : 'false'));
    ({ home: () => {}, plan: renderBuilder, myplan: renderMyPlan, scores: renderScoreList, score: () => renderScore(arg), medicines: () => renderLibrary(arg), lifestyle: () => renderLifestyle(arg), resources: renderResources, handouts: () => renderHandouts(arg) }[v])();
    if (!renderedOnce || v !== 'plan') window.scrollTo(0, 0);
    renderedOnce = true;
  }
  let renderedOnce = false;

  /* ------------------------------------------------------------------ library: medicines */
  const LIB = () => [
    { grp: 'Start here', items: [['rules', 'Rules for every medicine']] },
    { grp: 'Medicines for symptoms', items: window.PLAN_CONFIG.medFiles.filter((f) => f !== 'c2').map((f) => [f, C.meds[f].title.replace(/^Section \d+:\s*/, '')]) },
    { grp: 'Immune medicines', items: [['c1', 'For everyone on immune medicines'], ['c2', 'Your immune medicine']] },
    { grp: 'Questions', items: [['before', 'Before you message us']] },
  ];
  function renderLibrary(arg) {
    const id = arg || 'rules';
    $('#lib-toc').innerHTML = LIB().map((g) => `<div class="grp">${g.grp}</div>` + g.items.map(([k, t], n) => `<a href="#meds-${k}" aria-current="${k === id}">${/^\d/.test(k) ? '<span class="mono muted">' + (+k) + '</span> ' : ''}${esc(t)}</a>`).join('')).join('');
    let html;
    if (id === 'rules') html = md(C.rules);
    else if (id === 'c1') html = md(C.c1);
    else if (id === 'before') html = md(C.before);
    else if (C.meds[id]) { const s = C.meds[id]; html = `<h1>${inline(s.title)}</h1>` + s.blocks.map((b) => blockHTML(b, { anchor: true })).join(''); }
    else html = '<p>Section not found.</p>';
    $('#lib-body').innerHTML = html;
  }

  /* ------------------------------------------------------------------ lifestyle */
  function renderLifestyle(arg) {
    const tabs = [['', 'Healthy habits'], ['seeds', 'SEEDS for headache'], ['pots', 'Orthostatic hypotension and POTS']];
    const key = arg === 'seeds' ? 'seeds' : arg === 'pots' ? 'pots' : 'general';
    $('#life-tabs').innerHTML = tabs.map(([k, t]) => `<button role="tab" aria-selected="${(k || 'general') === key}" data-k="${k}">${t}</button>`).join('');
    $$('#life-tabs button').forEach((b) => b.onclick = () => { location.hash = b.dataset.k ? 'lifestyle-' + b.dataset.k : 'lifestyle'; });
    let extra = '';
    if (key === 'seeds') extra = `<h2>Your headache plan</h2><p>Your doctor fills these in with you.</p><ul><li>For diagnostics: <span class="blank"></span></li><li>Preventive medicines: <span class="blank"></span></li><li><strong>Step 1</strong> when a severe headache starts: <span class="blank"></span> + a bottle of water</li><li><strong>Step 2</strong> if you still have a headache after 2 hours: <span class="blank"></span> + a bottle of water</li></ul>`;
    $('#life-body').innerHTML = md(C.life[key]) + extra;
  }

  /* ------------------------------------------------------------------ handouts */
  function renderHandouts(arg) {
    const list = CFG().handouts; const cur = list.find((x) => x.id === arg) || list[0];
    $('#ho-tabs').innerHTML = list.map((x, i) => `<button role="tab" aria-selected="${x === cur}" data-k="${i ? x.id : ''}">${esc(x.title)}</button>`).join('');
    $$('#ho-tabs button').forEach((b) => b.onclick = () => { location.hash = b.dataset.k ? 'handouts-' + b.dataset.k : 'handouts'; });
    $('#ho-body').innerHTML = md(C.handouts[cur.id]) + (FRAMED ? '' : '<p class="no-print"><button class="btn ghost small" type="button" id="ho-print">Print</button></p>');
    if ($('#ho-print')) $('#ho-print').onclick = () => window.print();
  }

  /* ------------------------------------------------------------------ resources */
  function renderResources() {
    $('#res-jump').innerHTML = C.res.map((r) => `<a class="chip" href="#resources" data-to="res-${r.id}">${esc(r.title)}</a>`).join('');
    $$('#res-jump a').forEach((a) => a.onclick = (e) => { e.preventDefault(); $('#' + a.dataset.to).scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    $('#res-body').innerHTML = C.res.map((r) => `<section class="stack" id="res-${r.id}"><h2>${inline(r.title)}</h2>${md(r.body)}</section>`).join('');
  }

  /* ------------------------------------------------------------------ scores */
  const S = () => window.SCORES;
  const isAbbr = (t) => /^[A-Z0-9&-]+$/.test(t);
  function renderScoreList() {
    const card = (s) => `<a class="card scorecard" href="#score-${s.id}"><div class="row">${isAbbr(s.short) ? `<span class="tag">${esc(s.short)}</span>` : ''}<span class="who ${s.who === 'clinician' ? 'clinic' : ''}">${s.who === 'clinician' ? 'In clinic' : 'At home'}</span></div><h3>${esc(s.name)}</h3>${s.linkOnly ? '' : `<div class="range">Score range ${rangeOf(s)}</div>`}</a>`;
    $('#scores-home').innerHTML = S().filter((s) => s.who === 'patient').map(card).join('');
    $('#scores-clinic').innerHTML = S().filter((s) => s.who === 'clinician').map(card).join('');
  }
  function rangeOf(s) { const r = s.compute ? s.compute({}, s) : {}; return `${r.min ?? 0}–${r.max}`; }
  const answers = {};
  function renderScore(id) {
    const s = S().find((x) => x.id === id); const el = $('#score-body');
    if (!s) { el.innerHTML = '<p>Score not found. <a href="#scores">See all tracking scores</a>.</p>'; return; }
    const a = answers[id] || (answers[id] = {});
    let h = `<a href="#scores" class="no-print">← All tracking scores</a><div class="pagehead" style="margin-top:1rem"><div class="row">${isAbbr(s.short) ? `<span class="tag mono" style="color:var(--accent);font-weight:700">${esc(s.short)}</span>` : ''}<span class="who ${s.who === 'clinician' ? 'clinic' : ''}">${s.who === 'clinician' ? 'Completed in clinic' : 'Fill out at home'}</span></div><h1>${esc(s.name)}</h1>${s.period ? `<p><strong>${esc(s.period)}</strong></p>` : ''}<p>${esc(s.intro)}</p></div>`;
    if (s.linkOnly) { el.innerHTML = h + (s.link ? `<p><a class="btn ghost" href="${esc(s.link)}" target="_blank" rel="noopener">Learn more</a></p>` : '') + (s.source ? `<p class="muted">${esc(s.source)}</p>` : ''); return; }
    h += '<form class="scoreform" id="sf" onsubmit="return false">';
    let n = 0;
    s.sections.forEach((sec, si) => {
      h += `<fieldset class="stack" style="border:0;padding:0;margin:0">${sec.title ? `<legend><h2 style="font-size:1.25rem">${esc(sec.title)}</h2></legend>` : ''}`;
      const checks = sec.items.every((it) => it.type === 'check');
      if (checks) {
        h += `<div class="checks">` + sec.items.map((it) => `<label><input type="checkbox" id="${id}-${it.id}" data-q="${it.id}" ${a[it.id] ? 'checked' : ''}> ${esc(it.text)}</label>`).join('') + '</div>';
      } else sec.items.forEach((it) => {
        if (it.type === 'check') { h += `<div class="checks"><label><input type="checkbox" id="${id}-${it.id}" data-q="${it.id}" ${a[it.id] ? 'checked' : ''}> ${esc(it.text)}</label></div>`; return; }
        if (it.type === 'range') { h += `<div class="q"><div class="qt">${esc(it.text)}</div><div class="row"><input type="range" min="${it.min}" max="${it.max}" step="1" id="${id}-${it.id}" data-q="${it.id}" value="${a[it.id] ?? 0}" style="flex:1"><output class="mono" id="${id}-${it.id}-out">${a[it.id] ?? '–'}</output></div></div>`; return; }
        if (!it.unscored) n++;
        const sel = a['_' + it.id];
        h += `<div class="q" role="radiogroup" aria-label="${esc(it.text)}"><div class="qt">${it.unscored ? '' : `<span class="qn">${n}.</span>`}${esc(it.text)}</div><div class="opts ${s.scale ? 'scale' : ''}">` +
          it.options.map((o, k) => `<label><input type="radio" name="${id}-${it.id}" id="${id}-${it.id}-${k}" data-q="${it.id}" data-k="${k}" ${sel === k ? 'checked' : ''}><span>${esc(o.l)}${s.scale || it.options.length > 5 || s.id === 'hdi' || s.id === 'stopbang' ? '' : ` <span class="mono muted">(${o.v})</span>`}</span></label>`).join('') + '</div>' +
          (it.help === 'bmi' ? `<details class="no-print"><summary>Work out my BMI</summary><div class="grid2" style="margin-top:.5rem"><label class="field">Height (inches)<input type="number" id="bmi-h" inputmode="decimal"></label><label class="field">Weight (pounds)<input type="number" id="bmi-w" inputmode="decimal"></label></div><p id="bmi-out" class="mono"></p></details>` : '') + '</div>';
      });
      h += '</fieldset>';
    });
    h += `<div class="result" id="res" aria-live="polite"></div></form>
      <section class="stack history no-print" style="margin-top:2rem;max-width:52rem"><h2 style="font-size:1.25rem">My saved scores</h2><p class="muted">Saved only in this browser on this device. Bring them to your visit.</p><div id="hist"></div></section>
      ${s.source ? `<p class="muted" style="margin-top:1.5rem;font-size:.85rem;max-width:52rem">${/^Adapted/.test(s.source) ? '' : 'Source: '}${esc(s.source)}</p>` : ''}`;
    el.innerHTML = h;
    const upd = () => {
      const vals = {};
      Object.keys(a).forEach((k) => { if (k[0] !== '_') vals[k] = a[k]; });
      const r = s.compute(vals, s);
      $('#res').innerHTML = `<div class="row" style="justify-content:space-between"><div><div class="eyebrow">${esc(r.label || 'Total score')}</div><div class="big">${r.total}<small> / ${r.max}</small></div></div>${r.badge ? `<span class="badge">${esc(r.badge)}</span>` : ''}</div>
        ${r.lines ? `<div class="kv">${r.lines.map(([k, v]) => `<span>${esc(k)}: <b>${esc(v)}</b></span>`).join('')}</div>` : ''}
        <p style="font-size:.95rem">${esc(r.interp)}${r.done ? '' : ' <strong>Some questions are not answered yet.</strong>'}</p>
        <div class="row no-print"><button class="btn small" type="button" id="sv">Save to my history</button><button class="btn small ghost" type="button" id="cp">Copy result</button>${FRAMED ? '' : '<button class="btn small ghost" type="button" id="pr">Print</button>'}<button class="btn small ghost" type="button" id="clr">Clear answers</button></div>`;
      $('#sv').onclick = () => { const hst = store.get('hist-' + id, []); hst.unshift({ d: new Date().toISOString().slice(0, 10), t: r.total }); if (store.set('hist-' + id, hst.slice(0, 50))) { toast('Saved'); hist(); } else toast('This browser blocks saving. Copy the result instead.'); };
      $('#cp').onclick = () => copyText(`${s.short} ${new Date().toLocaleDateString()}: ${r.total} / ${r.max}${r.badge ? ' (' + r.badge + ')' : ''}${r.lines ? '; ' + r.lines.map(([k, v]) => k + ' ' + v).join('; ') : ''}`);
      $('#clr').onclick = () => { answers[id] = {}; renderScore(id); };
      if ($('#pr')) $('#pr').onclick = () => window.print();
    };
    const hist = () => { const hst = store.get('hist-' + id, []); $('#hist').innerHTML = hst.length ? '<table>' + hst.map((x) => `<tr><td>${esc(x.d)}</td><td class="mono"><b>${esc(x.t)}</b></td></tr>`).join('') + '</table>' : '<p class="muted">No saved scores yet.</p>'; };
    $('#sf').addEventListener('input', (e) => {
      const t = e.target, q = t.dataset.q; if (!q) return;
      const it = s.sections.flatMap((x) => x.items).find((x) => x.id === q);
      if (t.type === 'radio') { a['_' + q] = +t.dataset.k; a[q] = it.options[+t.dataset.k].v; }
      else if (t.type === 'checkbox') { if (t.checked) a[q] = 1; else delete a[q]; }
      else if (t.type === 'range') { a[q] = +t.value; $('#' + t.id + '-out').textContent = t.value; }
      else if (t.id === 'bmi-h' || t.id === 'bmi-w') { const hh = +$('#bmi-h').value, ww = +$('#bmi-w').value; if (hh && ww) { const b = 703 * ww / (hh * hh); $('#bmi-out').textContent = 'BMI ' + b.toFixed(1) + (b > 35 ? ' (more than 35)' : ' (35 or less)'); } return; }
      upd();
    });
    upd(); hist();
  }

  /* ------------------------------------------------------------------ plan state */
  const CFG = () => window.PLAN_CONFIG;
  const condById = (id) => CFG().conditions.find((c) => c.id === id);
  let P = blankPlan();
  function blankPlan() { return { c: [], m: {}, life: 'auto', oh: false, sc: [], h: { dx: '', pv: '', s1: '', s2: '' }, note: '', about: true, rules: true, before: true, date: new Date().toISOString().slice(0, 10), ho: [], ear: '' }; }
  const b64e = (s) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const b64d = (s) => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));
  function encodePlan(p) {
    const o = { c: p.c, m: p.m, l: p.life === 'auto' ? undefined : p.life, o: p.oh ? 1 : undefined, s: p.sc, n: p.note || undefined, d: p.date,
      h: (p.h.dx || p.h.pv || p.h.s1 || p.h.s2) ? p.h : undefined, x: (p.about ? 0 : 1) + (p.rules ? 0 : 2) + (p.before ? 0 : 4) || undefined, ho: p.ho.length ? p.ho : undefined, e: p.ear || undefined };
    return b64e(JSON.stringify(o));
  }
  function decodePlan(s) {
    const o = JSON.parse(b64d(s)); const p = blankPlan();
    Object.assign(p, { c: o.c || [], m: o.m || {}, life: o.l || 'auto', oh: !!o.o, sc: o.s || [], note: o.n || '', date: o.d || p.date, h: o.h || p.h, ho: o.ho || [], ear: o.e || '' });
    const x = o.x || 0; p.about = !(x & 1); p.rules = !(x & 2); p.before = !(x & 4);
    return p;
  }
  const planURL = () => BASE + '?p=' + encodePlan(P);
  const useSeeds = (p) => p.life === 'seeds' || (p.life === 'auto' && p.c.some((c) => condById(c)?.seeds));
  function defaultChoices(medId, conds) {
    const b = C.medById[medId]; if (!b) return null;
    const ch = b.parts.filter((x) => x.type === 'choice'); if (!ch.length) return null;
    const hit = ch.filter((x) => x.when.some((w) => conds.includes(w))).map((x) => x.idx);
    if (hit.length) return hit;
    const def = ch.filter((x) => x.def).map((x) => x.idx);
    return def.length ? def : null;
  }

  /* ------------------------------------------------------------------ plan document */
  function fmtDate(d) { return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  function parseDate(s) { const [y, m, d] = (s || '').split('-').map(Number); return y ? new Date(y, m - 1, d) : new Date(); }
  function titration(t) {
    const start = +t.s, step = +t.st, every = +t.e, max = +t.mx, unit = t.u || 'mg';
    if (!(start > 0) || !(every > 0)) return null;
    const rows = []; let dose = start; let day = parseDate(t.dt); let guard = 0;
    const top = max > start ? max : start;
    while (guard++ < 40) {
      const isLast = !(step > 0) || dose >= top;
      const end = new Date(day); end.setDate(end.getDate() + every - 1);
      rows.push({ from: new Date(day), to: isLast ? null : end, dose, last: isLast });
      if (isLast) break;
      day = new Date(end); day.setDate(day.getDate() + 1); dose = Math.min(+(dose + step).toFixed(3), top);
    }
    return { rows, unit, f: t.f || '', cond: t.c || '' };
  }
  function calHTML(name, cal) {
    return `<div class="stack"><h3>${inline(name)}</h3><div class="tbl" style="overflow-x:auto"><table class="cal"><thead><tr><th>Dates</th><th>Dose</th><th>Done</th></tr></thead><tbody>` +
      cal.rows.map((r, i) => `<tr><td>${fmtDate(r.from)}${r.to ? ' – ' + fmtDate(r.to) : ' and after'}</td><td><strong>${r.dose} ${esc(cal.unit)}</strong>${cal.f ? ' ' + esc(cal.f) : ''}${r.last && cal.rows.length > 1 ? ' (goal dose)' : ''}${i > 0 && cal.cond ? `<br><span class="muted">Go up only if ${esc(cal.cond)}</span>` : ''}</td><td class="box"></td></tr>`).join('') +
      `</tbody></table></div>${cal.cond ? `<p>Go up to the next step only if <strong>${esc(cal.cond)}</strong>. If side effects are hard to live with, stay at the dose you are on and call us.</p>` : ''}</div>`;
  }
  function qrHTML(url) {
    if (!window.qrcode) return '';
    try { const q = window.qrcode(0, 'L'); q.addData(url); q.make(); return `<div class="qr">${q.createSvgTag({ cellSize: 3, margin: 0, scalable: true })}<span>Scan to open this plan on your phone</span></div>`; }
    catch (e) { return '<div class="qr"><span>This plan is too long for a QR code. Use the link instead.</span></div>'; }
  }
  function planDoc(p, forPatient) {
    const conds = p.c.map(condById).filter(Boolean);
    const medIds = Object.keys(p.m).filter((id) => C.medById[id]);
    const scores = p.sc.map((id) => S().find((s) => s.id === id)).filter(Boolean);
    const url = BASE + '?p=' + encodePlan(p);
    let h = `<article class="doc" id="doc"><header class="doc-head"><div class="stack" style="gap:.4rem"><div class="eyebrow">Dr. Sami Kaldawi, DO · Neurology</div><h1>Your neurology plan</h1><div class="meta">Prepared ${fmtDate(parseDate(p.date))}</div></div>${qrHTML(url)}</header>`;
    if (!conds.length && !medIds.length) return h + '<div class="empty">Pick a diagnosis or a medicine to start the plan.</div></article>';
    // at a glance
    h += `<section class="doc-sec glance"><h2>Your plan at a glance</h2><dl>`;
    if (conds.length) h += `<dt>Diagnosis</dt><dd>${conds.map((c) => esc(c.label)).join('; ')}</dd>`;
    if (medIds.length) h += `<dt>Medicines</dt><dd><ul style="margin:0;padding-left:1.1rem">${medIds.map((id) => { const cfg = p.m[id] || {}; return `<li>${inline(C.medById[id].title)}${cfg.d ? ': <strong>' + esc(cfg.d) + '</strong>' : ''}</li>`; }).join('')}</ul></dd>`;
    if (scores.length) h += `<dt>Track</dt><dd>${scores.map((s) => esc(s.short)).join(', ')} (see "Tracking scores" below)</dd>`;
    if (p.note) h += `<dt>Notes</dt><dd>${esc(p.note).replace(/\n/g, '<br>')}</dd>`;
    h += '</dl></section>';
    // step-up calendars
    const cals = medIds.map((id) => [id, p.m[id]?.t && titration(p.m[id].t)]).filter(([, c]) => c);
    if (cals.length) h += `<section class="doc-sec"><h2>Your step-up calendar</h2>${cals.map(([id, c]) => calHTML(C.medById[id].title, c)).join('')}</section>`;
    // headache plan
    const seeds = useSeeds(p);
    if (seeds && (p.h.dx || p.h.pv || p.h.s1 || p.h.s2)) {
      const f = (v) => v ? `<strong>${esc(v)}</strong>` : '<span class="blank"></span>';
      h += `<section class="doc-sec prose"><h2>Your headache plan</h2><ul>${p.h.dx ? `<li>For diagnostics: ${f(p.h.dx)}</li>` : ''}<li>Preventive medicines: ${f(p.h.pv)}</li><li><strong>Step 1</strong>, as early as you can in a severe headache: ${f(p.h.s1)} + a bottle of water</li><li><strong>Step 2</strong>, if you still have a headache after 2 hours: ${f(p.h.s2)} + a bottle of water</li></ul><p>See "Important considerations for rescue medicines" in your SEEDS plan below.</p></section>`;
    }
    // lifestyle
    const life = seeds ? C.life.seeds : C.life.general;
    h += `<section class="doc-sec prose"><h2>${inline(h1Of(life))}</h2>${md(stripH1(life).replace(/^## /gm, '### '))}</section>`;
    if (p.oh) h += `<section class="doc-sec prose"><h2>${inline(h1Of(C.life.pots))}</h2>${md(stripH1(C.life.pots).replace(/^## /gm, '### '))}</section>`;
    // about the condition
    if (p.about) {
      const secs = [...new Set(conds.flatMap((c) => c.sections))].filter((f) => f !== 'c2');
      const abouts = secs.map((f) => C.meds[f]?.blocks.find((b) => b.kind === 'intro' && /^About/.test(b.title))).filter(Boolean);
      if (abouts.length) h += `<section class="doc-sec prose"><h2>About your condition</h2>${abouts.map((b) => md(b.parts.filter((x) => x.type === 'md').map((x) => x.lines.join('\n')).join('\n').replace(/^(Medicines|Medicines and treatments|Medicines and care) in this section:.*$/m, '').replace(/^Also see:.*$/m, ''))).join('')}</section>`;
    }
    // medicines
    if (medIds.length) {
      h += `<section class="doc-sec prose"><h2>Your medicines</h2><p>Read only the medicines listed here. Keep this with your medicines and bring it to every visit.</p>`;
      if (p.rules) h += `<details open><summary><strong>Rules for every medicine</strong> (pregnancy labels and interaction alerts)</summary>${md(stripH1(C.rules))}</details>`;
      const sel = new Set(medIds);
      for (const f of CFG().medFiles) {
        const sec = C.meds[f]; const hasMed = sec.blocks.some((b) => b.kind === 'med' && sel.has(b.id));
        const shared = sec.blocks.filter((b) => b.kind === 'shared' && b.applies.some((x) => sel.has(x)));
        if (!hasMed && !shared.length) continue;
        let inner = '';
        if (f === 'c2' && hasMed) inner += `<details open><summary><strong>For everyone on immune medicines</strong> (blood tests, vaccines, infections)</summary>${md(stripH1(C.c1))}</details>`;
        for (const b of sec.blocks) {
          if (b.kind === 'med' && sel.has(b.id)) { const cfg = p.m[b.id] || {}; inner += blockHTML(b, { dose: cfg.d, choices: cfg.ch || null }); }
          else if (b.kind === 'shared' && b.applies.some((x) => sel.has(x))) inner += blockHTML(b);
          else if (b.kind === 'intro' && hasMed && f !== 'c2' && !/^About/.test(b.title) && b.parts.length) inner += blockHTML(b);
        }
        h += `<div class="stack"><h2 style="font-size:1.2rem;color:var(--muted)">${inline(sec.title)}</h2>${inner}</div>`;
      }
      h += '</section>';
    }
    // handouts
    for (const hid of p.ho) {
      const t = C.handouts[hid]; if (!t) continue;
      let body = stripH1(t).replace(/^## /gm, '### ');
      if (hid === 'epley' && p.ear) body = `**Ear to treat: <<F:${p.ear === 'both' ? 'Both ears (one at a time)' : p.ear === 'right' ? 'Right ear' : 'Left ear'}>>**\n\n` + body;
      h += `<section class="doc-sec prose"><h2>${inline(h1Of(t))}</h2>${md(body)}</section>`;
    }
    // scores
    if (scores.length) h += `<section class="doc-sec prose"><h2>Tracking scores</h2><p>Fill these out before each visit so we can see how you are doing over time. Scan the QR code or go to the website and open "Tracking scores".</p><ul>${scores.map((s) => `<li><strong>${esc(s.short)}</strong>: ${esc(s.name)}${s.who === 'clinician' ? ' (we do this one with you in clinic)' : ''}. <a href="${esc(BASE + '#score-' + s.id)}" target="_blank" rel="noopener">Open the form</a></li>`).join('')}</ul></section>`;
    // resources
    const resIds = [...new Set([...conds.flatMap((c) => c.resources), ...CFG().alwaysResources])];
    const order = C.res.map((r) => r.id); resIds.sort((a, b) => order.indexOf(a) - order.indexOf(b));
    const condRes = resIds.filter((r) => !CFG().alwaysResources.includes(r)), always = resIds.filter((r) => CFG().alwaysResources.includes(r));
    h += `<section class="doc-sec prose"><h2>Resources I recommend</h2>${[...condRes, ...always].map((id) => { const r = C.res.find((x) => x.id === id); return r ? `<h3>${inline(r.title)}</h3><div class="res-links">${md(r.body)}</div>` : ''; }).join('')}</section>`;
    if (p.before) h += `<section class="doc-sec prose"><h2>Before you message us</h2>${md(stripH1(C.before))}</section>`;
    h += `<footer class="doc-foot">This handout is for education and goes with the plan we made together. It is not a substitute for medical advice about your own situation. <strong>For an emergency, call 911.</strong> For new or worsening symptoms, call our office.</footer></article>`;
    return h;
  }

  /* ------------------------------------------------------------------ plan builder */
  let builderBuilt = false;
  function renderBuilder() {
    if (!builderBuilt) { buildForm(); builderBuilt = true; }
    syncForm(); refresh();
  }
  function buildForm() {
    const groups = [...new Set(CFG().conditions.map((c) => c.group))];
    $('#f-conds').innerHTML = groups.map((g) => `<div class="stack" style="gap:.4rem"><div class="grp-title">${esc(g)}</div><div class="chips">${CFG().conditions.filter((c) => c.group === g).map((c) => `<label class="chip"><input type="checkbox" id="cond-${c.id}" data-cond="${c.id}"> ${esc(c.label)}</label>`).join('')}</div></div>`).join('');
    $('#f-ho').innerHTML = CFG().handouts.map((x) => `<label class="chip" style="border-radius:8px"><input type="checkbox" id="ho-${x.id}" data-ho="${x.id}"> ${esc(x.title)}</label>`).join('');
    $('#f-scores').innerHTML = S().map((s) => `<label class="chip"><input type="checkbox" id="sc-${s.id}" data-sc="${s.id}"> ${esc(s.short)}</label>`).join('');
    const form = $('#builder-form');
    form.addEventListener('change', onForm); form.addEventListener('input', onForm);
    $('#med-search').addEventListener('input', renderMedPick);
    $('#btn-copy').onclick = () => copyText(planURL());
    $('#btn-open').onclick = () => { location.href = planURL(); };
    $('#btn-reset').onclick = () => { P = blankPlan(); syncForm(); refresh(); toast('Started a new plan'); };
    if (FRAMED) $('#btn-print').hidden = true; else $('#btn-print').onclick = () => window.print();
  }
  function onForm(e) {
    const t = e.target;
    if (t.dataset.cond) {
      const id = t.dataset.cond, c = condById(id);
      if (t.checked) { if (!P.c.includes(id)) P.c.push(id); c.scores.forEach((s) => { if (!P.sc.includes(s)) P.sc.push(s); }); if (c.ohpots) P.oh = true; (c.handouts || []).forEach((x) => { if (!P.ho.includes(x)) P.ho.push(x); }); }
      else { P.c = P.c.filter((x) => x !== id); }
      syncForm();
    } else if (t.dataset.ho) { const id = t.dataset.ho; P.ho = t.checked ? [...new Set([...P.ho, id])] : P.ho.filter((x) => x !== id); $('#ear-wrap').hidden = !P.ho.includes('epley'); }
    else if (t.id === 'f-ear') P.ear = t.value;
    else if (t.dataset.sc) { const id = t.dataset.sc; P.sc = t.checked ? [...new Set([...P.sc, id])] : P.sc.filter((x) => x !== id); }
    else if (t.dataset.med) {
      const id = t.dataset.med;
      if (t.checked) { P.m[id] = P.m[id] || { ch: defaultChoices(id, P.c) || undefined }; CFG().handouts.forEach((x) => { if (x.meds.includes(id) && !P.ho.includes(x.id)) { P.ho.push(x.id); $('#ho-' + x.id).checked = true; } }); } else delete P.m[id];
      renderMedCfg();
    } else if (t.dataset.cfg) {
      const [id, key] = t.dataset.cfg.split('|'); const m = P.m[id]; if (!m) return;
      if (key === 'd') m.d = t.value || undefined;
      else if (key === 'tt') { m.t = t.checked ? (m.t || { s: '', st: '', e: 7, mx: '', u: 'mg', f: '', c: 'you are tolerating it', dt: new Date().toISOString().slice(0, 10) }) : undefined; renderMedCfg(); }
      else if (key.startsWith('t.')) { m.t[key.slice(2)] = t.value; }
      else if (key === 'ch') { const k = +t.dataset.k; const all = C.medById[id].parts.filter((x) => x.type === 'choice').map((x) => x.idx); let cur = m.ch || all; cur = t.checked ? [...new Set([...cur, k])] : cur.filter((x) => x !== k); m.ch = cur.sort(); }
    } else if (t.name === 'life') P.life = t.value;
    else if (t.id === 'f-oh') P.oh = t.checked;
    else if (t.id?.startsWith('h-')) P.h[t.id.slice(2)] = t.value;
    else if (t.id === 'f-note') P.note = t.value;
    else if (t.id === 'f-date') P.date = t.value;
    else if (t.id === 'f-about') P.about = t.checked;
    else if (t.id === 'f-rules') P.rules = t.checked;
    else if (t.id === 'f-before') P.before = t.checked;
    else return;
    refresh();
  }
  function syncForm() {
    CFG().conditions.forEach((c) => { $('#cond-' + c.id).checked = P.c.includes(c.id); });
    S().forEach((s) => { $('#sc-' + s.id).checked = P.sc.includes(s.id); });
    CFG().handouts.forEach((x) => { $('#ho-' + x.id).checked = P.ho.includes(x.id); });
    $('#f-ear').value = P.ear || ''; $('#ear-wrap').hidden = !P.ho.includes('epley');
    $$('input[name="life"]').forEach((r) => { r.checked = r.value === P.life; });
    $('#f-oh').checked = P.oh;
    ['dx', 'pv', 's1', 's2'].forEach((k) => { $('#h-' + k).value = P.h[k] || ''; });
    $('#f-note').value = P.note; $('#f-date').value = P.date;
    $('#f-about').checked = P.about; $('#f-rules').checked = P.rules; $('#f-before').checked = P.before;
    renderMedPick(); renderMedCfg();
  }
  function renderMedPick() {
    const q = $('#med-search').value.trim().toLowerCase();
    const pri = [...new Set(P.c.flatMap((c) => condById(c)?.sections || []))];
    const files = [...pri, ...CFG().medFiles.filter((f) => !pri.includes(f))];
    $('#med-pick').innerHTML = files.map((f) => {
      const sec = C.meds[f]; const meds = sec.blocks.filter((b) => b.kind === 'med' && (!q || b.title.toLowerCase().includes(q)));
      if (!meds.length) return '';
      const open = q || pri.includes(f) || meds.some((b) => P.m[b.id]);
      return `<details ${open ? 'open' : ''}><summary>${inline(sec.title.replace(/^Section (\d+):/, '$1 ·'))}</summary><div class="list">${meds.map((b) => `<label><input type="checkbox" id="med-${b.id}" data-med="${b.id}" ${P.m[b.id] ? 'checked' : ''}> <span>${inline(b.title)}</span></label>`).join('')}</div></details>`;
    }).join('') || '<p class="muted">No medicine matches that search.</p>';
  }
  function renderMedCfg() {
    const ids = Object.keys(P.m).filter((id) => C.medById[id]);
    $('#med-cfg').innerHTML = ids.length ? ids.map((id) => {
      const b = C.medById[id], m = P.m[id]; const ch = b.parts.filter((x) => x.type === 'choice'); const cur = m.ch || ch.map((x) => x.idx); const t = m.t;
      return `<div class="medcfg"><h4>${inline(b.title)}</h4>
        <label class="field">My dose (prints on the plan)<input type="text" id="d-${id}" data-cfg="${id}|d" value="${esc(m.d || '')}" placeholder="e.g. 10 mg at bedtime"></label>
        ${ch.length ? `<div class="stack" style="gap:.3rem"><div class="grp-title">Which plan applies</div>${ch.map((x) => `<label class="chip" style="border-radius:8px"><input type="checkbox" id="ch-${id}-${x.idx}" data-cfg="${id}|ch" data-k="${x.idx}" ${cur.includes(x.idx) ? 'checked' : ''}> ${inline(x.title)}</label>`).join('')}</div>` : ''}
        <label class="chip" style="border-radius:8px"><input type="checkbox" id="tt-${id}" data-cfg="${id}|tt" ${t ? 'checked' : ''}> Make a dated step-up calendar</label>
        ${t ? `<div class="grid2">
          <label class="field">Start dose<input type="number" step="any" id="ts-${id}" data-cfg="${id}|t.s" value="${esc(t.s)}"></label>
          <label class="field">Go up by<input type="number" step="any" id="tst-${id}" data-cfg="${id}|t.st" value="${esc(t.st)}"></label>
          <label class="field">Every (days)<input type="number" id="te-${id}" data-cfg="${id}|t.e" value="${esc(t.e)}"></label>
          <label class="field">Up to (goal)<input type="number" step="any" id="tmx-${id}" data-cfg="${id}|t.mx" value="${esc(t.mx)}"></label>
          <label class="field">Unit<input type="text" id="tu-${id}" data-cfg="${id}|t.u" value="${esc(t.u)}"></label>
          <label class="field">Start date<input type="date" id="tdt-${id}" data-cfg="${id}|t.dt" value="${esc(t.dt)}"></label></div>
          <label class="field">When to take it<input type="text" id="tf-${id}" data-cfg="${id}|t.f" value="${esc(t.f)}" placeholder="e.g. at bedtime"></label>
          <label class="field">Go up only if…<input type="text" id="tc-${id}" data-cfg="${id}|t.c" value="${esc(t.c)}"></label>` : ''}
      </div>`;
    }).join('') : '<p class="muted">Medicines you pick show up here so you can add doses and step-up calendars.</p>';
  }
  let refreshT;
  function refresh() {
    clearTimeout(refreshT);
    refreshT = setTimeout(() => {
      $('#seeds-fields').hidden = !useSeeds(P);
      $('#plan-preview').innerHTML = planDoc(P);
      const n = Object.keys(P.m).length;
      $('#plan-status').textContent = `${P.c.length} diagnos${P.c.length === 1 ? 'is' : 'es'} · ${n} medicine${n === 1 ? '' : 's'}`;
    }, 60);
  }

  /* ------------------------------------------------------------------ patient view */
  let PLAN_FROM_URL = null;
  function renderMyPlan() {
    $('#myplan-doc').innerHTML = PLAN_FROM_URL ? planDoc(PLAN_FROM_URL, true) : '<div class="empty">No plan in this link.</div>';
    $('#myplan-print').hidden = FRAMED;
    $('#myplan-print').onclick = () => window.print();
    $('#myplan-edit').onclick = () => { P = JSON.parse(JSON.stringify(PLAN_FROM_URL)); location.hash = 'plan'; };
  }

  /* ------------------------------------------------------------------ start */
  async function start() {
    try {
      const q = new URLSearchParams(location.search).get('p');
      if (q) PLAN_FROM_URL = decodePlan(q);
    } catch (e) { PLAN_FROM_URL = null; }
    try { await loadContent(); }
    catch (e) { $('#loading').innerHTML = `The guide's content files could not be loaded (${esc(e.message)}). If you opened index.html straight from your computer, open the website address instead.`; return; }
    $('#loading').hidden = true;
    window.addEventListener('hashchange', route);
    route();
  }
  window.__guide = { md, titration, encodePlan, decodePlan, get P() { return P; }, set P(v) { P = v; }, planDoc, C };
  start();
})();

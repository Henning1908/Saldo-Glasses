(() => {
  const KEY = 'saldo-app-v1';
  const monthCursor = new Date(2026, 10, 1);
  const defaultState = {
    transactions: [
      { id: 't1', type: 'expense', amount: 8.5, category: 'Essen', note: 'Mittagessen', date: '2026-11-10T12:45:00' },
      { id: 't2', type: 'expense', amount: 32, category: 'Freizeit', note: 'Kino mit Freunden', date: '2026-11-09T19:20:00' },
      { id: 't3', type: 'income', amount: 150, category: 'Taschengeld', note: 'Monatliches Taschengeld', date: '2026-11-08T10:15:00' },
      { id: 't4', type: 'expense', amount: 24.9, category: 'Kleidung', note: 'T-Shirt', date: '2026-11-07T15:42:00' },
      { id: 't5', type: 'expense', amount: 5.2, category: 'Transport', note: 'Bus & Bahn', date: '2026-11-06T08:03:00' },
      { id: 't6', type: 'income', amount: 50, category: 'Geschenke', note: 'Geburtstagsgeschenk', date: '2026-11-04T13:30:00' },
      { id: 't7', type: 'expense', amount: 12.4, category: 'Essen', note: 'Bäckerei', date: '2026-11-03T09:05:00' },
      { id: 't8', type: 'expense', amount: 18, category: 'Freizeit', note: 'Schwimmbad', date: '2026-11-02T16:12:00' },
      { id: 't9', type: 'income', amount: 650, category: 'Arbeit', note: 'Nebenjob', date: '2026-11-01T09:00:00' },
      { id: 't10', type: 'expense', amount: 45, category: 'Technik', note: 'Kopfhörer', date: '2026-11-01T09:00:00' },
      { id: 't11', type: 'expense', amount: 1028.2, category: 'Wohnen', note: 'Wohnen & Fixkosten', date: '2026-11-01T08:45:00' }
    ],
    budgets: [
      { category: 'Essen', emoji: '🍜', limit: 150, color: '#86dfba' },
      { category: 'Freizeit', emoji: '✳', limit: 80, color: '#a9bde9' },
      { category: 'Kleidung', emoji: '◌', limit: 100, color: '#e9bf7e' },
      { category: 'Transport', emoji: '↗', limit: 50, color: '#dd958a' },
      { category: 'Technik', emoji: '▧', limit: 100, color: '#bd9dde' },
      { category: 'Sonstiges', emoji: '＋', limit: 40, color: '#8dbfcb' }
    ],
    debts: [
      { id: 'd1', direction: 'owed', person: 'Max', amount: 30, paid: 10, note: 'Tickets fürs Konzert', date: '2026-10-22' },
      { id: 'd2', direction: 'owed', person: 'Lena', amount: 90, paid: 0, note: 'Wochenendtrip', date: '2026-11-02' },
      { id: 'd3', direction: 'lent', person: 'Jonas', amount: 50, paid: 0, note: 'Essen gehen', date: '2026-11-04' },
      { id: 'd4', direction: 'lent', person: 'Mia', amount: 25, paid: 0, note: 'Kinokarte', date: '2026-11-07' }
    ]
  };
  let state;
  try { state = JSON.parse(localStorage.getItem(KEY)) || structuredClone(defaultState); } catch { state = structuredClone(defaultState); }
  let currentType = 'expense';
  let transactionFilter = 'all';
  let glassPage = 0;
  let toastTimer;

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const money = (n, digits = 2) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);
  const save = () => localStorage.setItem(KEY, JSON.stringify(state));
  const monthName = (d) => new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' }).format(d);
  const currentMonthTransactions = () => state.transactions.filter((t) => {
    const d = new Date(t.date); return d.getFullYear() === monthCursor.getFullYear() && d.getMonth() === monthCursor.getMonth();
  });
  const monthTotals = () => currentMonthTransactions().reduce((a, t) => { a[t.type] += Number(t.amount); return a; }, { income: 0, expense: 0 });
  const categorySpent = (category) => currentMonthTransactions().filter((t) => t.type === 'expense' && t.category === category).reduce((sum, t) => sum + Number(t.amount), 0);
  const debtsTotal = (direction) => state.debts.filter((d) => d.direction === direction).reduce((sum, d) => sum + Math.max(0, Number(d.amount) - Number(d.paid)), 0);
  const fmtDate = (date) => {
    const d = new Date(date); if (Number.isNaN(d.getTime())) return '';
    if (d.toDateString() === new Date().toDateString()) return 'Heute';
    return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'short' }).format(d).replace('.', '');
  };
  const iconFor = (category) => ({ Essen: '🍜', Freizeit: '✳', Kleidung: '◌', Transport: '↗', Technik: '▧', Schule: '⌂', Wohnen: '⌂', Taschengeld: '✳', Arbeit: '↙', Geschenke: '✳', Gesundheit: '✚', Abonnements: '◷' })[category] || '◈';
  const toast = (message) => { const node = $('#toast'); node.textContent = message; node.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => node.classList.remove('show'), 2500); };
  const setPage = (page) => {
    $$('.page').forEach((el) => el.classList.toggle('active', el.id === `page-${page}`));
    $$('.nav-item').forEach((el) => el.classList.toggle('active', el.dataset.page === page));
    const item = $(`.nav-item[data-page="${page}"]`); $('#page-title').textContent = item?.textContent.trim() || 'Übersicht';
    history.replaceState(null, '', `#${page}`); render();
  };
  const openModal = (id) => { const el = $(`#${id}`); el.classList.add('open'); el.setAttribute('aria-hidden', 'false'); setTimeout(() => $('input', el)?.focus(), 80); };
  const closeModals = () => $$('.modal-backdrop').forEach((m) => { m.classList.remove('open'); m.setAttribute('aria-hidden', 'true'); });
  const transactionRow = (t, full = false) => `<div class="${full ? 'full-list-row' : 'transaction-row'}" data-id="${t.id}">
    <div class="transaction-main"><span class="transaction-icon ${t.type === 'expense' ? 'exp' : ''}">${iconFor(t.category)}</span><span><span class="transaction-title">${escapeHtml(t.note || t.category)}</span><span class="transaction-note">${escapeHtml(t.category)}</span></span></div>
    <span class="category-tag">${escapeHtml(t.category)}</span><span class="date-cell">${fmtDate(t.date)}</span><span class="amount-cell ${t.type}">${t.type === 'income' ? '+' : '−'}${money(t.amount)}${full ? `<button class="delete-row" data-delete="${t.id}" title="Buchung löschen">×</button>` : ''}</span>
  </div>`;
  const budgetRow = (b) => {
    const spent = categorySpent(b.category), pct = b.limit ? Math.min(100, spent / b.limit * 100) : 0;
    const cls = spent >= b.limit ? 'over' : pct >= 80 ? 'warn' : '';
    return { spent, pct, cls };
  };
  const render = () => {
    const totals = monthTotals(), result = totals.income - totals.expense, monthTx = currentMonthTransactions();
    $('#month-label').textContent = monthName(monthCursor);
    $('#transaction-count').textContent = state.transactions.length;
    $('#monthly-result').textContent = `${result < 0 ? '−' : '+'}${money(Math.abs(result))}`;
    $('#monthly-result').style.color = result < 0 ? '#f1f4f1' : 'var(--mint)';
    $('#result-caption').textContent = result < 0 ? 'Du hast mehr ausgegeben als eingenommen.' : 'Deine Einnahmen liegen diesen Monat vorn.';
    $('#income-total').textContent = money(totals.income); $('#expense-total').textContent = money(totals.expense);
    $('#month-comparison').textContent = `${monthTx.length} manuell erfasste Buchungen`;
    $('#recent-list').innerHTML = [...state.transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5).map((t) => transactionRow(t)).join('') || '<div class="empty-state">Noch keine Buchungen. Füge deine erste hinzu.</div>';
    const search = ($('#transaction-search')?.value || '').trim().toLocaleLowerCase('de-DE');
    const filtered = [...state.transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).filter((t) => (transactionFilter === 'all' || t.type === transactionFilter) && (!search || `${t.note} ${t.category} ${t.amount}`.toLocaleLowerCase('de-DE').includes(search)));
    if ($('#full-list')) $('#full-list').innerHTML = filtered.map((t) => transactionRow(t, true)).join('') || '<div class="empty-state">Keine passenden Buchungen gefunden.</div>';
    $('#budget-list').innerHTML = state.budgets.slice(0, 3).map((b) => { const v = budgetRow(b); return `<div class="budget-line"><div class="budget-label"><span><span class="budget-emoji">${b.emoji}</span>${escapeHtml(b.category)}</span><span class="budget-value">${money(v.spent, 0)} / ${money(b.limit, 0)}</span></div><div class="progress-track"><div class="progress-fill ${v.cls}" style="width:${Math.min(100, v.pct)}%"></div></div></div>`; }).join('');
    const budgetTotal = state.budgets.reduce((s, b) => s + Number(b.limit), 0), budgetSpentTotal = state.budgets.reduce((s, b) => s + budgetRow(b).spent, 0);
    $('#budget-total').textContent = money(budgetTotal, 0); $('#budget-spent').textContent = money(budgetSpentTotal, 0); $('#budget-remaining').textContent = money(budgetTotal - budgetSpentTotal, 0); $('#budget-progress').style.width = `${Math.min(100, budgetSpentTotal / (budgetTotal || 1) * 100)}%`;
    $('#budgets-grid').innerHTML = state.budgets.map((b) => { const v = budgetRow(b); return `<article class="card budget-detail-card"><div class="budget-detail-top"><span class="budget-detail-icon" style="color:${b.color}">${b.emoji}</span><span class="budget-detail-copy"><b>${escapeHtml(b.category)}</b><span>Monatsbudget</span></span><span class="budget-detail-amount">${money(v.spent, 0)}<span>von ${money(b.limit, 0)}</span></span></div><div class="progress-track"><div class="progress-fill ${v.cls}" style="width:${Math.min(100, v.pct)}%"></div></div><div class="budget-detail-bottom"><span>${Math.round(v.pct)} % genutzt</span><span>${v.spent >= b.limit ? 'Budget erreicht' : `${money(b.limit - v.spent, 0)} verfügbar`}</span></div></article>`; }).join('');
    $('#owed-total').textContent = money(debtsTotal('owed')); $('#lent-total').textContent = money(debtsTotal('lent')); $('#owed-main').textContent = money(debtsTotal('owed')); $('#lent-main').textContent = money(debtsTotal('lent'));
    ['owed', 'lent'].forEach((direction) => { const container = $(`#${direction}-list`); const items = state.debts.filter((d) => d.direction === direction && d.amount > d.paid); container.innerHTML = items.map((d) => `<div class="debt-person-row"><span class="person-avatar">${escapeHtml(d.person.slice(0, 1).toUpperCase())}</span><span class="person-data"><b>${escapeHtml(d.person)}</b><span>${escapeHtml(d.note || 'Ohne Notiz')}</span></span><span class="person-balance">${money(d.amount - d.paid)}<span>offen</span></span><button class="repay-button" data-repay="${d.id}">+ Rückzahlung</button></div>`).join('') || '<div class="empty-state">Alles ausgeglichen.</div>'; });
    renderStats(); updateCategoryOptions();
  };
  const renderStats = () => {
    const byCat = currentMonthTransactions().filter((t) => t.type === 'expense').reduce((a, t) => { a[t.category] = (a[t.category] || 0) + Number(t.amount); return a; }, {});
    const entries = Object.entries(byCat).sort((a, b) => b[1] - a[1]); const colors = ['#8de3bf', '#9bb6e0', '#e6c183', '#d99086', '#667876', '#b597db']; const total = entries.reduce((s, [, n]) => s + n, 0);
    let pos = 0; const stops = entries.length ? entries.map(([, value], i) => { const start = pos; pos += value / (total || 1) * 100; return `${colors[i % colors.length]} ${start}% ${pos}%`; }).join(', ') : '#293230 0 100%';
    $('#category-donut').style.background = `conic-gradient(${stops})`; $('#donut-total').textContent = money(total, 0);
    $('#category-legend').innerHTML = entries.map(([cat, val], i) => `<div class="legend-row"><i style="background:${colors[i % colors.length]}"></i>${escapeHtml(cat)} <span style="margin-left:auto">${Math.round(val / (total || 1) * 100)}%</span></div>`).join('') || '<span class="glass-tip">Noch keine Ausgaben</span>';
    const months = []; for (let i = 5; i >= 0; i--) { const d = new Date(monthCursor.getFullYear(), monthCursor.getMonth() - i, 1); const tx = state.transactions.filter((t) => { const td = new Date(t.date); return td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear(); }); months.push({ label: new Intl.DateTimeFormat('de-DE', { month: 'short' }).format(d), income: tx.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0), expense: tx.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0) }); }
    const max = Math.max(1, ...months.flatMap((m) => [m.income, m.expense]));
    $('#chart-bars').innerHTML = months.map((m) => `<div class="month-bar"><i class="bar-income" style="height:${Math.max(3, m.income / max * 100)}%"></i><i class="bar-expense" style="height:${Math.max(3, m.expense / max * 100)}%"></i><label>${m.label}</label></div>`).join('');
  };
  const updateCategoryOptions = () => {
    const defaults = currentType === 'expense' ? ['Essen', 'Schule', 'Kleidung', 'Freizeit', 'Transport', 'Wohnen', 'Abonnements', 'Geschenke', 'Gesundheit', 'Technik', 'Sonstiges'] : ['Arbeit', 'Geschenke', 'Taschengeld', 'Erstattungen', 'Sonstige Einnahmen'];
    const cats = [...new Set([...defaults, ...state.transactions.filter((t) => t.type === currentType).map((t) => t.category)])];
    $('#entry-category').innerHTML = cats.map((cat) => `<option>${escapeHtml(cat)}</option>`).join('');
  };
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  $$('.nav-item').forEach((button) => button.addEventListener('click', () => setPage(button.dataset.page)));
  $$('[data-page-link]').forEach((button) => button.addEventListener('click', () => setPage(button.dataset.pageLink)));
  $$('[data-open-entry]').forEach((button) => button.addEventListener('click', () => openModal('entry-modal')));
  $$('[data-close-modal]').forEach((button) => button.addEventListener('click', closeModals));
  $$('.modal-backdrop').forEach((backdrop) => backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeModals(); }));
  $$('.mode-button').forEach((button) => button.addEventListener('click', () => { currentType = button.dataset.type; $$('.mode-button').forEach((b) => b.classList.toggle('active', b === button)); updateCategoryOptions(); }));
  $('#entry-form').addEventListener('submit', (e) => {
    e.preventDefault(); const amount = Number($('#entry-amount').value); if (!(amount > 0)) return;
    const item = { id: `t${Date.now()}`, type: currentType, amount, category: $('#entry-category').value, note: $('#entry-description').value.trim() || $('#entry-category').value, date: new Date().toISOString() };
    const duplicate = state.transactions.some((t) => t.type === item.type && t.amount === item.amount && t.category === item.category && new Date(t.date).toDateString() === new Date().toDateString());
    if (duplicate && !confirm('Eine ähnliche Buchung für heute ist schon vorhanden. Trotzdem speichern?')) return;
    state.transactions.push(item); save(); render(); closeModals(); e.target.reset(); toast('Buchung wurde gespeichert.');
  });
  $('#debt-form').addEventListener('submit', (e) => { e.preventDefault(); state.debts.push({ id: `d${Date.now()}`, direction: $('#debt-direction').value, person: $('#debt-person').value.trim(), amount: Number($('#debt-amount').value), paid: 0, note: $('#debt-note').value.trim(), date: new Date().toISOString().slice(0, 10) }); save(); render(); closeModals(); e.target.reset(); toast('Offener Betrag hinzugefügt.'); });
  $('#add-debt').addEventListener('click', () => openModal('debt-modal'));
  $('#add-budget').addEventListener('click', () => { const category = prompt('Für welche Kategorie möchtest du ein Budget anlegen?'); if (!category?.trim()) return; const limit = Number(prompt('Wie hoch soll das Monatsbudget in Euro sein?')); if (!(limit > 0)) return; state.budgets.push({ category: category.trim(), emoji: '◈', limit, color: '#8dbfcb' }); save(); render(); toast('Budget wurde angelegt.'); });
  document.addEventListener('click', (e) => {
    const del = e.target.closest('[data-delete]'); if (del) { const t = state.transactions.find((x) => x.id === del.dataset.delete); if (t && confirm(`Buchung „${t.note}“ löschen?`)) { state.transactions = state.transactions.filter((x) => x.id !== t.id); save(); render(); toast('Buchung gelöscht.'); } }
    const repay = e.target.closest('[data-repay]'); if (repay) { const d = state.debts.find((x) => x.id === repay.dataset.repay); if (!d) return; const remaining = d.amount - d.paid; const paid = Number(prompt(`Wie viel wurde zurückgezahlt? Noch offen: ${money(remaining)}`, remaining.toFixed(2))); if (paid > 0) { d.paid = Math.min(d.amount, d.paid + paid); save(); render(); toast(d.paid >= d.amount ? 'Betrag ist vollständig zurückgezahlt.' : 'Teilrückzahlung gespeichert.'); } }
  });
  $$('.filter-pill').forEach((b) => b.addEventListener('click', () => { transactionFilter = b.dataset.filter; $$('.filter-pill').forEach((x) => x.classList.toggle('active', x === b)); render(); }));
  $('#transaction-search').addEventListener('input', render);
  $('#export-csv').addEventListener('click', () => { const rows = [['Datum', 'Typ', 'Kategorie', 'Beschreibung', 'Betrag'], ...state.transactions.map((t) => [new Date(t.date).toLocaleString('de-DE'), t.type === 'income' ? 'Einnahme' : 'Ausgabe', t.category, t.note, t.amount.toFixed(2).replace('.', ',')])]; const blob = new Blob(['\ufeff' + rows.map((r) => r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'saldo-buchungen.csv'; link.click(); URL.revokeObjectURL(link.href); toast('CSV-Export wurde heruntergeladen.'); });
  $('#month-prev').addEventListener('click', () => { monthCursor.setMonth(monthCursor.getMonth() - 1); render(); }); $('#month-next').addEventListener('click', () => { monthCursor.setMonth(monthCursor.getMonth() + 1); render(); });

  const speech = window.SpeechRecognition || window.webkitSpeechRecognition;
  $('#voice-button').addEventListener('click', () => {
    if (!speech) { $('#voice-status').textContent = 'Spracherkennung wird von diesem Browser nicht unterstützt.'; return; }
    const recog = new speech(); recog.lang = 'de-DE'; recog.interimResults = false; $('#voice-status').textContent = 'Ich höre zu …'; recog.start();
    recog.onresult = (e) => { const text = e.results[0][0].transcript; $('#voice-status').textContent = `„${text}“`; const amount = text.match(/(\d+[,.]?\d*)\s*(?:€|Euro|EUR)?/i); const category = ['Essen', 'Freizeit', 'Kleidung', 'Transport', 'Schule', 'Technik', 'Wohnen'].find((c) => text.toLocaleLowerCase('de-DE').includes(c.toLocaleLowerCase('de-DE'))); currentType = /bekommen|verdient|einnahme|taschengeld|geschenkt/.test(text.toLocaleLowerCase('de-DE')) ? 'income' : 'expense'; $$('.mode-button').forEach((b) => b.classList.toggle('active', b.dataset.type === currentType)); updateCategoryOptions(); if (amount) $('#entry-amount').value = amount[1].replace(',', '.'); if (category && [...$('#entry-category').options].some((o) => o.value === category)) $('#entry-category').value = category; $('#entry-description').value = text; };
    recog.onerror = () => { $('#voice-status').textContent = 'Spracheingabe konnte nicht gestartet werden.'; };
  });

  const glassPages = ['summary', 'recent', 'add', 'debts'];
  const renderGlass = () => {
    const body = $('#glass-body'), totals = monthTotals(), recent = [...state.transactions].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    if (glassPage === 0) body.innerHTML = `<span class="glass-eyebrow">NOVEMBER · ERGEBNIS</span><b class="glass-value">${totals.income - totals.expense < 0 ? '−' : '+'}${money(Math.abs(totals.income - totals.expense))}</b><span class="glass-description">${totals.income - totals.expense < 0 ? 'Mehr ausgegeben als eingenommen' : 'Du bist diesen Monat im Plus'}</span><div class="glass-divider"></div><div class="glass-mini-row"><span>↑ Einnahmen</span><b>${money(totals.income)}</b></div><div class="glass-mini-row"><span>↓ Ausgaben</span><b>${money(totals.expense)}</b></div><span class="glass-tip">Weiterwischen für letzte Buchung</span>`;
    else if (glassPage === 1) body.innerHTML = `<span class="glass-eyebrow">LETZTE BUCHUNG</span><span class="glass-description">${escapeHtml(recent?.note || 'Noch keine Buchungen')}</span><b class="glass-value" style="font-size:clamp(29px,6vw,42px);color:${recent?.type === 'income' ? '#aff5d5' : '#f4c3a6'}">${recent?.type === 'income' ? '+' : '−'}${money(recent?.amount || 0)}</b><div class="glass-mini-row"><span>${iconFor(recent?.category)} ${escapeHtml(recent?.category || '')}</span><b>${fmtDate(recent?.date || new Date())}</b></div><span class="glass-tip">Weiterwischen für Schnellbuchung</span>`;
    else if (glassPage === 2) body.innerHTML = `<span class="glass-eyebrow">SCHNELLBUCHUNG</span><span class="glass-value" style="font-size:clamp(28px,6vw,44px)">＋</span><span class="glass-description">Sag zum Beispiel:<br><b>„8 Euro für Essen“</b></span><div class="glass-divider"></div><span class="glass-tip">Spracheingabe erfolgt über die Web-App</span>`;
    else body.innerHTML = `<span class="glass-eyebrow">OFFENE BETRÄGE</span><div class="glass-mini-row"><span>Du schuldest</span><b>${money(debtsTotal('owed'))}</b></div><div class="glass-mini-row"><span>Dir geschuldet</span><b>${money(debtsTotal('lent'))}</b></div><div class="glass-divider"></div><span class="glass-description">${state.debts.filter((d) => d.paid < d.amount).map((d) => `${escapeHtml(d.person)} · ${money(d.amount - d.paid)}`).join('<br>') || 'Alles ausgeglichen'}</span><span class="glass-tip">Weiterwischen zur Übersicht</span>`;
    $('#glass-clock').textContent = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' }).format(new Date());
  };
  const moveGlass = (delta) => { glassPage = (glassPage + delta + glassPages.length) % glassPages.length; renderGlass(); };
  $('#glass-toggle').addEventListener('click', () => { $('#glass-overlay').classList.add('open'); $('#glass-overlay').setAttribute('aria-hidden', 'false'); renderGlass(); });
  $('#glass-exit').addEventListener('click', () => { $('#glass-overlay').classList.remove('open'); $('#glass-overlay').setAttribute('aria-hidden', 'true'); });
  $('#glass-overlay').addEventListener('click', (e) => { if (e.target.closest('.glass-device')) { const rect = $('.glass-device').getBoundingClientRect(); moveGlass(e.clientX > rect.left + rect.width / 2 ? 1 : -1); } });
  document.addEventListener('keydown', (e) => { if ($('#glass-overlay').classList.contains('open')) { if (['ArrowRight', 'ArrowDown'].includes(e.key)) moveGlass(1); if (['ArrowLeft', 'ArrowUp'].includes(e.key)) moveGlass(-1); if (e.key === 'Escape') $('#glass-exit').click(); } else if (e.key === 'Escape') closeModals(); });
  const initial = location.hash.slice(1); if ($(`#page-${initial}`)) setPage(initial); else render();
})();

// ============================================================
// api.js — мост Mood Movies ↔ Django API (база 1955 фильмов)
// Подключать ПОСЛЕ app.js. Сервер выключен? — фолбэк на локальную базу
// ============================================================

(function () {
  'use strict';

  var API_BASE = 'http://127.0.0.1:8000/api';

  // --- стили чипов (инъекция, style.css не трогаем) ---
  var st = document.createElement('style');
  st.textContent =
    '.mood-btn.on{border-color:#f2c14e;background:rgba(242,193,78,0.18);box-shadow:0 0 12px rgba(242,193,78,0.35);}' +
    '.mood-apply-bar{display:flex;gap:8px;grid-column:1/-1;margin-top:8px;padding:4px;}' +
    '.mood-apply-bar button{flex:1;font-family:inherit;font-weight:700;font-size:14px;padding:10px 8px;border:none;border-radius:10px;cursor:pointer;}' +
    '.mood-apply-btn{background:#f2c14e;color:#1a1722;}' +
    '.mood-clear-btn{background:rgba(38,30,46,0.9);color:#f5f0e6;border:1px solid rgba(242,193,78,0.45);}' +
    'body.light .mood-clear-btn{background:#fff;color:#1a1722;}' +
    '.api-note{margin:0 0 12px;padding:10px 14px;border-radius:12px;font-size:14px;background:rgba(242,193,78,0.12);border:1px solid rgba(242,193,78,0.4);}' +
    'body.light .api-note{background:rgba(178,140,50,0.12);border-color:rgba(178,140,50,0.4);color:#1a1722;}';
  document.head.appendChild(st);

  function norm(w) { return String(w || '').toLowerCase().replace(/ё/g, 'е').trim(); }

  // что угодно → API-настроение
  var TO_API = {
    'плакать': 'хочу плакать', 'поплакать': 'хочу плакать', 'погрустить': 'хочу плакать',
    'грустить': 'хочу плакать', 'грустное': 'хочу плакать', 'хочу плакать': 'хочу плакать',
    'посмеяться': 'посмеяться', 'смеяться': 'посмеяться', 'смешное': 'посмеяться',
    'вдохновиться': 'вдохновиться', 'вдохновляющее': 'вдохновиться', 'вдохновение': 'вдохновиться',
    'расслабиться': 'расслабиться', 'расслабленное': 'расслабиться',
    'отдохнуть': 'расслабиться', 'расслабон': 'расслабиться',
    'поразмышлять': 'поразмышлять', 'философское': 'поразмышлять', 'задуматься': 'поразмышлять',
    'напрячься': 'напрячься', 'напряженное': 'напрячься',
    'приключения': 'приключения', 'приключенческое': 'приключения',
    'что-то милое': 'что-то милое', 'милое': 'что-то милое'
  };

  // API-настроение → словарь сайта (для карточек и фолбэка)
  var TO_SITE = {
    'посмеяться': 'смешное',
    'поразмышлять': 'философское',
    'что-то милое': 'милое',
    'приключения': 'приключенческое',
    'вдохновиться': 'вдохновляющее',
    'расслабиться': 'расслабленное',
    'напрячься': 'напряжённое',
    'хочу плакать': 'грустное'
  };

  var ICONS = ['🎭', '🎬', '🍿', '⭐', '🎞️', '🚀', '❤️', '🔥', '🌙', '✨'];
  var PALETTE = [
    ['#4a2d5e', '#8a3b5c'], ['#1a237e', '#5c6bc0'], ['#0f2027', '#2c5364'],
    ['#1b5e20', '#4caf50'], ['#c0392b', '#f39c12'], ['#d81b60', '#f48fb1'],
    ['#283593', '#7986cb'], ['#00695c', '#26a69a'], ['#e0a010', '#f6d365'], ['#37474f', '#78909c']
  ];
  function hashOf(s) {
    var h = 0, str = String(s || '');
    for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return h;
  }

  function toApiMood(label) {
    var k = norm(label).replace(/^[^\wа-яё]+/i, '');
    return TO_API[k] || k;
  }

  // --- конвертация ответа API в формат сайта ---
  function apiToSite(m) {
    var id = 'a' + m.id; // отдельная метка: не путается с локальными 1..488
    var ems = (m.emotions || []).map(function (e) { return TO_SITE[norm(e)] || e; });
    var h = hashOf(m.title);
    return {
      id: id,
      title: m.title,
      year: m.year,
      director: m.director || '—',
      country: m.country || '—',
      duration: m.duration || 0,
      age: m.age_rating || '',
      genres: m.genres || [],
      emotions: ems,
      icon: ICONS[h % ICONS.length],
      colors: PALETTE[h % PALETTE.length],
      description: m.description || '',
      rating: parseFloat(m.rating) || 0
    };
  }

  var apiMoviesAdded = {};
  function mergeApiMovies(list) {
    var added = list.filter(function (m) {
      if (apiMoviesAdded[m.id]) return false;
      apiMoviesAdded[m.id] = true;
      return true;
    });
    if (added.length) Array.prototype.push.apply(movies, added);
  }

  function fetchMovies(moods, cb) {
    var url = API_BASE + '/movies/?moods=' + encodeURIComponent(moods.join(',')) + '&limit=40';
    fetch(url)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var list = (data.results || []).map(apiToSite);
        mergeApiMovies(list);
        cb({ ok: true, list: list, matchMode: data.match_mode || '' });
      })
      .catch(function () { cb({ ok: false, list: [], matchMode: '' }); });
  }

  function fetchRandom(cb) {
    fetch(API_BASE + '/movies/?random=1')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var list = (data.results || []).map(apiToSite);
        mergeApiMovies(list);
        cb(list[0] || null);
      })
      .catch(function () { cb(null); });
  }

  // --- фолбэк: те же правила, но на локальной базе ---
  function localMultiMood(apiMoods) {
    var want = apiMoods.map(function (x) { return norm(TO_SITE[x] || x); });
    var matched = movies.filter(function (m) {
      var emos = m.emotions.map(norm);
      return want.every(function (w) { return emos.indexOf(w) !== -1; });
    });
    if (matched.length) return { list: matched, matchMode: 'full' };
    var scored = movies
      .map(function (m) {
        var emos = m.emotions.map(norm);
        var score = want.filter(function (w) { return emos.indexOf(w) !== -1; }).length;
        return { m: m, score: score };
      })
      .filter(function (x) { return x.score > 0; })
      .sort(function (a, b) { return b.score - a.score; })
      .slice(0, 12)
      .map(function (x) { return x.m; });
    return { list: scored, matchMode: scored.length ? 'partial' : '' };
  }

  function mkNote(html) {
    var d = document.createElement('div');
    d.className = 'api-note';
    d.innerHTML = html;
    return d;
  }

  function init() {

    // ===== Чипы настроений: отметь сколько угодно =====
    var moodMenu = document.getElementById('mood-menu');
    if (moodMenu) {
      var bar = document.createElement('div');
      bar.className = 'mood-apply-bar';
      bar.innerHTML =
        '<button class="mood-apply-btn" id="mood-apply" style="display:none;">✨ Подобрать</button>' +
        '<button class="mood-clear-btn" id="mood-clear" style="display:none;">Сбросить</button>';
      moodMenu.appendChild(bar);
    }

    function updateApplyBar() {
      var n = moodMenu ? moodMenu.querySelectorAll('.mood-btn.on').length : 0;
      var a = document.getElementById('mood-apply');
      var c = document.getElementById('mood-clear');
      if (a) { a.style.display = n ? 'block' : 'none'; a.textContent = '✨ Подобрать (' + n + ')'; }
      if (c) c.style.display = n ? 'block' : 'none';
    }

    function clearMoodChips() {
      if (!moodMenu) return;
      moodMenu.querySelectorAll('.mood-btn.on').forEach(function (b) { b.classList.remove('on'); });
      updateApplyBar();
    }

    function applyMoodChips() {
      if (!moodMenu) return;
      var labels = [];
      moodMenu.querySelectorAll('.mood-btn.on').forEach(function (b) {
        labels.push(b.dataset.mood || b.textContent);
      });
      if (!labels.length) { showToast('Отметь хотя бы одно настроение 🎭', false); return; }
      moodMenu.classList.remove('open');
      var apiMoods = labels.map(toApiMood);
      var moodText = labels.map(function (l) { return '«' + l + '»'; }).join(', ');

      var titleEl = document.getElementById('results-title');
      if (titleEl) titleEl.textContent = 'Собранное настроение';
      var container = document.getElementById('results-list');
      if (container) container.innerHTML = '<div class="search-empty">Ищу в большой базе 1955 фильмов… 🍿</div>';
      shownExtraPages = 0;
      lastFullItems = [];
      renderResultsScreen();
      showScreen('screen-results');

      fetchMovies(apiMoods, function (res) {
        var list, mode, prefix;
        if (res.ok) { list = res.list; mode = res.matchMode; prefix = ''; }
        else {
          var fb = localMultiMood(apiMoods);
          list = fb.list; mode = fb.matchMode;
          prefix = '📴 Сервер выключен — подобрал из локальной базы. ';
        }
        var note;
        if (mode === 'full') {
          note = prefix + '🎯 <b>Точное совпадение:</b> фильмы со всеми настроениями: ' + moodText;
          lastFullItems = list;
        } else if (mode === 'partial') {
          note = prefix + '👌 <b>Точного совпадения нет</b> — показываю ближайшие по числу совпадений: ' + moodText;
          lastFullItems = list;
        } else {
          note = prefix + '😴 Такого набора настроений в базе нет — попробуй убрать одно.';
          lastFullItems = [];
        }
        renderResultsScreen();
        var c2 = document.getElementById('results-list');
        if (c2) c2.insertBefore(mkNote(note), c2.firstChild);
      });
    }

    // ===== «Фильм для двоих» через большую базу =====
    function optLabel(sel) {
      return sel.options[sel.selectedIndex] ? sel.options[sel.selectedIndex].textContent : sel.value;
    }

    function runCoupleApi() {
      var screen = document.getElementById('screen-couple');
      var sels = screen ? screen.querySelectorAll('select') : [];
      if (sels.length < 2) { runCoupleSearch(); return; }
      var labelA = optLabel(sels[0]);
      var labelB = optLabel(sels[1]);
      var noteEl = document.getElementById('couple-note');
      var listEl = document.getElementById('couple-list');
      if (noteEl) noteEl.innerHTML = '<div class="couple-result-note">Ищу в большой базе… 🍿</div>';
      if (listEl) listEl.innerHTML = '';
      fetchMovies([toApiMood(labelA), toApiMood(labelB)], function (res) {
        if (!res.ok) { if (noteEl) noteEl.innerHTML = ''; runCoupleSearch(); return; }
        if (res.matchMode === 'full') {
          if (noteEl) noteEl.innerHTML = '<div class="couple-result-note">Фильмы, где есть и «' + labelA + '», и «' + labelB + '» сразу 💛</div>';
        } else if (res.matchMode === 'partial') {
          if (noteEl) noteEl.innerHTML = '<div class="couple-result-note">Фильмов с обоими настроениями в большой базе нет — показываю ближайшие по совпадению 🙂</div>';
        } else {
          if (noteEl) noteEl.innerHTML = '<div class="couple-result-note">Ничего не нашлось — попробуй другие настроения.</div>';
        }
        renderResults(res.list, 'couple-list', false);
      });
    }

    // ===== Случайный фильм из большой базы =====
    function pickRandomApi() {
      var titleEl = document.getElementById('results-title');
      if (titleEl) titleEl.textContent = 'Случайный фильм';
      var container = document.getElementById('results-list');
      if (container) container.innerHTML = '<div class="search-empty">Кручу рулетку из 1955 фильмов… 🎲</div>';
      fetchRandom(function (movie) {
        shownExtraPages = 0;
        lastFullItems = [movie || movies[Math.floor(Math.random() * movies.length)]];
        renderResultsScreen();
        showScreen('screen-results');
      });
    }

    // ===== Перехват кликов (capture — раньше обработчиков app.js) =====
    document.addEventListener('click', function (e) {
      if (!e.target || !e.target.closest) return;
      var btn = e.target.closest('.mood-btn');
      if (btn && moodMenu && moodMenu.contains(btn)) {
        e.stopPropagation();
        btn.classList.toggle('on');
        updateApplyBar();
        return;
      }
      if (e.target.closest('#mood-apply')) { e.stopPropagation(); applyMoodChips(); return; }
      if (e.target.closest('#mood-clear')) { e.stopPropagation(); clearMoodChips(); return; }
      if (e.target.closest('#btn-couple-find')) { e.stopPropagation(); runCoupleApi(); return; }
      if (e.target.closest('#btn-random') || e.target.closest('#btn-next')) {
        e.stopPropagation();
        pickRandomApi();
        return;
      }
    }, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

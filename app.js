// ============================================================
// Mood Movies — логика приложения (app.js)
// Структура: data.js (база фильмов) + posters.js (карта постеров)
//            + posters/ (66 локальных изображений) + этот файл
// ============================================================

// (База фильмов вынесена в data.js, постеры — в posters.js и папку posters/)

// ===== Сервисы «Где смотреть» =====
// Единая точка получения постера: POSTER_EXT (posters.js) → локальный файл → заглушка через onerror
function posterOf(id) {
  return POSTER_EXT[id] || ('posters/' + id + '.jpg');
}

const services = [
  { name: 'Кинопоиск', url: function(q) { return 'https://www.kinopoisk.ru/index.php?kp_query=' + encodeURIComponent(q); } },
  { name: 'IVI', url: function(q) { return 'https://www.ivi.ru/search?q=' + encodeURIComponent(q); } },
  { name: 'Okko', url: function(q) { return 'https://okko.tv/search?query=' + encodeURIComponent(q); } },
  { name: 'Wink', url: function(q) { return 'https://wink.ru/search?query=' + encodeURIComponent(q); } },
  { name: 'Netflix', url: function(q) { return 'https://www.netflix.com/search?q=' + encodeURIComponent(q); } }
];

// ===== Хранилище =====
let favorites;
try { favorites = JSON.parse(localStorage.getItem('mood_movies_favorites')); } catch (e) { favorites = []; }
if (!Array.isArray(favorites)) favorites = [];

let ratings;
try { ratings = JSON.parse(localStorage.getItem('mood_movies_ratings')); } catch (e) { ratings = {}; }
if (!ratings || typeof ratings !== 'object' || Array.isArray(ratings)) ratings = {};
function saveRatings() { localStorage.setItem('mood_movies_ratings', JSON.stringify(ratings)); }

let watched;
try { watched = JSON.parse(localStorage.getItem('mood_movies_watched')); } catch (e) { watched = []; }
if (!Array.isArray(watched)) watched = [];

let reviews;
try { reviews = JSON.parse(localStorage.getItem('mood_movies_reviews')); } catch (e) { reviews = {}; }
if (!reviews || typeof reviews !== 'object' || Array.isArray(reviews)) reviews = {};
function saveReviews() { localStorage.setItem('mood_movies_reviews', JSON.stringify(reviews)); }

// ===== Тема =====
function applyTheme(theme) {
  document.body.classList.toggle('light', theme === 'light');
  const btn = document.getElementById('theme-btn');
  if (btn) btn.textContent = theme === 'light' ? '☀️ Тема' : '🌙 Тема';
  localStorage.setItem('mood_movies_theme', theme);
}
function toggleTheme() {
  const isLight = document.body.classList.contains('light');
  applyTheme(isLight ? 'dark' : 'light');
}

// ===== Тосты =====
function showToast(message, ok) {
  const box = document.getElementById('toast-container');
  if (!box) return;
  const t = document.createElement('div');
  t.className = 'toast' + (ok ? ' ok' : '');
  t.textContent = message;
  box.appendChild(t);
  setTimeout(function() {
    t.style.transition = 'opacity 0.3s ease';
    t.style.opacity = '0';
    setTimeout(function() { t.remove(); }, 300);
  }, 2200);
}

// ===== Утилиты =====
function normalize(word) { return String(word).toLowerCase().replace(/ё/g, 'е').trim(); }
function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const moodSynonyms = {
  'плакать': 'грустное', 'погрустить': 'грустное', 'грустить': 'грустное', 'поплакать': 'грустное',
  'вдохновиться': 'вдохновляющее', 'вдохновение': 'вдохновляющее', 'мотивация': 'вдохновляющее',
  'расслабиться': 'расслабленное', 'отдохнуть': 'расслабленное', 'расслабон': 'расслабленное',
  'посмеяться': 'смешное', 'поржать': 'смешное', 'напрячься': 'напряженное',
  'поразмышлять': 'философское', 'задуматься': 'философское', 'приключения': 'приключенческое'
};

const MOOD_LABELS = {
  'грустное': 'плакать', 'смешное': 'смеяться', 'вдохновляющее': 'вдохновиться',
  'расслабленное': 'расслабиться', 'философское': 'поразмышлять',
  'напряжённое': 'напрячься', 'напряженное': 'напрячься',
  'приключенческое': 'приключения', 'милое': 'что-то милое',
  'трогательное': 'трогательное', 'доброе': 'доброе', 'глубокое': 'глубокое',
  'эпичное': 'эпичное', 'стильное': 'стильное', 'умное': 'умное',
  'культовое': 'культовое', 'красивое': 'красивое', 'безумное': 'безумное',
  'весёлое': 'весёлое', 'загадочное': 'загадочное', 'зрелищное': 'зрелищное',
  'игривое': 'игривое', 'классическое': 'классика', 'драматичное': 'драматичное',
  'жизнеутверждающее': 'жизнеутверждающее', 'энергичное': 'энергичное', 'историческое': 'историческое'
};

// ===== Фильтры: жанры и годы =====
function getAllGenres() {
  const set = {};
  movies.forEach(function(m) { m.genres.forEach(function(g) { set[normalize(g)] = g; }); });
  return Object.keys(set).sort();
}
function fillGenreFilter() {
  const sel = document.getElementById('sel-genre');
  if (!sel) return;
  getAllGenres().forEach(function(g) {
    const opt = document.createElement('option');
    opt.value = g;
    opt.textContent = g.charAt(0).toUpperCase() + g.slice(1);
    sel.appendChild(opt);
  });
}
function fillYearFilter() {
  const sel = document.getElementById('sel-year');
  if (!sel) return;
  const years = movies.map(function(m) { return m.year; }).sort(function(a, b) { return b - a; });
  years.forEach(function(y) {
    const opt = document.createElement('option');
    opt.value = String(y);
    opt.textContent = y;
    sel.appendChild(opt);
  });
}

// ===== Подборки =====
function getRecommendations(mood) {
  const key = normalize(mood);
  const target = moodSynonyms[key] || key;
  const matched = movies.filter(function(m) {
    return m.emotions.some(function(e) { return normalize(e) === target; });
  });
  return matched.sort(function() { return Math.random() - 0.5; });
}

function getRatedRecommendations() {
  const likedIds = Object.keys(ratings).filter(function(id) { return ratings[id] >= 4; });
  if (likedIds.length === 0) return [];

  const favGenres = {};
  const favEmotions = {};
  likedIds.forEach(function(id) {
    const m = movies.find(function(x) { return x.id === id; });
    if (!m) return;
    m.genres.forEach(function(g) { favGenres[normalize(g)] = (favGenres[normalize(g)] || 0) + ratings[id]; });
    m.emotions.forEach(function(e) { favEmotions[normalize(e)] = (favEmotions[normalize(e)] || 0) + ratings[id]; });
  });

  return movies
    .filter(function(m) { return watched.indexOf(m.id) === -1 && ratings[m.id] === undefined; })
    .map(function(m) {
      let score = 0;
      m.genres.forEach(function(g) { score += (favGenres[normalize(g)] || 0) * 2; });
      m.emotions.forEach(function(e) { score += favEmotions[normalize(e)] || 0; });
      return { movie: m, score: score + m.rating / 10 };
    })
    .filter(function(x) { return x.score > 1; })
    .sort(function(a, b) { return b.score - a.score; })
    .slice(0, 5)
    .map(function(x) { return x.movie; });
}

function getCouplePicks(moodMine, moodPartner) {
  const a = normalize(moodSynonyms[normalize(moodMine)] || moodMine);
  const b = normalize(moodSynonyms[normalize(moodPartner)] || moodPartner);
  const both = movies.filter(function(m) {
    const emos = m.emotions.map(normalize);
    return emos.indexOf(a) !== -1 && emos.indexOf(b) !== -1;
  });
  const shuffled = both.slice().sort(function() { return Math.random() - 0.5; });
  let result = shuffled.slice(0, 5);
  if (result.length < 3) {
    const extra = movies
      .filter(function(m) {
        if (result.indexOf(m) !== -1) return false;
        const emos = m.emotions.map(normalize);
        return emos.indexOf(a) !== -1 || emos.indexOf(b) !== -1;
      })
      .sort(function(x, y) { return y.rating - x.rating; })
      .slice(0, 5 - result.length);
    result = result.concat(extra);
  }
  return result;
}

function searchMovies(query) {
  const q = normalize(query);
  if (!q) return [];
  return movies.filter(function(m) {
    return normalize(m.title).indexOf(q) !== -1 || normalize(m.director).indexOf(q) !== -1;
  });
}

function getFilmOfDay() {
  const dayNumber = Math.floor(Date.now() / 86400000);
  return movies[dayNumber % movies.length];
}

// ===== Фильтры + порции =====
const PAGE_SIZE = 5;
let shownExtraPages = 0;

function getFilteredList(items) {
  const selRating = document.getElementById('sel-rating');
  const selSort = document.getElementById('sel-sort');
  const selGenre = document.getElementById('sel-genre');
  const selYear = document.getElementById('sel-year');
  const minRating = selRating ? (parseFloat(selRating.value) || 0) : 0;
  const genre = selGenre ? selGenre.value : 'all';
  const year = selYear ? selYear.value : 'all';

  let list = items.filter(function(m) { return m.rating >= minRating; });
  if (genre !== 'all') {
    list = list.filter(function(m) {
      return m.genres.some(function(g) { return normalize(g) === genre; });
    });
  }
  if (year !== 'all') {
    list = list.filter(function(m) { return String(m.year) === year; });
  }

  const sort = selSort ? selSort.value : 'rating';
  if (sort === 'rating') {
    list = list.slice().sort(function(a, b) { return b.rating - a.rating; });
  } else if (sort === 'year') {
    list = list.slice().sort(function(a, b) { return b.year - a.year; });
  } else {
    list = list.slice().sort(function(a, b) { return a.title.localeCompare(b.title, 'ru'); });
  }
  return list;
}

function applyView(items) {
  const selCount = document.getElementById('sel-count');
  const filtered = getFilteredList(items);
  const baseCount = selCount ? parseInt(selCount.value, 10) : 999;
  const cap = (baseCount >= 999) ? 999 : baseCount + shownExtraPages * PAGE_SIZE;
  return { shown: filtered.slice(0, cap), filteredTotal: filtered.length };
}

function updateResultsNote(filteredTotal, shownCount) {
  const note = document.getElementById('results-note');
  if (!note) return;
  if (filteredTotal > shownCount) {
    note.textContent = 'Найдено ' + filteredTotal + ', показываю ' + shownCount + ' — нажми «Показать ещё»';
    note.style.display = 'block';
  } else {
    note.style.display = 'none';
  }
}

function updateMoreButton(filteredTotal, shownCount) {
  const btn = document.getElementById('btn-more');
  if (!btn) return;
  const remaining = filteredTotal - shownCount;
  if (remaining > 0) {
    btn.textContent = '▶ Показать ещё (осталось ' + remaining + ')';
    btn.style.display = 'block';
  } else {
    btn.style.display = 'none';
  }
}

// ===== Отрисовка мелочей =====
function getStars(rating) {
  const full = Math.round(rating / 2);
  return '★★★★★'.slice(0, full) + '☆☆☆☆☆'.slice(0, 5 - full);
}

function buildRatingWidget(item) {
  const userRating = ratings[item.id] || 0;
  let html = '<div class="rating-row"><span class="rating-label">Твоя оценка:</span><span class="stars">';
  for (let i = 1; i <= 5; i++) {
    html += '<button class="star-btn' + (i <= userRating ? ' on' : '') + '" onclick="rateMovie(\'' + item.id + '\',' + i + ')">★</button>';
  }
  html += '</span>';
  if (userRating > 0) html += '<span class="rating-label">' + userRating + '/5</span>';
  html += '</div>';
  return html;
}

function ageClass(age) {
  if (age === '6+') return 'age-6';
  if (age === '12+') return 'age-12';
  if (age === '16+') return 'age-16';
  return 'age-18';
}

function buildServiceLinks(item) {
  const query = item.title + ' ' + item.year;
  let html = '<div class="services-label">Где смотреть:</div><div class="services">';
  services.forEach(function(s) {
    html += '<a class="service-chip" target="_blank" rel="noopener" href="' + s.url(query) + '">' + s.name + '</a>';
  });
  const trailerQuery = item.title + ' ' + item.year + ' трейлер';
  html += '</div>' +
    '<div class="services-label">Трейлер:</div><div class="services">' +
    '<a class="service-chip service-trailer" target="_blank" rel="noopener" ' +
    'href="https://yandex.ru/video/search?text=' + encodeURIComponent(trailerQuery) + '">▶ Смотреть трейлер</a>' +
    '</div>';
  return html;
}

function buildPlaceholder(m) {
  const words = String(m.title).split(' ');
  const lines = [];
  let cur = '';
  words.forEach(function(w) {
    if (cur && (cur + ' ' + w).length > 18) { lines.push(cur); cur = w; }
    else { cur = cur ? cur + ' ' + w : w; }
  });
  if (cur) lines.push(cur);
  if (lines.length > 4) { lines.length = 3; lines[2] += '…'; }
  const startY = 470 - (lines.length - 1) * 20;
  let titleSvg = '';
  lines.forEach(function(line, i) {
    titleSvg += "<text x='250' y='" + (startY + i * 42) + "' fill='#ffffff' font-size='30' font-weight='bold' text-anchor='middle' font-family='Arial, sans-serif'>" + line + "</text>";
  });
  const yearY = startY + lines.length * 42 + 6;
  const svg =
    "<svg xmlns='http://www.w3.org/2000/svg' width='500' height='750'>" +
    "<defs>" +
    "<linearGradient id='bg' x1='0' y1='0' x2='1' y2='1'>" +
    "<stop offset='0' stop-color='" + m.colors[0] + "'/>" +
    "<stop offset='1' stop-color='" + m.colors[1] + "'/>" +
    "</linearGradient>" +
    "<radialGradient id='glow' cx='0.5' cy='0.35' r='0.6'>" +
    "<stop offset='0' stop-color='white' stop-opacity='0.18'/>" +
    "<stop offset='1' stop-color='white' stop-opacity='0'/>" +
    "</radialGradient>" +
    "</defs>" +
    "<rect width='500' height='750' fill='url(#bg)'/>" +
    "<rect width='500' height='750' fill='url(#glow)'/>" +
    "<rect x='14' y='14' width='472' height='722' fill='none' stroke='#f2c14e' stroke-width='2' opacity='0.5' rx='10'/>" +
    "<circle cx='250' cy='235' r='95' fill='none' stroke='#f2c14e' stroke-width='3' opacity='0.55'/>" +
    "<text x='250' y='275' font-size='104' text-anchor='middle' font-family='Segoe UI Emoji, Apple Color Emoji, Noto Color Emoji, sans-serif'>" + m.icon + "</text>" +
    titleSvg +
    "<text x='250' y='" + yearY + "' fill='#f2c14e' font-size='26' text-anchor='middle' font-family='Arial, sans-serif'>" + m.year + "</text>" +
    "</svg>";
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

// ===== Отзывы =====
function getReviewsOf(id) {
  return reviews[id] || [];
}

function toggleReviews(id) {
  const panel = document.getElementById('reviews-' + id);
  if (panel) panel.classList.toggle('open');
}

function addReview(id) {
  const ta = document.getElementById('review-text-' + id);
  if (!ta) return;
  const text = ta.value.trim();
  if (!text) { showToast('Напиши что-нибудь сначала 🙂', false); return; }
  if (!reviews[id]) reviews[id] = [];
  reviews[id].push({
    text: text.slice(0, 500),
    date: new Date().toLocaleDateString('ru-RU'),
    stars: ratings[id] || 0
  });
  saveReviews();
  ta.value = '';
  showToast('💬 Отзыв сохранён', true);
  refreshCurrentScreen();
}

// ===== Экраны =====
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(function(s) { s.classList.remove('active'); });
  const target = document.getElementById(screenId);
  if (target) target.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function isFavoritesOpen() {
  const fav = document.getElementById('screen-favorites');
  return !!(fav && fav.classList.contains('active'));
}
function isWatchedOpen() {
  const w = document.getElementById('screen-watched');
  return !!(w && w.classList.contains('active'));
}
function isStatsOpen() {
  const s = document.getElementById('screen-stats');
  return !!(s && s.classList.contains('active'));
}

function updateFavCounter() {
  const el = document.getElementById('fav-count');
  if (el) el.textContent = favorites.length;
}
function updateWatchedCounter() {
  const el = document.getElementById('watched-count');
  if (el) el.textContent = watched.length;
}
function updateStatsCounter() {
  const el = document.getElementById('stats-count');
  if (el) el.textContent = Object.keys(ratings).length;
}

// ===== Модальное окно =====
function openModal(id) {
  const m = movies.find(function(x) { return x.id === id; });
  if (!m) return;
  window.__modalId = id;
  const modalFavBtn = favorites.indexOf(m.id) !== -1
    ? '<button class="remove-fav" onclick="removeFromFavorites(\'' + m.id + '\')">Уже в избранном — удалить?</button>'
    : '<button class="add-to-favs" onclick="addToFavorites(\'' + m.id + '\')">Хочу посмотреть</button>';
  const modalWatchBtn = watched.indexOf(m.id) !== -1
    ? '<button class="watch-btn" onclick="toggleWatched(\'' + m.id + '\')">✓ Смотрел — убрать метку</button>'
    : '<button class="watch-btn" onclick="toggleWatched(\'' + m.id + '\')">👁 Уже смотрел</button>';
  const content = document.getElementById('modal-content');
  if (!content) return;

  const revs = getReviewsOf(m.id);
    const revCount = revs.length;
  const revHtml = revs.length > 0
    ? '<div class="services-label">Твои отзывы (' + revs.length + '):</div>' +
      revs.map(function(r) {
        return '<div class="review-item"><b>' + (r.stars ? r.stars + '★ · ' : '') + escapeHtml(r.text) + '</b><div class="review-meta">' + r.date + '</div></div>';
      }).join('')
    : '<div class="review-empty">Отзывов пока нет — поставь оценку и напиши первый.</div>';

  content.innerHTML =
    '<div class="modal-title">' + m.title + '</div>' +
    '<div class="modal-year">' + m.year + ' · ' + m.age + ' · ' + m.duration + ' мин</div>' +
    '<div class="modal-facts">' +
      '<b>Режиссёр:</b> ' + m.director + '<br>' +
      '<b>Страна:</b> ' + m.country + '<br>' +
      '<b>Жанры:</b> ' + m.genres.join(', ') + '<br>' +
      '<b>Настроения:</b> ' + m.emotions.join(', ') + '<br>' +
      '<b>Рейтинг:</b> ' + getStars(m.rating) + ' ' + m.rating + '/10' +
    '</div>' +
    '<div class="modal-desc">' + m.description + '</div>' +
    '<div class="card-actions">' + modalFavBtn + modalWatchBtn +
      '<button class="ai-soft" onclick="aiAboutMovie(\'' + m.id + '\')">✨ Спросить ИИ</button>' +
    '</div>' +
    buildRatingWidget(m) +
    '<div class="card-actions">' +
      '<button class="share-btn" id="share-btn-' + m.id + '" onclick="shareMovie(\'' + m.id + '\')">📤 Поделиться</button>' +
      '<button class="review-toggle" onclick="toggleReviews(\'' + m.id + '\')">💬 Отзывы (' + revCount + ')</button>' +
    '</div>' +
    '<div class="review-panel" id="reviews-' + m.id + '">' +
      revHtml +
      '<div class="review-form">' +
        '<textarea id="review-text-' + m.id + '" placeholder="Твой отзыв о фильме..." maxlength="500"></textarea>' +
        '<button class="review-add" onclick="addReview(\'' + m.id + '\')">Сохранить</button>' +
      '</div>' +
    '</div>' +
    '<div class="share-messengers" id="share-row-' + m.id + '">' +
      '<a class="share-messenger share-tg" onclick="shareTelegram(\'' + m.id + '\')">Telegram</a>' +
      '<a class="share-messenger share-vk" onclick="shareVK(\'' + m.id + '\')">VK</a>' +
      '<a class="share-messenger share-wa" onclick="shareWhatsApp(\'' + m.id + '\')">WhatsApp</a>' +
      '<a class="share-messenger share-max" onclick="shareMax(\'' + m.id + '\')">Макс</a>' +
    '</div>' +
    '<div style="margin-bottom: 14px;">' + buildServiceLinks(m) + '</div>';

  document.getElementById('modal-overlay').classList.add('open');
}
function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) overlay.classList.remove('open');
}

// ===== Карточки =====
window.__fodOffset = 0;
function fodPoster(id) {
  return posterOf(id);
}
window.fodShift = function(dir) {
  window.__fodOffset = (window.__fodOffset || 0) + dir;
  renderResults([getFilmOfDay()], 'film-of-day', false);
};
window.renderFod = function(container, filmOfDay) {
  const n = movies.length;
  const base = movies.indexOf(filmOfDay);
  const centerIdx = ((base + (window.__fodOffset || 0)) % n + n) % n;
  const c = movies[centerIdx];
  const l = movies[(centerIdx - 1 + n) % n];
  const r = movies[(centerIdx + 1) % n];
  container.innerHTML =
    '<div class="fod-row">' +
      '<div class="fod-side" onclick="fodShift(-1)">' +
        '<img src="' + fodPoster(l.id) + '" alt="' + l.title + '">' +
        '<div class="fod-side-title">' + l.title + '</div>' +
      '</div>' +
      '<div class="fod-hero">' +
        '<img class="fod-poster" src="' + fodPoster(c.id) + '" alt="' + c.title + '" onclick="openModal(\'' + c.id + '\')">' +
        '<div class="fod-info">' +
          '<div class="card-title" onclick="openModal(\'' + c.id + '\')">' + c.title + '</div>' +
          '<div class="card-meta"><span class="card-year">' + c.year + ' · ' + c.age + ' · ' + c.duration + ' мин</span></div>' +
          '<div class="fod-dir">🎬 ' + c.director + ' · ' + c.country + '</div>' +
          '<div>' + c.genres.map(function(g){ return '<span class="genre-chip">' + g + '</span>'; }).join('') + '</div>' +
          '<div class="card-emotion">' + c.emotions.join(', ') + '</div>' +
          '<div class="card-desc">' + c.description + '</div>' +
          '<div class="card-rating">' + getStars(c.rating) + ' ' + c.rating + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="fod-side" onclick="fodShift(1)">' +
        '<img src="' + fodPoster(r.id) + '" alt="' + r.title + '">' +
        '<div class="fod-side-title">' + r.title + '</div>' +
      '</div>' +
    '</div>' +
    '<div class="fod-arrows">' +
      '<button class="fod-arrow" onclick="fodShift(-1)">‹</button>' +
      '<span class="fod-counter">' + (centerIdx + 1) + ' / ' + n + '</span>' +
      '<button class="fod-arrow" onclick="fodShift(1)">›</button>' +
    '</div>';
};
function renderResults(items, containerId, isFavoriteMode) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  if (containerId === 'film-of-day' && items.length && items[0]) { window.renderFod(container, items[0]); return; }
  const noFavorites = document.getElementById('no-favorites');

  if (items.length === 0) {
    if (isFavoriteMode && noFavorites) noFavorites.style.display = 'block';
    return;
  } else if (noFavorites) {
    noFavorites.style.display = 'none';
  }

  items.forEach(function(item, idx) {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.animationDelay = (idx * 0.06) + 's';
    const isInFavorites = favorites.indexOf(item.id) !== -1;
    const isWatched = watched.indexOf(item.id) !== -1;
    const revCount = getReviewsOf(item.id).length;

    let buttonHtml = '';
    if (isFavoriteMode) {
      buttonHtml = '<button class="remove-fav" onclick="removeFromFavorites(\'' + item.id + '\')">Удалить из избранного</button>';
    } else if (isInFavorites) {
      buttonHtml = '<button class="remove-fav" onclick="removeFromFavorites(\'' + item.id + '\')">Уже в избранном — удалить?</button>';
    } else {
      buttonHtml = '<button class="add-to-favs" onclick="addToFavorites(\'' + item.id + '\')">Хочу посмотреть</button>';
    }

    const watchButtonHtml = isWatched
      ? '<button class="watch-btn" onclick="toggleWatched(\'' + item.id + '\')">✓ Смотрел — убрать метку</button>'
      : '<button class="watch-btn" onclick="toggleWatched(\'' + item.id + '\')">👁 Уже смотрел</button>';

    const watchedBadgeHtml = isWatched ? '<span class="watched-badge">✓ Уже смотрел</span>' : '';

    const genreChips = item.genres.map(function(g) {
      return '<span class="genre-chip">' + g + '</span>';
    }).join('');

    const revs = getReviewsOf(item.id);
    const reviewsHtml = revs.length > 0
      ? revs.map(function(r) {
          return '<div class="review-item"><b>' + (r.stars ? r.stars + '★ · ' : '') + escapeHtml(r.text) + '</b><div class="review-meta">' + r.date + '</div></div>';
        }).join('')
      : '<div class="review-empty">Отзывов пока нет. Напиши первый — он сохранится навсегда.</div>';

    const img = document.createElement('img');
    img.className = 'card-poster';
    img.alt = item.title;
    img.onerror = function() { img.onerror = null; img.src = buildPlaceholder(item); };
      img.onclick = function() { openModal(item.id); };
      img.style.cursor = 'pointer';
      img.src = posterOf(item.id);






    const body = document.createElement('div');
    body.className = 'card-body';
    body.innerHTML =
      '<div class="card-title" onclick="openModal(\'' + item.id + '\')" title="Подробнее о фильме">' + item.title + '</div>' +
      '<div class="card-meta">' +
        '<span class="card-year">' + item.year + '</span>' +
        '<span class="age-badge ' + ageClass(item.age) + '">' + item.age + '</span>' +
        watchedBadgeHtml +
      '</div>' +
      '<div class="card-info">' +
        '<b>Режиссёр:</b> ' + item.director + '<br>' +
        '<b>Страна:</b> ' + item.country + ' &nbsp;•&nbsp; <b>Время:</b> ' + item.duration + ' мин' +
      '</div>' +
      '<div>' + genreChips + '</div>' +
      '<div class="card-emotion">' + item.emotions.join(', ') + '</div>' +
      '<div class="card-desc">' + item.description + '</div>' +
      '<div class="card-rating">' + getStars(item.rating) + ' ' + item.rating + '</div>' +
      buildRatingWidget(item) +
      '<div class="card-actions">' + buttonHtml + watchButtonHtml +
        '<button class="share-btn" id="share-btn-' + item.id + '" onclick="shareMovie(\'' + item.id + '\')">📤 Поделиться</button>' +
        '<button class="review-toggle" onclick="toggleReviews(\'' + item.id + '\')">💬 Отзывы (' + revCount + ')</button>' +
        '<button class="ai-soft" onclick="aiAboutMovie(\'' + item.id + '\')">✨ Спросить ИИ</button>' +
      '</div>' +
      '<div class="review-panel" id="reviews-' + item.id + '">' +
        reviewsHtml +
        '<div class="review-form">' +
          '<textarea id="review-text-' + item.id + '" placeholder="Твой отзыв о фильме..." maxlength="500"></textarea>' +
          '<button class="review-add" onclick="addReview(\'' + item.id + '\')">Сохранить</button>' +
        '</div>' +
      '</div>' +
      '<div class="share-messengers" id="share-row-' + item.id + '">' +
        '<a class="share-messenger share-tg" onclick="shareTelegram(\'' + item.id + '\')">Telegram</a>' +
        '<a class="share-messenger share-vk" onclick="shareVK(\'' + item.id + '\')">VK</a>' +
        '<a class="share-messenger share-wa" onclick="shareWhatsApp(\'' + item.id + '\')">WhatsApp</a>' +
        '<a class="share-messenger share-max" onclick="shareMax(\'' + item.id + '\')">Макс</a>' +
      '</div>' +
      buildServiceLinks(item);

    card.appendChild(img);
    card.appendChild(body);
    container.appendChild(card);
  });
}

let lastFullItems = [];

function renderResultsScreen() {
  const view = applyView(lastFullItems);
  updateResultsNote(view.filteredTotal, view.shown.length);
  updateMoreButton(view.filteredTotal, view.shown.length);
  renderResults(view.shown, 'results-list', false);
}

function refreshCurrentScreen() {
  updateFavCounter();
  updateWatchedCounter();
  updateStatsCounter();
  if (isStatsOpen()) {
    renderStats();
  } else if (isWatchedOpen()) {
    renderWatched();
  } else if (isFavoritesOpen()) {
    renderFavorites();
  } else {
    renderResultsScreen();
  }
  renderResults([getFilmOfDay()], 'film-of-day', false);
}

window.addToFavorites = function(id) {
  if (favorites.indexOf(id) === -1) {
    favorites.push(id);
    localStorage.setItem('mood_movies_favorites', JSON.stringify(favorites));
    const m = movies.find(function(x) { return x.id === id; });
    showToast('❤️ «' + (m ? m.title : 'Фильм') + '» — в избранном', true);
    refreshCurrentScreen();
  }
};

window.removeFromFavorites = function(id) {
  favorites = favorites.filter(function(f) { return f !== id; });
  localStorage.setItem('mood_movies_favorites', JSON.stringify(favorites));
  refreshCurrentScreen();
};

window.rateMovie = function(id, stars) {
  ratings[id] = stars;
  saveRatings();
  const m = movies.find(function(x) { return x.id === id; });
  showToast('⭐ «' + (m ? m.title : 'Фильм') + '» — оценка ' + stars + '/5', true);
  refreshCurrentScreen();
};

window.toggleWatched = function(id) {
  const index = watched.indexOf(id);
  if (index === -1) {
    watched.push(id);
    const m = movies.find(function(x) { return x.id === id; });
    showToast('🎬 «' + (m ? m.title : 'Фильм') + '» — отмечен как просмотренный', true);
  } else {
    watched.splice(index, 1);
  }
  localStorage.setItem('mood_movies_watched', JSON.stringify(watched));
  try {
    var wlog = {};
    try { wlog = JSON.parse(localStorage.getItem('mood_movies_watched_log')) || {}; } catch(eW) { wlog = {}; }
    if (index === -1) wlog[String(id)] = Date.now(); else delete wlog[String(id)];
    localStorage.setItem('mood_movies_watched_log', JSON.stringify(wlog));
  } catch(eW2) {}
  refreshCurrentScreen();
};

// ===== Поделиться =====
function buildShareText(id) {
  const m = movies.find(function(x) { return x.id === id; });
  if (!m) return null;
  const link = 'https://www.kinopoisk.ru/index.php?kp_query=' + encodeURIComponent(m.title + ' ' + m.year);
  let text = '🎬 «' + m.title + '» (' + m.year + ')';
  text += '\n⭐ Рейтинг: ' + m.rating + '/10';
  text += '\n🎭 ' + m.genres.join(', ');
  text += '\n🎬 Режиссёр: ' + m.director;
  text += '\n🌍 ' + m.country + ' • ' + m.duration + ' мин';
  if (ratings[id]) { text += '\nМоя оценка: ' + ratings[id] + '/5'; }
  text += '\n\n' + m.description;
  text += '\n\nНайти: ' + link;
  text += '\n\n— подобрано на Mood Movies';
  return { movie: m, link: link, text: text };
}

function openShareRow(id) {
  const row = document.getElementById('share-row-' + id);
  if (row) row.classList.add('open');
}

window.shareMovie = function(id) {
  const pack = buildShareText(id);
  if (!pack) return;
  const btn = document.getElementById('share-btn-' + id);
  function markCopied() {
    if (!btn) return;
    const old = btn.textContent;
    btn.textContent = '✅ Скопировано';
    btn.classList.add('copied');
    setTimeout(function() { btn.textContent = old; btn.classList.remove('copied'); }, 2000);
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(pack.text).then(markCopied).catch(function() { fallbackCopy(pack.text, markCopied); });
  } else {
    fallbackCopy(pack.text, markCopied);
  }
  openShareRow(id);
};

function fallbackCopy(text, onDone) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try {
    document.execCommand('copy');
    if (onDone) onDone();
  } catch (e) {
    window.prompt('Скопируй текст вручную (Ctrl+C):', text);
  }
  document.body.removeChild(ta);
}

function openShare(url, text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(function() {});
  }
  window.open(url, '_blank', 'noopener');
}

window.shareTelegram = function(id) {
  const pack = buildShareText(id);
  if (!pack) return;
  const shortText = '🎬 «' + pack.movie.title + '» (' + pack.movie.year + ') ⭐ ' + pack.movie.rating + '/10\n' + pack.link;
  openShare('https://t.me/share/url?url=' + encodeURIComponent(pack.link) + '&text=' + encodeURIComponent(shortText), pack.text);
};

window.shareVK = function(id) {
  const pack = buildShareText(id);
  if (!pack) return;
  openShare('https://vk.com/share.php?url=' + encodeURIComponent(pack.link) + '&title=' + encodeURIComponent('«' + pack.movie.title + '» (' + pack.movie.year + ')'), pack.text);
};

window.shareWhatsApp = function(id) {
  const pack = buildShareText(id);
  if (!pack) return;
  openShare('https://wa.me/?text=' + encodeURIComponent(pack.text), pack.text);
};

window.shareMax = function(id) {
  const pack = buildShareText(id);
  if (!pack) return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(pack.text).catch(function() { fallbackCopy(pack.text, null); });
  } else {
    fallbackCopy(pack.text, null);
  }
  window.open('https://max.ru', '_blank', 'noopener');
};

// ===== Избранное =====
function renderFavorites() {
  const favItems = movies.filter(function(m) { return favorites.indexOf(m.id) !== -1; });
  renderResults(favItems, 'favorites-list', true);
}

// ===== История =====
function renderWatched() {
  const watchedItems = movies.filter(function(m) { return watched.indexOf(m.id) !== -1; });
  const note = document.getElementById('watched-note');
  if (note) {
    if (watchedItems.length > 0) {
      note.textContent = 'Просмотрено ' + watchedItems.length + ' из ' + movies.length + ' 🎬';
      note.style.display = 'block';
    } else {
      note.style.display = 'none';
    }
  }
  renderResults(watchedItems, 'watched-list', false);
  const noWatched = document.getElementById('no-watched');
  if (noWatched) noWatched.style.display = watchedItems.length === 0 ? 'block' : 'none';
}

// ===== Статистика =====
function buildStatsData() {
  const watchedItems = movies.filter(function(m) { return watched.indexOf(m.id) !== -1; });
  const ratedIds = Object.keys(ratings).filter(function(id) { return ratings[id] > 0; });

  const moodCounts = {};
  watchedItems.forEach(function(m) {
    m.emotions.forEach(function(e) {
      const key = normalize(e);
      moodCounts[key] = (moodCounts[key] || 0) + 1;
    });
  });
  const moodList = Object.keys(moodCounts)
    .map(function(k) { return { mood: k, count: moodCounts[k] }; })
    .sort(function(a, b) { return b.count - a.count; });

  let avg = 0;
  if (ratedIds.length > 0) {
    const sum = ratedIds.reduce(function(acc, id) { return acc + ratings[id]; }, 0);
    avg = sum / ratedIds.length;
  }

  const topRated = ratedIds
    .map(function(id) { return movies.find(function(m) { return m.id === id; }); })
    .filter(Boolean)
    .sort(function(a, b) {
      const diff = ratings[b.id] - ratings[a.id];
      if (diff !== 0) return diff;
      return b.rating - a.rating;
    })
    .slice(0, 3);

  return {
    watchedCount: watchedItems.length,
    totalCount: movies.length,
    ratedCount: ratedIds.length,
    avgRating: avg,
    moodList: moodList,
    topRated: topRated,
    reviewCount: Object.keys(reviews).reduce(function(acc, id) { return acc + reviews[id].length; }, 0),
    recommendations: getRatedRecommendations()
  };
}

function renderStats() {
  const data = buildStatsData();
  const content = document.getElementById('stats-content');
  const noStats = document.getElementById('no-stats');
  if (!content) return;

  if (data.watchedCount === 0 && data.ratedCount === 0) {
    content.innerHTML = '';
    if (noStats) noStats.style.display = 'block';
    return;
  }
  if (noStats) noStats.style.display = 'none';

  const percent = Math.round((data.watchedCount / data.totalCount) * 100);
  let html = '';

  html += '<div class="stats-box">';
  html += '<div class="stats-title">🎬 Просмотры</div>';
  html += '<div class="stat-row"><span>Просмотрено фильмов</span><span class="stat-value">' + data.watchedCount + ' из ' + data.totalCount + '</span></div>';
  html += '<div class="stat-bar"><div class="stat-bar-fill" style="width: ' + percent + '%;"></div></div>';
  html += '</div>';

  if (data.ratedCount > 0) {
    html += '<div class="stats-box">';
    html += '<div class="stats-title">⭐ Оценки</div>';
    html += '<div class="stat-row"><span>Ты оценил фильмов</span><span class="stat-value">' + data.ratedCount + '</span></div>';
    html += '<div class="stat-row"><span>Средняя твоя оценка</span><span class="stat-value">' + data.avgRating.toFixed(1) + ' из 5</span></div>';
    html += '</div>';
  }

  if (data.reviewCount > 0) {
    html += '<div class="stats-box">';
    html += '<div class="stats-title">💬 Отзывы</div>';
    html += '<div class="stat-row"><span>Написано отзывов</span><span class="stat-value">' + data.reviewCount + '</span></div>';
    html += '</div>';
  }

  if (data.moodList.length > 0) {
    const maxMoodCount = data.moodList[0].count;
    html += '<div class="stats-box">';
    html += '<div class="stats-title">💛 Что ты смотришь</div>';
    data.moodList.slice(0, 5).forEach(function(entry) {
      const label = MOOD_LABELS[entry.mood] || entry.mood;
      const width = maxMoodCount > 0 ? Math.round((entry.count / maxMoodCount) * 100) : 0;
      html += '<div class="stat-row"><span>' + label + '</span><span class="stat-value">' + entry.count + '</span></div>';
      html += '<div class="stat-bar"><div class="stat-bar-fill" style="width: ' + width + '%;"></div></div>';
    });
    html += '</div>';
  }

  if (data.topRated.length > 0) {
    html += '<div class="stats-box">';
    html += '<div class="stats-title">🏆 Твои фавориты</div>';
    data.topRated.forEach(function(m, i) {
      const medal = ['🥇', '🥈', '🥉'][i] || '⭐';
      html += '<div class="stat-row"><span>' + medal + ' «' + m.title + '»</span><span class="stat-value">' + ratings[m.id] + '/5</span></div>';
    });
    html += '</div>';
  }

  if (data.recommendations.length > 0) {
    html += '<div class="stats-title" style="margin-top: 24px;">💡 Тебе может понравиться</div>';
    html += '<div id="stats-recommend"></div>';
  } else if (data.ratedCount === 0) {
    html += '<div class="stats-box"><div class="stats-hint">Поставь несколько оценок звёздами — и здесь появятся фильмы под твой вкус 💡</div></div>';
  }

  content.innerHTML = html;

  if (data.recommendations.length > 0) {
    renderResults(data.recommendations, 'stats-recommend', false);
  }
}

// ===== Поиск =====
function showSearchResults(query) {
  const found = searchMovies(query);
  const titleEl = document.getElementById('results-title');
  if (titleEl) titleEl.textContent = 'Поиск: «' + query.trim() + '»';
  shownExtraPages = 0;
  lastFullItems = found;
  renderResultsScreen();
  const container = document.getElementById('results-list');
  if (container && found.length === 0 && query.trim() !== '') {
    container.innerHTML = '<div class="search-empty">Ничего не нашлось. Попробуй другое название или имя режиссёра 🙂</div>';
  }
  showScreen('screen-results');
}

// ===== Для двоих =====
function runCoupleSearch() {
  const mine = document.getElementById('mood-mine').value;
  const partner = document.getElementById('mood-partner').value;
  const noteEl = document.getElementById('couple-note');
  const a = normalize(moodSynonyms[normalize(mine)] || mine);
  const b = normalize(moodSynonyms[normalize(partner)] || partner);
  const both = movies.filter(function(m) {
    const emos = m.emotions.map(normalize);
    return emos.indexOf(a) !== -1 && emos.indexOf(b) !== -1;
  });
  const picks = getCouplePicks(mine, partner);
  const labelA = MOOD_LABELS[a] || a;
  const labelB = MOOD_LABELS[b] || b;
  if (both.length >= 3) {
    noteEl.innerHTML = '<div class="couple-result-note">Фильмы, где есть и «' + labelA + '», и «' + labelB + '» сразу 💛</div>';
  } else {
    noteEl.innerHTML = '<div class="couple-result-note">Фильмов с обоими настроениями мало — добавил лучшее из каждого списка 🙂</div>';
  }
  renderResults(picks, 'couple-list', false);
}

// ===== Чат-помощник =====
const chatAnswers = {
  'Как добавить фильм в избранное?': 'На каждой карточке есть кнопка «Хочу посмотреть» — фильм попадёт в раздел ❤️ Избранное в шапке. Кнопка превращается в «Уже в избранном — удалить?», так что всегда можно передумать.',
  'Как работает подборка по настроению?': 'У каждого фильма в базе есть набор настроений — плачу, смеюсь, поразмышляю и другие. Жмёшь кнопку настроения, и я выбираю все фильмы с совпадением, сортирую случайно и показываю. Фильтрами сверху можно сузить выдачу.',
  'Как работают рекомендации по оценкам?': 'Я смотрю фильмы, которым ты поставил 4–5 звёзд, беру их жанры (с двойным весом) и настроения, а потом ищу непросмотренные фильмы с теми же признаками. Чем больше оценок — тем точнее подбор.',
  'Где хранятся мои данные?': 'Всё — избранное, оценки, просмотры, отзывы, тема — хранится в localStorage твоего браузера. Ничего не улетает в сеть: сайт полностью локальный. Если очистить данные браузера — история пропадёт.',
  'Работает ли сайт без интернета?': 'Да! После загрузки страницы всё работает офлайн: подборки, избранное, статистика. Интернет нужен только чтобы открывать ссылки «Где смотреть» и трейлеры.'
};

function showChatAnswer(question) {
  const panel = document.getElementById('chat-a');
  if (!panel) return;
  panel.textContent = chatAnswers[question] || 'Спроси что-нибудь из списка выше 🙂';
  panel.classList.add('show');
}

// ===== Инициализация =====
document.addEventListener('DOMContentLoaded', function() {
  const savedTheme = localStorage.getItem('mood_movies_theme') || 'dark';
  applyTheme(savedTheme);

  updateFavCounter();
  updateWatchedCounter();
  updateStatsCounter();
  fillGenreFilter();
  fillYearFilter();
  renderResults([getFilmOfDay()], 'film-of-day', false);

  const themeBtn = document.getElementById('theme-btn');
  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

  const chatBtn = document.getElementById('chat-btn');
  const chatPanel = document.getElementById('chat-panel');
  if (chatBtn && chatPanel) {
    chatBtn.addEventListener('click', function() { chatPanel.classList.toggle('open'); });
    chatPanel.querySelectorAll('.chat-q').forEach(function(q) {
      q.addEventListener('click', function() { showChatAnswer(q.dataset.a); });
    });
  }

  const modalOverlay = document.getElementById('modal-overlay');
  const modalClose = document.getElementById('modal-close');
  if (modalOverlay) {
    modalOverlay.addEventListener('click', function(e) {
      if (e.target === modalOverlay) closeModal();
    });
  }
  if (modalClose) modalClose.addEventListener('click', closeModal);
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeModal();
  });

  const favCounter = document.getElementById('fav-counter');
  if (favCounter) favCounter.addEventListener('click', function() { renderFavorites(); showScreen('screen-favorites'); });

  const watchedCounter = document.getElementById('watched-counter');
  if (watchedCounter) watchedCounter.addEventListener('click', function() { renderWatched(); showScreen('screen-watched'); });

  const statsCounter = document.getElementById('stats-counter');
  if (statsCounter) statsCounter.addEventListener('click', function() { renderStats(); showScreen('screen-stats'); });

  const btnBackHome = document.getElementById('back-home');
  if (btnBackHome) btnBackHome.addEventListener('click', function() { showScreen('screen-home'); });

  const btnBackFavs = document.getElementById('back-home-from-favs');
  if (btnBackFavs) btnBackFavs.addEventListener('click', function() { showScreen('screen-home'); });

  const btnBackCouple = document.getElementById('back-home-from-couple');
  if (btnBackCouple) btnBackCouple.addEventListener('click', function() { showScreen('screen-home'); });

  const btnBackWatched = document.getElementById('back-home-from-watched');
  if (btnBackWatched) btnBackWatched.addEventListener('click', function() { showScreen('screen-home'); });

  const btnBackStats = document.getElementById('back-home-from-stats');
  if (btnBackStats) btnBackStats.addEventListener('click', function() { showScreen('screen-home'); });

  document.querySelectorAll('.mood-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      const mood = btn.dataset.mood || btn.textContent;
      const titleEl = document.getElementById('results-title');
      if (titleEl) titleEl.textContent = 'Фильмы для настроения';
      shownExtraPages = 0;
      lastFullItems = getRecommendations(mood);
      renderResultsScreen();
      showScreen('screen-results');
    });
  });

  const btnRandom = document.getElementById('btn-random');
  if (btnRandom) {
    btnRandom.addEventListener('click', function() {
      const one = movies[Math.floor(Math.random() * movies.length)];
      const titleEl = document.getElementById('results-title');
      if (titleEl) titleEl.textContent = 'Случайный фильм';
      shownExtraPages = 0;
      lastFullItems = [one];
      renderResultsScreen();
      showScreen('screen-results');
    });
  }

  const btnRecommend = document.getElementById('btn-recommend');
  if (btnRecommend) {
    btnRecommend.addEventListener('click', function() {
      const picks = getRatedRecommendations();
      const titleEl = document.getElementById('results-title');
      if (titleEl) titleEl.textContent = 'Тебе может понравиться';
      shownExtraPages = 0;
      lastFullItems = picks;
      renderResultsScreen();
      showScreen('screen-results');
      const container = document.getElementById('results-list');
      if (container && picks.length === 0) {
        container.innerHTML = '<div class="search-empty">Пока нечего рекомендовать. Поставь оценки 4–5 звёзд паре фильмов — и я найду похожие 💡</div>';
      }
    });
  }

  const btnCouple = document.getElementById('btn-couple');
  if (btnCouple) {
    btnCouple.addEventListener('click', function() {
      document.getElementById('couple-note').innerHTML = '';
      document.getElementById('couple-list').innerHTML = '';
      showScreen('screen-couple');
    });
  }

  const btnCoupleFind = document.getElementById('btn-couple-find');
  if (btnCoupleFind) btnCoupleFind.addEventListener('click', runCoupleSearch);

  const btnNext = document.getElementById('btn-next');
  if (btnNext) {
    btnNext.addEventListener('click', function() {
      const one = movies[Math.floor(Math.random() * movies.length)];
      const titleEl = document.getElementById('results-title');
      if (titleEl) titleEl.textContent = 'Случайный фильм';
      shownExtraPages = 0;
      lastFullItems = [one];
      renderResultsScreen();
    });
  }

  const btnMore = document.getElementById('btn-more');
  if (btnMore) {
    btnMore.addEventListener('click', function() {
      const before = document.querySelectorAll('#results-list .card').length;
      shownExtraPages++;
      renderResultsScreen();
      const cards = document.querySelectorAll('#results-list .card');
      if (cards.length > before) {
        cards[before].scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  ['sel-count', 'sel-rating', 'sel-genre', 'sel-year', 'sel-sort'].forEach(function(id) {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', function() {
      shownExtraPages = 0;
      renderResultsScreen();
    });
  });

  const btnSearch = document.getElementById('btn-search');
  const searchInput = document.getElementById('search-input');
  if (btnSearch) btnSearch.addEventListener('click', function() { showSearchResults(searchInput.value); });
  if (searchInput) {
    searchInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') showSearchResults(searchInput.value);
    });
  }
});


(function(){
  'use strict';
  var lastReq = 0;

  function esc(t){ return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function buildCatalog(){
    try {
      return movies.map(function(m){
        var g = Array.isArray(m.genres) ? m.genres.join(', ') : '';
        var e = Array.isArray(m.emotions) ? m.emotions.join(', ') : '';
        return (m.title || '') + ' (' + (m.year || '') + ') — жанры: ' + g + '; настроение: ' + e + '; рейтинг ' + (m.rating || '') + '; ' + (m.age || '');
      }).join('\n');
    } catch(err){ return ''; }
  }

  function buildProfile(){
    var out = [];
    if (Array.isArray(favorites) && favorites.length) {
      var favTitles = [];
      favorites.forEach(function(id){
        movies.forEach(function(m){ if (String(m.id) === String(id)) favTitles.push(m.title); });
      });
      if (favTitles.length) out.push('ИЗБРАННОЕ ПОЛЬЗОВАТЕЛЯ: ' + favTitles.join(', '));
    }
    if (Array.isArray(watched) && watched.length) {
      var seen = [];
      watched.forEach(function(id){
        movies.forEach(function(m){ if (String(m.id) === String(id)) seen.push(m.title); });
      });
      if (seen.length) out.push('УЖЕ ПРОСМОТРЕНО (не советовать повторно): ' + seen.join(', '));
    }
    var hi = [];
    if (ratings && typeof ratings === 'object') {
      Object.keys(ratings).forEach(function(id){
        if ((ratings[id] || 0) >= 8) {
          movies.forEach(function(m){ if (String(m.id) === String(id)) hi.push(m.title + ' (' + ratings[id] + '/10)'); });
        }
      });
    }
    if (hi.length) out.push('ВЫСОКИЕ ОЦЕНКИ (8+): ' + hi.join(', '));
    return out.length ? 'ПРОФИЛЬ ЗРИТЕЛЯ:\n' + out.join('\n') : '';
  }

  function aiAntiRepeat(){
    var named = [];
    aiHist.forEach(function(x){ if (x.who === 'ai') named.push(x.text); });
    var blob = named.slice(-10).join(' ');
    var mm = blob.match(/«[^»]+»/g) || [];
    var hints = ['Приведи менее очевидные примеры', 'Предложи неожиданный выбор', 'Возьми фильм, который редко советуют', 'Варьируй страны и эпохи', 'Избегай самых известных хитов'];
    return (mm.length ? 'НЕ ПОВТОРЯЙ фильмы из этих ответов: ' + mm.join(', ') + '. ' : '') + hints[Math.floor(Math.random() * hints.length)] + '.\n\n';
  }
  function buildSystem(){
    return 'Ты — ИИ-кинокритик и энциклопедия кино: ты знаешь мировое кино целиком. Отвечай на грамотном русском: БЕЗ markdown — никаких таблиц, звёздочек, решёток и строк из дефисов; только чистый текст; названия фильмов пиши в «ёлочках». Любое название в вопросе — это фильм, сериал или мультфильм, а не что-либо другое: не описывай города, сёла, реки и случайных однофамильцев. Не выдумывай факты: если ниже есть КРАТКАЯ СПРАВКА ИЗ ВИКИПЕДИИ или ПРОВЕРЕННЫЕ ФАКТЫ — строй ответ строго по ним и приводи факты уверенно: год, страну, жанр, создателей, актёров и озвучку, бюджет и кассовые сборы — ставь такие факты в начало. Если справки нет — отвечай по общеизвестным данным о фильме: это твоя сильная сторона, ты знаешь знаменитые картины. ЗАПРЕЩЕНЫ фразы: «нет данных», «в каталоге нет», «не присутствует», «мне недоступны», «поищите в других источниках», «обратитесь к внешним базам», «проверьте актуальные данные», «в нашей базе нет сведений», «к сожалению», «уточните», «не могу найти», «нет информации». Если ниже есть КРАТКАЯ СПРАВКА ИЗ ВИКИПЕДИИ — называй только те актёров, режиссёров, годы и суммы, которые есть в справке; ничего не выдумывай. НЕ упоминай каталог Mood Movies и не предлагай ничего «нажать». Всегда указывай возрастной рейтинг; при 18+ предупреди, что детям нельзя. Если пользователь упомянул ребёнка или детей — предлагай только фильмы с рейтингом до 12+. Подбирая похожее — выбирай только близкие по жанру, эпохе и духу фильмы из каталога. Пиши связным текстом без списков и дефисов в начале строк. Отвечай живо и коротко (до 120 слов).\n\n' + aiAntiRepeat() + buildProfile() + '\n\nКАТАЛОГ:\n' + buildCatalog();
  }

  function fetchTO(url, opts, ms){
    return new Promise(function(resolve, reject){
      var done = false;
      var ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
      var timer = setTimeout(function(){ if(!done){ done = true; reject(new Error('таймаут')); } }, ms || 25000);
      var o = opts || {};
      if(ctrl) o.signal = ctrl.signal;
      fetch(url, o).then(function(r){
        if(done) return;
        if(!r.ok){ done = true; clearTimeout(timer); reject(new Error('HTTP ' + r.status)); return; }
        r.text().then(function(t){ if(!done){ done = true; clearTimeout(timer); resolve(t); } }, function(e){ if(!done){ done = true; clearTimeout(timer); reject(e); } });
      }, function(e){ if(!done){ done = true; clearTimeout(timer); reject(new Error('сеть')); } });
    });
  }

  function viaPost(sys, user, model, ms){
    return fetchTO('https://text.pollinations.ai/openai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: model || 'openai', messages: [ {role:'system', content: sys}, {role:'user', content: user} ] })
    }, ms || 25000).then(function(txt){
      try {
        var j = JSON.parse(txt);
        var c = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
        if(c && String(c).trim()) return String(c).trim();
      } catch(e){}
      if(txt && txt.length < 4000 && txt.trim().charAt(0) !== '{') return txt.trim();
      throw new Error('формат');
    });
  }

  function viaGet(sys, user, wiki){
    var w = String(wiki || '').slice(0, 1500);
    var prompt = 'Ответь коротко по-русски (до 80 слов). Если ниже есть справка — отвечай строго по ней, не придумывай актёров, годы и суммы. Если справки нет — говори о фильме только общими словами (жанр, сюжет в общих чертах), без конкретных имён и цифр. Справка: ' + (w || 'нет') + '. Вопрос: ' + user;
    return fetchTO('https://text.pollinations.ai/' + encodeURIComponent(prompt), {}, 12000).then(function(t){
      if(!t || !String(t).trim() || String(t).trim().charAt(0) === '{') throw new Error('пусто');
      return String(t).trim();
    });
  }

  function normText(t){ return String(t || '').toLowerCase().replace(/ё/g, 'е'); }
  function findMovieInText(t){
    var s = normText(t);
    var order = movies.map(function(m, i){ return i; }).sort(function(a, b){
      return normText(movies[b].title).length - normText(movies[a].title).length;
    });
    for (var j = 0; j < order.length; j++) {
      var i2 = order[j];
      var title = normText(movies[i2].title);
      if (title && title.length >= 2 && s.indexOf(title) >= 0) return movies[i2];
    }
    return null;
  }
  var WIKI_LAT = {'a':'а','b':'б','c':'ц','d':'д','e':'е','f':'ф','g':'г','h':'х','i':'и','j':'й','k':'к','l':'л','m':'м','n':'н','o':'о','p':'п','q':'к','r':'р','s':'с','t':'т','u':'у','v':'в','w':'в','x':'кс','y':'ы','z':'з'};
  function translit(str){
    return String(str || '').toLowerCase().replace(/[a-zçşğıöü]/gi, function(ch){
      var l = ch.toLowerCase();
      if (l === 'ç') return 'ч';
      if (l === 'ş') return 'ш';
      if (l === 'ı') return 'и';
      if (l === 'ğ') return 'г';
      if (l === 'ö') return 'о';
      if (l === 'ü') return 'ю';
      return WIKI_LAT[l] || ch;
    });
  }
  function normTitle(v){
    return translit(deAcc(v)).replace(/[^а-я0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function lev1(a, b){
    if (a === b) return true;
    if (Math.abs(a.length - b.length) > 1) return false;
    var i = 0, j = 0, diff = 0;
    while (i < a.length && j < b.length){
      if (a[i] === b[j]) { i++; j++; continue; }
      diff++;
      if (diff > 1) return false;
      if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
    }
    if (i < a.length || j < b.length) diff++;
    return diff <= 1;
  }
  function deAcc(v){
    try { return String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch(e){ return String(v || ''); }
  }
  function stripTypeWords(v){
    return String(v || '').replace(/мультсериал|телесериал|мультфильм|аниме|сериал|фильм|мульт/gi, ' ').replace(/\s+/g, ' ').trim();
  }
  function compactNorm(v){
    return translit(deAcc(v)).replace(/[^а-я0-9]/g, '');
  }
  function titleMatch(candTitle, query){
    var a = normTitle(stripTypeWords(query)), b = normTitle(stripTypeWords(candTitle));
    if (!a || !b) return false;
    if (b.indexOf(a) >= 0 || a.indexOf(b) >= 0) return true;
    var at = a.split(' ').filter(function(x){ return x.length >= 3; });
    var bt = b.split(' ').filter(function(x){ return x.length >= 3; });
    if (!at.length || !bt.length) return false;
    var ac = compactNorm(stripTypeWords(query)), bc = compactNorm(stripTypeWords(candTitle));
    if (ac.length >= 4 && (bc === ac || (bc.indexOf(ac) === 0 && !/\d/.test(bc.slice(ac.length))) || (ac.indexOf(bc) === 0 && !/\d/.test(ac.slice(bc.length))) || lev1(bc, ac))) return true;
    var hit = 0;
    at.forEach(function(x){
      var st = x.slice(0, 4);
      for (var i = 0; i < bt.length; i++) if (bt[i].slice(0, 4) === st) { hit++; break; }
    });
    return hit / at.length >= 0.6;
  }
  function cinemaScore(txt, wantSerial, wantCartoon){
    var t = String(txt || '').toLowerCase().slice(0, 800);
    if (/может означать|значения:|список значений|disambiguation|may refer to/.test(t)) return -100;
    var plus = [['телесериал', 5], ['мультсериал', 5], ['мультфильм', 5], ['анимационный', 4], ['сериал', 4], ['фильм', 3], ['кинокартина', 3], ['озвучк', 3], ['режиссёр', 2], ['режиссер', 2], ['сценарист', 2], ['премьера', 2], ['актёр', 2], ['актер', 2], ['кассов', 2], ['экранизац', 2], ['бюджет', 1], ['прокат', 1], ['эпизод', 1], ['tv series', 5], ['television series', 5], ['animated', 4], ['movie', 3], ['directed by', 2], ['starring', 2], ['box office', 2], ['screenplay', 2], ['premiere', 2]];
    var minus = [['населённый пункт', -6], ['населенный пункт', -6], ['муниципалитет', -6], ['село', -5], ['деревня', -5], ['река', -5], ['озеро', -5], ['футбольн', -5], ['хоккей', -5], ['альбом', -5], ['посёлок', -4], ['поселок', -4], ['коммуна', -4], ['политик', -4], ['песня', -4], ['растение', -4], ['горы', -4], ['остров', -3], ['музыкальн', -3], ['группа', -2], ['наук', -2], ['город', -2], ['village', -5], ['river', -5], ['lake', -5], ['album', -5], ['municipality', -6], ['politician', -4], ['band', -2], ['settlement', -5]];
    var sc = 0, i;
    for (i = 0; i < plus.length; i++) if (t.indexOf(plus[i][0]) >= 0) sc += plus[i][1];
    for (i = 0; i < minus.length; i++) if (t.indexOf(minus[i][0]) >= 0) sc += minus[i][1];
    if (wantSerial && /телесериал|сериал|tv series|television series/.test(t)) sc += 3;
    if (wantCartoon && /мульт|анимац|animated/.test(t)) sc += 3;
    return sc;
  }
  function cleanWikiVal(v){
    return String(v || '').replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, '').replace(/<ref[^>]*\/>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '').replace(/\[\[[^\]|]*\|([^\]]*)\]\]/g, '$1').replace(/\[\[([^\]]*)\]\]/g, '$1')
      .replace(/\{\{([^{}]*)\}\}/g, function(all, inner){
        var parts = inner.split('|');
        if (parts.length > 1 && /num|кино|мульт|флаг|abbr|s$/i.test(parts[0])) parts = parts.slice(1);
        return parts.join(', ');
      })
      .replace(/'{2,}/g, '').replace(/\s+/g, ' ').trim();
  }
  function wikiFacts(wikitext){
    var t = String(wikitext || '');
    if (!t) return '';
    var m = t.match(/\{\{\s*[Фф]ильм[\s\S]{0,4000}?\n\}\}/) || t.match(/\{\{\s*[Тт]елесериал[\s\S]{0,4000}?\n\}\}/) || t.match(/\{\{\s*[Мм]ультфильм[\s\S]{0,4000}?\n\}\}/);
    if (!m) return '';
    var box = m[0];
    function field(names){
      for (var i = 0; i < names.length; i++){
        var re = new RegExp('\\|\\s*' + names[i] + '\\s*=\\s*([^\\n]*)', 'i');
        var mm = box.match(re);
        if (mm && mm[1]) {
          var v = cleanWikiVal(mm[1]);
          if (v && v !== '-') return v.slice(0, 220);
        }
      }
      return '';
    }
    var rows = [
      ['Год', ['год', 'Год']],
      ['Жанр', ['жанр', 'Жанр']],
      ['Страна', ['страна', 'Страна']],
      ['Режиссёр', ['режиссёр', 'Режиссёр', 'режиссер']],
      ['Бюджет', ['бюджет', 'Бюджет']],
      ['Сборы', ['сборы', 'Сборы', 'кассовые сборы']],
      ['В ролях', ['в главных ролях', 'актеры', 'актёры', 'Актеры', 'Актёры']],
      ['Актёры озвучания', ['актёры озвучания', 'Актёры озвучания', 'озвучка']],
      ['Сезоны', ['кол_во_сезонов', 'сезонов', 'Сезоны', 'сезоны']],
      ['Серии', ['кол_во_серий', 'серий', 'Серии', 'серии']]
    ];
    var out = [];
    for (var i = 0; i < rows.length; i++){
      var v = field(rows[i][1]);
      if (v) out.push(rows[i][0] + ': ' + v);
    }
    return out.join('; ');
  }
  function wikitextFetch(title){
    var url = 'https://ru.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&origin=*&titles=' + encodeURIComponent(title);
    return fetchTO(url, {}, 7000).then(function(t){
      try {
        var j = JSON.parse(t);
        var pages = j && j.query && j.query.pages ? j.query.pages : {};
        for (var k in pages){
          var rv = pages[k].revisions && pages[k].revisions[0];
          if (rv && rv.slots && rv.slots.main) return rv.slots.main['*'] || '';
        }
      } catch(e){}
      return '';
    }).catch(function(){ return ''; });
  }
  function sumFetch(title){
    return fetchTO('https://ru.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(title), {}, 6000).then(function(t){
      try {
        var j = JSON.parse(t);
        return (j && j.extract) ? j.extract : '';
      } catch(e){ return ''; }
    }).catch(function(){ return ''; });
  }
  function wikiSummary(title){
    return sumFetch(title).then(function(ex){
      if (!ex) return '';
      return wikitextFetch(title).then(function(wt){
        var facts = wikiFacts(wt);
        return 'КРАТКАЯ СПРАВКА ИЗ ВИКИПЕДИИ о «' + title + '»: ' + ex + (facts ? '\nПРОВЕРЕННЫЕ ФАКТЫ из инфобокса статьи: ' + facts : '');
      });
    });
  }
  function translitLat(str){
    var map = {'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'e','ж':'zh','з':'z','и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'h','ц':'ts','ч':'ch','ш':'sh','щ':'sch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya'};
    return String(str || '').toLowerCase().split('').map(function(ch){ return map[ch] !== undefined ? map[ch] : ch; }).join('');
  }
  function titleMatchLat(candTitle, query){
    var a = translitLat(query).replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    var b = String(candTitle || '').toLowerCase();
    if (!a) return false;
    if (b.indexOf(a) >= 0 || a.indexOf(b) >= 0) return true;
    var at = a.split(' ').filter(function(x){ return x.length >= 3; });
    var bt = b.split(' ').filter(function(x){ return x.length >= 3; });
    if (!at.length || !bt.length) return false;
    var hit = 0;
    at.forEach(function(x){ var st = x.slice(0, 4); for (var i = 0; i < bt.length; i++) if (bt[i].slice(0, 4) === st) { hit++; break; } });
    return hit / at.length >= 0.6;
  }
  function wikitextFetchEn(title){
    var url = 'https://en.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&origin=*&titles=' + encodeURIComponent(title);
    return fetchTO(url, {}, 7000).then(function(t){
      try {
        var j = JSON.parse(t);
        var pages = j && j.query && j.query.pages ? j.query.pages : {};
        for (var k in pages){
          var rv = pages[k].revisions && pages[k].revisions[0];
          if (rv && rv.slots && rv.slots.main) return rv.slots.main['*'] || '';
        }
      } catch(e){}
      return '';
    }).catch(function(){ return ''; });
  }
  function sumFetchEn(title){
    return fetchTO('https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(title), {}, 6000).then(function(t){
      try {
        var j = JSON.parse(t);
        return (j && j.extract) ? j.extract : '';
      } catch(e){ return ''; }
    }).catch(function(){ return ''; });
  }
  function wikiFactsEn(wt){
    var t = String(wt || '');
    if (!t) return '';
    var m = t.match(/\{\{\s*Infobox film[\s\S]{0,6000}?\n\}\}/) || t.match(/\{\{\s*Infobox television[\s\S]{0,6000}?\n\}\}/) || t.match(/\{\{\s*Infobox anime[\s\S]{0,6000}?\n\}\}/);
    if (!m) return '';
    var box = m[0];
    function field(names){
      for (var i = 0; i < names.length; i++){
        var re = new RegExp('\\|\\s*' + names[i] + '\\s*=\\s*([^\\n]*)', 'i');
        var mm = box.match(re);
        if (mm && mm[1]) {
          var v = cleanWikiVal(mm[1]);
          if (v && v !== '-') return v.slice(0, 220);
        }
      }
      return '';
    }
    var rows = [
      ['Год', ['released', 'first_aired']],
      ['Жанр', ['genre']],
      ['Страна', ['country']],
      ['Режиссёр', ['directed_by', 'director']],
      ['Бюджет', ['budget']],
      ['Сборы', ['gross', 'revenue']],
      ['В ролях', ['starring']],
      ['Сезоны', ['num_seasons']],
      ['Серии', ['num_episodes']]
    ];
    var out = [];
    for (var i = 0; i < rows.length; i++){
      var v = field(rows[i][1]);
      if (v) out.push(rows[i][0] + ': ' + v);
    }
    return out.join('; ');
  }
  function wikiSearch(q){
    var base = String(q || '').trim();
    if (!base) return Promise.resolve('');
    var wantSerial = /сериал/i.test(q);
    var wantCartoon = /мульт/i.test(q);
    var tries = [base, base + ' фильм', base + ' телесериал', base + ' мультфильм'];
    var usedTitles = {};
    function run(i){
      if (i >= tries.length) return Promise.resolve('');
      var url = 'https://ru.wikipedia.org/w/api.php?action=query&list=search&srsearch=' + encodeURIComponent(tries[i]) + '&format=json&origin=*&srlimit=5';
      return fetchTO(url, {}, 6000).then(function(t){
        var j = JSON.parse(t);
        var hits = j && j.query && j.query.search ? j.query.search : [];
        var cand = [];
        for (var k = 0; k < hits.length; k++){
          if (usedTitles[hits[k].title]) continue;
          usedTitles[hits[k].title] = 1;
          cand.push(hits[k].title);
        }
        return checkCand(cand, 0);
      }).catch(function(){ return run(i + 1); });
    }
    function checkCand(cand, idx){
      if (idx >= cand.length) return Promise.resolve('');
      var title = cand[idx];
      if (!titleMatch(title, base)) return checkCand(cand, idx + 1);
      return sumFetch(title).then(function(ex){
        if (!ex) return checkCand(cand, idx + 1);
        var sc = cinemaScore(ex, wantSerial, wantCartoon);
        if (sc < 4) return checkCand(cand, idx + 1);
        return wikitextFetch(title).then(function(wt){
          var facts = wikiFacts(wt);
          return 'КРАТКАЯ СПРАВКА ИЗ ВИКИПЕДИИ о «' + title + '»: ' + ex + (facts ? '\nПРОВЕРЕННЫЕ ФАКТЫ из инфобокса статьи: ' + facts : '');
        });
      });
    }
    return run(0).then(function(res){
      if (res) return res;
      return runEn(0);
    });
    var lat0 = translitLat(stripTypeWords(base)).replace(/\s+/g, ' ').trim();
    var latList = [];
    [lat0, lat0.replace(/ch/g, 'c'), lat0.replace(/ch/g, 'h'), lat0.replace(/ts/g, 'c')].forEach(function(v){
      if (v && latList.indexOf(v) < 0) latList.push(v);
    });
    if (!latList.length) latList = [translitLat(base).trim()];
    function matchEnTitle(title){
      var plain = deAcc(String(title || '')).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
      var cmp = plain.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
      for (var k = 0; k < latList.length; k++){
        var v = latList[k];
        if (!v) continue;
        if (plain.indexOf(v) === 0 || cmp === v || cmp.indexOf(v) === 0) return true;
        if (Math.abs(cmp.length - v.length) <= 1 && lev1(cmp, v)) return true;
      }
      return false;
    }
    function runEn(i){
      if (i >= latList.length) return Promise.resolve('');
      var url = 'https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=' + encodeURIComponent(latList[i]) + '&format=json&origin=*&srlimit=5';
      return fetchTO(url, {}, 6000).then(function(t){
        var j = JSON.parse(t);
        var hits = j && j.query && j.query.search ? j.query.search : [];
        var cand = [];
        for (var k = 0; k < hits.length; k++){
          if (usedTitles[hits[k].title]) continue;
          usedTitles[hits[k].title] = 1;
          cand.push(hits[k].title);
        }
        return checkCandEn(cand, 0);
      }).catch(function(){ return runEn(i + 1); });
    }
    function checkCandEn(cand, idx){
      if (idx >= cand.length) return Promise.resolve('');
      var title = cand[idx];
      if (!matchEnTitle(title)) return checkCandEn(cand, idx + 1);
      return sumFetchEn(title).then(function(ex){
        if (!ex) return checkCandEn(cand, idx + 1);
        var sc = cinemaScore(ex, wantSerial, wantCartoon);
        if (sc < 4) return checkCandEn(cand, idx + 1);
        return wikitextFetchEn(title).then(function(wt){
          var facts = wikiFactsEn(wt);
          return 'КРАТКАЯ СПРАВКА ИЗ АНГЛИЙСКОЙ ВИКИПЕДИИ о «' + title + '» (статья на английском — перескажи по-русски, названия и цифры сохраняй точными): ' + ex + (facts ? '\nПРОВЕРЕННЫЕ ФАКТЫ из инфобокса статьи: ' + facts : '');
        });
      });
    }
  }
  function getWikiContext(q){
    var m = findMovieInText(q);
    if (m) return wikiSummary(m.title).then(function(s){ return s ? s : wikiSearch(q); });
    var subj = aiExtractSubject(q);
    return wikiSearch(subj && subj.length >= 3 ? subj : q);
  }
  function aiChain(sys, user, wiki){
    var models = [['openai-large', 12000], ['mistral', 14000], ['openai', 16000]];
    function run(i){
      if (i >= models.length) return viaGet(sys, user, wiki);
      return viaPost(sys, user, models[i][0], models[i][1]).then(function(r){
        if (!String(r || '').trim()) throw new Error('пусто');
        return r;
      }).catch(function(){ return run(i + 1); });
    }
    return run(0);
  }

    // ===== УМНЫЙ ОФЛАЙН-СОВЕТНИК =====
  var AI_SERVICES = [
    { n: '🔍 Яндекс', u: 'https://yandex.ru/search/?text=' },
    { n: 'Кинопоиск', u: 'https://www.kinopoisk.ru/index.php?kp_query=' },
    { n: 'Иви', u: 'https://www.ivi.ru/search/?q=' },
    { n: 'Okko', u: 'https://okko.tv/search?query=' },
    { n: 'Wink', u: 'https://wink.ru/search?query=' }
  ];
  function aiH(s){
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function aiWhereBtns(title){
    var q = encodeURIComponent(String(title || ''));
    var out = '<div class="ai-where"><span>Искать здесь:</span>';
    for (var i = 0; i < AI_SERVICES.length; i++) {
      out += '<a class="ai-where-btn" href="' + AI_SERVICES[i].u + q + '" target="_blank" rel="noopener">' + aiH(AI_SERVICES[i].n) + '</a>';
    }
    return out + '</div>';
  }
  var TMDB_KEY = '65d74b18432def614e220862fb83f816';
  var TMDB_NAMES = { 'Kinopoisk': 'Кинопоиск HD', 'Kinopoisk HD': 'Кинопоиск HD', 'Netflix': 'Netflix', 'Netflix Standard with Ads': 'Netflix (с рекламой)', 'ivi': 'Иви', 'Okko': 'Окко', 'Wink': 'Wink', 'Premier': 'Premier', 'KION': 'KION', 'Start': 'Start', 'Apple TV+': 'Apple TV+', 'Apple TV': 'Apple TV', 'Amazon Prime Video': 'Prime Video', 'YouTube': 'YouTube', 'Google Play Movies': 'Google Play', 'Disney Plus': 'Disney+', 'HBO Max': 'HBO Max', 'Rutube': 'Rutube', 'LIME': 'LIME', 'Now': 'Now', 'Amediateka': 'Амедиатека', 'TurboSistem': 'Турбосистема' };
  function tmdbTierHtml(tier, list){
    if (!list || !list.length) return '';
    var label = tier === 'free' ? 'Бесплатно' : tier === 'ads' ? 'Бесплатно с рекламой' : tier === 'flatrate' ? 'По подписке' : tier === 'rent' ? 'Аренда' : 'Покупка';
    var names = list.map(function(p){ return aiH(TMDB_NAMES[p.provider_name] || p.provider_name); });
    return '<div class="ai-note">• ' + label + ': ' + names.join(', ') + '</div>';
  }
  var TMDB_HOSTS = ['https://apitmdb.cub.red', 'https://api.lampa.mx', 'https://tmdb.cub.red', 'https://api.themoviedb.org'];
  var TMDB_OK = '';
  function tmdbFetch(path){
    var hosts = [];
    if (TMDB_OK) hosts.push(TMDB_OK);
    TMDB_HOSTS.forEach(function(h){ if (hosts.indexOf(h) < 0) hosts.push(h); });
    function run(i){
      if (i >= hosts.length) return Promise.reject(new Error('TMDB недоступен'));
      return fetchTO(hosts[i] + path, {}, 6000).then(function(t){
        TMDB_OK = hosts[i];
        return t;
      }).catch(function(){ return run(i + 1); });
    }
    return run(0);
  }
  function justwatchUrl(title){
    return 'https://yandex.ru/search/?text=' + encodeURIComponent(String(title || ''));
  }
  function tmdbWhereBlock(title){
    if (!TMDB_KEY) return Promise.resolve('');
    var st = String(title || '').trim();
    if (!st) return Promise.resolve('');
    var path = '/3/search/multi?api_key=' + TMDB_KEY + '&query=' + encodeURIComponent(st) + '&language=ru-RU&page=1';
    return tmdbFetch(path).then(function(t){
      var j = JSON.parse(t);
      var res = j && j.results && j.results.length ? j.results : [];
      if (!res.length) return '';
      var low = st.toLowerCase();
      var pick = null;
      for (var i = 0; i < res.length; i++){
        var nm = String(res[i].title || res[i].name || '').toLowerCase();
        if (nm && (nm.indexOf(low) === 0 || low.indexOf(nm) === 0)) { pick = res[i]; break; }
      }
      if (!pick) pick = res[0];
      var mt = pick.media_type || 'movie';
      if (mt !== 'movie' && mt !== 'tv') return '';
      return tmdbFetch('/3/' + mt + '/' + pick.id + '/watch/providers?api_key=' + TMDB_KEY).then(function(t2){
        var j2 = JSON.parse(t2);
        var ru = j2 && j2.results && j2.results.RU ? j2.results.RU : null;
        var order = ['free', 'ads', 'flatrate', 'rent', 'buy'];
        var html = '<div class="ai-where"><span>Реально доступно в РФ (по данным TMDB):</span>';
        for (var k = 0; k < order.length; k++){
          var h = tmdbTierHtml(order[k], ru ? ru[order[k]] : null);
          if (h) html += h;
        }
        html += '<a class="ai-where-btn" href="' + justwatchUrl(st) + '" target="_blank" rel="noopener">🔍 Найти онлайн (Яндекс)</a>';
        return html + '</div>';
      });
    }).catch(function(){ return ''; });
  }
  function aiShuffle(arr){
    for (var i = arr.length - 1; i > 0; i--){
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }
  function romanToInt(r){
    var map = { I:1, V:5, X:10, L:50, C:100 };
    var s = String(r).toUpperCase(), out = 0, prev = 0;
    for (var i = s.length - 1; i >= 0; i--) {
      var v = map[s[i]] || 0;
      out = v < prev ? out - v : out + v;
      prev = Math.max(prev, v);
    }
    return out || 0;
  }
  var AI_PART_WORDS = { 'втор':2, 'трет':3, 'четверт':4, 'четвёрт':4, 'пят':5, 'шест':6, 'седьм':7, 'восьм':8, 'девят':9, 'десят':10 };
  function aiQueryPart(nq){
    var m = nq.match(/(?:^|\s)(?:часть\s+)?(\d{1,2})$/);
    if (m) return parseInt(m[1], 10);
    m = nq.match(/(?:^|\s)(X{0,3}(?:IX|IV|V?I{0,3}))$/);
    if (m && m[1]) return romanToInt(m[1]);
    m = nq.match(/(?:^|\s)(втор|трет|четверт|четвёрт|пят|шест|седьм|восьм|девят|десят)[аыоёй]?($|\s)/);
    if (m && AI_PART_WORDS[m[1]]) return AI_PART_WORDS[m[1]];
    return 0;
  }
  function aiPartMismatch(nq, movie){
    var part = aiQueryPart(nq);
    if (!part || part <= 1) return false;
    var t = aiNorm(movie.title).trim();
    if (t.indexOf(String(part)) >= 0) return false;
    if (aiQueryPart(t) >= part) return false;
    if (new RegExp('(^|\\s)часть\\s*' + part + '($|\\s)').test(t)) return false;
    return true;
  }
  function aiMoodOnly(nq){
    var svc = ['что','посмотреть','глянуть','посоветуй','подскажи','подбери','покажи','дай','дайте','хочу','чтобы','фильм','кино','на','под','в','и','а','но','очень','настроение','перед','для','сна','мне','тебе'];
    var mood = ['экшен','драйв','адреналин','динамичн','взбодрить','уснуть','заснуть','спать','сном','страшн','смешн','поплак','плакать','успоко','романтик','новеньк','вечер','ночь','ночью','выходн','уют','расслаб','чил','скучн','вдохнов','груст','весел','мил','добр','напряг','ужас','мистик','философ','ностальг','поразмыш','спокойн','детям','детей'];
    var words = nq.split(/[^a-zа-я0-9]+/).filter(Boolean);
    var hasMood = false;
    for (var i = 0; i < words.length; i++){
      var w = words[i];
      if (svc.indexOf(w) >= 0) continue;
      var ok = false;
      for (var j = 0; j < mood.length; j++){
        if (w.indexOf(mood[j]) === 0 || (mood[j].indexOf(w) === 0 && mood[j].length - w.length <= 2)) { ok = true; break; }
      }
      if (!ok) return false;
      hasMood = true;
    }
    return hasMood;
  }
  function aiClassify(txt){
    var nq = aiNorm(txt);
    if (aiMoodOnly(nq)) return { type: 'picks' };
    var inCat = findMovieInText(txt);
    if (inCat) {
      if (aiPartMismatch(nq, inCat)) return { type: 'outside', title: txt, partHint: inCat.title };
      return { type: 'catalog', movie: inCat };
    }
    var advice = /что посмотреть|что глянуть|что глянь|посоветуй|подскажи|рекоменд|подборк|похож|похоже|настроени|вечером|вечер\b|ночью|на ночь|груст|весел|страшн|посмеять|посмеят|поржать|юмор|смешн|плакать|поплакать|слез|вдохнов|напрячь|расслаб|успоко|чил|скучн|скучаю|трогатель|поразмыш|люблю|нравится|романтик|свидани|вдво|с девушк|с парнем|детям|детей|ребен|малыш|семейн|выходн|драйв|адреналин|ностальг|детств|душевн|философ|смысл|красив|стильн|эпичн|загадк|мистик|новеньк|экшен|динамичн|взбодр|уснуть|заснуть|спать|сном/i.test(nq);
    var words = nq.split(/[^a-zа-я0-9]+/).filter(function(w){ return w.length > 2; });
    var genreish = false;
    if (words.length <= 2) {
      var gV = aiVocab('genres');
      for (var i = 0; i < words.length; i++){
        var w = words[i];
        if (w.length < 4) continue;
        for (var g in gV) { if (g.indexOf(w.slice(0, 5)) === 0) { genreish = true; break; } }
        if (genreish) break;
      }
    }
    if (/уснуть|заснуть|не могу спать|хочу уснуть|на сон|перед сном/.test(nq)) return { type: 'sleep' };
    var likeM = nq.match(/похож[ео] на\s+([^«»]{3,50})|в стиле\s+([^«»]{3,50})|что-?нибудь как\s+([^«»]{3,50})|как\s+«([^»]{3,50})»/);
    if (likeM) return { type: 'like', subject: (likeM[1] || likeM[2] || likeM[3] || likeM[4] || '').trim().replace(/[.!?]+$/, '') };
    if (/просто подбер|что-?нибудь посмотреть|что нибудь посмотреть|лень думать/.test(nq)) return { type: 'quick' };
    if (/подбер[её]м точнее/.test(nq) || (nq.length < 22 && /точнее/.test(nq))) return { type: 'interview' };
    if (advice || genreish) return { type: 'picks' };
    var loose = aiMatchLoose(txt);
    if (loose.length) return { type: 'catalog', movie: loose[0] };
    var subj = aiExtractSubject(txt);
    if (subj && subj.length >= 3 && subj.split(' ').length <= 3
        && !/^(спасибо|привет|здравств|хай|ку\b|ладно|ок\b|хорошо|понятно|благодар|отлично|класс\b|супер|дела|фильм|сериал|кино|мульт)/i.test(subj)) {
      return { type: 'outside', title: subj };
    }
    return { type: 'ai' };
  }
  function aiChipBtn(m){
    var age = m.age ? ', ' + aiH(m.age) : '';
    return '<button class="ai-chip" onclick="openModal(\'' + String(m.id) + '\')">🎬 <b>' + aiH(m.title) + '</b> (' + aiH(m.year) + age + ')</button>';
  }
  function aiNorm(s){
    return String(s || '').toLowerCase().replace(/[«»"'!?,.:;()]/g, ' ').replace(/ё/g, 'е');
  }
  function aiVocab(field){
    var v = {};
    movies.forEach(function(m){
      String(m[field] || '').split(',').forEach(function(x){
        x = x.trim().toLowerCase();
        if (x) v[x] = 1;
      });
    });
    return v;
  }
  var AI_GENRE_SYN = [
    ['бандит', 'криминал'], ['гангстер', 'криминал'], ['мафи', 'криминал'], ['разбойн', 'криминал'],
    ['страшн', 'хоррор'], ['хоррор', 'хоррор'], ['пугат', 'хоррор'], ['ужас', 'хоррор'], ['кровав', 'хоррор'],
    ['смешн', 'комедия'], ['юмор', 'комедия'], ['поржать', 'комедия'], ['посмеять', 'комедия'],
    ['космос', 'фантастика'], ['космич', 'фантастика'], ['пришельц', 'фантастика'],
    ['любов', 'мелодрама'], ['романт', 'мелодрама'],
    ['загадк', 'детектив'], ['расследов', 'детектив'], ['сыщик', 'детектив'],
    ['шпион', 'триллер'], ['саспенс', 'триллер'],
    ['войн', 'военный'], ['сказк', 'фэнтези'], ['магия', 'фэнтези'], ['дракон', 'фэнтези'],
    ['семейн', 'семейный'], ['детск', 'семейный'],
    ['поплакать', 'драма'], ['плакат', 'драма'], ['слёз', 'драма'], ['слез', 'драма'], ['потрог', 'драма'], ['трогательн', 'драма'],
    ['напряж', 'триллер'], ['интриг', 'триллер'], ['весел', 'комедия'], ['весёл', 'комедия'],
    ['настроение под', 'комедия'], ['поржа', 'комедия'], ['экшен', 'боевик'], ['экшн', 'боевик'], ['драйв', 'боевик']
  ];
  var AI_MOOD_SYN = [
    ['успоко', 'расслаблен|мил|добр', 'хоррор|триллер|криминал|военный|катастрофа'],
    ['чилить', 'расслаблен|мил|добр', 'хоррор|триллер|криминал|военный|катастрофа'],
    ['расслаб', 'расслаблен|мил|добр', 'хоррор|триллер|криминал|военный|катастрофа'],
    ['спокой', 'расслаблен|мил|добр', 'хоррор|триллер|криминал|военный|катастрофа'],
    ['отдохн', 'расслаблен|добр', 'хоррор|триллер|криминал|военный|катастрофа'],
    ['снять стресс', 'расслаблен|добр', 'хоррор|триллер|криминал|военный|катастрофа'],
    ['стресс', 'расслаблен|добр', 'хоррор|триллер|криминал|военный|катастрофа'],
    ['уют', 'расслаблен|мил|добр', 'хоррор|триллер|криминал|военный|катастрофа'],
    ['на ночь', 'расслаблен|мил|добр', 'хоррор|триллер|криминал|военный|катастрофа'],
    ['поднять настроение', 'весел|смешн|игрив|жизнеутверждающ', 'хоррор|военный|катастрофа'],
    ['повеселиться', 'весел|смешн|игрив', 'хоррор|военный|катастрофа'],
    ['весел', 'весел|смешн|игрив', 'хоррор|военный|катастрофа'],
    ['поржать', 'смешн|весел', 'хоррор|военный|катастрофа'],
    ['посмеять', 'смешн|весел', 'хоррор|военный|катастрофа'],
    ['смешн', 'смешн|весел|игрив', 'хоррор|военный|катастрофа'],
    ['юмор', 'смешн|весел', 'хоррор|военный|катастрофа'],
    ['угар', 'смешн|весел|безумн', 'хоррор|военный|катастрофа'],
    ['скучно', 'весел|смешн|игрив|приключенч', 'хоррор|военный|катастрофа'],
    ['скучаю', 'трогател|грустн', 'хоррор'],
    ['отвлеч', 'весел|смешн|приключенч', 'хоррор|военный|катастрофа'],
    ['поплакать', 'трогател|грустн|драматичн', 'хоррор'],
    ['плакат', 'трогател|грустн|драматичн', 'хоррор'],
    ['слез', 'трогател|грустн|драматичн', 'хоррор'],
    ['груст', 'трогател|грустн|жизнеутверждающ', 'хоррор'],
    ['печаль', 'трогател|грустн', 'хоррор'],
    ['трогат', 'трогател|грустн', 'хоррор'],
    ['романтик', 'романтичн|мил|трогател', 'хоррор|катастрофа'],
    ['романтич', 'романтичн|мил|трогател', 'хоррор|катастрофа'],
    ['любов', 'романтичн|мил|трогател', 'хоррор|катастрофа'],
    ['свидани', 'романтичн|мил', 'хоррор|катастрофа'],
    ['вдвоём', 'романтичн|мил', 'хоррор|катастрофа'],
    ['вдвоем', 'романтичн|мил', 'хоррор|катастрофа'],
    ['с девушкой', 'романтичн|мил', 'хоррор|катастрофа'],
    ['с парнем', 'романтичн|мил', 'хоррор|катастрофа'],
    ['мелодрам', 'романтичн|трогател', 'хоррор'],
    ['с детьми', 'добр|приключенч|игрив', 'хоррор|криминал|военный|катастрофа'],
    ['для детей', 'добр|приключенч|игрив|добр', 'хоррор|криминал|военный|катастрофа'],
    ['ребен', 'добр|приключенч|игрив', 'хоррор|криминал|военный|катастрофа'],
    ['ребён', 'добр|приключенч|игрив', 'хоррор|криминал|военный|катастрофа'],
    ['малыш', 'добр|приключенч|игрив', 'хоррор|криминал|военный|катастрофа'],
    ['семейн', 'добр|приключенч|игрив', 'хоррор|криминал|военный|катастрофа'],
    ['драйв', 'энергичн|безумн|напряжен', ''],
    ['адреналин', 'энергичн|безумн|напряжен', ''],
    ['экшен', 'энергичн|напряжен', ''],
    ['динамичн', 'энергичн|напряжен', ''],
    ['взбодриться', 'энергичн|весел', ''],
    ['уснуть', 'спокойн|уютн|добр|мил|тепл|умиротвор', 'хоррор|триллер|криминал|военный|катастрофа|боевик'],
    ['заснуть', 'спокойн|уютн|добр|мил|тепл|умиротвор', 'хоррор|триллер|криминал|военный|катастрофа|боевик'],
    ['спать', 'спокойн|уютн|добр|мил|тепл|умиротвор', 'хоррор|триллер|криминал|военный|катастрофа|боевик'],
    ['сном', 'спокойн|уютн|добр|мил|тепл|умиротвор', 'хоррор|триллер|криминал|военный|катастрофа|боевик'],
    ['ностальги', 'классич|жизнеутверждающ|добр', 'хоррор'],
    ['детств', 'классич|добр|жизнеутверждающ', 'хоррор'],
    ['советск', 'классич|добр', 'хоррор'],
    ['душевн', 'трогател|жизнеутверждающ|глубок', 'хоррор'],
    ['по душам', 'трогател|глубок', 'хоррор'],
    ['задуматься', 'философ|глубок|умн', 'хоррор|катастрофа'],
    ['смысл жизни', 'философ|глубок', 'хоррор|катастрофа'],
    ['философ', 'философ|глубок|умн', 'хоррор|катастрофа'],
    ['красив', 'красив|стильн', ''],
    ['стильн', 'стильн|красив', ''],
    ['визуальн', 'красив|стильн', ''],
    ['эпичн', 'эпичн|зрелищн', ''],
    ['масштабн', 'эпичн|зрелищн', ''],
    ['зрелищ', 'зрелищн|эпичн', ''],
    ['загадк', 'загадочн|умн|напряжен', ''],
    ['мистик', 'загадочн|напряжен', ''],
    ['интрига', 'загадочн|напряжен', ''],
    ['страшн', 'страшн|напряжен', ''],
    ['ужас', 'страшн|напряжен', ''],
    ['вдохнов', 'вдохновляющ|жизнеутверждающ|глубок', ''],
    ['выходн', 'расслаблен|весел|приключенч', ''],
    ['вечером', 'расслаблен|весел|трогател', ''],
    ['напрячь', 'напряжен|загадочн', ''],
    ['умн', 'умн|загадочн', '']
  ];
  function aiMatchVocab(nq, vocab, words){
    var found = [];
    Object.keys(vocab).forEach(function(g){
      if (g.length < 4) return;
      if (nq.indexOf(g) >= 0 && found.indexOf(g) < 0) found.push(g);
      words.forEach(function(w){
        if (w.length >= 3 && g.slice(0, 5) === w.slice(0, 5) && found.indexOf(g) < 0) found.push(g);
      });
    });
    return found;
  }
  function aiPick(q){
    var nq = aiNorm(q);
    var words = nq.split(/[^a-zа-я0-9]+/).filter(function(w){ return w.length > 2; });
    var genreV = aiVocab('genres');
    var moodV = aiVocab('emotions');
    var wantedG = aiMatchVocab(nq, genreV, words);
    AI_GENRE_SYN.forEach(function(p){
      if (nq.indexOf(p[0]) >= 0 && wantedG.indexOf(p[1]) < 0) {
        Object.keys(genreV).forEach(function(g){ if (g.indexOf(p[1]) === 0 && wantedG.indexOf(p[1]) < 0) wantedG.push(p[1]); });
      }
    });
    var wantedM = aiMatchVocab(nq, moodV, words);
    var bannedG = [];
    AI_MOOD_SYN.forEach(function(p){
      if (nq.indexOf(p[0]) >= 0) {
        p[1].split('|').forEach(function(e){ if (e && wantedM.indexOf(e) < 0) wantedM.push(e); });
        if (p[2]) p[2].split('|').forEach(function(b){ if (b && bannedG.indexOf(b) < 0) bannedG.push(b); });
      }
    });
    var era = null;
    var dm = nq.match(/(\d{2,4})\s*-?\s*х/);
    if (dm) {
      var d0 = parseInt(dm[1], 10);
      if (d0 < 100) d0 = d0 >= 30 ? 1900 + d0 : 2000 + d0;
      d0 = d0 - d0 % 10;
      era = [d0, d0 + 9];
    }
    if (/нов(ое|ых|инк|еньк)|свеж|недавн/.test(nq)) era = [2020, 2100];
    if (/классик|стар(ое|ых|инк)/.test(nq)) era = [0, 1999];
    var regionRe = null;
    if (/европейск|европ/.test(nq)) regionRe = /британ|франц|герман|итал|испан|ирлан|дан|швед|норвеж|польск|нидерланд|австрий|чеш|бельг|финлянд|швейцар|португал|греч|венгер|серб/i;
    else if (/азиатск|японск|корейск|китайск|гонконг|индийск/.test(nq)) regionRe = /япон|корей|китай|гонконг|индийск/i;
    else if (/американск|голливуд|сша/.test(nq)) regionRe = /сша/i;
    else if (/наш(е|его|их)|советск|российск|русск/.test(nq)) regionRe = /росси|ссср|украин|беларус/i;
    var isTop = /лучш|топ|шедевр|величайш/.test(nq);
    var kids = /ребен|ребён|малыш|детям|детей|детск/.test(nq);
    var allowWatched = /пересмотр|снова/.test(nq);
    var watchedSet = {};
    (watched || []).forEach(function(x){ watchedSet[String(x)] = 1; });
    var favGenres = {};
    (favorites || []).forEach(function(id){
      var fm = null;
      movies.forEach(function(x){ if (String(x.id) === String(id)) fm = x; });
      if (fm) String(fm.genres || '').split(',').forEach(function(g){ g = g.trim().toLowerCase(); if (g) favGenres[g] = (favGenres[g] || 0) + 1; });
    });
    var scored = [];
    movies.forEach(function(m){
      if (kids && !/^(0|6|12)\+/.test(String(m.age || ''))) return;
      if (!allowWatched && watchedSet[String(m.id)]) return;
      var sc = 0;
      var gStr = String(m.genres || '').toLowerCase();
      if (bannedG.length && bannedG.some(function(b){ return gStr.indexOf(b) >= 0; })) return;
      if (regionRe && !regionRe.test(String(m.country || ''))) return;
      wantedG.forEach(function(g){ if (gStr.indexOf(g) >= 0) sc += 3; });
      var mStr = String(m.emotions || '').toLowerCase().replace(/ё/g, 'е');
      wantedM.forEach(function(g){ if (mStr.indexOf(g) >= 0) sc += 3; });
      if (era) {
        var yy = parseInt(m.year, 10);
        if (yy >= era[0] && yy <= era[1]) sc += 2; else return;
      }
      if (isTop) sc += (parseFloat(m.rating) || 0) / 2;
      var firstG = (Array.isArray(m.genres) && m.genres[0] ? String(m.genres[0]).trim().toLowerCase() : '');
      if (favGenres[firstG]) sc += 1;
      if (sc <= 0) return;
      scored.push({ m: m, sc: sc + (parseFloat(m.rating) || 0) / 10 });
    });
    window.AI_SHOWN = window.AI_SHOWN || {};
    scored.forEach(function(x){ x.sc -= (window.AI_SHOWN[String(x.m.id)] || 0) * 0.7; });
    scored.sort(function(a, b){ return b.sc - a.sc; });
    var top = scored.slice(0, 18);
    aiShuffle(top);
    var out5 = top.slice(0, 5).map(function(x){ return x.m; });
    out5.forEach(function(mm2){ window.AI_SHOWN[String(mm2.id)] = (window.AI_SHOWN[String(mm2.id)] || 0) + 1; });
    if (out5.length >= 5) return out5;
    var seen5 = {};
    out5.forEach(function(m){ seen5[String(m.id)] = 1; });
    var pool = [];
    movies.forEach(function(m){
      if (seen5[String(m.id)] || watchedSet[String(m.id)]) return;
      if ((parseFloat(m.rating) || 0) >= 7 && !(bannedG.length && bannedG.some(function(b){ return String(m.genres || '').toLowerCase().indexOf(b) >= 0; }))) pool.push(m);
    });
    aiShuffle(pool);
    pool.slice(0, 5 - out5.length).forEach(function(m){ out5.push(m); });
    if (out5.length >= 5) return out5;
    var pool2 = [];
    movies.forEach(function(m){
      if (seen5[String(m.id)] || watchedSet[String(m.id)] || out5.indexOf(m) >= 0) return;
      if (bannedG.length && bannedG.some(function(b){ return String(m.genres || '').toLowerCase().indexOf(b) >= 0; })) return;
      pool2.push(m);
    });
    aiShuffle(pool2);
    pool2.slice(0, 5 - out5.length).forEach(function(m){ out5.push(m); });
    return out5;
  }
  function aiFindMovie(q){
    var nq = aiNorm(q);
    var best = null, bestLen = 0;
    movies.forEach(function(m){
      var t = aiNorm(m.title).trim();
      if (t.length >= 4 && nq.indexOf(t) >= 0 && t.length > bestLen) { best = m; bestLen = t.length; }
    });
    return best;
  }
  function aiInfoBlock(m){
    var dir = m.director || '';
    var dur = m.duration || '';
    var desc = m.description || '';
    var out = '<div>Есть в каталоге: <button class="ai-chip" onclick="openModal(\'' + String(m.id) + '\')"><b>' + aiH(m.title) + '</b></button> (' + aiH(m.year) + ')</div>';
    out += '<div class="ai-note">Жанры: ' + aiH(Array.isArray(m.genres) ? m.genres.join(', ') : m.genres) + ' · Рейтинг: ' + aiH(m.rating) + '/10 · Возраст: <b>' + aiH(m.age || 'не указан') + '</b></div>';
    if (dir) out += '<div class="ai-note">Режиссёр: ' + aiH(dir) + (dur ? ' · Длительность: ' + aiH(dur) + ' мин' : '') + '</div>';
    if (desc) out += '<div class="ai-note">' + aiH(desc) + '</div>';
    out += aiWhereBtns(m.title);
    return out;
  }
  function aiLocalReply(q){
    var nq = aiNorm(q).trim();
    if (!nq) return 'Напишите настроение, жанр или эпоху — подберу фильм из каталога.';
    if (/^(привет|здравств|хай|ку)\b/.test(nq)) return 'Привет! Скажите настроение, жанр или эпоху — подберу фильм. Например: «что-то трогательное про семью» или «криминал 90-х».';
    var m = aiFindMovie(q);
    if (m) {
      if (aiPartMismatch(nq, m)) return '<div class="ai-note">«' + aiH(q) + '» — такой части в каталоге нет, но есть другая часть: <b>' + aiH(m.title) + '</b>. Её можно поискать здесь:</div>' + aiWhereBtns(m.title);
      return aiInfoBlock(m);
    }
    var MOOD_RE = /настроени|груст|весел|страшн|посмеять|посмеят|поржать|юмор|смешн|угар|скучн|скучаю|отвлеч|роман|вечером|вечер|утром|вдохнов|поразмыш|напрячь|расслаб|успоко|чил|спокой|отдохн|стресс|уют|на ночь|ночью|мило|трогатель|плакать|ужас|загадк|мистик|интрига|философ|смысл|душевн|по душам|ностальг|детств|советск|классик|красив|стильн|визуальн|эпичн|масштабн|зрелищ|драйв|адреналин|экшен|динамичн|выходн|новеньк|с девушк|с парнем|вдво|свидани|любов|детям|детей|ребен|малыш|семейн|жизнеутвержд|комеди|драм|боевик|триллер|фантасти|детектив|мелодрам|криминал|истори|военн|фэнтез|сказк|анимац|мульт|приключ|уснуть|заснуть|спать|сном/i;
    var wantsTitle = /расскажи|о фильме|про фильм|что за|подробност|описани|узнать|бюджет|сбор|режисс|актёр|актер|сериал|кто такой/i.test(nq);
    if (wantsTitle || !MOOD_RE.test(nq)) {
      var guess = q.replace(/расскажи (мне )?(о |про |об )?/gi, '').replace(/о фильме|про фильм|что за фильм|хочу узнать (о |про )?/gi, '').replace(/[«»"']/g, '').trim();
      var t = guess || q;
      var picks = aiPick(q);
      var intro = 'ИИ сейчас отвечает с перебоями — вот проверенные варианты из каталога 🎬\nА «' + aiH(t) + '» можно поискать здесь:' + aiWhereBtns(t);
      return intro + '<div>' + (picks && picks.length ? picks.map(aiChipBtn).join('') : '') + '</div>';
    }
    var picks = aiPick(q);
    var top = movies.slice();
    top.sort(function(a, b){ return (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0); });
    var picks2 = (picks && picks.length) ? picks : top.slice(0, 5);
    var intro = 'Вот что подошло под запрос «' + aiH(q) + '» — откройте карточку: там описание, возраст и кнопки «где смотреть».';
    return intro + '<div>' + picks2.map(aiChipBtn).join('') + '</div>';
  }
  function localAdvice(userText){
    return aiLocalReply(userText);
  }

  function fallbackText(err){
    var code = err && err.message ? String(err.message) : 'ошибка';
    var r = movies[Math.floor(Math.random() * movies.length)];
    return 'ИИ не ответил (' + code + '). Пока — проверенный вариант из каталога: 🎬 «' + r.title + '» (' + r.year + '), ' + r.genres.join(', ') + ', рейтинг ' + r.rating + '. ' + aiWhereBtns(r.title);
  }

  function throttle(){
    var wait = Math.max(0, lastReq + 8000 - Date.now());
    return new Promise(function(res){ setTimeout(res, wait); });
  }

  function aiAdd(cls, text){
    var box = document.getElementById('ai-messages');
    if(!box) return null;
    var d = document.createElement('div');
    d.className = 'ai-msg ' + cls;
    d.innerHTML = esc(text).replace(/«([^»]+)»/g, '«<b>$1</b>»').replace(/\n/g, '<br>');
    box.appendChild(d);
    box.scrollTop = box.scrollHeight;
    return d;
  }

  function aiAddHTML(html){
    var box = document.getElementById('ai-messages');
    if(!box) return null;
    var d = document.createElement('div');
    d.className = 'ai-msg bot';
    d.innerHTML = html;
    box.appendChild(d);
    box.scrollTop = box.scrollHeight;
    return d;
  }

    function aiToks(s){
    return String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[^0-9a-zа-я]+/gi, ' ').replace(/\s+/g, ' ').trim();
  }
  function aiCleanReply(r){
    var t = String(r || '');
    t = t.replace(/\*\*/g, '').replace(/^#{1,6}\s*/gm, '').replace(/\(\?\?\)/g, '');
    t = t.replace(/^-{3,}\s*$/gm, '');
    var BAD = /(каталог|нет данных|нет сведений|в нашей базе|не присутствует|недоступн|внешн|поищите|поищи|проверьте актуальн|не указана|не указано|в открытых источниках|отсутствуют|кинодоров|делиться не буду|кинопоиск|к сожалению|уточните|уточнить|не нашёл|не нашел|не могу найти|нет информации|не удалось найти)/i;
    t = t.split('\n').filter(function(line){
      var s2 = line.trim();
      if (s2.split('|').length > 2) return false;
      if (BAD.test(s2)) return false;
      return true;
    }).join('\n');
    t = t.replace(/^[-–•]\s+/gm, '');
    t = t.replace(/\n{3,}/g, '\n\n');
    return t.trim();
  }
  function aiHasTok(hay, t){
    hay = ' ' + hay + ' ';
    return hay.indexOf(' ' + t + ' ') >= 0;
  }
  function aiCatalogMentions(text){
    var res = [], seen = {}, hay = aiToks(text), t = String(text || '');
    movies.forEach(function(m){
      var mt = aiToks(m.title);
      if (mt.length < 4) return;
      if (!aiHasTok(hay, mt)) return;
      if (mt.indexOf(' ') < 0 && t.indexOf('«' + m.title + '»') < 0) return;
      seen[m.id] = 1; res.push(m);
    });
    return res;
  }
  function aiToksEq(a, b){
    var A = a.split(' '), B = b.split(' ');
    if (A.length !== B.length) return false;
    var diff = 0;
    for (var i = 0; i < A.length; i++) {
      if (A[i] === B[i]) continue;
      if (A[i].length >= 3 && B[i].length >= 3 && A[i].slice(0, 3) === B[i].slice(0, 3)) { diff++; continue; }
      return false;
    }
    return diff <= 1;
  }
  function aiExtractSubject(q){
    var s = String(q || '').replace(/[«»"']/g, ' ').replace(/\(\d{4}\)/g, ' ').replace(/\b\d{4}\b/g, ' ');
    s = s.replace(/(^|[\s.,!?:;«»("'])(расскажи|покажи|посоветуй|хочу|посмотреть|смотреть|сериалы?|фильмы?|мультики?|мультфильмы?|мне|про|об|о|у|и|в|на|кто|что|какой|какая|какие|как|о чем|о чём|сюжет|актеры|актёры|бюджет|отзывы|оценка|рейтинг|серий|серии|сезонов|весь|всё|все|его|её|там|это)(?=[\s.,!?:;«»"')]|$)/gi, '$1');
    s = s.replace(/\s+/g, ' ').trim();
    return s;
  }
  function aiMatchLoose(text){
    var res = aiCatalogMentions(text);
    if (res.length) return res;
    var subj = aiExtractSubject(text);
    if (!subj) return [];
    var cs = compactNorm(stripTypeWords(subj));
    if (cs.length < 4) return [];
    var out = [];
    movies.forEach(function(m){
      var mt = compactNorm(stripTypeWords(m.title));
      if (!mt) return;
      if (mt === cs) { out.push(m); return; }
      if (mt.indexOf(cs) === 0 && !/\d/.test(mt.slice(cs.length))) { out.push(m); return; }
      if (cs.indexOf(mt) === 0 && !/\d/.test(cs.slice(mt.length))) { out.push(m); return; }
      if (Math.abs(mt.length - cs.length) <= 2 && lev1(mt, cs)) {
        var longer = mt.length > cs.length ? mt : cs;
        var shorter = mt.length > cs.length ? cs : mt;
        if (longer.indexOf(shorter) === 0 && /\d/.test(longer.slice(shorter.length))) return;
        out.push(m);
      }
    });
    return out;
  }
  function aiMissingBlock(title){
    return '<div class="ai-note" style="margin:10px 0;"><b>' + aiH(title) + '</b> — смотрите здесь:</div>' + aiWhereBtns(title);
  }
  /* семейство частей убрано: одна карточка строго по запросу пользователя */
  function aiEnrich(userText, reply){
    var clean = aiCleanReply(reply);
    var html = '', i;
    var paras = clean.split(/\n{2,}/).filter(function(p){ return p.trim(); });
    var first = paras.length ? paras[0] : clean;
    html += '<div>' + aiH(first).replace(/\n/g, '<br>') + '</div>';
    var seen = {}, cards = [];
    var userCards = aiMatchLoose(userText);
    if (userCards.length){
      userCards.forEach(function(m){ if (!seen[m.id]) { seen[m.id] = 1; cards.push(m); } });
    }
    for (i = 1; i < paras.length; i++) html += '<div style="margin-top:8px;">' + aiH(paras[i]).replace(/\n/g, '<br>') + '</div>';
    cards.forEach(function(m){ html += '<div style="margin-top:10px;">' + aiInfoBlock(m) + '</div>'; });
    if (!cards.length){
      var subj = aiExtractSubject(userText);
      var titleish = subj && subj.length >= 3 && subj.split(' ').length <= 3 && !/груст|весел|весёл|страшн|посмеять|роман|вечер|вдохнов|поразмыш|напрячь|расслаб|милое|трогатель|плакать|настроени|двоих/i.test(subj);
      if (titleish) html += aiMissingBlock(subj.charAt(0).toUpperCase() + subj.slice(1));
    }
    return html;
  }

  var aiHist = [];
  var aiCurFilm = '';
  function aiHistPush(who, text){
    aiHist.push({ who: who, text: String(text || '').slice(0, 400) });
    if (aiHist.length > 12) aiHist = aiHist.slice(-12);
  }
  function aiIsMood(t){
    return /груст|посмеять|плак|вдохнов|расслаб|поразмыш|напряг|приключ|мило|вечер|настроен|двое|случайн/i.test(t);
  }
  function aiTrackSubject(txt){
    if (aiIsMood(txt)) return;
    var subj = aiExtractSubject(txt);
    if (!subj) return;
    var words = subj.split(' ').filter(function(w){ return w.length >= 2; });
    if (words.length >= 1 && words.length <= 3) aiCurFilm = words.join(' ');
  }

  // ===== ОЧЕРЕДЬ 1+2: умный подбор, интервью, почему, не хочу, сон, дневник =====
  function aiPainLoad(){
    try { return JSON.parse(localStorage.getItem('mood_movies_pain')) || {}; } catch(e){ return {}; }
  }
  function aiPainSave(p){
    try { localStorage.setItem('mood_movies_pain', JSON.stringify(p)); } catch(e){}
  }
  function aiPainActive(pain){
    var out = {}, now = Date.now();
    Object.keys(pain || {}).forEach(function(g){
      if (now - pain[g] < 14 * 24 * 3600 * 1000) out[g] = 1;
    });
    return out;
  }
  function aiProfLoad(){
    try { return JSON.parse(localStorage.getItem('mood_movies_profile')) || null; } catch(e){ return null; }
  }
  function aiProfSave(p){
    try { localStorage.setItem('mood_movies_profile', JSON.stringify(p)); } catch(e){}
  }
  function aiGenresOf(m){
    return (Array.isArray(m.genres) ? m.genres.join(',') : String(m.genres || '')).toLowerCase();
  }
  function aiEmotionsOf(m){
    return (Array.isArray(m.emotions) ? m.emotions.join(',') : String(m.emotions || '')).toLowerCase().replace(/ё/g, 'е');
  }
  function aiSmartPick(profile, opts){
    opts = opts || {};
    var mood = profile.mood || null;
    var tone = profile.tone || null;
    var time = profile.time || null;
    var comp = profile.company || null;
    var sleep = !!opts.sleep;
    var pain = aiPainActive(aiPainLoad());
    var favGenres = {}, famGenres = {};
    var watchedSet = {};
    (watched || []).forEach(function(x){ watchedSet[String(x)] = 1; });
    function addFav(genStr, w){
      String(genStr || '').split(',').forEach(function(g){
        g = g.trim().toLowerCase(); if (g) favGenres[g] = (favGenres[g] || 0) + w;
      });
    }
    (favorites || []).forEach(function(id){
      movies.forEach(function(x){ if (String(x.id) === String(id)) addFav(x.genres, 1); });
    });
    Object.keys(ratings || {}).forEach(function(id){
      var st = parseInt(ratings[id], 10);
      if (st >= 4) movies.forEach(function(x){
        if (String(x.id) === String(id)){
          addFav(x.genres, 1);
          String(x.genres || '').split(',').forEach(function(g){
            g = g.trim().toLowerCase(); if (g) famGenres[g] = (famGenres[g] || 0) + 1;
          });
        }
      });
    });
    var moodGenre = {
      'бодрое': ['боевик', 'приключения', 'фантастика'],
      'спокойное': ['мелодрама', 'драма', 'музыкальный'],
      'смешное': ['комедия'],
      'грустное': ['драма'],
      'эмоции': ['триллер', 'драма', 'хоррор']
    }[mood] || [];
    var moodEmo = {
      'бодрое': ['энергичное', 'зрелищное', 'весёлое', 'безумное'],
      'спокойное': ['расслабленное', 'милое', 'доброе'],
      'смешное': ['смешное', 'весёлое'],
      'грустное': ['трогательное', 'грустное', 'драматичное'],
      'эмоции': ['напряжённое', 'страшное', 'загадочное']
    }[mood] || [];
    var sleepEmo = ['расслабленное', 'милое', 'доброе', 'красивое'];
    var scored = [];
    movies.forEach(function(m){
      if (watchedSet[String(m.id)]) return;
      var g = aiGenresOf(m);
      var dur = parseInt(m.duration, 10) || 0;
      var yy = parseInt(m.year, 10) || 0;
      var age = String(m.age || '');
      if (comp === 'one' && (g.indexOf('семейный') >= 0 || g.indexOf('мультфильм') >= 0)) return;
      if (comp === 'kids' && !/^(0|6|12)\+/.test(age)) return;
      if (comp === 'couple' && g.indexOf('хоррор') >= 0) return;
      if (sleep && ['хоррор', 'триллер', 'криминал', 'военный', 'катастрофа', 'детектив', 'спорт'].some(function(b){ return g.indexOf(b) >= 0; })) return;
      var sc = (parseFloat(m.rating) || 0) / 4;
      moodGenre.forEach(function(gg){ if (g.indexOf(gg) >= 0) sc += 3; });
      var em = aiEmotionsOf(m);
      moodEmo.forEach(function(ee){ if (em.indexOf(ee) >= 0) sc += 2; });
      if (sleep) sleepEmo.forEach(function(ee){ if (em.indexOf(ee) >= 0) sc += 3; });
      if (tone === 'light'){
        ['хоррор', 'триллер', 'криминал', 'военный', 'катастрофа'].forEach(function(b){ if (g.indexOf(b) >= 0) sc -= 4; });
        ['комедия', 'приключения', 'фэнтези', 'мелодрама'].forEach(function(lg){ if (g.indexOf(lg) >= 0) sc += 2; });
      }
      if (tone === 'dark'){
        ['триллер', 'криминал', 'драма', 'детектив', 'хоррор'].forEach(function(dg){ if (g.indexOf(dg) >= 0) sc += 2; });
        ['мультфильм', 'семейный', 'мюзикл'].forEach(function(dg){ if (g.indexOf(dg) >= 0) sc -= 2; });
      }
      if (comp === 'kids'){
        ['семейный', 'мультфильм', 'приключения', 'фэнтези'].forEach(function(kg){ if (g.indexOf(kg) >= 0) sc += 2; });
      }
      if (comp === 'couple'){
        if (em.indexOf('романтичное') >= 0) sc += 3;
        if (g.indexOf('мелодрама') >= 0) sc += 1;
      }
      if (time === 'short'){ if (dur && dur <= 105) sc += 2; if (dur >= 140) sc -= 1; }
      if (time === 'mid'){ if (dur >= 85 && dur <= 140) sc += 2; if (dur && dur < 70) sc -= 1; }
      if (time === 'long'){ if (dur >= 120) sc += 2; if (dur && dur <= 85) sc -= 1; }
      if (sleep){ if (!dur || dur <= 130) sc += 1; }
      if (yy >= 2010) sc += 1;
      if (yy && yy < 1980) sc -= 1;
      if (opts.minYear && yy < opts.minYear) return;
      Object.keys(pain).forEach(function(pg){ if (g.indexOf(pg) >= 0) sc -= 2; });
      if (sleep){
        Object.keys(famGenres).forEach(function(fg){ if (g.indexOf(fg) >= 0) sc += 1.5 * Math.min(famGenres[fg], 3); });
      }
      Object.keys(favGenres).forEach(function(fg){ if (g.indexOf(fg) >= 0) sc += 0.8; });
      if (sc <= 0.5) return;
      scored.push({ m: m, sc: sc });
    });
    scored.sort(function(a, b){ return b.sc - a.sc; });
    var out = [], firstGCount = {};
    var last = (opts.excludeIds || []).map(String);
    for (var i = 0; i < scored.length && out.length < 5; i++){
      var mm = scored[i].m;
      if (last.indexOf(String(mm.id)) >= 0) continue;
      var fg = (aiGenresOf(mm).split(',')[0] || '').trim();
      if (fg && (firstGCount[fg] || 0) >= 2) continue;
      firstGCount[fg] = (firstGCount[fg] || 0) + 1;
      out.push(mm);
    }
    return out;
  }
  function aiExplainLine(m, profile, opts){
    opts = opts || {};
    profile = profile || {};
    var g = aiGenresOf(m), em = aiEmotionsOf(m);
    var parts = [];
    if (opts.sleep) parts.push('спокойный темп');
    else if (profile.mood === 'бодрое') parts.push('бодрый темп');
    else if (profile.mood === 'спокойное') parts.push('спокойный ритм');
    else if (profile.mood === 'смешное') parts.push('весёлое кино');
    else if (profile.mood === 'грустное') parts.push('трогательная история');
    else if (profile.mood === 'эмоции') parts.push('держит в напряжении');
    if (profile.tone === 'light') parts.push('светлая картинка');
    if (profile.tone === 'dark') parts.push('мрачная картинка');
    if (profile.time === 'short') parts.push('короткий хронометраж');
    if (profile.time === 'long') parts.push('большая форма');
    var favHit = null;
    var favIds = (favorites || []).slice();
    Object.keys(ratings || {}).forEach(function(id){ if (parseInt(ratings[id], 10) >= 4) favIds.push(String(id)); });
    var MASS_G = { 'драма': 1, 'комедия': 1 };
    var mg = g.split(',').map(function(v){ return v.trim(); });
    var usedRefs = opts.usedRefs || null;
    var best = null, bestN = 0;
    favIds.forEach(function(id){
      movies.forEach(function(x){
        if (!x || String(x.id) !== String(id)) return;
        if (usedRefs && usedRefs[x.title]) return;
        var xg = aiGenresOf(x).split(',').map(function(v){ return v.trim(); });
        var common = [], nonMass = 0;
        xg.forEach(function(gg){
          if (gg && mg.indexOf(gg) >= 0){ common.push(gg); if (!MASS_G[gg]) nonMass++; }
        });
        if (common.length < 2 || !nonMass) return;
        var stars = parseInt(ratings[id], 10) || 0;
        if (common.length > bestN || (common.length === bestN && best && stars > best.stars)) {
          best = { title: x.title, stars: stars };
          bestN = common.length;
        }
      });
    });
    if (best) {
      if (usedRefs) usedRefs[best.title] = 1;
      parts.push('похоже на «' + best.title + '»' + (best.stars ? ' (оценил на ' + best.stars + '/5)' : ''));
    }
    parts.push('оценка ' + m.rating + '/10');
    return parts.slice(0, 3).join('; ');
  }
  window.AI_LAST_PICKS = [];
  window.AI_LAST_PROFILE = {};
  window.AI_LAST_OPTS = {};
  function aiWhyNopeRow(picks){
    if (picks) window.AI_LAST_PICKS = picks;
    return '<div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;">' +
      '<button class="ai-chip" onclick="aiWhyToggle()">💬 почему эти фильмы</button>' +
      '<button class="ai-chip" onclick="aiNopeStart()">👎 не хочу, другое</button></div>';
  }
  window.aiWhyToggle = function(){
    var picks = window.AI_LAST_PICKS || [];
    if (!picks.length) return;
    var opts0 = Object.assign({}, window.AI_LAST_OPTS);
    var usedRefs = {};
    var html = picks.map(function(m){
      opts0.usedRefs = usedRefs;
      return '<div class="ai-note">💬 <b>' + aiH(m.title) + '</b> — ' + aiExplainLine(m, window.AI_LAST_PROFILE, opts0) + '</div>';
    }).join('');
    aiAddHTML(html);
  };
  window.aiNopeStart = function(){
    aiAddHTML('<div class="ai-note">Что не так с подборкой?</div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">' +
      '<button class="ai-chip" onclick="aiNopePick(\'long\')">слишком длинное</button>' +
      '<button class="ai-chip" onclick="aiNopePick(\'old\')">слишком старое</button>' +
      '<button class="ai-chip" onclick="aiNopePick(\'mood\')">не то настроение</button>' +
      '<button class="ai-chip" onclick="aiNopePick(\'genre\')">не этот жанр</button>' +
      '<button class="ai-chip" onclick="aiNopePick(\'nope\')">просто не зашло</button></div>');
  };
  window.aiNopePick = function(cause){
    var prof = JSON.parse(JSON.stringify(window.AI_LAST_PROFILE || {}));
    var opts = JSON.parse(JSON.stringify(window.AI_LAST_OPTS || {}));
    var lastIds = (window.AI_LAST_PICKS || []).map(function(m){ return String(m.id); });
    var msg = '';
    if (cause === 'long'){ prof.time = 'short'; msg = 'Понял — покороче. Пересобрал:'; }
    if (cause === 'old'){ opts.minYear = 2015; msg = 'Понял — посвежее. Пересобрал:'; }
    if (cause === 'mood'){
      var order = ['бодрое', 'спокойное', 'смешное', 'грустное', 'эмоции'];
      prof.mood = order[(order.indexOf(prof.mood) + 1) % order.length] || 'спокойное';
      msg = 'Меняю курс: теперь под «' + prof.mood + '». Пересобрал:';
    }
    if (cause === 'genre'){
      var gs = {};
      (window.AI_LAST_PICKS || []).forEach(function(m){
        aiGenresOf(m).split(',').forEach(function(g){ g = g.trim(); if (g) gs[g] = (gs[g] || 0) + 1; });
      });
      var topG = null, topN = 0;
      Object.keys(gs).forEach(function(g){ if (gs[g] > topN){ topN = gs[g]; topG = g; } });
      if (topG){
        var pain = aiPainLoad();
        pain[topG] = Date.now();
        aiPainSave(pain);
        opts.excludeGenre = topG;
        msg = 'Запомнил: «' + topG + '» пока не предлагаю. Пересобрал:';
      } else { msg = 'Пересобрал:'; }
    }
    if (cause === 'nope'){ msg = 'Понял, пробую иначе:'; }
    opts.excludeIds = lastIds;
    var picks = aiSmartPick(prof, opts);
    if (opts.excludeGenre) picks = picks.filter(function(m){ return aiGenresOf(m).indexOf(opts.excludeGenre) < 0; });
    if (picks.length < 3){
      var fallback = aiSmartPick(prof, opts);
      if (fallback.length > picks.length) picks = fallback;
    }
    if (!picks.length) picks = aiPick('что-нибудь посмотреть');
    aiAddHTML('<div class="ai-note">' + msg + '</div>' + aiRenderPicks(picks, prof, opts));
  };
  function aiRenderPicks(picks, profile, opts){
    window.AI_LAST_PICKS = picks;
    window.AI_LAST_PROFILE = profile;
    window.AI_LAST_OPTS = opts || {};
    return '<div>' + picks.map(aiChipBtn).join('') + '</div>' + aiWhyNopeRow();
  }
  var AI_INT_STEPS = [
    { key: 'mood', q: 'Какое настроение?', opts: [['⚡ бодрое', 'бодрое'], ['😴 спокойное', 'спокойное'], ['😂 смешное', 'смешное'], ['😭 грустное', 'грустное'], ['🔥 хочу эмоций', 'эмоции']] },
    { key: 'tone', q: 'Какая картинка по духу?', opts: [['☀ светлая и яркая', 'light'], ['🌑 тёмная', 'dark'], ['🤷 не важно', '']] },
    { key: 'time', q: 'Сколько есть времени?', opts: [['⏱ до полутора часов', 'short'], ['⏰ около двух часов', 'mid'], ['🕰 два и больше', 'long'], ['🤷 не важно', '']] },
    { key: 'company', q: 'С кем смотришь?', opts: [['🙂 один', 'one'], ['👨‍👩‍👧 с детьми', 'kids'], ['💕 вдвоём', 'couple'], ['🤷 не важно', '']] }
  ];
  window.AI_INT = null;
  function aiIntSavedText(p){
    p = p || {};
    var parts = [];
    if (p.mood) parts.push('настроение — ' + p.mood);
    if (p.tone === 'light') parts.push('светлая картинка');
    if (p.tone === 'dark') parts.push('тёмная картинка');
    if (p.time === 'short') parts.push('короткое');
    if (p.time === 'mid') parts.push('около двух часов');
    if (p.time === 'long') parts.push('длинное');
    if (p.company === 'one') parts.push('смотреть одному');
    if (p.company === 'kids') parts.push('с детьми');
    if (p.company === 'couple') parts.push('вдвоём');
    return parts.join(', ') || 'ничего не запомнил';
  }
  window.aiStartInterview = function(){
    var saved = aiProfLoad();
    if (saved && saved.mood){
      aiAddHTML('<div class="ai-note">В прошлый раз ты выбрал: ' + aiH(aiIntSavedText(saved)) + '. Оставляем?</div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">' +
        '<button class="ai-chip" onclick="aiInterviewRun(true)">оставляем</button>' +
        '<button class="ai-chip" onclick="aiInterviewRun(false)">сначала заново</button></div>');
      return;
    }
    window.aiInterviewRun(false);
  };
  window.aiInterviewRun = function(useSaved){
    if (useSaved){
      aiFinishInterview(aiProfLoad());
      return;
    }
    window.AI_INT = { prof: {}, step: 0 };
    aiAskStep();
  };
  function aiAskStep(){
    var st = window.AI_INT;
    if (!st) return;
    if (st.step >= AI_INT_STEPS.length){ aiFinishInterview(st.prof); window.AI_INT = null; return; }
    var def = AI_INT_STEPS[st.step];
    var btns = def.opts.map(function(o){
      return '<button class="ai-chip" onclick="aiInterviewAns(\'' + aiAttr(o[1]) + '\')">' + aiH(o[0]) + '</button>';
    }).join('');
    aiAddHTML('<div class="ai-note">' + aiH(def.q) + '</div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">' + btns + '</div>');
  }
  window.aiInterviewAns = function(v){
    var st = window.AI_INT;
    if (!st) return;
    var def = AI_INT_STEPS[st.step];
    st.prof[def.key] = v || null;
    var label = v;
    def.opts.forEach(function(o){ if (String(o[1]) === String(v)) label = o[0]; });
    aiAdd('user', label || 'не важно');
    st.step++;
    aiAskStep();
  };
  function aiFinishInterview(prof){
    if (!prof) prof = {};
    aiProfSave(prof);
    var picks = aiSmartPick(prof, {});
    aiHistPush('ai', 'подборка по профилю: ' + aiIntSavedText(prof));
    aiAddHTML('<div class="ai-note">Собрал под твой выбор: ' + aiH(aiIntSavedText(prof)) + '. Открывай карточки:</div>' + aiRenderPicks(picks, prof, {}));
  }
  window.aiQuickStart = function(){
    var h = new Date().getHours();
    var evening = (h >= 19 || h < 6);
    var prof = { mood: evening ? 'спокойное' : 'бодрое', tone: null, time: null, company: null };
    var picks = aiSmartPick(prof, {});
    var hint = '';
    if (h >= 22 || h < 5) hint = 'Поздно уже — если не спится, скажи «уснуть» 🌙';
    else if (new Date().getDay() === 5 && h >= 19) hint = 'Пятница — можно и повеселее';
    var intro = '<div class="ai-note">' + (evening ? 'Вечер — держи что-то поспокойнее' : 'День — держи что-то поживее') + (hint ? '. ' + hint + '.' : '') + ' С учётом твоих фаворитов:</div>';
    aiHistPush('ai', 'быстрая подборка');
    aiAddHTML(intro + aiRenderPicks(picks, prof, {}));
  };
  window.aiSleepPick = function(){
    var prof = { mood: 'спокойное', tone: null, time: 'short', company: null };
    var picks = aiSmartPick(prof, { sleep: true });
    aiHistPush('ai', 'подборка «уснуть»');
    aiAddHTML('<div class="ai-note">Тихий, лёгкий набор — без экшена, хорроров и головоломок. Спокойной ночи 🌙</div>' + aiRenderPicks(picks, prof, { sleep: true }));
  };
  window.aiDiary = function(){
    var box = document.getElementById('diary-box');
    if (!box) return;
    if (box.style.display !== 'none'){ box.style.display = 'none'; return; }
    var wlog = {};
    try { wlog = JSON.parse(localStorage.getItem('mood_movies_watched_log')) || {}; } catch(e){ wlog = {}; }
    var now = Date.now();
    var monthIds = [], allIds = [];
    (watched || []).forEach(function(id){
      allIds.push(String(id));
      if (wlog[String(id)] && now - wlog[String(id)] < 30 * 24 * 3600 * 1000) monthIds.push(String(id));
    });
    if (!allIds.length){
      box.style.display = 'block';
      box.innerHTML = '<div class="couple-box">Отметь пару фильмов как просмотренные — и я соберу итоги месяца 🎬</div>';
      return;
    }
    var list = (monthIds.length ? monthIds : allIds);
    var per = monthIds.length ? 'за месяц' : 'за всё время';
    var gcount = {}, rated = [], sum = 0, n = 0;
    list.forEach(function(id){
      movies.forEach(function(x){
        if (String(x.id) !== String(id)) return;
        aiGenresOf(x).split(',').forEach(function(g){ g = g.trim(); if (g) gcount[g] = (gcount[g] || 0) + 1; });
        if (ratings && ratings[id]){ rated.push({ m: x, stars: parseInt(ratings[id], 10) }); sum += parseInt(ratings[id], 10); n++; }
      });
    });
    var topG = null, topN = 0;
    Object.keys(gcount).forEach(function(g){ if (gcount[g] > topN){ topN = gcount[g]; topG = g; } });
    var best = rated.slice().sort(function(a, b){ return b.stars - a.stars; })[0] || null;
    var html = '<div class="couple-box"><div style="font-weight:700;margin-bottom:10px;">📊 Итоги ' + per + '</div>';
    html += '<div class="ai-note">Посмотрел: <b>' + list.length + '</b> ' + (list.length % 10 === 1 && list.length % 100 !== 11 ? 'фильм' : 'фильмов');
    if (n) html += ' · средняя оценка: <b>' + (sum / n).toFixed(1) + '/5</b>';
    if (topG) html += '<br>Чаще всего выбирал: <b>' + aiH(topG) + '</b>';
    if (best) html += '<br>Лучший выбор: «<b>' + aiH(best.m.title) + '</b>» — оценка ' + best.stars + '/5' + (best.stars >= 4 ? ', отличный вкус 🙂' : ', честно отмечено');
    html += '</div></div>';
    box.innerHTML = html;
    box.style.display = 'block';
  };
  function aiNoop(){}

  window.aiLikePrompt = function(){
    aiAddHTML('<div class="ai-note">Напиши, на что похожее хочется — например: «похоже на Интерстеллар» или «в стиле Гранд Будапешт».</div>');
  };
  window.aiLikePick = function(name){
    name = (name || '').trim();
    if (!name){ aiLikePrompt(); return; }
    var ref = aiFindMovie(name);
    if (!ref){ aiHistPush('ai', 'похоже на «' + name + '» — нет в каталоге'); aiAddHTML('<div class="ai-note"><b>' + aiH(name.charAt(0).toUpperCase() + name.slice(1)) + '</b> — этого фильма в каталоге нет. Напиши название точнее или попробуй другой.</div>'); return; }
    var rg = aiGenresOf(ref).split(',').map(function(v){ return v.trim(); }).filter(function(v){ return v; });
    var re_ = aiEmotionsOf(ref).split(',').map(function(v){ return v.trim(); }).filter(function(v){ return v; });
    var rated = parseInt(ratings[ref.id], 10) || 0;
    var scored = [];
    movies.forEach(function(m){
      if (String(m.id) === String(ref.id)) return;
      if ((watched || []).indexOf(String(m.id)) >= 0 && !(parseInt(ratings[m.id], 10) >= 4)) return;
      var mg2 = aiGenresOf(m).split(',').map(function(v){ return v.trim(); });
      var me2 = aiEmotionsOf(m).split(',').map(function(v){ return v.trim(); });
      var common = rg.filter(function(gg){ return gg && mg2.indexOf(gg) >= 0; });
      var emo = re_.filter(function(e){ return e && me2.indexOf(e) >= 0; });
      var sc = common.length * 3 + emo.length * 1.5;
      if (Math.abs((m.year || 0) - (ref.year || 0)) <= 12) sc += 0.6;
      if (String(m.age || '') === String(ref.age || '')) sc += 0.4;
      if (!common.length) sc -= 4;
      sc += (m.rating || 0) / 10;
      scored.push({ m: m, sc: sc, common: common });
    });
    scored.sort(function(a, b){ return b.sc - a.sc; });
    var top = scored.slice(0, 5);
    var picks = top.map(function(s){ return s.m; });
    var comMap = {};
    top.forEach(function(s){ comMap[s.m.id] = s.common; });
    window.AI_LAST_PICKS = picks;
    window.AI_LAST_PROFILE = {};
    window.AI_LAST_OPTS = { like: comMap };
    aiHistPush('ai', 'похоже на «' + ref.title + '»');
    var intro = '<div class="ai-note">Похожее на «' + aiH(ref.title) + '»' + (rated >= 4 ? ' (ты оценил на ' + rated + '/5)' : '') + ' — подобрал по общим жанрам и настроению:</div>';
    var cards = '<div>' + picks.map(aiChipBtn).join('') + '</div>';
    var lines = '<div style="margin-top:10px;">' + picks.map(function(m){
      var cm = (comMap[m.id] || []).slice(0, 3).join(', ');
      return '<div class="ai-note">💬 <b>' + aiH(m.title) + '</b>' + (cm ? ' — общие жанры: ' + aiH(cm) : '') + '</div>';
    }).join('') + '</div>';
    aiAddHTML(intro + cards + lines + aiWhyNopeRow(picks));
  };
  window.aiSend = function(){
    var inp = document.getElementById('ai-input');
    if(!inp) return;
    var txt = (inp.value || '').trim();
    if(!txt) return;
    inp.value = '';
    aiAdd('user', txt);
    aiTrackSubject(txt);
    aiHistPush('user', txt);

    var cls = aiClassify(txt);

    if (cls.type === 'catalog' && cls.movie) {
      if (cls.movie.title) aiCurFilm = cls.movie.title;
      var el1 = aiAddHTML(aiInfoBlock(cls.movie));
      tmdbWhereBlock(cls.movie.title).then(function(b){
        if (b && el1) el1.insertAdjacentHTML('beforeend', '<div style="margin-top:10px;">' + b + '</div>');
      });
      return;
    }

    if (cls.type === 'outside') {
      var T = cls.title.charAt(0).toUpperCase() + cls.title.slice(1);
      aiCurFilm = cls.title;
      aiHistPush('ai', T + ' — в каталоге нет');
      var hintHtml = cls.partHint ? '<div class="ai-note" style="margin-top:8px;">В каталоге есть другая часть: <b>' + aiH(cls.partHint) + '</b> — <button class="ai-chip" onclick="aiShowTitle(\'' + aiAttr(cls.partHint) + '\')">показать</button></div>' : '';
      var el2 = aiAddHTML('<div class="ai-note"><b>' + aiH(T) + '</b> — в нашем каталоге этого фильма нет, но его можно посмотреть здесь:</div>' + aiWhereBtns(cls.title) + hintHtml);
      tmdbWhereBlock(cls.title).then(function(b){
        if (b && el2) el2.insertAdjacentHTML('beforeend', '<div style="margin-top:10px;">' + b + '</div>');
      });
      return;
    }

    if (cls.type === 'quick') { aiQuickStart(); return; }
    if (cls.type === 'interview') { aiStartInterview(); return; }
    if (cls.type === 'sleep') { aiSleepPick(); return; }
    if (cls.type === 'like') { aiLikePick(cls.subject); return; }
    if (cls.type === 'picks') {
      var picks = aiPick(txt);
      var intro = 'Вот что подобрал из каталога под запрос «' + aiH(txt) + '» — откройте карточку: там описание и кнопки «где смотреть».';
      aiHistPush('ai', intro);
      aiAddHTML(intro + '<div>' + picks.map(aiChipBtn).join('') + '</div>' + aiWhyNopeRow(picks));
      return;
    }

    // ИИ-ветка: разговоры и вопросы
    var wikiQ = aiCurFilm || txt;
    var typing = aiAdd('ai-typing', 'ИИ думает…');
    var step = 0;
    var stepTimer = setInterval(function(){
      step++;
      if (typing) typing.innerHTML = esc(step === 1 ? 'Смотрю справку…' : step === 2 ? 'Формулирую ответ…' : 'Ещё немного…');
    }, 9000);
    var hist = aiHist.slice(-6).map(function(m){ return (m.who === 'user' ? 'Пользователь: ' : 'ИИ: ') + m.text; }).join('\n');
    var subj = aiCurFilm || aiExtractSubject(txt) || '';

    function finish(reply, wiki){
      clearInterval(stepTimer);
      if (typing) typing.remove();
      lastReq = Date.now();
      aiHistPush('ai', reply);
      var el = aiAddHTML(aiEnrich(txt, reply));
      if (wiki && el) el.insertAdjacentHTML('beforeend', '<div style="margin-top:8px;font-size:12px;opacity:.65;">По данным Википедии</div>');
      if (subj) tmdbWhereBlock(subj).then(function(block){
        if (block && el) el.insertAdjacentHTML('beforeend', '<div style="margin-top:10px;">' + block + '</div>');
      });
    }
    var attemptNo = 0;
    function attempt(){
      attemptNo++;
      var settled = false;
      var watchdog = setTimeout(function(){
        if (settled) return;
        settled = true;
        retry('ИИ долго отвечает — пробую ещё раз…');
      }, 45000);
      getWikiContext(wikiQ).then(function(wiki){
        var wikiGot = wiki || '';
        var sys = buildSystem();
        if (wikiGot) sys = sys + '\n\n' + wikiGot;
        var userMsg = txt;
        if (hist) userMsg = 'КОНТЕКСТ РАЗГОВОРА:\n' + hist + (aiCurFilm ? '\nТЕКУЩАЯ ТЕМА: «' + aiCurFilm + '».' : '') + '\n\nТЕКУЩИЙ ВОПРОС ПОЛЬЗОВАТЕЛЯ: ' + txt;
        return throttle().then(function(){ return aiChain(sys, userMsg, wikiGot); }).then(function(reply){
          return { reply: reply || '', wiki: wikiGot };
        });
      }).then(function(pack){
        if (settled) return;
        settled = true;
        clearTimeout(watchdog);
        finish(pack.reply, pack.wiki);
      }).catch(function(e){
        if (settled) return;
        settled = true;
        clearTimeout(watchdog);
        retry('Сервис занят — пробую ещё раз…');
      });
    }
    function retry(status){
      if (attemptNo >= 2) {
        clearInterval(stepTimer);
        if (typing) typing.remove();
        var s = localAdvice(txt);
        if (s) { aiAddHTML(s); return; }
        aiAdd('bot', fallbackText(new Error('нет ответа')));
        return;
      }
      if (typing) typing.innerHTML = esc(status);
      setTimeout(attempt, 7000);
    }
    attempt();
  };

  function aiAttr(s){
    return String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/'/g, '\\\'');
  }
  window.aiShowTitle = function(t){
    var m = aiFindMovie(t);
    if (!m) return;
    if (m.title) aiCurFilm = m.title;
    var el = aiAddHTML(aiInfoBlock(m));
    tmdbWhereBlock(m.title).then(function(b){
      if (b && el) el.insertAdjacentHTML('beforeend', '<div style="margin-top:10px;">' + b + '</div>');
    });
  };
  window.aiQuickAsk = function(t){
    var inp = document.getElementById('ai-input');
    if(!inp) return;
    inp.value = t;
    aiSend();
  };

  
window.aiAboutMovie = function(id){
    var m = movies.find(function(x){ return x.id === id; });
    if(!m) return;
    closeModal();
    if (typeof showScreen === 'function') showScreen('screen-ai');
    var inp = document.getElementById('ai-input');
    if(!inp) return;
    inp.value = 'Расскажи о фильме «' + m.title + '» (' + m.year + '): о чём он, где снимали и почему стоит посмотреть?';
    setTimeout(function(){ window.aiSend(); }, 60);
  };

  var _addF = window.addToFavorites;
  window.addToFavorites = function(id){
    if (_addF) _addF(id);
    if (window.__modalId && document.getElementById('modal-overlay').classList.contains('open')) openModal(window.__modalId);
  };
  var _togW = window.toggleWatched;
  window.toggleWatched = function(id){
    if (_togW) _togW(id);
    if (window.__modalId && document.getElementById('modal-overlay').classList.contains('open')) openModal(window.__modalId);
  };
})();

/* === Колонка: выпадающие меню + высота шапки === */
(function(){
  const topBar = document.querySelector('.top-bar');
  function syncHeaderH(){ if (topBar) document.documentElement.style.setProperty('--header-h', topBar.offsetHeight + 'px'); }
  syncHeaderH(); window.addEventListener('resize', syncHeaderH);
  const moodToggle = document.getElementById('mood-toggle');
  const moodMenu = document.getElementById('mood-menu');
  const catsToggle = document.getElementById('cats-toggle');
  const catsMenu = document.getElementById('cats-menu');
  function closeAll(except){ [moodMenu, catsMenu].forEach(function(m){ if (m && m !== except) m.classList.remove('open'); }); }
  if (moodToggle && moodMenu) moodToggle.addEventListener('click', function(e){
    e.stopPropagation();
    const willOpen = !moodMenu.classList.contains('open');
    closeAll(null);
    if (willOpen) moodMenu.classList.add('open');
  });
  if (moodMenu) moodMenu.addEventListener('click', function(e){
    if (e.target.closest('.mood-btn')) moodMenu.classList.remove('open');
  });
  function buildCats(){
    if (catsMenu.dataset.built) return;
    const selG = document.getElementById('sel-genre');
    if (!selG) return;
    let html = '';
    for (let i = 0; i < selG.options.length; i++) {
      const o = selG.options[i];
      if (!o.value) continue;
      html += '<button class="cat-item" data-genre="' + o.value + '">' + o.textContent + '</button>';
    }
    catsMenu.innerHTML = html || '<div class="review-empty">Категории недоступны</div>';
    catsMenu.dataset.built = '1';
  }
  if (catsToggle && catsMenu) catsToggle.addEventListener('click', function(e){
    e.stopPropagation();
    const willOpen = !catsMenu.classList.contains('open');
    closeAll(null);
    if (willOpen) { buildCats(); catsMenu.classList.add('open'); }
  });
  document.addEventListener('click', function(e){
    if (moodMenu && moodMenu.classList.contains('open') && !moodMenu.contains(e.target)) moodMenu.classList.remove('open');
    if (catsMenu && catsMenu.classList.contains('open') && !catsMenu.contains(e.target)) catsMenu.classList.remove('open');
  });
  if (catsMenu) catsMenu.addEventListener('click', function(e){
    const b = e.target.closest('.cat-item');
    if (!b) return;
    catsMenu.classList.remove('open');
    const g = b.dataset.genre;
    lastFullItems = movies.slice();
    const selG = document.getElementById('sel-genre');
    if (selG) { selG.value = g; selG.dispatchEvent(new Event('change')); }
    const rt = document.getElementById('results-title');
    if (rt) rt.textContent = 'Категория: ' + g;
    showScreen('screen-results');
  });
})();



(function(){
  function fitMenus(){
    document.querySelectorAll('.dropdown-menu.open').forEach(function(m){
      var r = m.getBoundingClientRect();
      if (!r.height) return;
      var avail = window.innerHeight - r.top - 14;
      if (avail > 160) m.style.maxHeight = avail + 'px';
    });
  }
  window.addEventListener('resize', fitMenus);
  window.setInterval(fitMenus, 400);
  var tt = document.getElementById('to-top');
  function upd(){
    var any = window.scrollY > 400;
    if (!any) {
      var els = document.querySelectorAll('.screen.active, .ai-messages, #chat-panel.open, .dropdown-menu.open, .modal-overlay.open .modal-box');
      for (var i = 0; i < els.length; i++) { if (els[i].scrollTop > 400) { any = true; break; } }
    }
    tt.classList.toggle('show', any);
  }
  window.addEventListener('scroll', upd, {passive:true});
  window.setInterval(upd, 500);
  upd();
  tt.addEventListener('click', function(){
    window.scrollTo({top: 0, behavior: 'smooth'});
    document.querySelectorAll('.screen.active, .ai-messages, #chat-panel.open, .dropdown-menu.open, .modal-overlay.open .modal-box').forEach(function(el){
      el.scrollTo({top: 0, behavior: 'smooth'});
    });
  });
})();


/* ===== Плавающая подсказка поля ИИ (мобильная вёрстка) =====
   Текст плейсхолдера переносится из атрибута в подпись .ai-hint,
   которая лежит поверх поля и скрывается при фокусе/вводе.
   Работает только там, где mobile.css включает подсказку. */
(function () {
  function initAiHint() {
    var input = document.getElementById('ai-input');
    if (!input || document.querySelector('.ai-hint')) return;
    var text = (input.getAttribute('placeholder') || '').trim();
    if (!text) return;
    input.setAttribute('placeholder', ' ');
    var span = document.createElement('span');
    span.className = 'ai-hint';
    span.textContent = text;
    input.parentNode.insertBefore(span, input.nextSibling);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAiHint);
  } else {
    initAiHint();
  }
})();

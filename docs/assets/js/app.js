let serverPayload = { movies: [], tvShows: [] };
let currentTab = 'movies';
let toastTimeout = null;

async function initDashboard() {
    try {
        const response = await fetch('./data/media.json');
        if (!response.ok) throw new Error("Data bank could not be read.");
        serverPayload = await response.json();
        populateGenres();
        filterAndRender();
    } catch (err) {
        document.getElementById('catalog-display-box').innerHTML = 
            `<p style="color: var(--accent-purple); grid-column: 1/-1; text-align: center;">Unable to load media catalog details.</p>`;
    }
}

function isRecent(dateAdded) {
    if (!dateAdded) return false;
    const diffTime = Math.abs(new Date() - new Date(dateAdded));
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30;
}

function populateGenres() {
    const genres = new Set();
    [...serverPayload.movies, ...serverPayload.tvShows].forEach(i => (i.genres || []).forEach(g => genres.add(g)));
    const select = document.getElementById('genre-select');
    [...genres].sort().forEach(g => {
        const opt = document.createElement('option');
        opt.value = g;
        opt.textContent = g;
        select.appendChild(opt);
    });
}

function filterAndRender() {
    const container = document.getElementById('catalog-display-box');
    const search = document.getElementById('library-search').value.trim().toLowerCase();
    const sort = document.getElementById('sort-select').value;
    const genre = document.getElementById('genre-select').value;
    let data = currentTab === 'movies' ? serverPayload.movies : serverPayload.tvShows;

    if (genre !== 'all') data = data.filter(i => (i.genres || []).includes(genre));
    if (search) data = data.filter(i => i.title.toLowerCase().includes(search));

    data.sort((a, b) => {
        if (sort === 'year-desc') return (parseInt(b.year) || 0) - (parseInt(a.year) || 0);
        if (sort === 'year-asc') return (parseInt(a.year) || 0) - (parseInt(b.year) || 0);
        return (a.title || "").localeCompare(b.title || "");
    });

    container.innerHTML = '';
    const seenTitles = new Set();

    data.forEach(item => {
        const standardizedTitle = item.title.trim().toLowerCase();
        if (seenTitles.has(standardizedTitle)) return;
        seenTitles.add(standardizedTitle);

        const card = document.createElement('a');
        card.className = 'media-card';
        card.href = item.imdb ? `https://www.imdb.com/title/${item.imdb}/` : '#';
        
        if (!item.imdb) {
            card.onclick = (e) => { e.preventDefault(); showToast("No IMDb link available."); };
        } else {
            card.target = '_blank';
        }

        const isNew = isRecent(item.dateAdded);
        card.innerHTML = `
            <div class="poster-wrapper">
                ${isNew ? '<div class="new-badge">NEW</div>' : ''}
                <img src="${item.poster}" class="poster-img" loading="lazy">
            </div>
            <div class="info-panel">
                <div class="card-title">${item.title}</div>
                <div class="card-meta">${item.year}</div>
            </div>
        `;
        container.appendChild(card);
    });
}

function showToast(message) {
    const toast = document.getElementById('toast-message');
    toast.innerText = message;
    toast.classList.add('show');
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toast.classList.remove('show'), 3000);
}

function switchTab(type, el) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
    currentTab = type === 'tv' ? 'tvShows' : 'movies';
    filterAndRender();
}

window.addEventListener('DOMContentLoaded', initDashboard);

const fs = require('fs');
const path = require('path');

if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const EMBY_URL = process.env.EMBY_URL.replace(/\/$/, "");
const API_KEY = process.env.EMBY_API_KEY;

// Use process.cwd() to ensure we are targeting the actual working directory of the runner
const WEB_ROOT = path.join(process.cwd(), 'docs');
const DATA_DIR = path.join(WEB_ROOT, 'data');
const POSTER_DIR = path.join(DATA_DIR, 'posters');

if (!fs.existsSync(POSTER_DIR)) {
    fs.mkdirSync(POSTER_DIR, { recursive: true });
}

async function getCollectionIdByType() {
    try {
        const response = await fetch(`${EMBY_URL}/Library/MediaFolders?api_key=${API_KEY}`);
        if (!response.ok) return null;
        const data = await response.json();
        return data.Items.find(item => item.CollectionType === 'tvshows')?.Id || null;
    } catch (err) {
        return null;
    }
}

async function downloadPosterImage(itemId, imageTag) {
    if (!imageTag) return null;
    const fileName = `${itemId}.jpg`;
    const destinationPath = path.join(POSTER_DIR, fileName);
    if (fs.existsSync(destinationPath)) return `./data/posters/${fileName}`;

    try {
        const response = await fetch(`${EMBY_URL}/Items/${itemId}/Images/Primary?api_key=${API_KEY}&maxWidth=400`);
        if (!response.ok) return null;
        fs.writeFileSync(destinationPath, Buffer.from(await response.arrayBuffer()));
        return `./data/posters/${fileName}`;
    } catch { return null; }
}

async function queryLibraryContents(itemType, parentId = null) {
    const queryParams = new URLSearchParams({ api_key: API_KEY, IncludeItemTypes: itemType, Recursive: 'true', Fields: 'Overview,ProductionYear,ImageTags,ProviderIds,Genres,DateCreated', IsMissing: 'false' });
    if (parentId) queryParams.append('ParentId', parentId);
    
    const response = await fetch(`${EMBY_URL}/Items?${queryParams.toString()}`);
    const data = await response.json();
    
    return Promise.all(data.Items.map(async item => ({
        id: item.Id,
        title: item.Name,
        year: item.ProductionYear || 'N/A',
        overview: item.Overview || 'No description.',
        poster: await downloadPosterImage(item.Id, item.ImageTags?.Primary),
        imdb: item.ProviderIds?.Imdb || item.ProviderIds?.IMDB || null,
        genres: item.Genres || [],
        dateAdded: item.DateCreated
    })));
}

async function run() {
    const tvDirectoryId = await getCollectionIdByType();
    const newPayload = {
        movies: await queryLibraryContents("Movie"),
        tvShows: await queryLibraryContents("Series", tvDirectoryId),
        lastGenerated: new Date().toISOString()
    };

    const filePath = path.join(DATA_DIR, 'media.json');
    console.log(`DEBUG: Writing to ${filePath}`);
    
    fs.writeFileSync(filePath, JSON.stringify(newPayload, null, 2));
    console.log("Write success.");
}

run().catch(console.error);

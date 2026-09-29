const fs = require('fs');
const path = require('path');

if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

// Sanitize inputs to catch accidental quotes or trailing slashes from secrets
let rawUrl = process.env.EMBY_URL || '';
rawUrl = rawUrl.replace(/^["']|["']$/g, '').replace(/\/$/, "");
const EMBY_URL = rawUrl;
const API_KEY = (process.env.EMBY_API_KEY || '').replace(/^["']|["']$/g, '');

console.log(`[DEBUG] Attempting connection to Emby URL: "${EMBY_URL}"`);
console.log(`[DEBUG] API Key length: ${API_KEY.length} characters`);

if (!EMBY_URL || !API_KEY) {
    console.error("[FATAL] EMBY_URL or EMBY_API_KEY is missing or empty.");
    process.exit(1);
}

const WEB_ROOT = path.join(process.cwd(), 'docs');
const DATA_DIR = process.env.OUTPUT_DIR || path.join(process.cwd(), 'docs', 'data');
const POSTER_DIR = path.join(DATA_DIR, 'posters');

console.log(`[DEBUG] Working directory (cwd): ${process.cwd()}`);
console.log(`[DEBUG] Target DATA_DIR: ${DATA_DIR}`);

if (!fs.existsSync(POSTER_DIR)) {
    fs.mkdirSync(POSTER_DIR, { recursive: true });
}

async function getCollectionIdByType() {
    const targetUrl = `${EMBY_URL}/Library/MediaFolders?api_key=${API_KEY}`;
    console.log(`[DEBUG] Fetching media folders from: ${EMBY_URL}/Library/MediaFolders`);
    
    const response = await fetch(targetUrl);
    if (!response.ok) {
        throw new Error(`[ERROR] Failed to fetch media folders. Status: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    const tvShowFolder = data.Items?.find(item => item.CollectionType === 'tvshows');
    console.log(`[DEBUG] Found TV Shows Collection ID: ${tvShowFolder ? tvShowFolder.Id : 'None found'}`);
    return tvShowFolder?.Id || null;
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
    const queryParams = new URLSearchParams({ 
        api_key: API_KEY, 
        IncludeItemTypes: itemType, 
        Recursive: 'true', 
        Fields: 'Overview,ProductionYear,ImageTags,ProviderIds,Genres,DateCreated', 
        //IsMissing: 'false' 
    });
    if (parentId) queryParams.append('ParentId', parentId);
    
    console.log(`[DEBUG] Querying library items for type: ${itemType}`);
    const response = await fetch(`${EMBY_URL}/Items?${queryParams.toString()}`);
    if (!response.ok) {
        throw new Error(`[ERROR] Emby API error for ${itemType}: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    if (!data.Items || !Array.isArray(data.Items)) {
        console.warn(`[WARNING] No items array returned for type ${itemType}`);
        return [];
    }
    
    console.log(`[DEBUG] Successfully fetched ${data.Items.length} items for type ${itemType}`);
    
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
    console.log(`[DEBUG] Writing payload to ${filePath}`);
    
    fs.writeFileSync(filePath, JSON.stringify(newPayload, null, 2));
    console.log("[SUCCESS] Write complete.");
}

run().catch(err => {
    console.error("[FATAL ERROR] Script crashed:", err);
    process.exit(1); // Force GitHub Action to fail loudly instead of passing silently
});


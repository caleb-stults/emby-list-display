const fs = require('fs');
const path = require('path');

if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const EMBY_URL = process.env.EMBY_URL.replace(/\/$/, "");
const API_KEY = process.env.EMBY_API_KEY;

const WEB_ROOT = path.join(__dirname, 'docs'); 
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
        const match = data.Items.find(item => item.CollectionType === 'tvshows');
        
        if (match) {
            console.log(`Successfully detected TV Library: "${match.Name}" (ID: ${match.Id})`);
            return match.Id;
        } else {
            console.warn("Could not find a library with CollectionType 'tvshows'.");
            return null;
        }
    } catch (err) {
        console.error(`Error resolving TV collection folder ID:`, err.message);
        return null;
    }
}

async function downloadPosterImage(itemId, imageTag) {
    if (!imageTag) return null;

    const fileName = `${itemId}.jpg`;
    const destinationPath = path.join(POSTER_DIR, fileName);
    const webRelativePath = `./data/posters/${fileName}`;

    if (fs.existsSync(destinationPath)) {
        return webRelativePath;
    }

    const targetUrl = `${EMBY_URL}/Items/${itemId}/Images/Primary?api_key=${API_KEY}&maxWidth=400`;

    try {
        const response = await fetch(targetUrl);
        if (!response.ok) return null;

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        fs.writeFileSync(destinationPath, buffer);

        return webRelativePath;
    } catch (err) {
        console.error(`Error writing image asset for ID ${itemId}:`, err.message);
        return null;
    }
}

async function queryLibraryContents(itemType, parentId = null) {
    const queryParams = new URLSearchParams({
        api_key: API_KEY,
        IncludeItemTypes: itemType,
        Recursive: 'true',
        Fields: 'Overview,ProductionYear,ImageTags,ProviderIds,Genres,DateCreated',
        IsMissing: 'false'
    });

    if (parentId) {
        queryParams.append('ParentId', parentId);
    }

    const endpointUrl = `${EMBY_URL}/Items?${queryParams.toString()}`;
    const response = await fetch(endpointUrl);
    if (!response.ok) throw new Error(`HTTP network error returned: ${response.status}`);

    const data = await response.json();
    const cleanCatalog = [];

    for (const item of data.Items) {
        const primaryImageTag = item.ImageTags ? item.ImageTags.Primary : null;
        const localPosterUrl = await downloadPosterImage(item.Id, primaryImageTag);
        const imdbId = (item.ProviderIds && (item.ProviderIds.Imdb || item.ProviderIds.IMDB || item.ProviderIds.imdb)) || null;
        
        cleanCatalog.push({
            id: item.Id,
            title: item.Name,
            year: item.ProductionYear || 'N/A',
            overview: item.Overview || 'No description summary available.',
            poster: localPosterUrl,
            imdb: imdbId,
            genres: item.Genres || [],
            dateAdded: item.DateCreated
        });
    }

    return cleanCatalog;
}

async function run() {
    if (!EMBY_URL || !API_KEY) {
        console.error("Critical configuration failure: Check your local .env key pairs.");
        process.exit(1);
    }

    try {
        const tvDirectoryId = await getCollectionIdByType();
        const moviesList = await queryLibraryContents("Movie");
        const tvShowsList = await queryLibraryContents("Series", tvDirectoryId);

        const newPayload = {
            movies: moviesList,
            tvShows: tvShowsList,
            lastGenerated: new Date().toISOString()
        };

        const filePath = path.join(DATA_DIR, 'media.json');
        
        if (fs.existsSync(filePath)) {
            const oldData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            const newData = JSON.parse(JSON.stringify(newPayload));
            
            delete oldData.lastGenerated;
            delete newData.lastGenerated;

            if (JSON.stringify(oldData) === JSON.stringify(newData)) {
                console.log("No library changes detected. Skipping file write.");
                return;
            }
        }

        fs.writeFileSync(filePath, JSON.stringify(newPayload, null, 2));
        console.log(`Success! Synchronized ${moviesList.length} movies and ${tvShowsList.length} shows.`);
    } catch (globalError) {
        console.error("System pipeline routine failure:", globalError);
        process.exit(1);
    }
}

run();

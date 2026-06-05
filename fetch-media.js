const fs = require('fs');
const path = require('path');

require('dotenv').config();

const EMBY_URL = process.env.EMBY_URL.replace(/\/$/, "");
const API_KEY = process.env.EMBY_API_KEY;

const WEB_ROOT = path.join(__dirname, 'docs'); 
const DATA_DIR = path.join(WEB_ROOT, 'data');
const POSTER_DIR = path.join(DATA_DIR, 'posters');

if (!fs.existsSync(POSTER_DIR)) {
    fs.mkdirSync(POSTER_DIR, { recursive: true });
}

/**
 * Connects to the updated folder layout routing tree and matches the library tagged internally with the structural type 'tvshows'.
 */
async function getCollectionIdByType() {
    try {
        const response = await fetch(`${EMBY_URL}/Library/MediaFolders?api_key=${API_KEY}`);
        if (!response.ok) return null;
        
        const data = await response.json();
	const cleanCatalog = [];

    // Debug: Check the first item returned to see if it even has ProviderIds
    	if (data.Items && data.Items.length > 0) {
        	console.log(`DEBUG: First item in ${itemType} is "${data.Items[0].Name}"`);
        	console.log(`DEBUG: ProviderIds for this item:`, JSON.stringify(data.Items[0].ProviderIds));
    	}

    	for (const item of data.Items) {        
        // Debug: Log what Emby returns so we can see the exact CollectionType
        console.log("Available Libraries:", data.Items.map(i => ({ Name: i.Name, Type: i.CollectionType })));

        // Look for common variations of the TV library type
        const match = data.Items.find(item => 
            ['tvshows', 'shows', 'series'].includes(item.CollectionType)
        );
        
        return match ? match.Id : null;
    } catch (err) {
        console.error(`Error resolving TV collection folder ID:`, err.message);
        return null;
    }
}
/**
 * Downloads a binary poster image from Emby and saves it locally inside the repository workspace
 */
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

/**
 * Queries modern Emby API for item structures and formats the layout payload arrays
 */
async function queryLibraryContents(itemType, parentId = null) {
    const queryParams = new URLSearchParams({
        api_key: API_KEY,
        IncludeItemTypes: itemType,
        Recursive: 'true',
        // CHANGED: Added 'ProviderIds' to the Fields string
        Fields: 'Overview,ProductionYear,ImageTags,ProviderIds',
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

        // CHANGED: Added extraction of the Imdb ID
        const imdbId = item.ProviderIds && item.ProviderIds.Imdb ? item.ProviderIds.Imdb : null;

        cleanCatalog.push({
            id: item.Id,
            title: item.Name,
            year: item.ProductionYear || 'N/A',
            overview: item.Overview || 'No description summary available.',
            poster: localPosterUrl,
            imdb: imdbId
        });
    }

    return cleanCatalog;
}

/**
 * Core orchestrator execution module
 */
async function run() {
    if (!EMBY_URL || !API_KEY) {
        console.error("Critical configuration failure: Check your local .env key pairs.");
        process.exit(1);
    }

    try {
        console.log("Analyzing Emby workspace configurations...");
        
        const tvDirectoryId = await getCollectionIdByType();
        if (!tvDirectoryId) {
            console.warn("Warning: Could not isolate an internal library type matching 'tvshows'.");
        } else {
            console.log(`Detected TV Library ID: ${tvDirectoryId}`);
        }

        console.log("Compiling movies list...");
        const moviesList = await queryLibraryContents("Movie");

        console.log("Compiling TV shows list using detected collection ID...");
        const tvShowsList = await queryLibraryContents("Series", tvDirectoryId);

        const structuredPayload = {
            movies: moviesList,
            tvShows: tvShowsList,
            lastGenerated: new Date().toISOString()
        };

        fs.writeFileSync(
            path.join(DATA_DIR, 'media.json'), 
            JSON.stringify(structuredPayload, null, 2)
        );

        console.log(`Success! Synchronized ${moviesList.length} movies and ${tvShowsList.length} shows.`);
    } catch (globalError) {
        console.error("System pipeline routine failure:", globalError);
        process.exit(1);
    }
}

run();

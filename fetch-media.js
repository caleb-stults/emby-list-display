require('dotenv').config();
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const EMBY_URL = process.env.EMBY_URL;
const API_KEY = process.env.EMBY_API_KEY;

// Ensure directories exist
const dataDir = path.join('docs', 'data');
const postersDir = path.join(dataDir, 'posters');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(postersDir)) fs.mkdirSync(postersDir, { recursive: true });

async function downloadPoster(imageId, tag) {
    const targetPath = path.join(postersDir, `${imageId}.jpg`);
    if (fs.existsSync(targetPath)) return;

    try {
        const url = `${EMBY_URL}/emby/Items/${imageId}/Images/Primary?tag=${tag}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Status ${response.status}`);
        const buffer = await response.buffer();
        fs.writeFileSync(targetPath, buffer);
    } catch (err) {
        console.error(`Error downloading poster ${imageId}:`, err.message);
    }
}

async function fetchMedia(type) {
    // Added ONLY ",ProviderIds" to your exact working URL fields string
    const url = `${EMBY_URL}/emby/Items?ApiKey=${API_KEY}&IncludeItemTypes=${type}&Recursive=true&Fields=ProductionYear,ImageTags,ProviderIds`;
    
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Emby response error: ${response.status}`);
    }
    const data = await response.json();
    const items = data.Items || [];

    const processed = [];
    for (const item of items) {
        let posterPath = '';
        if (item.ImageTags && item.ImageTags.Primary) {
            await downloadPoster(item.Id, item.ImageTags.Primary);
            posterPath = `./data/posters/${item.Id}.jpg`;
        }

        // Added ONLY this extraction mapping line to pull the IMDb ID safely
        const imdbId = item.ProviderIds && item.ProviderIds.Imdb ? item.ProviderIds.Imdb : null;

        processed.push({
            title: item.Name,
            year: item.ProductionYear || 'Unknown',
            poster: posterPath,
            imdb: imdbId
        });
    }
    return processed;
}

async function main() {
    try {
        console.log('Fetching movies...');
        const movies = await fetchMedia('Movie');

        console.log('Fetching TV shows...');
        const tvShows = await fetchMedia('Series');

        const outPath = path.join(dataDir, 'media.json');
        fs.writeFileSync(outPath, JSON.stringify({ movies, tvShows }, null, 2));
        console.log('Success! media.json updated.');
    } catch (err) {
        console.error('Fatal error running script:', err.message);
        process.exit(1);
    }
}

main();

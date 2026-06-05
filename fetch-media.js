import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

dotenv.config();

async function downloadPoster(imageId, tag) {
    const targetDir = path.join('docs', 'data', 'posters');
    const targetPath = path.join(targetDir, `${imageId}.jpg`);

    if (fs.existsSync(targetPath)) {
        return;
    }

    try {
        const url = `${process.env.EMBY_URL}/emby/Items/${imageId}/Images/Primary?tag=${tag}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to download image asset for ID: ${imageId}`);
        
        const buffer = await response.buffer();
        fs.writeFileSync(targetPath, buffer);
    } catch (err) {
        console.error(`Error caching poster asset for ID ${imageId}:`, err.message);
    }
}

async function fetchLibrary(itemType) {
    const url = `${process.env.EMBY_URL}/emby/Items?ApiKey=${process.env.EMBY_API_KEY}&IncludeItemTypes=${itemType}&Recursive=true&Fields=ProductionYear,ImageTags,ProviderIds`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Emby server responded with status: ${response.status}`);
        const data = await response.json();
        return data.Items || [];
    } catch (err) {
        console.error(`Failed to harvest ${itemType} records from Emby:`, err.message);
        return [];
    }
}

async function processItems(items) {
    const optimizedList = [];

    for (const item of items) {
        const cleanTitle = item.Name;
        const releaseYear = item.ProductionYear || 'Unknown';
        let posterPath = '';

        if (item.ImageTags && item.ImageTags.Primary) {
            const imageId = item.Id;
            const tag = item.ImageTags.Primary;
            await downloadPoster(imageId, tag);
            posterPath = `./data/posters/${imageId}.jpg`;
        }

        const imdbId = (item.ProviderIds && item.ProviderIds.Imdb) ? item.ProviderIds.Imdb : null;

        optimizedList.push({
            title: cleanTitle,
            year: releaseYear,
            poster: posterPath,
            imdb: imdbId
        });
    }

    return optimizedList;
}

async function main() {
    const dataDir = path.join('docs', 'data');
    const postersDir = path.join(dataDir, 'posters');

    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    if (!fs.existsSync(postersDir)) fs.mkdirSync(postersDir, { recursive: true });

    console.log('Querying movie collection entries...');
    const rawMovies = await fetchLibrary('Movie');
    const processedMovies = await processItems(rawMovies);

    console.log('Querying television series entries...');
    const rawTV = await fetchLibrary('Series');
    const processedTV = await processItems(rawTV);

    const finalPayload = {
        movies: processedMovies,
        tvShows: processedTV
    };

    const outputPath = path.join(dataDir, 'media.json');
    fs.writeFileSync(outputPath, JSON.stringify(finalPayload, null, 2));
    console.log(`Synchronization payload successfully compiled and written to: ${outputPath}`);
}

main();

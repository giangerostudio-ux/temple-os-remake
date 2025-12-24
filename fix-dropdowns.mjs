import { readFileSync, writeFileSync } from 'fs';

let c = readFileSync('src/main.ts', 'utf8');

// Replace audio-sink-select
c = c.replace(
    /<select class="audio-sink-select"[^>]+>[\s\S]*?\$\{sinkOptions \|\|[^}]+\}[\s\S]*?<\/select>/,
    '${renderCustomDropdown(\'audio-sink\', sinkDropdownOptions, \'(No devices)\')}'
);

// Replace audio-source-select
c = c.replace(
    /<select class="audio-source-select"[^>]+>[\s\S]*?\$\{sourceOptions \|\|[^}]+\}[\s\S]*?<\/select>/,
    '${renderCustomDropdown(\'audio-source\', sourceDropdownOptions, \'(No devices)\')}'
);

// Fix grid columns (120px 1fr -> 80px minmax(0, 1fr)) in Sound card
c = c.replace(
    /grid-template-columns: 120px 1fr/,
    'grid-template-columns: 80px minmax(0, 1fr)'
);

writeFileSync('src/main.ts', c);
console.log('Replacement complete');

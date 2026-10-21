import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const expected=JSON.parse(await fs.readFile('VERSION.json','utf8'));
const html=await fs.readFile('dist/index.html','utf8');
const assets=[...html.matchAll(/(?:src|href)="(\.\/assets\/[^\"]+)"/g)].map(m=>m[1]);
assert(assets.some(a=>a.endsWith('.js'))&&assets.some(a=>a.endsWith('.css')),'relative JS and CSS asset links exist');
const page=new URL('https://moyisey.github.io/ash-coast/');
for(const asset of assets){assert(new URL(asset,page).pathname.startsWith('/ash-coast/assets/'));await fs.access(path.join('dist',asset));}
const bytes=await fs.readFile(expected.bundle);
assert.equal(bytes.length,expected.bundleBytes);
assert.equal(createHash('sha256').update(bytes).digest('hex'),expected.bundleSha256,'published gameplay bytes match verified 0.1.1');
console.log(`Verified ${assets.length} project-path assets; gameplay SHA-256 ${expected.bundleSha256}`);

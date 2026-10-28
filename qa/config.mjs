import path from 'node:path';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs/promises';
export const ROOT=path.dirname(fileURLToPath(import.meta.url));
export const BASE=path.resolve(ROOT,'..');
export const CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe';
export const EXPECTED_BUNDLE=JSON.parse(await fs.readFile(path.join(BASE,'VERSION.json'),'utf8')).bundleSha256;
export async function output(name,value){const target=path.join(ROOT,'evidence',name);await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,typeof value==='string'?value:JSON.stringify(value,null,2));}

import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const files=(await fs.readdir('dist/assets')).filter(n=>n.endsWith('.js'));if(files.length!==1)throw Error('Expected one game bundle');
const bundle='dist/assets/'+files[0],body=await fs.readFile(bundle),sha=data=>createHash('sha256').update(data).digest('hex');
const assets=[];for(const file of ['dist/index.html',...(await fs.readdir('dist/assets')).map(n=>'dist/assets/'+n)]){const data=await fs.readFile(file);assets.push({file,bytes:data.length,sha256:sha(data)});}
const manifest={version:'0.5.0',status:'release 0.5.0; approved GitHub Pages publication',saveFormatVersion:3,bundle,bundleBytes:body.length,bundleSha256:sha(body),assets};
await fs.writeFile('VERSION.json',JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify(manifest));

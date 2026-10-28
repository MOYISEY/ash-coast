import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {BASE,EXPECTED_BUNDLE} from './config.mjs';
export async function serveFrozen(){
 const root=path.join(BASE,'dist'),version=JSON.parse(await fs.readFile(path.join(BASE,'VERSION.json'),'utf8'));
 const bytes=await fs.readFile(path.join(BASE,version.bundle));
 if(createHash('sha256').update(bytes).digest('hex')!==EXPECTED_BUNDLE)throw Error('Candidate 0.5.0 bundle differs');
 const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
 const server=http.createServer(async(req,res)=>{try{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
  const url=new URL(req.url,'http://127.0.0.1');
  const file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname)));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  const body=await fs.readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:body);
 }catch{res.writeHead(404).end();}});
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 const origin=`http://127.0.0.1:${server.address().port}/`;
 return {origin,bundleSha256:EXPECTED_BUNDLE,close:()=>new Promise(resolve=>server.close(resolve))};
}

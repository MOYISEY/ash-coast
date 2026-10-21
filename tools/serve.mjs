import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../dist');
const port=Number(process.env.PORT||5173),host='127.0.0.1',url=`http://${host}:${port}/`;
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml'};
function openBrowser(){if(process.argv.includes('--open'))spawn('rundll32.exe',['url.dll,FileProtocolHandler',url],{windowsHide:true,stdio:'ignore'}).unref();}
try{await fs.access(path.join(root,'index.html'));}catch{console.error('Build missing. Run npm.cmd ci and npm.cmd run build.');process.exit(1);}
const server=http.createServer(async(req,res)=>{
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
 try{
  const pathname=decodeURIComponent(new URL(req.url,url).pathname);
  if(pathname==='/health'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({game:'ash-coast',version:'0.1.1'}));return;}
  const target=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!target.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  const data=await fs.readFile(target);res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:data);
 }catch{res.writeHead(404);res.end('Not found');}
});
server.on('error',async e=>{
 if(e.code==='EADDRINUSE'){
  try{const existing=await fetch(url+'health');if((await existing.json()).game==='ash-coast'){console.log('Ash Coast is already running: '+url);openBrowser();return;}}catch{}
  console.error(`Port ${port} is occupied. Close the existing development server, or use a different PORT.`);
 }else console.error(e.message);
 process.exitCode=1;
});
server.listen(port,host,()=>{console.log(`Ash Coast 0.1.1: ${url}\nLocal computer only. Press Ctrl+C to stop.`);openBrowser();});

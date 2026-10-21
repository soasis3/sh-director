// GitHub Pages stores this device's work in IndexedDB until a cloud worker is paired.
window.SHWeb = !['127.0.0.1','localhost','::1'].includes(location.hostname) || new URLSearchParams(location.search).has('web');
window.SHMediaURLs = new Map();
window.SHWebReady = Promise.resolve();
if (window.SHWeb) {
  const networkFetch = window.fetch.bind(window);
  const database = new Promise((resolve,reject)=>{const req=indexedDB.open('sh-director-web',1);req.onupgradeneeded=()=>{req.result.createObjectStore('projects',{keyPath:'projectId'});req.result.createObjectStore('media',{keyPath:'key'});req.result.createObjectStore('trash',{keyPath:'projectId'});};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
  async function db(store,method,value){const connection=await database;return new Promise((resolve,reject)=>{const tx=connection.transaction(store,method==='getAll'?'readonly':'readwrite'),req=tx.objectStore(store)[method](...(value===undefined?[]:[value]));let result;req.onsuccess=()=>result=req.result;tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error);});}
  window.SHWebReady=(async()=>{
    const rows=await db('media','getAll');
    for(const row of rows)SHMediaURLs.set(row.key,row.remoteURL||URL.createObjectURL(row.blob));
    try{
      const manifestResponse=await networkFetch('published-projects/index.json',{cache:'no-store',signal:AbortSignal.timeout(10000)});
      if(!manifestResponse.ok)return;
      const manifest=await manifestResponse.json(),existing=await db('projects','getAll'),deleted=new Set((await db('trash','getAll')).map(p=>p.projectId));
      for(const entry of manifest.projects||[]){
        const response=await networkFetch(entry.file+'?revision='+encodeURIComponent(entry.revision),{cache:'no-store',signal:AbortSignal.timeout(10000)});
        if(!response.ok)continue;
        const published=await response.json();
        for(const media of published.media||[]){
          const key=entry.id+'/'+media.path,remoteURL=new URL(media.url,document.baseURI).href;
          if(!SHMediaURLs.has(key)){SHMediaURLs.set(key,remoteURL);await db('media','put',{...media,key,projectId:entry.id,remoteURL,createdAt:new Date().toISOString(),source:'published'});}
        }
        // Seed once; never overwrite edits made in this browser or restore a deleted project.
        if(!existing.some(p=>p.projectId===entry.id)&&!deleted.has(entry.id))await db('projects','put',{...published.project,publishedRevision:published.revision});
      }
    }catch(error){console.warn('Published project list could not be refreshed; saved projects remain available.');}
  })();
  const response=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
  window.fetch=async(input,options={})=>{
    const raw=typeof input==='string'?input:input.url;
    if(!raw.startsWith('/api/'))return networkFetch(input,options);
    await SHWebReady;
    const url=new URL(raw,location.origin),method=options.method||'GET';
    if(url.pathname==='/api/projects'){
      if(method==='GET')return response({projects:await db('projects','getAll'),deletedIds:(await db('trash','getAll')).map(p=>p.projectId)});
      if(method==='POST'){const project=JSON.parse(options.body);await db('projects','put',project);return response({folder:project.title});}
    }
    if(url.pathname.startsWith('/api/projects/')&&method==='DELETE'){const projectId=decodeURIComponent(url.pathname.split('/').pop()),project=(await db('projects','getAll')).find(p=>p.projectId===projectId);if(project)await db('trash','put',project);await db('projects','delete',projectId);return response({deletedId:projectId});}
    if(['/api/mood-upload','/api/timeline-audio'].includes(url.pathname)&&method==='POST'){const projectId=url.searchParams.get('projectId'),label=url.searchParams.get('name'),blob=options.body,path='media/web/'+crypto.randomUUID()+'-'+label,key=projectId+'/'+path,kind=url.pathname==='/api/timeline-audio'?'audio':blob.type.startsWith('video/')?'video':'image';await db('media','put',{key,projectId,path,label,blob,kind,createdAt:new Date().toISOString()});SHMediaURLs.set(key,URL.createObjectURL(blob));return response({path,kind});}
    if(url.pathname==='/api/krea-import'&&method==='POST'){const {sourceURL,label}=JSON.parse(options.body);if(!/^https:\/\/gen\.krea\.ai\/images\//.test(sourceURL))return response({error:'Krea 이미지 주소를 확인해주세요.'},400);const projectId=url.searchParams.get('projectId'),path='media/krea/'+sourceURL.split('/').pop(),key=projectId+'/'+path;await db('media','put',{key,projectId,path,label,remoteURL:sourceURL,kind:'image',createdAt:new Date().toISOString()});SHMediaURLs.set(key,sourceURL);return response({path,kind:'image'});}
    if(url.pathname==='/api/project-library'){const items=(await db('media','getAll')).filter(r=>r.projectId===url.searchParams.get('projectId')).map(({blob,key,projectId,...r})=>({...r,source:'upload'}));return response({items});}
    if(url.pathname==='/api/generation-jobs'&&method==='GET')return response({jobs:[]});
    return response({error:'생성 요청을 저장했습니다. 원격 생성 PC 연결은 아직 준비 중입니다.'},503);
  };
}

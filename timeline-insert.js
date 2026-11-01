// Magnetic timeline: no synthetic gaps; distinct Source Monitor insert/overwrite edits.
const tiInsert=$('#tlInsert');tiInsert.classList.add('tp-icon','ti-source-edit');tiInsert.setAttribute('aria-label','삽입 · , · 오른쪽 클립 밀기');tiInsert.title='삽입 (,) · 재생 헤드에 넣고 오른쪽 클립을 밀기';tiInsert.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3h8v5H8ZM12 8v7m-3-3 3 3 3-3M3 18h5m8 0h5M8 16v5m8-5v5"/></svg>';
const tiOverwrite=document.createElement('button');tiOverwrite.id='tiOverwrite';tiOverwrite.type='button';tiOverwrite.className='tp-icon ti-source-edit';tiOverwrite.setAttribute('aria-label','덮어쓰기 · . · 기존 시간 교체');tiOverwrite.title='덮어쓰기 (.) · 뒤 클립을 밀지 않고 기존 시간을 교체';tiOverwrite.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3h8v5H8ZM12 8v7m-3-3 3 3 3-3M3 18h18"/><rect x="7" y="17" width="10" height="4" fill="currentColor" stroke="none"/></svg>';tiInsert.after(tiOverwrite);
function tiPlace(mode){if(!tlSource)return toast('소스 모니터에서 클립을 선택하세요.');tlStop();const bounds=teSourceBounds(),duration=TimelineEdit.snap(bounds.out-bounds.in);if(duration<TimelineEdit.FRAME)return;const c=tlNew({...tlSource,duration,inPoint:bounds.in}),at=Math.min(tpTotalBefore(),TimelineEdit.snap(tlTime));tlCheckpoint();if(mode==='overwrite')TimelineEdit.overwrite(state.timeline,c,at,id);else TimelineEdit.insert(state.timeline,c,at,id);tlSelected=c.id;tpAudioId=null;tlTime=at+duration;tlCommit();tpRenderProperties();}
tiInsert.onclick=()=>tiPlace('insert');tiOverwrite.onclick=()=>tiPlace('overwrite');
const tiRenderBefore=renderTimeline;renderTimeline=function(){tlClips();if(TimelineEdit.compact(state.timeline,id))save();tiRenderBefore();};
const tiCommitBefore=tlCommit;tlCommit=function(){if(state.timeline)TimelineEdit.compact(state.timeline,id);tiCommitBefore();};
document.addEventListener('keydown',e=>{if(activeTab!=='timeline'||document.querySelector('dialog[open]')||e.ctrlKey||e.metaKey||e.target.closest('textarea,select,[contenteditable="true"],input:not([type="range"])'))return;if(e.key==='.'){e.preventDefault();e.stopImmediatePropagation();tiPlace('overwrite');}},true);
$('.tl-bottom>span').textContent='V 선택 · C 컷 · B 리플 · N 롤링 · , 삽입 · . 덮어쓰기 · Ctrl K 분할 · Q/W 트림 · I/O 범위';

/* BEGIN TIMELINE-STUDIO */
// Multi-selection, clipboard, Studio handoff, and generated video layers.
let tsProject=null,tsAnchor=null,tsCopied=[];
const tsSelected=new Set();
const tsTrack=$('#tlTrack');
const tsMenu=document.createElement('div');
tsMenu.id='tsContextMenu';
tsMenu.className='ts-context-menu';
tsMenu.hidden=true;
tsMenu.innerHTML='<button data-ts-action="studio">Send to Studio</button><button data-ts-action="copy">Copy</button><button data-ts-action="paste">Paste</button><button data-ts-action="delete">Delete</button>';
document.body.append(tsMenu);
const tsIndex=clipId=>tlClips().findIndex(clip=>clip.id===clipId);
function tsOrdered(){return tlClips().filter(clip=>tsSelected.has(clip.id));}
function tsPaint(){document.querySelectorAll('#tlTrack [data-tl-clip]').forEach(node=>node.classList.toggle('selected',tsSelected.has(node.dataset.tlClip)));}
function tsClearSelection(){tsSelected.clear();tsAnchor=null;tlSelected=null;tpAudioId=null;$('#tlDuration').value='';tsPaint();}
function tsChoose(clip,event={}){
  const index=tsIndex(clip.id);
  if(event.shiftKey&&tsAnchor!==null){const a=Math.min(tsAnchor,index),b=Math.max(tsAnchor,index);if(!event.ctrlKey&&!event.metaKey)tsSelected.clear();tlClips().slice(a,b+1).forEach(item=>tsSelected.add(item.id));}
  else if(event.ctrlKey||event.metaKey){if(tsSelected.has(clip.id))tsSelected.delete(clip.id);else tsSelected.add(clip.id);tsAnchor=index;}
  else{if(!tsSelected.has(clip.id)||tsSelected.size===1){tsSelected.clear();tsSelected.add(clip.id);}tsAnchor=index;}
  if(tsSelected.size)tlSelect(tsSelected.has(clip.id)?clip:tsOrdered().at(-1));else tsClearSelection();tsPaint();
}
function tsHideMenu(){tsMenu.hidden=true;}
function tsCopy(){const selected=tsOrdered();if(!selected.length)return;tsCopied=selected.map(c=>structuredClone(c));toast(selected.length+'개 클립 복사');}
function tsPaste(){if(!tsCopied.length)return toast('복사한 클립이 없습니다.');tlCheckpoint();const selected=tsOrdered(),index=selected.length?tsIndex(selected.at(-1).id)+1:tlClips().length;const added=tsCopied.map(c=>({...structuredClone(c),id:id()}));tlClips().splice(index,0,...added);tsSelected.clear();added.forEach(c=>tsSelected.add(c.id));tsAnchor=index;tlSelected=added[0].id;tlCommit();tsPaint();}
function tsDelete(){const selected=tsOrdered();if(!selected.length)return;tlCheckpoint();for(const clip of [...selected].reverse()){const index=tsIndex(clip.id),start=tlClips().slice(0,index).reduce((sum,c)=>sum+c.duration,0);TimelineEdit.remove(state.timeline,start,start+clip.duration,id);}tsSelected.clear();tsAnchor=null;tlSelected=null;tlCommit();}
function tsRefs(cuts,clips){const refs=[],seen=new Set();const add=(path,label,kind='image')=>{if(path&&!seen.has(path)&&refs.length<9){seen.add(path);refs.push({path,label,kind});}};for(const cut of cuts)for(const assetId of cut?.referenceAssetIds||[]){const asset=state.assets.find(a=>a.id===assetId);if(asset?.image)add(asset.image,asset.name||'Character or set reference');}for(const cut of cuts)add(cut?.image,cut?.title+' storyboard composition');for(const clip of clips){add(clip.image,clip.title+' still');add(clip.video,clip.title+' video','video');}return refs;}
function tsSendToStudio(){
  const selected=tsOrdered(),all=tlClips();if(!selected.length)return toast('타임라인 클립을 선택하세요.');
  const indexes=selected.map(c=>tsIndex(c.id));if(indexes.at(-1)-indexes[0]+1!==indexes.length)return toast('연속된 클립을 선택하세요.');
  const duration=selected.reduce((sum,c)=>sum+c.duration,0);if(duration>15+1/24)return toast('한 번에 보낼 수 있는 길이는 최대 15초입니다.');
  const start=all.slice(0,indexes[0]).reduce((sum,c)=>sum+c.duration,0);
  const cuts=selected.map(c=>state.scenes.flatMap(s=>s.cuts).find(cut=>cut.id===c.sourceId));
  let elapsed=0;const beats=selected.map((c,i)=>{const begin=elapsed;elapsed+=c.duration;const cut=cuts[i];return `[${begin.toFixed(2)}-${elapsed.toFixed(2)}s] ${c.title}. ${cut?.description||''} Camera: ${cut?.camera||'locked'}. ${cut?.dialogue?'Dialogue: '+cut.dialogue+'. ':''}${cut?.sound?'Sound: '+cut.sound+'.':''}`;});
  const references=tsRefs(cuts,selected);if(!references.length)return toast('선택한 클립에 이미지나 영상 참조가 없습니다.');
  let imageNumber=0,videoNumber=0;const roles=references.map(ref=>`${ref.kind==='video'?'@영상'+(++videoNumber):'@이미지'+(++imageNumber)}: ${ref.label}`).join('\n');
  const prompt=`Create one continuous ${Math.max(2,Math.ceil(duration))}-second full-color handcrafted stop-motion style video. Follow the selected timeline cuts in this exact order and at these relative times:\n${beats.join('\n')}\nReference roles:\n${roles}\nKeep the camera locked during each shot; use fast, precise moves only at cut transitions. Yo has exactly four fingers per hand including the thumb. Rumi stays on stage left; the target is on stage right, facing Rumi. Preserve character and prop continuity. Character and stage references control appearance; storyboard panels guide composition only. Never show line art, panel borders, arrows, captions, instructions, or written timestamps in the final video.`;
  state.studioDraft={model:'minimax-h3-r2v',backendModel:state.studioDraft?.backendModel||'minimax_h3_ref2va_pruned_veda',duration:Math.max(2,Math.ceil(duration)),aspectRatio:'16:9',resolution:'480p',prompt,references,timelinePlacement:{sourceClipIds:selected.map(c=>c.id),start,duration,title:selected.length===1?selected[0].title:`${selected[0].title} + ${selected.length-1} cuts`}};
  save();setTab('higgsfield');toast('선택한 '+selected.length+'컷을 스튜디오에 보냈습니다.');
}
tsMenu.onclick=e=>{const action=e.target.closest('[data-ts-action]')?.dataset.tsAction;tsHideMenu();if(action==='studio')tsSendToStudio();if(action==='copy')tsCopy();if(action==='paste')tsPaste();if(action==='delete')tsDelete();};
tsTrack.oncontextmenu=e=>{const node=e.target.closest('[data-tl-clip]');if(!node)return;e.preventDefault();const clip=tlClips().find(c=>c.id===node.dataset.tlClip);if(!tsSelected.has(clip.id)){tsSelected.clear();tsSelected.add(clip.id);tsAnchor=tsIndex(clip.id);tlSelect(clip);tsPaint();}tsMenu.hidden=false;tsMenu.style.left=Math.min(e.clientX,innerWidth-190)+'px';tsMenu.style.top=Math.min(e.clientY,innerHeight-160)+'px';tsMenu.querySelector('[data-ts-action=paste]').disabled=!tsCopied.length;};
document.addEventListener('pointerdown',e=>{if(!tsMenu.hidden&&!e.target.closest('#tsContextMenu'))tsHideMenu();},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape')tsHideMenu();if(activeTab!=='timeline'||document.querySelector('dialog[open]')||e.target.closest('input,textarea,select,[contenteditable="true"]'))return;const command=e.ctrlKey||e.metaKey,key=e.key.toLowerCase();if(command&&key==='c'){e.preventDefault();e.stopImmediatePropagation();tsCopy();}else if(command&&key==='v'){e.preventDefault();e.stopImmediatePropagation();tsPaste();}else if(key==='delete'&&!e.shiftKey&&tsSelected.size>1){e.preventDefault();e.stopImmediatePropagation();tsDelete();}},true);
// Handle body gestures here; keep the existing trim and cut-tool handlers intact.
const tsMarquee=document.createElement('div');tsMarquee.className='ts-marquee';tsMarquee.hidden=true;
const tsScroll=$('#tlScroll'),tsCanvas=$('#tlTrackCanvas');
tsScroll.addEventListener('pointerdown',e=>{
  if(e.button!==0||e.target.closest('#tlRuler,[data-tl-clip],[data-audio-clip],[data-ts-video],[data-range-handle],.te-sequence-band'))return;
  const scrollRect=tsScroll.getBoundingClientRect();if(e.clientX>scrollRect.right-14||e.clientY>scrollRect.bottom-14)return;
  e.preventDefault();e.stopImmediatePropagation();tsHideMenu();tsClearSelection();
  const startX=e.clientX,startY=e.clientY,canvasBounds=tsCanvas.getBoundingClientRect();
  if(!tsMarquee.isConnected)tsCanvas.append(tsMarquee);
  tsScroll.setPointerCapture(e.pointerId);
  tsScroll.onpointermove=v=>{
    const left=Math.min(startX,v.clientX),right=Math.max(startX,v.clientX),top=Math.min(startY,v.clientY),bottom=Math.max(startY,v.clientY);
    if(Math.max(right-left,bottom-top)<4)return;
    tsMarquee.hidden=false;tsMarquee.style.left=Math.max(0,left-canvasBounds.left)+'px';tsMarquee.style.top=Math.max(0,top-canvasBounds.top)+'px';tsMarquee.style.width=Math.max(0,right-left)+'px';tsMarquee.style.height=Math.max(0,bottom-top)+'px';
    tsSelected.clear();for(const box of tsTrack.querySelectorAll('[data-tl-clip]')){const bounds=box.getBoundingClientRect();if(bounds.left<right&&bounds.right>left&&bounds.top<bottom&&bounds.bottom>top)tsSelected.add(box.dataset.tlClip);}
    tsAnchor=tsSelected.size?tsIndex(tsOrdered()[0].id):null;tsPaint();
  };
  const finish=()=>{tsScroll.onpointermove=null;tsScroll.onpointerup=null;tsScroll.onpointercancel=null;tsMarquee.hidden=true;const selected=tsOrdered();if(selected.length)tlSelect(selected.at(-1));tsPaint();};
  tsScroll.onpointerup=finish;tsScroll.onpointercancel=finish;
},true);
tsTrack.addEventListener('pointerdown',e=>{
  const node=e.target.closest('[data-tl-clip]');if(!node||e.button!==0)return;
  if(e.target.closest('[data-edge]')||teTool==='cut')return;
  e.preventDefault();e.stopImmediatePropagation();tsHideMenu();const clip=tlClips().find(c=>c.id===node.dataset.tlClip);if(!clip)return;
  const wasGroup=tsSelected.size>1&&tsSelected.has(clip.id);tsChoose(clip,e);if(e.shiftKey||e.ctrlKey||e.metaKey)return;
  const x=e.clientX,group=tsOrdered().map(c=>c.id);let moving=false;node.setPointerCapture(e.pointerId);
  node.onpointermove=v=>{const delta=v.clientX-x;if(Math.abs(delta)>5)moving=true;if(moving)for(const id of group){const box=tsTrack.querySelector(`[data-tl-clip="${id}"]`);if(box){box.style.transform=`translateX(${delta}px)`;box.style.zIndex='5';box.style.opacity='.7';}}};
  node.onpointerup=v=>{node.onpointermove=null;node.onpointerup=null;if(!moving){if(wasGroup){tsSelected.clear();tsSelected.add(clip.id);tsAnchor=tsIndex(clip.id);tsPaint();}return;}const clips=tlClips(),moved=clips.filter(c=>group.includes(c.id));if(!moved.length)return;tlCheckpoint();const rest=clips.filter(c=>!group.includes(c.id)),time=Math.max(0,(v.clientX-tsTrack.getBoundingClientRect().left)/tlZoom);let cursor=0,index=rest.findIndex(c=>{const center=cursor+c.duration/2;cursor+=c.duration;return time<center;});if(index<0)index=rest.length;state.timeline.clips=[...rest.slice(0,index),...moved,...rest.slice(index)];tsAnchor=index;tlCommit();};
  node.onpointercancel=()=>{node.onpointermove=null;node.onpointerup=null;tsPaint();renderTimeline();};
},true);
tsTrack.onclick=()=>{};
const tsDeleteBefore=$('#tlDelete').onclick;$('#tlDelete').onclick=()=>{if(tpAudioId)return tsDeleteBefore();if(tsSelected.size>1)return tsDelete();tsSelected.clear();tsAnchor=null;tsDeleteBefore();};
function tsVideoTracks(){state.timeline||={clips:[]};state.timeline.videoTracks||=[];return state.timeline.videoTracks;}
tlProgramLocate=function(time){for(const track of [...tsVideoTracks()].sort((a,b)=>b.number-a.number)){const clip=track.clips.find(c=>time>=c.start&&time<c.start+c.duration);if(clip)return {clip,start:clip.start};}return tlLocate(time);};
function tsSyncCompleted(){let changed=false;for(const request of state.generationRequests||[]){const placement=request.timelinePlacement;if(!placement||request.deleted)continue;const job=generationJobs.filter(j=>j.projectId===state.projectId&&j.requestId===request.id&&j.status==='completed').at(-1);if(!job)continue;for(const output of job.outputs||[]){if((state.deletedMediaPaths||[]).includes(output.path)||output.kind!=='video'&&!/\.(mp4|webm|mov)$/i.test(output.path||''))continue;if(tsVideoTracks().some(t=>t.clips.some(c=>c.requestId===request.id&&c.video===output.path)))continue;const number=Math.max(1,...tsVideoTracks().map(t=>t.number))+1;tsVideoTracks().push({number,clips:[{id:id(),requestId:request.id,sourceClipIds:placement.sourceClipIds,start:placement.start,duration:placement.duration,inPoint:0,title:placement.title,video:output.path,image:''}]});changed=true;}}
  if(changed){save();if(activeTab==='timeline')renderTimeline();}
}
const tsJobsBefore=renderGenerationJobs;renderGenerationJobs=function(){tsJobsBefore();tsSyncCompleted();};
function tsRenderVideoTracks(){
  document.querySelectorAll('.ts-video-row,.ts-video-label').forEach(node=>node.remove());
  const tracks=[...tsVideoTracks()].sort((a,b)=>a.number-b.number),canvas=$('#tlTrackCanvas'),side=$('.tl-edit-area>aside');
  for(const track of tracks){const row=document.createElement('div');row.className='ts-video-row';row.innerHTML=track.clips.map(c=>`<article class="ts-video-clip" data-ts-video="${c.id}" style="left:${c.start*tlZoom}px;width:${Math.max(12,c.duration*tlZoom)}px" title="${esc(c.title)}"><video src="${esc(mediaURL(c.video))}" muted preload="metadata"></video><strong>${esc(c.title)}</strong><small>${c.duration.toFixed(2)}s</small></article>`).join('');canvas.insertBefore(row,canvas.querySelector('.tp-audio-row'));row.onclick=e=>{const node=e.target.closest('[data-ts-video]');if(!node)return;const clip=track.clips.find(c=>c.id===node.dataset.tsVideo);tlStop();tlTime=clip.start;tlUpdate();};const label=document.createElement('div');label.className='ts-video-label';label.innerHTML=`<strong>V${track.number}</strong><small>생성 영상</small>`;side.insertBefore(label,side.querySelector('.tp-audio-label'));}
  tlPage.style.setProperty('--ts-min-height',(232+tracks.length*64)+'px');canvas.style.minHeight=(216+tracks.length*64)+'px';
}
const tsRenderBefore=renderTimeline;renderTimeline=function(){if(tsProject!==state.projectId){tsProject=state.projectId;tsSelected.clear();tsAnchor=null;tsCopied=[];}tsRenderBefore();for(const clipId of [...tsSelected])if(tsIndex(clipId)<0)tsSelected.delete(clipId);tsPaint();tsRenderVideoTracks();tlUpdate();};
const tsRenderStudioBefore=renderStudio;renderStudio=function(){tsRenderStudioBefore();const placement=studioDraft().timelinePlacement;if(placement){$('#studioContext').textContent='타임라인 · '+placement.title;$('#studioClearTarget').hidden=false;$('#studioClearTarget').textContent='타임라인 연결 해제';}};
const tsClearStudioBefore=$('#studioClearTarget').onclick;$('#studioClearTarget').onclick=()=>{if(!studioDraft().timelinePlacement)return tsClearStudioBefore();delete studioDraft().timelinePlacement;delete studioDraft().target;save();renderStudio();};
$('.tl-bottom>span').textContent='빈 영역에서 V1 클립까지 드래그 박스 선택 · 빈 공간 클릭 선택 해제 · Shift 연속 선택 · Ctrl 개별 선택 · 우클릭 메뉴';
/* END TIMELINE-STUDIO */

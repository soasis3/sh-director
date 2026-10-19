const layoutKey='sh-director-shot-layout';
let panelLayout={left:true,right:true};try{Object.assign(panelLayout,JSON.parse(localStorage.getItem(layoutKey))||{});}catch{}
const shotWorkspace=document.querySelector('#shotsPage .workspace');
shotWorkspace.insertAdjacentHTML('afterbegin','<div class="panel-controls"><button id="toggleSceneList" aria-controls="sceneSidebar">☰ 씬 목록</button><button id="toggleCutDetails" aria-controls="cutSidebar">컷 디테일 ☷</button></div>');
document.querySelector('#shotsPage .story').id='sceneSidebar';document.querySelector('#shotsPage .inspector').id='cutSidebar';
document.querySelector('#sceneSidebar .eyebrow').insertAdjacentHTML('afterend','<button class="panel-close" id="closeSceneList" aria-label="씬 목록 접기">‹</button>');
document.querySelector('#cutSidebar .eyebrow').insertAdjacentHTML('afterend','<button class="panel-close" id="closeCutDetails" aria-label="컷 디테일 접기">›</button>');
$('#sceneTitle').setAttribute('contenteditable','plaintext-only');$('#sceneTitle').setAttribute('role','textbox');$('#sceneTitle').setAttribute('aria-label','씬 이름');$('#sceneTitle').setAttribute('aria-multiline','false');
$('#sceneDesc').setAttribute('contenteditable','plaintext-only');$('#sceneDesc').setAttribute('role','textbox');$('#sceneDesc').setAttribute('aria-label','씬 장소와 시간');
document.querySelector('.board-heading').insertAdjacentHTML('beforeend','<label class="scene-summary-label">씬 내용<textarea id="sceneSummary" placeholder="이 씬에서 벌어지는 이야기와 연출 방향을 적어보세요."></textarea></label>');
function applyPanelLayout(){shotPage.classList.toggle('scenes-collapsed',!panelLayout.left);shotPage.classList.toggle('details-collapsed',!panelLayout.right);$('#sceneSidebar').hidden=!panelLayout.left;$('#cutSidebar').hidden=!panelLayout.right;$('#toggleSceneList').setAttribute('aria-expanded',String(panelLayout.left));$('#toggleCutDetails').setAttribute('aria-expanded',String(panelLayout.right));try{localStorage.setItem(layoutKey,JSON.stringify(panelLayout));}catch{}}
$('#toggleSceneList').onclick=()=>{panelLayout.left=!panelLayout.left;applyPanelLayout();};$('#toggleCutDetails').onclick=()=>{panelLayout.right=!panelLayout.right;applyPanelLayout();};$('#closeSceneList').onclick=()=>{panelLayout.left=false;applyPanelLayout();};$('#closeCutDetails').onclick=()=>{panelLayout.right=false;applyPanelLayout();};
function updateScene(key,value){const scene=current();if(!scene)return;scene[key]=value;save();const row=document.querySelector(`[data-scene="${scene.id}"] strong`);if(row)row.textContent=scene.title;}
$('#sceneTitle').oninput=e=>updateScene('title',e.currentTarget.textContent);$('#sceneTitle').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();e.currentTarget.blur();}};$('#sceneTitle').onblur=e=>{if(current()&&!e.currentTarget.textContent.trim()){current().title='이름 없는 씬';e.currentTarget.textContent=current().title;save();}};
$('#sceneDesc').oninput=e=>updateScene('description',e.currentTarget.textContent);$('#sceneSummary').oninput=e=>updateScene('summary',e.target.value);
const renderBeforeLayout=render;render=function(){renderBeforeLayout();const scene=current();$('#sceneSummary').value=scene?.summary||'';$('#sceneSummary').disabled=!scene;$('#sceneTitle').setAttribute('contenteditable',scene?'plaintext-only':'false');$('#sceneDesc').setAttribute('contenteditable',scene?'plaintext-only':'false');applyPanelLayout();};
applyPanelLayout();

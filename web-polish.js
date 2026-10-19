document.body.classList.toggle('web-edition',!!window.SHWeb);
const environmentBadge=document.createElement('span');environmentBadge.className='environment-badge';environmentBadge.textContent=window.SHWeb?'WEB':'STUDIO';environmentBadge.title=window.SHWeb?'이 기기의 브라우저에 저장 · 원격 생성 PC 연결 준비 중':'프로젝트 폴더에 저장 · WanGP 생성';document.querySelector('.brand').after(environmentBadge);
if(window.SHWeb){document.querySelector('#higgsfieldPage .page-top > .tag').textContent='생성 PC 연결 대기';document.querySelector('#higgsfieldPage .page-top > .tag').title='요청은 이 기기에 저장됩니다. 원격 워커 연결은 아직 구성되지 않았습니다.';}
document.body.insertAdjacentHTML('beforeend','<div class="web-storage-note" hidden></div>');

(function(root){
  const api={
    instruction(looks=[]){return looks.map(b=>'Style direction — '+b.name+': '+b.description+'\nStyle keywords: '+(b.keywords||[]).join(', ')).join('\n\n');},
    compose(prompt,looks=[]){const style=api.instruction(looks);return style?prompt+'\n\n[PROJECT LOOK — visual treatment only; preserve the requested subjects, identities, actions and reference roles]\n'+style:prompt;}
  };
  if(typeof module==='object'&&module.exports)module.exports=api;else root.ProjectLook=api;
})(typeof globalThis==='object'?globalThis:this);

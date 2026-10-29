(async () => {
  const checks=[];
  const q=s=>document.querySelector(s);
  const wait=async fn=>{const end=Date.now()+10000;while(!fn()){if(Date.now()>end)throw new Error('Timeout: '+fn);await new Promise(r=>setTimeout(r,25));}};
  const navigate=async name=>{q(`header [data-nav="${name}"]`).click();await wait(()=>q('#page-'+name));};
  const initialCount=Number(q('#navRecordBadge').textContent);
  q('#saveRecordBtn').click();
  await wait(()=>Number(q('#navRecordBadge').textContent)===initialCount+1);
  await navigate('records');
  q('#resetRecordFilterBtn').click(); await Promise.resolve();
  const savedId=q('[data-delete-id]').dataset.deleteId;
  if(!savedId.startsWith('REC-'))throw new Error('Unexpected saved ID');
  q(`[data-detail-id="${savedId}"]`).click();await Promise.resolve();
  if(q('#detailModalBackdrop').classList.contains('hidden'))throw new Error('Saved detail did not open');
  q('#closeDetailModalBtn').click();
  q(`[data-delete-id="${savedId}"]`).click();await Promise.resolve();
  q('#confirmDeleteBtn').click();
  await wait(()=>Number(q('#navRecordBadge').textContent)===initialCount);
  checks.push('save from interpret and delete the newly created record; initial count restored');
  for(const id of ['teaching-pneumonia','teaching-effusion','teaching-pneumothorax','teaching-atelectasis','teaching-nodule','teaching-edema']){
    await navigate('home');
    q('#aiChatLauncher').click();await Promise.resolve();
    q(`[data-chat-sample="${id}"]`).click();
    await wait(()=>q('#infoFileName')?.textContent.includes(id));
    if(q('#stateIdlePanel').classList.contains('hidden')) throw new Error(id+' not ready for analysis');
    checks.push(id+': loaded through mounted interpret page');
  }
  for (let i=0;i<3;i++) {
    await navigate('home'); await navigate('interpret');
  }
  dispatchEvent(new KeyboardEvent('keydown',{key:'k',altKey:true})); await Promise.resolve();
  if(q('#aiChatPanel').style.display!=='flex')throw new Error('Shortcut did not open once');
  dispatchEvent(new KeyboardEvent('keydown',{key:'k',altKey:true})); await Promise.resolve();
  if(q('#aiChatPanel').style.display!=='none')throw new Error('Shortcut did not close once');
  checks.push('one global shortcut handler after repeated routing');
  return {passed:checks.length,checks};
})()

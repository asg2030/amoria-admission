let students=[];
db.ref('students').on('value',snap=>{ const data=snap.val()||{}; students=Object.entries(data).map(([id,v])=>({id,...v})).filter(s=>!s.archived); studentSelect.innerHTML=students.map(s=>`<option value="${s.id}">${escapeHtml(s.name)} - ${escapeHtml(s.civilId)}</option>`).join(''); fill(); });
db.ref('settings').on('value',snap=>{ const s=snap.val()||{}; signer.textContent=s.signerName||'........................'; });
studentSelect.onchange=fill;
function fill(){ const s=students.find(x=>x.id===studentSelect.value)||students[0]; if(!s)return; lName.textContent=s.name||''; lCivil.textContent=s.civilId||''; lNat.textContent=s.nationality||''; lGrade.textContent=s.grade||''; lSchool.textContent=s.school||''; }
printBtn.onclick=()=>window.print();

let allStudents=[];
const form=document.getElementById('studentForm');
function resetForm(){form.reset(); studentId.value='';}
resetBtn.onclick=resetForm;
form.addEventListener('submit',async e=>{
 e.preventDefault(); const id=studentId.value; formMsg.textContent='';
 const item={school:school.value.trim(),name:name.value.trim(),civilId:civilId.value.trim(),nationality:nationality.value.trim(),grade:grade.value,phone:phone.value.trim(),notes:notes.value.trim(),status:'جديد',archived:false,updatedAt:now()};
 if(!id){ const dup=allStudents.find(s=>s.civilId===item.civilId && !s.archived); if(dup){formMsg.textContent='السجل المدني موجود مسبقًا.'; return;} item.createdAt=now(); item.createdBy=(auth.currentUser||{}).email||''; await db.ref('students').push(item); }
 else await db.ref('students/'+id).update(item);
 formMsg.style.color='#0f5132'; formMsg.textContent='تم الحفظ بنجاح'; resetForm();
});
function render(){ const q=search.value.trim(); const rows=allStudents.filter(s=>!s.archived).filter(s=>!q||[s.name,s.school,s.civilId,s.grade].some(x=>String(x||'').includes(q))); studentsTable.innerHTML=rows.map(s=>`<tr><td>${escapeHtml(s.name)}</td><td>${escapeHtml(s.civilId)}</td><td>${escapeHtml(s.school)}</td><td>${escapeHtml(s.grade)}</td><td class="actions"><button onclick="editStudent('${s.id}')">تعديل</button><button class="warn" onclick="archiveStudent('${s.id}')">أرشفة</button></td></tr>`).join('')||'<tr><td colspan="5">لا توجد بيانات</td></tr>';}
db.ref('students').on('value',snap=>{ const data=snap.val()||{}; allStudents=Object.entries(data).map(([id,v])=>({id,...v})); render(); });
search.oninput=render;
window.editStudent=id=>{ const s=allStudents.find(x=>x.id===id); if(!s)return; studentId.value=id; school.value=s.school||''; name.value=s.name||''; civilId.value=s.civilId||''; nationality.value=s.nationality||''; grade.value=s.grade||''; phone.value=s.phone||''; notes.value=s.notes||''; scrollTo(0,0); };
window.archiveStudent=id=>{ if(confirm('هل تريد أرشفة الطالب؟')) db.ref('students/'+id).update({archived:true,archivedAt:now()}); };

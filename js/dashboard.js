db.ref('students').on('value',snap=>{
 const data=snap.val()||{}; const arr=Object.entries(data).map(([id,v])=>({id,...v}));
 document.getElementById('totalStudents').textContent=arr.filter(s=>!s.archived).length;
 document.getElementById('archivedStudents').textContent=arr.filter(s=>s.archived).length;
 document.getElementById('lettersCount').textContent=arr.filter(s=>!s.archived).length;
 document.getElementById('latestStudents').innerHTML=arr.filter(s=>!s.archived).slice(-10).reverse().map(s=>`<tr><td>${escapeHtml(s.name)}</td><td>${escapeHtml(s.school)}</td><td>${escapeHtml(s.grade)}</td><td>${escapeHtml(s.status||'جديد')}</td></tr>`).join('')||'<tr><td colspan="4">لا توجد بيانات</td></tr>';
});

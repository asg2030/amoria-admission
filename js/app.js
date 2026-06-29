firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const grades = ["الأول الابتدائي","الثاني الابتدائي","الثالث الابتدائي","الرابع الابتدائي","الخامس الابتدائي","السادس الابتدائي","الأول المتوسط","الثاني المتوسط","الثالث المتوسط","الأول الثانوي","الثاني الثانوي","الثالث الثانوي"];
const statuses = ["جديد","تحت الإجراء","تم إصدار الخطاب","تم قبول الطالب","ملغي"];
const ADMIN_EMAIL = "admin@amoria.com";
const ADMIN_PASSWORD = "Admin123456";

function esc(v){return String(v??'').replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]))}
function nowText(){return new Date().toLocaleString('ar-SA')}
function pathName(){return location.pathname.split('/').pop() || 'index.html'}
function go(p){location.href=p}
function toast(t){alert(t)}
function currentEmail(){return sessionStorage.getItem('amoria_user_email') || ''}
function isLoggedIn(){return sessionStorage.getItem('amoria_logged_in') === '1'}

function initBase(){
  $$('.logoutBtn').forEach(b=>b.onclick=()=>{sessionStorage.removeItem('amoria_logged_in');sessionStorage.removeItem('amoria_user_email');go('index.html')});
  const page=pathName();
  if(page!=='index.html'){
    if(!isLoggedIn()) go('index.html');
    const el=$('#userEmail'); if(el) el.textContent=currentEmail();
  }
}

function initLogin(){
  const f=$('#loginForm'); if(!f)return;
  if(isLoggedIn()) go('dashboard.html');
  f.onsubmit=e=>{
    e.preventDefault();
    const email=$('#email').value.trim();
    const pass=$('#password').value;
    $('#loginMsg').textContent='جاري الدخول...';
    if(email===ADMIN_EMAIL && pass===ADMIN_PASSWORD){
      sessionStorage.setItem('amoria_logged_in','1');
      sessionStorage.setItem('amoria_user_email',email);
      go('dashboard.html');
    }else{
      $('#loginMsg').textContent='تعذر الدخول. تأكد من البريد وكلمة المرور.';
    }
  }
}

async function getSettings(){
  const def={schoolName:'ثانوية عمورية',committeeName:'لجنة القبول والتسجيل بثانوية عمورية',signer:'عضو لجنة القبول بمدرسة عمورية المكلف',letterText:'تحقيقاً لأهداف الإدارة العامة للتعليم بمحافظة جدة نحو استقرار الميدان، وما يتوفر لدى اللجنة من بيانات الطاقة الاستيعابية. نأمل منكم التعاون في قبول الطالب أدناه بمدرستكم العامرة بحسب الأنظمة والتعليمات المنظمة للقبول.'};
  const s=await db.ref('settings').once('value'); return {...def,...(s.val()||{})};
}
async function log(type,details={}){await db.ref('logs').push({type,details,by:currentEmail(),at:Date.now(),atText:nowText()})}
function fillSelect(el,arr,first='اختر'){ if(!el)return; el.innerHTML=`<option value="">${first}</option>`+arr.map(x=>`<option>${x}</option>`).join('') }
async function initDashboard(){
  if(!$('#dashboardStats'))return;
  const snap=await db.ref('students').once('value'); let total=0,active=0,archived=0,issued=0,schools=new Set(); const byGrade={}; const recent=[];
  snap.forEach(c=>{const s={id:c.key,...c.val()}; total++; if(s.archived) archived++; else active++; if(s.status==='تم إصدار الخطاب') issued++; if(s.school) schools.add(s.school); if(s.grade) byGrade[s.grade]=(byGrade[s.grade]||0)+1; recent.push(s)});
  $('#dashboardStats').innerHTML=`<div class="card stat"><b>${total}</b><span>إجمالي الطلاب</span></div><div class="card stat"><b>${active}</b><span>طلبات نشطة</span></div><div class="card stat"><b>${issued}</b><span>خطابات صادرة</span></div><div class="card stat"><b>${schools.size}</b><span>مدارس</span></div>`;
  recent.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  $('#recentBody').innerHTML=recent.slice(0,10).map(s=>`<tr><td>${esc(s.studentName)}</td><td>${esc(s.school)}</td><td>${esc(s.grade)}</td><td><span class="badge">${esc(s.status||'جديد')}</span></td><td>${esc(s.createdAtText)}</td></tr>`).join('')||'<tr><td colspan="5">لا توجد بيانات</td></tr>';
  $('#gradeStats').innerHTML=Object.entries(byGrade).map(([g,n])=>`<tr><td>${esc(g)}</td><td>${n}</td></tr>`).join('')||'<tr><td colspan="2">لا توجد بيانات</td></tr>';
}
async function addStudent(e){
  e.preventDefault(); const id=$('#studentId').value; const civilId=$('#civilId').value.trim();
  if(!id){ const exists=await db.ref('students').orderByChild('civilId').equalTo(civilId).once('value'); if(exists.exists()){toast('السجل المدني موجود مسبقًا');return} }
  const data={school:$('#school').value.trim(),studentName:$('#studentName').value.trim(),civilId,nationality:$('#nationality').value.trim(),grade:$('#grade').value,phone:$('#phone').value.trim(),notes:$('#notes').value.trim(),status:$('#status').value||'جديد',updatedAt:Date.now(),updatedAtText:nowText(),updatedBy:currentEmail()};
  if(id){ await db.ref('students/'+id).update(data); await log('update_student',{id,name:data.studentName}); toast('تم تعديل بيانات الطالب'); }
  else{ data.archived=false; data.createdAt=Date.now(); data.createdAtText=nowText(); data.createdBy=currentEmail(); const ref=await db.ref('students').push(data); await log('add_student',{id:ref.key,name:data.studentName}); toast('تم حفظ الطالب بنجاح'); }
  closeModal(); loadStudents();
}
function openAdd(){ $('#studentForm').reset(); $('#studentId').value=''; $('#modalTitle').textContent='إضافة طالب جديد'; $('.modal').classList.add('show') }
function closeModal(){ const m=$('.modal'); if(m)m.classList.remove('show') }
async function openEdit(id){
  const s=(await db.ref('students/'+id).once('value')).val(); if(!s)return;
  $('#studentId').value=id; $('#school').value=s.school||''; $('#studentName').value=s.studentName||''; $('#civilId').value=s.civilId||''; $('#nationality').value=s.nationality||''; $('#grade').value=s.grade||''; $('#phone').value=s.phone||''; $('#notes').value=s.notes||''; $('#status').value=s.status||'جديد'; $('#modalTitle').textContent='تعديل بيانات الطالب'; $('.modal').classList.add('show');
}
async function archiveStudent(id,state){await db.ref('students/'+id).update({archived:state,archivedAt:Date.now(),archivedBy:currentEmail()}); await log(state?'archive_student':'restore_student',{id}); loadStudents()}
function statusBadge(st){let cls=st==='ملغي'?'red':st==='تحت الإجراء'?'blue':st==='جديد'?'gray':'';return `<span class="badge ${cls}">${esc(st||'جديد')}</span>`}
async function loadStudents(){
  if(!$('#studentsBody'))return; const q=($('#searchInput')?.value||'').trim(); const status=$('#filterStatus')?.value||''; const showArchived=$('#showArchived')?.checked;
  const snap=await db.ref('students').orderByChild('createdAt').once('value'); const arr=[];
  snap.forEach(c=>{const s={id:c.key,...c.val()}; if(!showArchived && s.archived)return; if(status && s.status!==status)return; const text=[s.school,s.studentName,s.civilId,s.nationality,s.grade,s.phone,s.status].join(' '); if(q && !text.includes(q))return; arr.push(s)});
  arr.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  $('#studentsBody').innerHTML=arr.map(s=>`<tr class="${s.archived?'archived':''}"><td>${esc(s.studentName)}</td><td>${esc(s.civilId)}</td><td>${esc(s.school)}</td><td>${esc(s.grade)}</td><td>${statusBadge(s.status)}</td><td>${esc(s.createdBy)}</td><td class="actions"><a class="btn small gold" href="letter.html?id=${s.id}">خطاب</a><button class="btn small secondary" onclick="openEdit('${s.id}')">تعديل</button><button class="btn small danger" onclick="archiveStudent('${s.id}',${s.archived?false:true})">${s.archived?'استعادة':'أرشفة'}</button></td></tr>`).join('')||'<tr><td colspan="7">لا توجد بيانات</td></tr>';
}
function initStudents(){
  if(!$('#studentForm'))return; fillSelect($('#grade'),grades,'اختر الصف'); fillSelect($('#status'),statuses,'اختر الحالة'); fillSelect($('#filterStatus'),statuses,'كل الحالات'); $('#studentForm').onsubmit=addStudent; $('#addBtn').onclick=openAdd; $('#closeModal').onclick=closeModal; $('#searchInput').oninput=loadStudents; $('#filterStatus').onchange=loadStudents; $('#showArchived').onchange=loadStudents; $('#exportBtn').onclick=exportCSV; loadStudents();
}
async function initLetter(){
  if(!$('#letterContent'))return; const id=new URLSearchParams(location.search).get('id'); const st=await getSettings();
  if(!id){$('#letterContent').innerHTML='لم يتم اختيار طالب';return} const s=(await db.ref('students/'+id).once('value')).val(); if(!s){$('#letterContent').innerHTML='الطالب غير موجود';return}
  $('#letterContent').innerHTML=`<div class="letter-box">${esc(st.committeeName)}</div><p>المكرم مدير مدرسة / <b>${esc(s.school)}</b> المحترم</p><p>السلام عليكم ورحمة الله وبركاته، وبعد:</p><p>${esc(st.letterText)}</p><table><tr><th>اسم الطالب</th><td>${esc(s.studentName)}</td></tr><tr><th>السجل المدني</th><td>${esc(s.civilId)}</td></tr><tr><th>الجنسية</th><td>${esc(s.nationality)}</td></tr><tr><th>الصف</th><td>${esc(s.grade)}</td></tr></table><p>شاكرين ومقدرين تعاونكم.</p><div class="signature"><b>${esc(st.signer)}</b><br>الاسم: ........................<br>التوقيع: ......................</div>`;
  await db.ref('students/'+id).update({status:'تم إصدار الخطاب',lastPrintedAt:Date.now(),lastPrintedBy:currentEmail()}); await log('print_letter',{id,name:s.studentName});
}
async function initSettings(){
  if(!$('#settingsForm'))return; const st=await getSettings(); $('#schoolName').value=st.schoolName; $('#committeeName').value=st.committeeName; $('#signer').value=st.signer; $('#letterText').value=st.letterText;
  $('#settingsForm').onsubmit=async e=>{e.preventDefault(); await db.ref('settings').set({schoolName:$('#schoolName').value,committeeName:$('#committeeName').value,signer:$('#signer').value,letterText:$('#letterText').value}); await log('update_settings'); toast('تم حفظ الإعدادات')}
  const logs=await db.ref('logs').orderByChild('at').limitToLast(30).once('value'); const arr=[]; logs.forEach(c=>arr.push(c.val())); arr.reverse(); $('#logsBody').innerHTML=arr.map(l=>`<tr><td>${esc(l.type)}</td><td>${esc(l.by)}</td><td>${esc(l.atText)}</td></tr>`).join('')||'<tr><td colspan="3">لا توجد عمليات</td></tr>';
}
function exportCSV(){db.ref('students').once('value').then(snap=>{let csv='اسم الطالب,السجل المدني,المدرسة,الجنسية,الصف,الجوال,الحالة,الأرشيف,المدخل,التاريخ\n'; snap.forEach(ch=>{const s=ch.val(); csv += [s.studentName,s.civilId,s.school,s.nationality,s.grade,s.phone,s.status,s.archived?'مؤرشف':'نشط',s.createdBy,s.createdAtText].map(v=>'"'+String(v||'').replaceAll('"','""')+'"').join(',')+'\n'}); const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}); const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='amoria_students.csv';a.click()})}
window.openAdd=openAdd; window.openEdit=openEdit; window.archiveStudent=archiveStudent; window.closeModal=closeModal; window.print=window.print;
document.addEventListener('DOMContentLoaded',()=>{initBase();initLogin();initDashboard();initStudents();initLetter();initSettings()});

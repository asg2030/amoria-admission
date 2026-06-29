firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const grades = ["الأول الابتدائي","الثاني الابتدائي","الثالث الابتدائي","الرابع الابتدائي","الخامس الابتدائي","السادس الابتدائي","الأول المتوسط","الثاني المتوسط","الثالث المتوسط","الأول الثانوي","الثاني الثانوي","الثالث الثانوي"];
const statuses = ["جديد","تحت الإجراء","تم إصدار الخطاب","تم قبول الطالب","ملغي"];
const defaultUsers = {"admin@amoria.com":{name:"مدير النظام",email:"admin@amoria.com",password:"Admin123456",role:"admin",active:true}};
const roleNames = {admin:"مدير",registrar:"موظف تسجيل",viewer:"تقارير فقط"};
function esc(v){return String(v??'').replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]))}
function nowText(){return new Date().toLocaleString('ar-SA')}
function pathName(){return location.pathname.split('/').pop() || 'index.html'}
function go(p){location.href=p}
function toast(t){alert(t)}
function currentEmail(){return sessionStorage.getItem('amoria_user_email') || ''}
function currentRole(){return sessionStorage.getItem('amoria_user_role') || ''}
function currentName(){return sessionStorage.getItem('amoria_user_name') || currentEmail()}
function isLoggedIn(){return sessionStorage.getItem('amoria_logged_in') === '1'}
function can(action){const r=currentRole(); return r==='admin'||(r==='registrar' && ['add','print','export','view','edit'].includes(action))||(r==='viewer' && ['print','export','view'].includes(action));}
async function seedUsers(){const s=await db.ref('appUsers').once('value'); if(!s.exists()) await db.ref('appUsers').set(defaultUsers);}
async function getUserByEmail(email){const s=await db.ref('appUsers/'+email.replaceAll('.','_dot_')).once('value'); if(s.exists()) return s.val(); const all=await db.ref('appUsers').once('value'); let found=null; all.forEach(c=>{const u=c.val(); if((u.email||'').toLowerCase()===email.toLowerCase()) found={...u,_key:c.key};}); return found;}
function keyFromEmail(email){return email.trim().toLowerCase().replaceAll('.','_dot_')}
function applyPermissions(){
  const r=currentRole();
  $$('.admin-only').forEach(e=>e.style.display = r==='admin' ? '' : 'none');
  $$('.registrar-only').forEach(e=>e.style.display = (r==='admin'||r==='registrar') ? '' : 'none');
  $$('.viewer-only-hide').forEach(e=>e.style.display = r==='viewer' ? 'none' : '');
}
function initBase(){
  $$('.logoutBtn').forEach(b=>b.onclick=()=>{sessionStorage.clear();go('index.html')});
  const page=pathName();
  if(page!=='index.html'){
    if(!isLoggedIn()) go('index.html');
    const el=$('#userEmail'); if(el) el.textContent=currentName()+" - "+(roleNames[currentRole()]||'');
    if((page==='settings.html'||page==='users.html') && currentRole()!=='admin') go('dashboard.html');
    applyPermissions();
  }
}
function initLogin(){
  const f=$('#loginForm'); if(!f)return;
  seedUsers();
  if(isLoggedIn()) go('dashboard.html');
  f.onsubmit=async e=>{
    e.preventDefault();
    const email=$('#email').value.trim().toLowerCase(); const pass=$('#password').value;
    $('#loginMsg').textContent='جاري الدخول...';
    let u=await getUserByEmail(email);
    if(!u && defaultUsers[email]) u=defaultUsers[email];
    if(u && u.active!==false && u.password===pass){
      sessionStorage.setItem('amoria_logged_in','1');
      sessionStorage.setItem('amoria_user_email',u.email||email);
      sessionStorage.setItem('amoria_user_name',u.name||u.email||email);
      sessionStorage.setItem('amoria_user_role',u.role||'registrar');
      await log('login',{email});
      go('dashboard.html');
    }else $('#loginMsg').textContent='تعذر الدخول. تأكد من البريد وكلمة المرور.';
  }
}
async function getSettings(){
  const def={schoolName:'ثانوية عمورية',committeeName:'لجنة القبول والتسجيل بثانوية عمورية',signer:'عضو لجنة القبول بمدرسة عمورية المكلف',letterText:'تحقيقاً لأهداف الإدارة العامة للتعليم بمحافظة جدة نحو استقرار الميدان، وما يتوفر لدى اللجنة من بيانات الطاقة الاستيعابية. نأمل منكم التعاون في قبول الطالب أدناه بمدرستكم العامرة بحسب الأنظمة والتعليمات المنظمة للقبول.'};
  const s=await db.ref('settings').once('value'); return {...def,...(s.val()||{})};
}
async function log(type,details={}){try{await db.ref('logs').push({type,details,by:currentEmail(),at:Date.now(),atText:nowText()})}catch(e){console.warn(e)}}
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
  e.preventDefault(); if(!can('add')){toast('ليست لديك صلاحية إضافة الطلاب');return}
  const id=$('#studentId').value; const civilId=$('#civilId').value.trim();
  if(!id){ const exists=await db.ref('students').orderByChild('civilId').equalTo(civilId).once('value'); if(exists.exists()){toast('السجل المدني موجود مسبقًا');return} }
  const data={school:$('#school').value.trim(),studentName:$('#studentName').value.trim(),civilId,nationality:$('#nationality').value.trim(),grade:$('#grade').value,phone:$('#phone').value.trim(),notes:$('#notes').value.trim(),status:$('#status').value||'جديد',updatedAt:Date.now(),updatedAtText:nowText(),updatedBy:currentEmail()};
  if(id){ await db.ref('students/'+id).update(data); await log('update_student',{id,name:data.studentName}); toast('تم تعديل بيانات الطالب'); }
  else{ data.archived=false; data.createdAt=Date.now(); data.createdAtText=nowText(); data.createdBy=currentEmail(); const ref=await db.ref('students').push(data); await log('add_student',{id:ref.key,name:data.studentName}); toast('تم حفظ الطالب بنجاح'); }
  closeModal(); loadStudents();
}
function openAdd(){ if(!can('add')){toast('ليست لديك صلاحية إضافة الطلاب');return} $('#studentForm').reset(); $('#studentId').value=''; $('#modalTitle').textContent='إضافة طالب جديد'; $('.modal').classList.add('show') }
function closeModal(){ const m=$('.modal'); if(m)m.classList.remove('show') }
async function openEdit(id){
  if(!can('edit')){toast('ليست لديك صلاحية تعديل الطلاب');return}
  const s=(await db.ref('students/'+id).once('value')).val(); if(!s)return;
  $('#studentId').value=id; $('#school').value=s.school||''; $('#studentName').value=s.studentName||''; $('#civilId').value=s.civilId||''; $('#nationality').value=s.nationality||''; $('#grade').value=s.grade||''; $('#phone').value=s.phone||''; $('#notes').value=s.notes||''; $('#status').value=s.status||'جديد'; $('#modalTitle').textContent='تعديل بيانات الطالب'; $('.modal').classList.add('show');
}
async function archiveStudent(id,state){if(currentRole()!=='admin'){toast('الأرشفة للمدير فقط');return} await db.ref('students/'+id).update({archived:state,archivedAt:Date.now(),archivedBy:currentEmail()}); await log(state?'archive_student':'restore_student',{id}); loadStudents()}
function statusBadge(st){let cls=st==='ملغي'?'red':st==='تحت الإجراء'?'blue':st==='جديد'?'gray':'';return `<span class="badge ${cls}">${esc(st||'جديد')}</span>`}
async function loadStudents(){
  if(!$('#studentsBody'))return; const q=($('#searchInput')?.value||'').trim(); const status=$('#filterStatus')?.value||''; const showArchived=$('#showArchived')?.checked;
  const snap=await db.ref('students').orderByChild('createdAt').once('value'); const arr=[];
  snap.forEach(c=>{const s={id:c.key,...c.val()}; if(!showArchived && s.archived)return; if(status && s.status!==status)return; const text=[s.school,s.studentName,s.civilId,s.nationality,s.grade,s.phone,s.status].join(' '); if(q && !text.includes(q))return; arr.push(s)});
  arr.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  $('#studentsBody').innerHTML=arr.map(s=>`<tr class="${s.archived?'archived':''}"><td>${esc(s.studentName)}</td><td>${esc(s.civilId)}</td><td>${esc(s.school)}</td><td>${esc(s.grade)}</td><td>${statusBadge(s.status)}</td><td>${esc(s.createdBy)}</td><td class="actions"><a class="btn small gold" href="letter.html?id=${s.id}">خطاب</a>${can('edit')?`<button class="btn small secondary" onclick="openEdit('${s.id}')">تعديل</button>`:''}${currentRole()==='admin'?`<button class="btn small danger" onclick="archiveStudent('${s.id}',${s.archived?false:true})">${s.archived?'استعادة':'أرشفة'}</button>`:''}</td></tr>`).join('')||'<tr><td colspan="7">لا توجد بيانات</td></tr>';
}
function initStudents(){
  if(!$('#studentForm'))return; fillSelect($('#grade'),grades,'اختر الصف'); fillSelect($('#status'),statuses,'اختر الحالة'); fillSelect($('#filterStatus'),statuses,'كل الحالات'); $('#studentForm').onsubmit=addStudent; if($('#addBtn')){$('#addBtn').onclick=openAdd; if(!can('add')) $('#addBtn').style.display='none'} $('#closeModal').onclick=closeModal; $('#searchInput').oninput=loadStudents; $('#filterStatus').onchange=loadStudents; $('#showArchived').onchange=loadStudents; $('#exportBtn').onclick=exportCSV; loadStudents();
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
async function initUsers(){
  if(!$('#userForm'))return; if(currentRole()!=='admin') go('dashboard.html'); await seedUsers();
  $('#userForm').onsubmit=saveUser; $('#clearUserBtn').onclick=()=>{$('#userForm').reset();$('#userKey').value=''}; loadUsers();
}
async function loadUsers(){
  const snap=await db.ref('appUsers').once('value'); const arr=[]; snap.forEach(c=>arr.push({key:c.key,...c.val()}));
  $('#usersBody').innerHTML=arr.map(u=>`<tr><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${esc(roleNames[u.role]||u.role)}</td><td>${u.active!==false?'مفعل':'موقوف'}</td><td class="actions"><button class="btn small secondary" onclick="editUser('${u.key}')">تعديل</button><button class="btn small danger" onclick="toggleUser('${u.key}',${u.active!==false})">${u.active!==false?'إيقاف':'تفعيل'}</button></td></tr>`).join('')||'<tr><td colspan="5">لا يوجد مستخدمون</td></tr>';
}
async function saveUser(e){
  e.preventDefault(); const email=$('#uEmail').value.trim().toLowerCase(); const key=$('#userKey').value||keyFromEmail(email);
  const data={name:$('#uName').value.trim(),email,password:$('#uPassword').value,role:$('#uRole').value,active:$('#uActive').checked,updatedAt:Date.now(),updatedAtText:nowText(),updatedBy:currentEmail()};
  if(!data.password){toast('اكتب كلمة المرور');return}
  await db.ref('appUsers/'+key).set(data); await log('save_user',{email,role:data.role}); toast('تم حفظ المستخدم'); $('#userForm').reset(); $('#userKey').value=''; loadUsers();
}
async function editUser(key){const u=(await db.ref('appUsers/'+key).once('value')).val(); if(!u)return; $('#userKey').value=key; $('#uName').value=u.name||''; $('#uEmail').value=u.email||''; $('#uPassword').value=u.password||''; $('#uRole').value=u.role||'registrar'; $('#uActive').checked=u.active!==false;}
async function toggleUser(key,active){await db.ref('appUsers/'+key).update({active:!active}); loadUsers();}
function exportCSV(){db.ref('students').once('value').then(snap=>{let csv='اسم الطالب,السجل المدني,المدرسة,الجنسية,الصف,الجوال,الحالة,الأرشيف,المدخل,التاريخ\n'; snap.forEach(ch=>{const s=ch.val(); csv += [s.studentName,s.civilId,s.school,s.nationality,s.grade,s.phone,s.status,s.archived?'مؤرشف':'نشط',s.createdBy,s.createdAtText].map(v=>'"'+String(v||'').replaceAll('"','""')+'"').join(',')+'\n'}); const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}); const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='amoria_students.csv';a.click()})}
window.openAdd=openAdd; window.openEdit=openEdit; window.archiveStudent=archiveStudent; window.closeModal=closeModal; window.print=window.print; window.editUser=editUser; window.toggleUser=toggleUser;
document.addEventListener('DOMContentLoaded',()=>{initBase();initLogin();initDashboard();initStudents();initLetter();initSettings();initUsers()});

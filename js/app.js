import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js';
import { getDatabase, ref, push, set, update, get, onValue, query, orderByChild, equalTo } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-database.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const grades = ['الأول الابتدائي','الثاني الابتدائي','الثالث الابتدائي','الرابع الابتدائي','الخامس الابتدائي','السادس الابتدائي','الأول المتوسط','الثاني المتوسط','الثالث المتوسط','الأول الثانوي','الثاني الثانوي','الثالث الثانوي'];
window.Amoria = {auth,db,ref,push,set,update,get,onValue,query,orderByChild,equalTo,grades};

function notice(text,type='ok'){const n=$('#notice'); if(!n) return; n.textContent=text; n.className='notice '+type; n.style.display='block'; setTimeout(()=>n.style.display='none',3500)}
function requireAuth(){onAuthStateChanged(auth,u=>{if(!u && !location.pathname.endsWith('index.html') && !location.pathname.endsWith('/')) location.href='index.html'; if(u && $('#userEmail')) $('#userEmail').textContent=u.email;});}

if($('#loginForm')){$('#loginForm').addEventListener('submit',async e=>{e.preventDefault();try{await signInWithEmailAndPassword(auth,$('#email').value,$('#password').value);location.href='dashboard.html'}catch(err){notice('بيانات الدخول غير صحيحة','err')}})}
if($('#logout')){$('#logout').onclick=()=>signOut(auth).then(()=>location.href='index.html')}
if(!$('#loginForm')) requireAuth();

function fillGrades(){const el=$('#grade'); if(el) grades.forEach(g=>el.insertAdjacentHTML('beforeend',`<option>${g}</option>`))}
fillGrades();

if($('#studentForm')){$('#studentForm').addEventListener('submit',async e=>{e.preventDefault();const civilId=$('#civilId').value.trim();const snap=await get(query(ref(db,'students'),orderByChild('civilId'),equalTo(civilId)));if(snap.exists() && !$('#studentId').value){notice('السجل المدني موجود مسبقًا','err');return}const data={school:$('#school').value.trim(),name:$('#name').value.trim(),civilId,nationality:$('#nationality').value.trim(),grade:$('#grade').value,phone:$('#phone').value.trim(),notes:$('#notes').value.trim(),status:'تم إصدار الخطاب',archived:false,createdAt:Date.now(),createdBy:auth.currentUser?.email||''};const id=$('#studentId').value||push(ref(db,'students')).key;await set(ref(db,'students/'+id),data);notice('تم حفظ الطالب بنجاح');setTimeout(()=>location.href='letter.html?id='+id,700)})}

if($('#studentsBody')){onValue(ref(db,'students'),snap=>{const rows=[];snap.forEach(ch=>{rows.push({id:ch.key,...ch.val()})});renderStudents(rows.filter(s=>!s.archived));$('#search')?.addEventListener('input',()=>renderStudents(rows.filter(s=>!s.archived)));});}
function renderStudents(rows){const q=($('#search')?.value||'').trim();const body=$('#studentsBody'); if(!body)return; body.innerHTML='';rows.filter(s=>!q||[s.name,s.civilId,s.school,s.grade].join(' ').includes(q)).forEach(s=>body.insertAdjacentHTML('beforeend',`<tr><td>${s.name||''}</td><td>${s.civilId||''}</td><td>${s.school||''}</td><td>${s.grade||''}</td><td>${s.createdBy||''}</td><td class="actions"><a class="btn light" href="letter.html?id=${s.id}">خطاب</a><button class="btn danger" data-archive="${s.id}">أرشفة</button></td></tr>`));$$('[data-archive]').forEach(b=>b.onclick=()=>update(ref(db,'students/'+b.dataset.archive),{archived:true}).then(()=>notice('تمت الأرشفة')))}

if($('#dashboardStats')){onValue(ref(db,'students'),snap=>{let total=0,arch=0,today=0;const start=new Date();start.setHours(0,0,0,0);snap.forEach(ch=>{const s=ch.val();total++;if(s.archived)arch++;if((s.createdAt||0)>=start.getTime())today++});$('#total').textContent=total;$('#active').textContent=total-arch;$('#today').textContent=today;$('#archived').textContent=arch;});}

if($('#letterBox')){const id=new URLSearchParams(location.search).get('id');get(ref(db,'students/'+id)).then(snap=>{const s=snap.val()||{};$('#letterBox').innerHTML=`<div class="letter-title">لجنة القبول بمدرسة عمورية الثانوية</div><p>المكرم مدير مدرسة / <b>${s.school||''}</b> المحترم</p><p>السلام عليكم ورحمة الله وبركاته</p><p>تحقيقًا لأهداف الإدارة العامة للتعليم بمحافظة جدة نحو استقرار الميدان، وما يتوفر لدى اللجنة من بيانات الطاقة الاستيعابية، نأمل منكم التعاون في قبول الطالب أدناه بمدرستكم العامرة بحسب الأنظمة والتعليمات المنظمة للقبول.</p><table><tr><th>اسم الطالب</th><td>${s.name||''}</td></tr><tr><th>السجل المدني</th><td>${s.civilId||''}</td></tr><tr><th>الجنسية</th><td>${s.nationality||''}</td></tr><tr><th>الصف</th><td>${s.grade||''}</td></tr></table><p style="text-align:left;margin-top:70px">عضو لجنة القبول بمدرسة عمورية المكلف<br>الاسم / ........................<br>التوقيع / ........................</p>`;});}

if($('#settingsForm')){$('#settingsForm').addEventListener('submit',async e=>{e.preventDefault();await set(ref(db,'settings'),{schoolName:$('#schoolName').value,signer:$('#signer').value,updatedAt:Date.now()});notice('تم حفظ الإعدادات')});get(ref(db,'settings')).then(s=>{const v=s.val()||{}; if($('#schoolName')) $('#schoolName').value=v.schoolName||'ثانوية عمورية'; if($('#signer')) $('#signer').value=v.signer||'';});}

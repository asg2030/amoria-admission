firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();
auth.onAuthStateChanged(user=>{ if(!user && !location.pathname.endsWith('index.html') && location.pathname !== '/') location.href='index.html'; const el=document.getElementById('userEmail'); if(el&&user) el.textContent=user.email; });
document.addEventListener('click',e=>{ if(e.target && e.target.id==='logoutBtn') auth.signOut().then(()=>location.href='index.html'); });
function escapeHtml(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function now(){return new Date().toISOString();}

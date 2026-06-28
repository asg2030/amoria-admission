firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
document.getElementById('loginForm').addEventListener('submit',async e=>{
 e.preventDefault();
 const msg=document.getElementById('loginMsg'); msg.textContent='';
 try{ await auth.signInWithEmailAndPassword(email.value,password.value); location.href='dashboard.html'; }
 catch(err){ msg.textContent='تعذر الدخول، تأكد من البريد وكلمة المرور.'; }
});

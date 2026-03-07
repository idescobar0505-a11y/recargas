type="module"
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyB9yqguTpNXeZEy7jMvH1cmhf4HBdub88A",
    authDomain: "rapi-recargas-ultra.firebaseapp.com",
    projectId: "rapi-recargas-ultra",
    storageBucket: "rapi-recargas-ultra.firebasestorage.app",
    messagingSenderId: "246317013918",
    appId: "1:246317013918:web:4048c97d7c7cac83ea148f",
    measurementId: "G-3GKMSP9M9N"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// ========================================================
// 🔐 PERSISTENCIA FORZADA (Evita que se cierre la sesión al recargar)
// ========================================================
setPersistence(auth, browserLocalPersistence)
    .then(() => { console.log("Persistencia de sesión activada."); })
    .catch((error) => { console.error("Error de persistencia:", error); });

// ========================================================
// 🚀 INICIO DE SESIÓN CON GOOGLE
// ========================================================
window.loginWithGoogle = () => {
    signInWithPopup(auth, provider)
    .then(async (result) => {
        const user = result.user;
        const userRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userRef);
        
        // Si el usuario es nuevo, crearle su base de datos
        if (!docSnap.exists()) {
            await setDoc(userRef, {
                name: user.displayName,
                email: user.email,
                wallet: { cash: 0, bank: 0 },
                history: []
            });
        }
        // El observador onAuthStateChanged se encargará de dejarlo entrar
    }).catch((error) => {
        console.error(error);
        alert("Error al iniciar con Google: " + error.message);
    });
};

// ========================================================
// 🚪 CERRAR SESIÓN CORRECTAMENTE
// ========================================================
window.logout = () => {
    if(confirm("¿Seguro que quieres cerrar sesión?")) {
        signOut(auth).then(() => {
            localStorage.clear(); // Limpia la memoria caché del celular
            location.reload();    // Recarga la página para mostrar el Login
        }).catch((error) => {
            alert("Error al cerrar sesión");
        });
    }
};

// ========================================================
// 👁️ OBSERVADOR DE SESIÓN (Sincronización Multidispositivo)
// ========================================================
onAuthStateChanged(auth, (user) => {
    if (user) {
        // El usuario ESTÁ logueado. Escuchar su base de datos en tiempo real.
        const userRef = doc(db, "users", user.uid);
        
        onSnapshot(userRef, (docSnap) => {
            const data = docSnap.data();
            if(data) {
                // Sincronizar datos globales a la RAM de la app
                state.user = data.name || user.displayName;
                state.wallet = data.wallet || { cash: 0, bank: 0 };
                localStorage.setItem('rp_history', JSON.stringify(data.history || []));
                
                document.getElementById('user-display').innerText = state.user;
                
                // Ocultar Login
                document.getElementById('sec-login').classList.add('hidden');
                
                // Si la app acaba de abrirse (Lobby oculto), mostrar el Lobby
                if(document.getElementById('sec-lobby').classList.contains('hidden')) {
                    document.getElementById('sec-lobby').classList.remove('hidden');
                }

                // Actualizar interfaz
                if(window.updateWalletUI) window.updateWalletUI();
                if(window.updateDashboard) window.updateDashboard();
                if(window.checkBalanceHealth) window.checkBalanceHealth();
            }
        });
    } else {
        // El usuario NO ESTÁ logueado. Forzar pantalla de Login.
        document.getElementById('sec-login').classList.remove('hidden');
        document.getElementById('sec-lobby').classList.add('hidden');
    }
});

// ========================================================
// ☁️ GUARDADO FORZADO EN FIREBASE
// ========================================================
window.saveSaleToFirebase = async (saleData) => {
    if(auth.currentUser) {
        const userRef = doc(db, "users", auth.currentUser.uid);
        await updateDoc(userRef, {
            wallet: state.wallet,
            history: arrayUnion(saleData)
        });
    }
};

window.saveDepositToFirebase = async () => {
    if(auth.currentUser) {
        const userRef = doc(db, "users", auth.currentUser.uid);
        await updateDoc(userRef, {
            wallet: state.wallet
        });
    }
};
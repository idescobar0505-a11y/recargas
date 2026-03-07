type="module"
        import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
        import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
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

        let currentUserData = null;

        // --- AUTH FUNCTIONS ---
        window.loginWithGoogle = () => {
            signInWithPopup(auth, provider)
            .then(async (result) => {
                const user = result.user;
                // Check if doc exists, if not create
                const userRef = doc(db, "users", user.uid);
                const docSnap = await getDoc(userRef);
                
                if (!docSnap.exists()) {
                    await setDoc(userRef, {
                        name: user.displayName,
                        email: user.email,
                        wallet: { cash: 0, bank: 0 },
                        history: []
                    });
                }
                // Auth state listener will handle the transition
            }).catch((error) => {
                console.error(error);
                alert("Error con Google: " + error.message);
            });
        };

        window.logout = () => {
            signOut(auth).then(() => {
                location.reload();
            });
        };

        // Escuchar cambios de sesión
        onAuthStateChanged(auth, (user) => {
            if (user) {
                // User signed in
                const userRef = doc(db, "users", user.uid);
                onSnapshot(userRef, (doc) => {
                    const data = doc.data();
                    if(data) {
                        state.user = data.name || user.displayName;
                        state.wallet = data.wallet;
                        localStorage.setItem('rp_history', JSON.stringify(data.history || []));
                        
                        document.getElementById('user-display').innerText = state.user;
                        document.getElementById('sec-login').classList.add('hidden');
                        
                        // Si es la primera carga y estamos en login, ir a intro
                        if(!document.getElementById('sec-lobby').classList.contains('hidden') === false) {
                            document.getElementById('sec-intro').classList.remove('hidden');
                        }

                        window.updateWalletUI();
                        window.updateDashboard();
                        window.checkBalanceHealth();
                    }
                });
            } else {
                // User signed out, show login
            }
        });

        // --- FIRESTORE FUNCTIONS (Exposed to Window) ---
        window.saveSaleToFirebase = async (saleData) => {
            if(auth.currentUser) {
                const userRef = doc(db, "users", auth.currentUser.uid);
                // Update wallet locally first for speed
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
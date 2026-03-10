/* =========================================================
   CONFIGURACIÓN Y PRECIOS
========================================================= */
const PRECIOS = {
    'Tigo': [
        {n:'Super 1 Día', b:36, v:45}, {n:'Super 3 Días', b:67, v:75},
        {n:'Super 3 Días', b:70, v:78},
        {n:'Super 7 Días', b:122, v:135}, {n:'Super 10 Días', b:165, v:175},
        {n:'Super 15 Días', b:235, v:255}, {n:'Recarga 25', b:25, v:35}, {n:'Recarga 50', b:50, v:60}
    ],
    'Claro': [
        {n:'Super 1 Día', b:36, v:45}, {n:'Super 3 Días', b:67, v:75},
        {n:'Super 7 Días', b:125, v:135}, {n:'Super 10 Días', b:165, v:175}, {n:'Super 15 Días', b:235, v:255},
        {n:'Super ilimitado intrenet 2 Días', b:60, v:65}, {n:'Super 1 dia ilimitado internet', b:32, v:37}, {n:'Super 3 Horas', b:15, v:20},
        {n:'Recarga 25', b:25, v:30}, {n:'Recarga 30', b:30, v:35}, {n:'Recarga 35', b:35, v:40},
        {n:'Recarga 40', b:40, v:45}, {n:'Recarga 50', b:50, v:60}
    ]
};

// URL DE TU BASE DE DATOS (Ajusta esto si lo subes a Render)
const API_URL = "http://127.0.0.1:10000"; 

let state = {
    uid: localStorage.getItem('rp_uid') || null,
    user: localStorage.getItem('rp_user') || 'Usuario',
    theme: localStorage.getItem('rp_theme') || 'light',
    wallet: JSON.parse(localStorage.getItem('rp_wallet')) || { cash: 0, bank: 0 },
    tempSale: null,
    currentOp: '',
    mascotDismissed: false,
    audioUnlocked: false
};

let currentFilteredHistory = []; 

/* =========================================================
   INICIO Y PERSISTENCIA REAL DE SESIÓN
========================================================= */
window.onload = () => {
    initParticles();
    applyTheme();
    checkSessionPersistence();

    // AUTOCOMPLETAR NOMBRE DEL CLIENTE AL ESCRIBIR 8 DÍGITOS
    const phoneInput = document.getElementById('sale-phone');
    if(phoneInput) {
        phoneInput.addEventListener('keyup', (e) => {
            if(e.target.value.length === 8) {
                let rawHistory = JSON.parse(localStorage.getItem('rp_history')) || [];
                let pastSale = rawHistory.find(h => h.phone === e.target.value && h.customerName && h.customerName.toLowerCase() !== 'cliente');
                if(pastSale) {
                    const nameInput = document.getElementById('sale-name');
                    nameInput.value = pastSale.customerName;
                    nameInput.style.backgroundColor = 'rgba(0, 200, 81, 0.2)';
                    setTimeout(() => { nameInput.style.backgroundColor = 'transparent'; }, 1000);
                }
            }
        });
    }
};

/* --- DESBLOQUEO DE AUDIO FORZADO --- */
document.body.addEventListener('click', () => {
    if(!state.audioUnlocked) {
        const audio = document.getElementById('urgent-audio');
        if(audio) {
            audio.play().then(() => {
                audio.pause();
                audio.currentTime = 0;
                state.audioUnlocked = true;
            }).catch(err => console.log("Audio en espera."));
        }
    }
}, { once: true });

/* --- COMPROBAR SI YA ESTABA LOGUEADO (PERSISTENCIA) --- */
function checkSessionPersistence() {
    const isLoggedIn = localStorage.getItem('rp_logged_in') === 'true';
    if(isLoggedIn && state.uid) {
        // Ocultar Login y mostrar el Lobby sin pedir datos
        document.getElementById('sec-login').classList.add('hidden');
        document.getElementById('sec-lobby').classList.remove('hidden');
        document.getElementById('user-display').innerText = state.user;
        
        updateWalletUI();
        updateDashboard();
        syncDataFromDatabase(); // Descarga historial de la Nube a este dispositivo
    }
}

/* =========================================================
   LOGIN CLÁSICO (SIN GOOGLE)
========================================================= */
function toggleFlip() { document.getElementById('login-flipper').classList.toggle('flipped'); }

function handleRegister() {
    const u = document.getElementById('reg-user').value.trim();
    const p = document.getElementById('reg-pass').value.trim();
    const n = document.getElementById('reg-name').value.trim();
    if(u && p && n) {
        // Guardamos las credenciales localmente
        localStorage.setItem('user_' + u, p);
        localStorage.setItem('name_' + u, n); 
        document.getElementById('reg-success-overlay').classList.remove('hidden');
    } else { alert("Por favor, completa todos los campos."); }
}

function finishRegAnimation() {
     document.getElementById('reg-success-overlay').classList.add('hidden');
     document.getElementById('log-user').value = document.getElementById('reg-user').value;
     document.getElementById('log-pass').value = '';
     toggleFlip(); 
}

function handleLogin() {
    const u = document.getElementById('log-user').value.trim();
    const p = document.getElementById('log-pass').value.trim();
    const storedPass = localStorage.getItem('user_' + u);
    const storedName = localStorage.getItem('name_' + u) || u;

    const grpUser = document.getElementById('grp-log-user');
    const grpPass = document.getElementById('grp-log-pass');
    grpUser.classList.remove('shake-error'); grpPass.classList.remove('shake-error');

    if(u && p && storedPass === p) {
        // CREDENCIALES CORRECTAS: CREAR SESIÓN PERSISTENTE
        state.uid = u;
        state.user = storedName; 
        localStorage.setItem('rp_uid', state.uid);
        localStorage.setItem('rp_user', state.user);
        localStorage.setItem('rp_logged_in', 'true'); // Marca de persistencia
        
        document.getElementById('sec-login').classList.add('hidden');
        document.getElementById('sec-lobby').classList.remove('hidden');
        document.getElementById('user-display').innerText = state.user;
        
        updateWalletUI();
        syncDataFromDatabase(); // Trae datos de la base de datos si entra desde otro celular
    } else {
        void grpUser.offsetWidth; void grpPass.offsetWidth;
        grpUser.classList.add('shake-error'); grpPass.classList.add('shake-error');
        if(navigator.vibrate) navigator.vibrate(200);
    }
}

function logout() {
    if(confirm("¿Seguro que quieres cerrar sesión? Perderás el acceso rápido en este dispositivo.")) {
        localStorage.removeItem('rp_logged_in');
        location.reload(); // Recarga la página y muestra el login
    }
}

function nextIntroSlide() {
    document.getElementById('sec-intro').classList.add('hidden');
    document.getElementById('sec-welcome').classList.remove('hidden');
}

/* =========================================================
   NAVEGACIÓN CERO LAG
========================================================= */
function navTo(screen) {
    document.querySelectorAll('section').forEach(s => s.classList.add('hidden'));
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
    
    const targetSection = document.getElementById(`sec-${screen}`);
    if(targetSection) targetSection.classList.remove('hidden');

    if(screen === 'lobby') { updateDashboard(); updateWalletUI(); checkBalanceHealth(); }
    else if (screen === 'history') { renderHistory(); }
    else if (screen === 'customers') { renderCustomers(); }
    else if (screen === 'analytics') { renderAnalytics(); }
    
    // Pinta el botón exacto instantáneamente
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.querySelectorAll(`.nav-item[data-target="${screen}"]`).forEach(el => el.classList.add('active'));
}

/* =========================================================
   SINCRONIZACIÓN CON BASE DE DATOS POSTGRESQL (LA NUBE)
========================================================= */
async function syncDataFromDatabase() {
    if(!state.uid) return;
    try {
        const response = await fetch(`${API_URL}/sales/${state.uid}`);
        if(response.ok) {
            const serverSales = await response.json();
            if(serverSales && serverSales.length > 0) {
                // Sobrescribir historial local con el de la nube
                localStorage.setItem('rp_history', JSON.stringify(serverSales));
                updateDashboard();
            }
        }
    } catch(err) {
        console.log("Modo Offline activo: Usando caché local.");
    }
}

async function forceBackupToCloud() {
    if(!state.uid) return;
    try {
        // Guarda la Billetera
        await fetch(`${API_URL}/users/sync`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                uid: state.uid,
                name: state.user,
                email: `${state.uid}@rapirecargas.com`,
                wallet: state.wallet
            })
        });
    } catch(e) { console.log("Backup billetera en espera..."); }
}

function showSyncToast() {
    const toast = document.getElementById('sync-toast');
    if(toast) {
        toast.classList.remove('hidden');
        toast.style.opacity = '1';
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.classList.add('hidden'), 500);
        }, 3000);
    }
}

/* =========================================================
   WALLET, DEPÓSITOS Y MASCOTA DE ALERTA
========================================================= */
function toggleTheme() {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('rp_theme', state.theme);
    applyTheme();
}
function applyTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
    const icon = document.getElementById('theme-icon');
    if(icon) icon.className = state.theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
}

function updateWalletUI() {
    document.getElementById('wallet-cash').innerText = `L.${state.wallet.cash}`;
    document.getElementById('wallet-bank').innerText = `L.${state.wallet.bank}`;
    localStorage.setItem('rp_wallet', JSON.stringify(state.wallet));
}

function checkBalanceHealth() {
    const bal = state.wallet.bank;
    const mascot = document.getElementById('mascot-container');
    const text = document.getElementById('mascot-text');
    const face = document.getElementById('mascot-face');
    
    if(state.mascotDismissed) return;

    mascot.classList.remove('hidden', 'mascot-warning', 'mascot-critical');
    let htmlMsg = '';

    if(bal <= 100) {
        mascot.classList.add('mascot-critical');
        htmlMsg = `¡URGENTE ${state.user}! 🚨<br>Quedan menos de L.100 en banco. Recarga YA.`;
        face.innerHTML = '<i class="fas fa-dizzy"></i>';
        const audioAlerta = document.getElementById('urgent-audio');
        if(audioAlerta && state.audioUnlocked) audioAlerta.play().catch(e=>e);
    } else if (bal <= 500) {
        mascot.classList.add('mascot-warning');
        htmlMsg = `Oye ${state.user}, nos estamos quedando sin fondos (L.${bal}).`;
        face.innerHTML = '<i class="fas fa-meh-rolling-eyes"></i>';
    } else {
        mascot.classList.add('hidden');
        return;
    }
    text.innerHTML = htmlMsg + '<div class="close-mascot" onclick="dismissMascot()">X</div>';
}
function dismissMascot() { state.mascotDismissed = true; document.getElementById('mascot-container').classList.add('hidden'); }
setInterval(() => {
    if(state.mascotDismissed) {
        state.mascotDismissed = false; 
        if(!document.getElementById('sec-login').classList.contains('hidden')) return; 
        checkBalanceHealth(); 
    }
}, 10000);

function openDepositModal() {
    document.getElementById('deposit-amount').value = '';
    document.getElementById('modal-deposit').classList.remove('hidden');
}

function confirmDeposit() {
    const amt = parseInt(document.getElementById('deposit-amount').value);
    if(!amt || amt <= 0) return alert("Monto inválido");
    
    document.getElementById('modal-deposit').classList.add('hidden');
    const animContainer = document.getElementById('deposit-animation-container');
    if(animContainer) animContainer.classList.remove('hidden');
    
    state.wallet.bank += amt;
    updateWalletUI();
    forceBackupToCloud(); // Sube la nueva billetera a Postgres
    
    setTimeout(() => {
        if(animContainer) animContainer.classList.add('hidden');
        const celebScreen = document.getElementById('celebration-screen');
        if(celebScreen) celebScreen.classList.remove('hidden');
        checkBalanceHealth(); 
    }, 2500);
}
function closeCelebration() { document.getElementById('celebration-screen').classList.add('hidden'); }

/* =========================================================
   VENTAS Y FACTURACIÓN
========================================================= */
function openSales(op) {
    state.currentOp = op;
    document.getElementById('sale-op-title').innerText = "Recargas " + op;
    document.getElementById('sale-phone').value = '';
    const nameInput = document.getElementById('sale-name');
    if(nameInput) { nameInput.value = ''; nameInput.style.backgroundColor = 'transparent'; }
    
    const grid = document.getElementById('packages-grid');
    grid.innerHTML = '';
    
    PRECIOS[op].forEach(p => {
        const btn = document.createElement('button');
        btn.className = 'btn-mega';
        
        // NUEVOS ESTILOS: Apilamos en columna y ajustamos espacios
        btn.style.flexDirection = 'column'; 
        btn.style.padding = '10px 5px'; 
        btn.style.fontSize = '0.8rem'; 
        btn.style.textAlign = 'center';
        btn.style.background = 'var(--card-bg)';
        btn.style.color = 'var(--text)'; 
        btn.style.border = '1px solid var(--primary)';
        
        // El div del nombre ahora permite saltos de línea sin cortarse
        btn.innerHTML = `
            <div style="width: 100%; word-break: break-word; line-height: 1.2; margin-bottom: 5px;">${p.n}</div>
            <div style="color:var(--primary); font-size:1.1rem; font-weight: 900;">L.${p.v}</div>
        `;
        
        btn.onclick = () => prepareSale(op, p);
        grid.appendChild(btn);
    });

    const btnCustom = document.createElement('button');
    btnCustom.className = 'btn-mega btn-custom-opt'; btnCustom.style.gridColumn = "span 3";
    btnCustom.style.background = "var(--text)"; btnCustom.style.color = "var(--bg)"; 
    btnCustom.innerHTML = "OTRO MONTO"; btnCustom.onclick = () => showCustomModal();
    grid.appendChild(btnCustom);

    navTo('sales');
}

function showCustomModal() { document.getElementById('custom-amount-input').value = ''; document.getElementById('modal-custom').classList.remove('hidden'); }
function processCustomAmount() {
    const amt = document.getElementById('custom-amount-input').value;
    if(!amt || amt <= 0) return alert("Ingresa un monto válido");
    document.getElementById('modal-custom').classList.add('hidden');
    prepareSale(state.currentOp, { n: 'Recarga Libre', b: amt, v: amt });
}

function prepareSale(op, pkg) {
    if(state.wallet.bank < pkg.b) return alert(`Saldo insuficiente en Banco (L.${state.wallet.bank}).`);

    const phoneInput = document.getElementById('sale-phone');
    const nameInput = document.getElementById('sale-name');
    const phoneContainer = document.getElementById('phone-input-container');
    
    const phone = phoneInput.value;
    const name = nameInput && nameInput.value.trim() !== '' ? nameInput.value : 'Cliente';
    
    if(phone.length !== 8) {
        phoneContainer.classList.remove('shake-error'); void phoneContainer.offsetWidth; 
        phoneContainer.classList.add('shake-error'); return; 
    }
    
    const orderID = Math.floor(100000 + Math.random() * 900000); 
    const fecha = new Date();
    
    let expireTimestamp = null;
    let esSuper = false;
    
    // Cálculo Exacto de Días
    if(pkg.n.toLowerCase().includes('super') || pkg.n.toLowerCase().includes('día')) {
        esSuper = true;
        const numMatch = pkg.n.match(/(\d+)\s*Día/i);
        if(numMatch) {
            const dias = parseInt(numMatch[1]);
            expireTimestamp = fecha.getTime() + (dias * 24 * 60 * 60 * 1000);
        }
    }

    state.tempSale = {
        id: orderID, op: op, prod: pkg.n, monto: pkg.v,
        costo: pkg.b, ganancia: (pkg.v - pkg.b) > 0 ? (pkg.v - pkg.b) : 0, 
        phone: phone, customerName: name,
        date: fecha.toLocaleDateString(), time: fecha.toLocaleTimeString(),
        timestamp: fecha.getTime(),
        esSuper: esSuper, expireTimestamp: expireTimestamp
    };

    const html = `
        <div style="text-align:center; font-weight:bold; margin-bottom:10px;">RAPI RECARGAS</div>
        <div class="v-row"><span>Cliente:</span> <span>${name}</span></div>
        <div class="v-row"><span>Orden ID:</span> <span>#${orderID}</span></div>
        <div class="v-row"><span>Operador:</span> <span>${op}</span></div>
        <div class="v-row"><span>Número:</span> <span>${phone}</span></div>
        <div class="v-row"><span>Producto:</span> <span>${pkg.n}</span></div>
        <div class="v-total">TOTAL: L.${pkg.v}.00</div>
    `;
    document.getElementById('pre-voucher').innerHTML = html;
    document.getElementById('modal-confirm').classList.remove('hidden');
}

function closeModal() { document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden')); }

function finalizeSale() {
    let history = JSON.parse(localStorage.getItem('rp_history')) || [];
    history.unshift(state.tempSale);
    localStorage.setItem('rp_history', JSON.stringify(history));
    
    state.wallet.bank -= state.tempSale.costo; 
    state.wallet.cash += parseInt(state.tempSale.monto); 
    
    updateWalletUI();
    checkBalanceHealth();
    forceBackupToCloud(); // Respalda billetera

    // SUBE LA VENTA A POSTGRES EN SEGUNDO PLANO
    try {
        fetch(`${API_URL}/sales/new`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                uid_user: state.uid || 'anonimo',
                id: state.tempSale.id.toString(),
                op: state.tempSale.op,
                prod: state.tempSale.prod,
                monto: parseFloat(state.tempSale.monto),
                costo: parseFloat(state.tempSale.costo),
                ganancia: parseFloat(state.tempSale.ganancia),
                phone: state.tempSale.phone,
                customerName: state.tempSale.customerName,
                date: state.tempSale.date,
                time: state.tempSale.time,
                timestamp: state.tempSale.timestamp,
                esSuper: state.tempSale.esSuper,
                expireTimestamp: state.tempSale.expireTimestamp || null
            })
        }).then(() => showSyncToast()).catch(e => showSyncToast());
    } catch(err) { showSyncToast(); }

    closeModal();
    
    const msg = `🧾 *COMPROBANTE DE PAGO*\n\nHola ${state.tempSale.customerName}, aquí está tu recarga:\n🆔 Orden: ${state.tempSale.id}\n📅 Fecha: ${state.tempSale.date}\n📱 Numero: ${state.tempSale.phone}\n📦 Pack: ${state.tempSale.prod}\n💰 Valor: L.${state.tempSale.monto}\n\nGracias por tu preferencia!`;
    const waLink = `https://wa.me/504${state.tempSale.phone}?text=${encodeURIComponent(msg)}`;
    const btn = document.getElementById('btn-wa-client');
    if(btn) { btn.onclick = () => window.open(waLink, '_blank'); }
    
    document.getElementById('modal-success').classList.remove('hidden');
}

/* =========================================================
   DASHBOARD Y REPORTES ADMIN
========================================================= */
function updateDashboard() {
    let rawHistory = JSON.parse(localStorage.getItem('rp_history')) || [];
    let history = rawHistory.filter(h => h && h.monto !== undefined);
    const today = new Date().toLocaleDateString();
    const currentMonth = new Date().getMonth();
    let gToday = 0, gMonth = 0, vTotal = 0;
    
    history.forEach(h => {
        vTotal += parseInt(h.monto || 0);
        if(h.date === today) gToday += parseInt(h.ganancia || 0);
        const safeDate = h.date || '';
        const hDateParts = safeDate.split('/');
        if(hDateParts.length === 3) {
            const mIndex = parseInt(hDateParts[1]) - 1;
            if(mIndex === currentMonth) gMonth += parseInt(h.ganancia || 0);
        }
    });

    document.getElementById('stat-today').innerText = `L.${gToday}`;
    document.getElementById('stat-month').innerText = `L.${gMonth}`;
    document.getElementById('stat-total').innerText = `L.${vTotal}`;
}

function sendAdminReport() {
    let rawHistory = JSON.parse(localStorage.getItem('rp_history')) || [];
    let history = rawHistory.filter(h => h && h.date);
    const today = new Date().toLocaleDateString();
    let salesToday = history.filter(h => h.date === today);
    if(salesToday.length === 0) return alert("No hay ventas hoy para reportar.");
    
    let totalVenta = 0, totalGanancia = 0;
    salesToday.forEach(h => { totalVenta += parseInt(h.monto || 0); totalGanancia += parseInt(h.ganancia || 0); });
    
    const msg = `📊 *REPORTE DE CIERRE - ${today}*\n\n👤 Usuario: ${state.user}\n🛒 Transacciones: ${salesToday.length}\n💰 Venta Total: L.${totalVenta}\n📈 Ganancia Neta: L.${totalGanancia}\n💵 Caja Actual: L.${state.wallet.cash}\n🏦 Banco Restante: L.${state.wallet.bank}`;
    window.open(`https://wa.me/50493655523?text=${encodeURIComponent(msg)}`, '_blank');
}

/* =========================================================
   MÓDULO CRM: VENCIMIENTOS Y UPSELL (24H LOGIC)
========================================================= */
function renderCustomers() {
    let rawHistory = JSON.parse(localStorage.getItem('rp_history')) || [];
    const list = document.getElementById('customers-list');
    const searchFilter = document.getElementById('filter-customer').value.toLowerCase();
    list.innerHTML = '';

    let clientsMap = {};
    rawHistory.forEach(h => {
        if(!h || !h.phone) return;
        if(!clientsMap[h.phone]) { clientsMap[h.phone] = { phone: h.phone, name: h.customerName || 'Cliente', purchases: [], latestSuper: null }; }
        clientsMap[h.phone].purchases.push(h);
        if(h.esSuper && h.expireTimestamp) {
            if(!clientsMap[h.phone].latestSuper || h.timestamp > clientsMap[h.phone].latestSuper.timestamp) {
                clientsMap[h.phone].latestSuper = h;
            }
        }
    });

    const now = new Date().getTime();

    Object.values(clientsMap).forEach(client => {
        if(!client.phone.includes(searchFilter) && !client.name.toLowerCase().includes(searchFilter)) return;
        
        const card = document.createElement('div');
        card.className = 'customer-card';
        let statusHtml = ''; let upsellHtml = '';
        
        if(client.latestSuper) {
            const timeDiff = client.latestSuper.expireTimestamp - now;
            const hoursLeft = timeDiff / (1000 * 60 * 60);
            const waMsg = `Hola ${client.name}, te saludo de Rapi Recargas. Tu paquete ${client.latestSuper.prod} está por terminar. ¿Deseas que te haga una nueva recarga para que no pierdas conexión? Avisame, aquí te atiendo rápido. ⚡`;
            
            if(hoursLeft <= 0) {
                statusHtml = `<div class="status-badge status-expired"><i class="fas fa-times-circle"></i> Recarga Vencida</div>
                              <button class="btn-sm btn-wa-remind" onclick="window.open('https://wa.me/504${client.phone}?text=${encodeURIComponent(waMsg)}', '_blank')"><i class="fab fa-whatsapp"></i> Avisar para Renovar</button>`;
            } else if (hoursLeft <= 24) {
                statusHtml = `<div class="status-badge status-warning"><i class="fas fa-exclamation-triangle"></i> Vence en ${Math.ceil(hoursLeft)}h</div>
                              <button class="btn-sm btn-wa-remind" onclick="window.open('https://wa.me/504${client.phone}?text=${encodeURIComponent(waMsg)}', '_blank')"><i class="fab fa-whatsapp"></i> Avisar para Renovar</button>`;
            } else {
                statusHtml = `<div class="status-badge status-active"><i class="fas fa-check-circle"></i> Activa (${Math.ceil(hoursLeft/24)} días rest)</div>
                              <div style="font-size:0.75rem; color:#888; margin-top:5px; padding-left:5px; border-left: 2px solid var(--primary);">El botón de WhatsApp aparecerá cuando falten 24h.</div>`;
            }
        } else {
            statusHtml = `<span style="font-size:0.8rem; color:#888;">Cliente de recargas normales (sin vencimiento).</span>`;
        }

        const oneDayPurchases = client.purchases.filter(p => p.prod.includes('1 Día'));
        if(oneDayPurchases.length >= 2) {
            upsellHtml = `<div class="upsell-box"><strong>💡 Oportunidad:</strong> Este cliente lleva ${oneDayPurchases.length} recargas de 1 Día seguidas.<br><i>Ofrécele la Super 3 Días (L.75). Ahorrará dinero.</i></div>`;
        }

        card.innerHTML = `<div style="font-size:1.1rem; font-weight:bold; color:var(--primary);"><i class="fas fa-user-circle"></i> ${client.name}</div>
                          <div style="font-weight:bold; margin-bottom:5px;">📱 ${client.phone}</div>
                          <div>${statusHtml}</div>${upsellHtml}`;
        list.appendChild(card);
    });
}

/* =========================================================
   MÓDULO ALGORITMO E HISTORIAL
========================================================= */
function renderAnalytics() {
    let rawHistory = JSON.parse(localStorage.getItem('rp_history')) || [];
    let history = rawHistory.filter(h => h && h.monto);
    const content = document.getElementById('analytics-content');
    
    if(history.length === 0) { content.innerHTML = "<p>Necesitas realizar ventas para procesar datos.</p>"; return; }

    let tigoCount = 0, claroCount = 0; let productsMap = {};
    history.forEach(h => {
        if(h.op === 'Tigo') tigoCount++; else claroCount++;
        if(!productsMap[h.prod]) productsMap[h.prod] = { name: h.prod, count: 0, revenue: 0 };
        productsMap[h.prod].count++; productsMap[h.prod].revenue += parseInt(h.monto);
    });

    let bestOp = tigoCount > claroCount ? 'Tigo' : (claroCount > tigoCount ? 'Claro' : 'Empate');
    const topP = Object.values(productsMap).sort((a, b) => b.count - a.count)[0];

    content.innerHTML = `
        <div class="analytics-card">
            <h4><i class="fas fa-chart-line"></i> Diagnóstico de tu Negocio</h4>
            <p><strong>🏆 Compañía Dominante:</strong> ${bestOp}</p>
            <div class="progress-bar-wrap">
                <div class="progress-fill tigo-fill" style="width: ${(tigoCount/history.length)*100}%">TIGO</div>
                <div class="progress-fill claro-fill" style="width: ${(claroCount/history.length)*100}%">CLARO</div>
            </div>
            <div style="margin-top:15px; padding-top:15px; border-top:1px solid var(--border);">
                <p><strong>🔥 Tu Producto Estrella:</strong></p>
                <h3 style="color:var(--primary);">${topP.name}</h3>
                <p style="font-size:0.8rem;">Lo has vendido ${topP.count} veces (Ingreso total: L.${topP.revenue}).</p>
            </div>
        </div>
    `;
}

function renderHistory() {
    let rawHistory = JSON.parse(localStorage.getItem('rp_history')) || [];
    const list = document.getElementById('history-list');
    const dateFilter = document.getElementById('filter-date') ? document.getElementById('filter-date').value : ''; 
    const monthFilter = document.getElementById('filter-month') ? document.getElementById('filter-month').value : ''; 
    const searchFilter = document.getElementById('filter-search') ? document.getElementById('filter-search').value.toLowerCase() : '';
    
    list.innerHTML = '';
    let validHistory = rawHistory.filter(h => h && h.id && h.phone);
    validHistory.sort((a, b) => (b.timestamp || parseInt(b.id) || 0) - (a.timestamp || parseInt(a.id) || 0));
    
    const filtered = validHistory.filter(h => {
        const safeId = h.id ? h.id.toString() : ''; const safePhone = h.phone ? h.phone.toString() : '';
        const safeDate = h.date || ''; const safeName = h.customerName ? h.customerName.toLowerCase() : '';
        const matchesSearch = safeId.includes(searchFilter) || safePhone.includes(searchFilter) || safeName.includes(searchFilter);
        
        let matchesDate = true;
        if(dateFilter) {
            const [y, m, d] = dateFilter.split('-'); matchesDate = safeDate.includes(`${parseInt(d)}/${parseInt(m)}/${y}`) || safeDate.includes(`${d}/${m}/${y}`);
        }
        let matchesMonth = true;
        if(monthFilter) {
            const [y, m] = monthFilter.split('-'); matchesMonth = safeDate.includes(`/${parseInt(m)}/${y}`) || safeDate.includes(`/${m}/${y}`);
        }
        return matchesSearch && matchesDate && matchesMonth;
    });

    currentFilteredHistory = filtered; 
    if(filtered.length === 0) { list.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-light);">No se encontraron registros.</div>'; return; }

    filtered.forEach(h => {
        const item = document.createElement('div');
        item.className = `history-card ${h.op === 'Claro' ? 'h-claro' : 'h-tigo'}`;
        item.innerHTML = `<div><div class="order-id">ORDEN #${h.id} - ${h.customerName || 'Cliente'}</div><div style="font-weight:bold;">${h.phone}</div><div style="font-size:0.8rem; color:var(--text-light);">${h.prod}</div></div><div class="h-price">L.${h.monto}</div>`;
        list.appendChild(item);
    });
}

function exportHistoryPDF() {
    if(!currentFilteredHistory || currentFilteredHistory.length === 0) return alert("No hay órdenes.");
    const { jsPDF } = window.jspdf; const doc = new jsPDF();
    doc.text("Reporte Rapi Recargas ULTRA", 14, 15); doc.setFontSize(10); doc.text(`Fecha: ${new Date().toLocaleString()}`, 14, 22);
    let tV = 0, tG = 0;
    const tableData = currentFilteredHistory.map(h => { tV += parseInt(h.monto || 0); tG += parseInt(h.ganancia || 0); return [h.date, `#${h.id}`, h.op, h.phone, `L.${h.monto}`, `L.${h.ganancia}`]; });
    doc.autoTable({ startY: 30, head: [['Fecha', 'ID', 'Compañía', 'Número', 'Venta', 'Ganancia']], body: tableData, theme: 'grid', headStyles: { fillColor: [255, 103, 0] } });
    doc.save(`Reporte_RapiRecargas.pdf`);
}

/* =========================================================
   PARTICULAS Y OPTIMIZADOR
========================================================= */
function initParticles() {
    const canvas = document.getElementById('particles-js');
    if(!canvas) return; const ctx = canvas.getContext('2d');
    let width, height, particles;
    const resize = () => { width = canvas.width = window.innerWidth; height = canvas.height = window.innerHeight; };
    class Particle {
        constructor() {
            this.x = Math.random() * width; this.y = Math.random() * height;
            this.vx = (Math.random() - 0.5) * 1; this.vy = (Math.random() - 0.5) * 1;
            this.size = Math.random() * 2 + 1;
        }
        update() {
            this.x += this.vx; this.y += this.vy;
            if(this.x < 0 || this.x > width) this.vx *= -1; if(this.y < 0 || this.y > height) this.vy *= -1;
        }
        draw() {
            ctx.fillStyle = state.theme === 'dark' ? 'rgba(255,136,0,0.5)' : 'rgba(255, 103, 0, 0.6)';
            ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill();
        }
    }
    const init = () => { particles = []; for(let i=0; i < 50; i++) particles.push(new Particle()); };
    const animate = () => {
        ctx.clearRect(0,0,width,height);
        particles.forEach((p, i) => {
            p.update(); p.draw();
            for(let j=i; j<particles.length; j++){
                const dx = particles[j].x - p.x; const dy = particles[j].y - p.y; const dist = Math.sqrt(dx*dx + dy*dy);
                if(dist < 100){
                    ctx.strokeStyle = state.theme === 'dark' ? `rgba(255,136,0,${1 - dist/100})` : `rgba(255,103,0,${0.4 - dist/1000})`;
                    ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(particles[j].x, particles[j].y); ctx.stroke();
                }
            }
        }); requestAnimationFrame(animate);
    };
    window.addEventListener('resize', resize); resize(); init(); animate();
}

(function initOptimizer() {
    window.isAppActive = true;
    document.addEventListener("visibilitychange", () => { window.isAppActive = !document.hidden; });
    const originalRequestAnimationFrame = window.requestAnimationFrame;
    window.requestAnimationFrame = function(callback) {
        if (!window.isAppActive) { setTimeout(() => window.requestAnimationFrame(callback), 1000); return; }
        return originalRequestAnimationFrame(callback);
    };
    setTimeout(() => {
        document.querySelectorAll('input').forEach(input => {
            input.setAttribute('autocomplete', 'off'); input.setAttribute('spellcheck', 'false'); input.style.transform = "translateZ(0)"; 
        });
    }, 1000);
})();
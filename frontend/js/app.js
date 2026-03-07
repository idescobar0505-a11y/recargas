/* --- CONFIG PRECIOS Y MATERIA PRIMA --- */
const PRECIOS = {
    'Tigo': [
        {n:'Super 1 Día', b:36, v:45}, {n:'Super 3 Días', b:67, v:75},
        {n:'Super 7 Días', b:122, v:135}, {n:'Super 10 Días', b:165, v:175},
        {n:'Super 15 Días', b:235, v:255}, {n:'Recarga 25', b:25, v:35}, {n:'Recarga 50', b:50, v:60}
    ],
    'Claro': [
        {n:'Super 1 Día', b:36, v:45}, {n:'Super 3 Días', b:67, v:75},
        {n:'Super 7 Días', b:122, v:135}, {n:'Super 10 Días', b:165, v:175}, {n:'Super 15 Días', b:235, v:255},
        {n:'Recarga 25', b:24, v:25}, {n:'Recarga 30', b:30, v:35}, {n:'Recarga 35', b:35, v:40},
        {n:'Recarga 40', b:39, v:40}, {n:'Recarga 50', b:50, v:60}
    ]
};

let state = {
    user: localStorage.getItem('rp_user') || null,
    theme: localStorage.getItem('rp_theme') || 'light',
    tempSale: null,
    currentOp: '',
    wallet: { cash: 0, bank: 0 },
    mascotDismissed: false,
    audioUnlocked: false // Para forzar que el sonido funcione
};

let currentFilteredHistory = []; 

/* --- INICIO --- */
window.onload = () => {
    initParticles();
    applyTheme();

    // AUTOCOMPLETAR NOMBRE DEL CLIENTE AL ESCRIBIR 8 DÍGITOS
    const phoneInput = document.getElementById('sale-phone');
    if(phoneInput) {
        phoneInput.addEventListener('keyup', (e) => {
            if(e.target.value.length === 8) {
                let rawHistory = JSON.parse(localStorage.getItem('rp_history')) || [];
                // Busca si este número ya compró antes y si tenía un nombre real
                let pastSale = rawHistory.find(h => h.phone === e.target.value && h.customerName && h.customerName.toLowerCase() !== 'cliente');
                if(pastSale) {
                    document.getElementById('sale-name').value = pastSale.customerName;
                    // Efecto visual para que se note que se autocompletó
                    document.getElementById('sale-name').style.backgroundColor = 'rgba(0, 200, 81, 0.2)';
                    setTimeout(() => { document.getElementById('sale-name').style.backgroundColor = 'transparent'; }, 1000);
                }
            }
        });
    }
};

/* DESBLOQUEO DE AUDIO FORZADO (Políticas de navegadores) */
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

/* --- THEME --- */
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

function toggleFlip() { document.getElementById('login-flipper').classList.toggle('flipped'); }

function handleRegister() {
    const u = document.getElementById('reg-user').value;
    const p = document.getElementById('reg-pass').value;
    const n = document.getElementById('reg-name').value;
    if(u && p && n) {
        localStorage.setItem('user_' + u, p);
        localStorage.setItem('name_' + u, n); 
        document.getElementById('reg-success-overlay').classList.remove('hidden');
    } else { alert("Completa todos los campos"); }
}

function finishRegAnimation() {
     document.getElementById('reg-success-overlay').classList.add('hidden');
     document.getElementById('log-user').value = document.getElementById('reg-user').value;
     toggleFlip(); 
}

function handleLogin() {
    const u = document.getElementById('log-user').value;
    const p = document.getElementById('log-pass').value;
    const storedPass = localStorage.getItem('user_' + u);
    const storedName = localStorage.getItem('name_' + u) || u;

    const grpUser = document.getElementById('grp-log-user');
    const grpPass = document.getElementById('grp-log-pass');
    grpUser.classList.remove('shake-error'); grpPass.classList.remove('shake-error');

    if(u && p && storedPass === p) {
        state.user = storedName; 
        document.getElementById('sec-login').classList.add('hidden');
        document.getElementById('sec-intro').classList.remove('hidden');
        document.getElementById('user-display').innerText = storedName;
        const localWallet = JSON.parse(localStorage.getItem('rp_wallet'));
        if(localWallet) state.wallet = localWallet;
        updateWalletUI();
    } else {
        void grpUser.offsetWidth; void grpPass.offsetWidth;
        grpUser.classList.add('shake-error'); grpPass.classList.add('shake-error');
        if(navigator.vibrate) navigator.vibrate(200);
    }
}

function nextIntroSlide() {
    document.getElementById('sec-intro').classList.add('hidden');
    document.getElementById('sec-welcome').classList.remove('hidden');
}

/* --- NAVEGACION CERO LAG --- */
function navTo(screen) {
    // Ocultar todas las secciones
    document.querySelectorAll('section').forEach(s => s.classList.add('hidden'));
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
    
    // Mostrar la sección correcta
    if(screen === 'lobby') {
        document.getElementById('sec-lobby').classList.remove('hidden');
        updateDashboard(); updateWalletUI(); checkBalanceHealth();
    } else if (screen === 'history') {
        document.getElementById('sec-history').classList.remove('hidden');
        renderHistory();
    } else if (screen === 'sales') {
        document.getElementById('sec-sales').classList.remove('hidden');
    } else if (screen === 'help') {
        document.getElementById('sec-help').classList.remove('hidden');
    } else if (screen === 'customers') {
        document.getElementById('sec-customers').classList.remove('hidden');
        renderCustomers();
    } else if (screen === 'analytics') {
        document.getElementById('sec-analytics').classList.remove('hidden');
        renderAnalytics();
    } else if (screen === 'settings') {
        document.getElementById('sec-settings').classList.remove('hidden');
    }
    
    // REPARACIÓN DE LAG: Busca y pinta el botón exacto con data-target
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.querySelectorAll(`.nav-item[data-target="${screen}"]`).forEach(el => el.classList.add('active'));
}

/* --- LOGICA MASCOTA Y SONIDO DE ALERTA --- */
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
        
        // Ejecutar audio
        const audioAlerta = document.getElementById('urgent-audio');
        if(audioAlerta && state.audioUnlocked) {
            audioAlerta.play().catch(e => console.log("Audio pausado por el navegador"));
        }
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

function dismissMascot() {
    state.mascotDismissed = true;
    document.getElementById('mascot-container').classList.add('hidden');
}

setInterval(() => {
    if(state.mascotDismissed) {
        state.mascotDismissed = false; 
        if(!document.getElementById('sec-login').classList.contains('hidden')) return; 
        checkBalanceHealth(); 
    }
}, 10000);

/* --- TOAST: MENSAJE DE GUARDADO EN LA NUBE --- */
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

/* --- WALLET & DEPOSIT --- */
function updateWalletUI() {
    document.getElementById('wallet-cash').innerText = `L.${state.wallet.cash}`;
    document.getElementById('wallet-bank').innerText = `L.${state.wallet.bank}`;
    localStorage.setItem('rp_wallet', JSON.stringify(state.wallet));
}

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

    if(window.saveDepositToFirebase) window.saveDepositToFirebase();
    
    setTimeout(() => {
        if(animContainer) animContainer.classList.add('hidden');
        const celebScreen = document.getElementById('celebration-screen');
        if(celebScreen) celebScreen.classList.remove('hidden');
        checkBalanceHealth(); 
    }, 2500);
}

function closeCelebration() {
    const celebScreen = document.getElementById('celebration-screen');
    if(celebScreen) celebScreen.classList.add('hidden');
}

/* --- VENTAS --- */
function openSales(op) {
    state.currentOp = op;
    document.getElementById('sale-op-title').innerText = "Recargas " + op;
    document.getElementById('sale-phone').value = '';
    
    const nameInput = document.getElementById('sale-name');
    if(nameInput) {
        nameInput.value = '';
        nameInput.style.backgroundColor = 'transparent';
    }
    
    const grid = document.getElementById('packages-grid');
    grid.innerHTML = '';
    
    PRECIOS[op].forEach(p => {
        const btn = document.createElement('button');
        btn.className = 'btn-mega';
        btn.style.fontSize = '0.9rem';
        btn.style.background = 'var(--card-bg)';
        btn.style.color = 'var(--text)';
        btn.style.border = '1px solid var(--primary)';
        btn.innerHTML = `<div>${p.n}</div><div style="color:var(--primary); font-size:1.2rem;">L.${p.v}</div>`;
        btn.onclick = () => prepareSale(op, p);
        grid.appendChild(btn);
    });

    const btnCustom = document.createElement('button');
    btnCustom.className = 'btn-mega btn-custom-opt'; 
    btnCustom.style.gridColumn = "span 3";
    btnCustom.style.background = "var(--text)";
    btnCustom.style.color = "var(--bg)"; 
    btnCustom.innerHTML = "OTRO MONTO";
    btnCustom.onclick = () => showCustomModal();
    grid.appendChild(btnCustom);

    navTo('sales');
}

function showCustomModal() {
    document.getElementById('custom-amount-input').value = '';
    document.getElementById('modal-custom').classList.remove('hidden');
}

function processCustomAmount() {
    const amt = document.getElementById('custom-amount-input').value;
    if(!amt || amt <= 0) return alert("Ingresa un monto válido");
    document.getElementById('modal-custom').classList.add('hidden');
    const pkg = { n: 'Recarga Libre', b: amt, v: amt }; 
    prepareSale(state.currentOp, pkg);
}

function prepareSale(op, pkg) {
    if(state.wallet.bank < pkg.b) return alert(`Saldo insuficiente en Banco (L.${state.wallet.bank}).`);

    const phoneInput = document.getElementById('sale-phone');
    const nameInput = document.getElementById('sale-name');
    const phoneContainer = document.getElementById('phone-input-container');
    
    const phone = phoneInput.value;
    const name = nameInput && nameInput.value.trim() !== '' ? nameInput.value : 'Cliente';
    
    if(phone.length !== 8) {
        phoneContainer.classList.remove('shake-error');
        void phoneContainer.offsetWidth; 
        phoneContainer.classList.add('shake-error');
        return; 
    }
    
    const orderID = Math.floor(100000 + Math.random() * 900000); 
    const fecha = new Date();
    
    let expireTimestamp = null;
    let esSuper = false;
    
    // Extraer Días para calcular Vencimiento Exacto
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

function closeModal() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
}

function finalizeSale() {
    let history = JSON.parse(localStorage.getItem('rp_history')) || [];
    history.unshift(state.tempSale);
    localStorage.setItem('rp_history', JSON.stringify(history));
    
    state.wallet.bank -= state.tempSale.costo; 
    state.wallet.cash += parseInt(state.tempSale.monto); 
    
    updateWalletUI();
    checkBalanceHealth();

    // 1. Guardado Forzado Firebase
    if(window.saveSaleToFirebase) {
        window.saveSaleToFirebase(state.tempSale).then(() => {
            showSyncToast();
        }).catch(e => showSyncToast()); 
    } else {
        showSyncToast();
    }

    // 2. Guardado Forzado PostgreSQL (Se manda en segundo plano optimizado)
    try {
        // Usa la URL de Render si ya la tienes activa, o usa localhost si estás en la PC
        fetch('http://127.0.0.1:10000/sales/new', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                uid_user: state.user || 'Desconocido',
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
        }).catch(e => console.log("Sincronización API PostgreSQL en espera"));
    } catch(err) {}

    closeModal();
    
    const msg = `🧾 *COMPROBANTE DE PAGO*\n\nHola ${state.tempSale.customerName}, aquí está tu recarga:\n🆔 Orden: ${state.tempSale.id}\n📅 Fecha: ${state.tempSale.date}\n📱 Numero: ${state.tempSale.phone}\n📦 Pack: ${state.tempSale.prod}\n💰 Valor: L.${state.tempSale.monto}\n\nGracias por tu preferencia!`;
    const waLink = `https://wa.me/504${state.tempSale.phone}?text=${encodeURIComponent(msg)}`;
    
    const btn = document.getElementById('btn-wa-client');
    if(btn) { btn.onclick = () => window.open(waLink, '_blank'); }
    
    document.getElementById('modal-success').classList.remove('hidden');
}

/* --- DASHBOARD ANTIFALLOS --- */
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

/* --- ADMIN REPORT --- */
function sendAdminReport() {
    let rawHistory = JSON.parse(localStorage.getItem('rp_history')) || [];
    let history = rawHistory.filter(h => h && h.date);
    const today = new Date().toLocaleDateString();
    let salesToday = history.filter(h => h.date === today);
    
    if(salesToday.length === 0) return alert("No hay ventas hoy para reportar.");
    
    let totalVenta = 0, totalGanancia = 0;
    salesToday.forEach(h => {
        totalVenta += parseInt(h.monto || 0);
        totalGanancia += parseInt(h.ganancia || 0);
    });
    
    const msg = `📊 *REPORTE DE CIERRE - ${today}*\n\n👤 Usuario: ${state.user}\n🛒 Transacciones: ${salesToday.length}\n💰 Venta Total: L.${totalVenta}\n📈 Ganancia Neta: L.${totalGanancia}\n💵 Caja Actual: L.${state.wallet.cash}\n🏦 Banco Restante: L.${state.wallet.bank}`;
    window.open(`https://wa.me/50493655523?text=${encodeURIComponent(msg)}`, '_blank');
}

/* --- HISTORIAL Y FILTROS BLINDADOS --- */
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
        const safeId = h.id ? h.id.toString() : '';
        const safePhone = h.phone ? h.phone.toString() : '';
        const safeDate = h.date || '';
        const safeName = h.customerName ? h.customerName.toLowerCase() : '';

        const matchesSearch = safeId.includes(searchFilter) || safePhone.includes(searchFilter) || safeName.includes(searchFilter);
        
        let matchesDate = true;
        if(dateFilter) {
            const [y, m, d] = dateFilter.split('-');
            const localDateFilter = `${parseInt(d)}/${parseInt(m)}/${y}`;
            matchesDate = safeDate.includes(localDateFilter) || safeDate.includes(`${d}/${m}/${y}`);
        }
        let matchesMonth = true;
        if(monthFilter) {
            const [y, m] = monthFilter.split('-');
            matchesMonth = safeDate.includes(`/${parseInt(m)}/${y}`) || safeDate.includes(`/${m}/${y}`);
        }
        return matchesSearch && matchesDate && matchesMonth;
    });

    currentFilteredHistory = filtered; 

    if(filtered.length === 0) { list.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-light);">No se encontraron registros.</div>'; return; }

    filtered.forEach(h => {
        const item = document.createElement('div');
        item.className = `history-card ${h.op === 'Claro' ? 'h-claro' : 'h-tigo'}`;
        item.innerHTML = `
            <div>
                <div class="order-id">ORDEN #${h.id} - ${h.customerName || 'Cliente'}</div>
                <div style="font-weight:bold;">${h.phone}</div>
                <div style="font-size:0.8rem; color:var(--text-light);">${h.prod}</div>
                <div style="font-size:0.7rem; color:var(--text-light);">${h.date} - ${h.time}</div>
            </div>
            <div class="h-price">L.${h.monto}</div>
        `;
        list.appendChild(item);
    });
}

function exportHistoryPDF() {
    if(!currentFilteredHistory || currentFilteredHistory.length === 0) return alert("No hay órdenes en pantalla.");
    const { jsPDF } = window.jspdf; const doc = new jsPDF();
    doc.text("Reporte Rapi Recargas ULTRA", 14, 15);
    doc.setFontSize(10); doc.text(`Fecha: ${new Date().toLocaleString()}`, 14, 22);
    
    let tV = 0, tG = 0;
    const tableData = currentFilteredHistory.map(h => {
        tV += parseInt(h.monto || 0); tG += parseInt(h.ganancia || 0);
        return [h.date, `#${h.id}`, h.op, h.phone, `L.${h.monto}`, `L.${h.ganancia}`];
    });
    
    doc.autoTable({ startY: 30, head: [['Fecha', 'ID', 'Compañía', 'Número', 'Venta', 'Ganancia']], body: tableData, theme: 'grid', headStyles: { fillColor: [255, 103, 0] } });
    doc.setFontSize(12); doc.text(`Ventas: L.${tV}`, 14, doc.lastAutoTable.finalY + 15); doc.text(`Ganancia: L.${tG}`, 14, doc.lastAutoTable.finalY + 25);
    doc.save(`Reporte_RapiRecargas.pdf`);
}

/* =========================================================
   NUEVO MÓDULO CRM: VENCIMIENTOS Y UPSELL (24H LOGIC)
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
        
        // --- 1. LÓGICA DE VENCIMIENTO 24 HORAS ---
        if(client.latestSuper) {
            const timeDiff = client.latestSuper.expireTimestamp - now;
            const hoursLeft = timeDiff / (1000 * 60 * 60);
            
            const waMsg = `Hola ${client.name}, te saludo de Rapi Recargas. Tu paquete ${client.latestSuper.prod} está por terminar. ¿Deseas que te haga una nueva recarga para que no pierdas conexión? Avisame, aquí te atiendo rápido. ⚡`;
            
            if(hoursLeft <= 0) {
                statusHtml = `<div class="status-badge status-expired"><i class="fas fa-times-circle"></i> Recarga Vencida</div>`;
                statusHtml += `<button class="btn-sm btn-wa-remind" onclick="window.open('https://wa.me/504${client.phone}?text=${encodeURIComponent(waMsg)}', '_blank')"><i class="fab fa-whatsapp"></i> Avisar para Renovar</button>`;
            } else if (hoursLeft <= 24) {
                // Faltan 24h o menos: APARECE EL BOTÓN
                statusHtml = `<div class="status-badge status-warning"><i class="fas fa-exclamation-triangle"></i> Vence en ${Math.ceil(hoursLeft)}h</div>`;
                statusHtml += `<button class="btn-sm btn-wa-remind" onclick="window.open('https://wa.me/504${client.phone}?text=${encodeURIComponent(waMsg)}', '_blank')"><i class="fab fa-whatsapp"></i> Avisar para Renovar</button>`;
            } else {
                // Faltan más de 24h: SE OCULTA EL BOTÓN Y SE MUESTRA EL MENSAJE
                statusHtml = `<div class="status-badge status-active"><i class="fas fa-check-circle"></i> Activa (${Math.ceil(hoursLeft/24)} días rest)</div>`;
                statusHtml += `<div style="font-size:0.75rem; color:#888; margin-top:5px; padding-left:5px; border-left: 2px solid var(--primary);">Aquí se mostrará el botón para avisar al cliente cuando falten 24 horas o menos para vencer.</div>`;
            }
        } else {
            statusHtml = `<span style="font-size:0.8rem; color:#888;">Cliente de recargas normales (sin vencimiento).</span>`;
        }

        // --- 2. ALGORITMO DE UPSELL ---
        const oneDayPurchases = client.purchases.filter(p => p.prod.includes('1 Día'));
        if(oneDayPurchases.length >= 2) {
            upsellHtml = `
                <div class="upsell-box">
                    <strong>💡 Oportunidad de Venta:</strong><br>
                    Este cliente lleva ${oneDayPurchases.length} recargas de 1 Día seguidas.<br>
                    <i>Ofrécele la Super 3 Días (L.75). Ahorrará dinero y tú aseguras la venta.</i>
                </div>
            `;
        }

        card.innerHTML = `
            <div style="font-size:1.1rem; font-weight:bold; color:var(--primary);"><i class="fas fa-user-circle"></i> ${client.name}</div>
            <div style="font-weight:bold; margin-bottom:5px;">📱 ${client.phone}</div>
            <div>${statusHtml}</div>
            ${upsellHtml}
        `;
        list.appendChild(card);
    });
}

/* =========================================================
   NUEVO MÓDULO ALGORITMO DE INTELIGENCIA Y ESTADÍSTICAS
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
    const topProducts = Object.values(productsMap).sort((a, b) => b.count - a.count);
    const topP = topProducts[0];

    content.innerHTML = `
        <div class="analytics-card">
            <h4><i class="fas fa-chart-line"></i> Diagnóstico de tu Negocio</h4>
            <div style="margin-top:10px;">
                <p><strong>🏆 Compañía Dominante:</strong> ${bestOp}</p>
                <div class="progress-bar-wrap">
                    <div class="progress-fill tigo-fill" style="width: ${(tigoCount/history.length)*100}%">TIGO</div>
                    <div class="progress-fill claro-fill" style="width: ${(claroCount/history.length)*100}%">CLARO</div>
                </div>
            </div>
            <div style="margin-top:15px; padding-top:15px; border-top:1px solid var(--border);">
                <p><strong>🔥 Tu Producto Estrella:</strong></p>
                <h3 style="color:var(--primary);">${topP.name}</h3>
                <p style="font-size:0.8rem;">Lo has vendido ${topP.count} veces (Ingreso total: L.${topP.revenue}).</p>
            </div>
        </div>
    `;
}

/* --- PARTICLES ENGINE --- */
function initParticles() {
    const canvas = document.getElementById('particles-js');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
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
            if(this.x < 0 || this.x > width) this.vx *= -1;
            if(this.y < 0 || this.y > height) this.vy *= -1;
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
                const dx = particles[j].x - p.x; const dy = particles[j].y - p.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                if(dist < 100){
                    ctx.strokeStyle = state.theme === 'dark' ? `rgba(255,136,0,${1 - dist/100})` : `rgba(255,103,0,${0.4 - dist/1000})`;
                    ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(particles[j].x, particles[j].y); ctx.stroke();
                }
            }
        }); requestAnimationFrame(animate);
    };
    window.addEventListener('resize', resize); resize(); init(); animate();
}

/* =========================================================
   🚀 MOTOR DE OPTIMIZACIÓN EXTREMA (ANTI-LAG Y RAM)
========================================================= */
(function initOptimizer() {
    // 1. Ahorro de Batería y RAM: Congela las partículas si la app no está en pantalla
    window.isAppActive = true;
    document.addEventListener("visibilitychange", () => {
        window.isAppActive = !document.hidden;
    });

    const originalRequestAnimationFrame = window.requestAnimationFrame;
    window.requestAnimationFrame = function(callback) {
        if (!window.isAppActive) {
            // Si el usuario minimiza la app, pausamos los gráficos
            setTimeout(() => window.requestAnimationFrame(callback), 1000);
            return;
        }
        return originalRequestAnimationFrame(callback);
    };

    // 2. Anti-Lag al escribir: Optimiza los inputs de búsqueda
    setTimeout(() => {
        const inputs = document.querySelectorAll('input');
        inputs.forEach(input => {
            input.setAttribute('autocomplete', 'off');
            input.setAttribute('spellcheck', 'false');
            input.style.transform = "translateZ(0)"; // Acelera el teclado virtual
        });
    }, 1000);

    console.log("🚀 Motor de Optimización PRO activado exitosamente.");
})();
import os
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
import database

# Inicializar y crear tablas en la BD si no existen
database.crear_db()

app = FastAPI(title="API Rapi Recargas PRO", version="2.0")

# Configurar CORS (Obligatorio para que el HTML/JS pueda enviar datos sin bloqueos)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependencia para BD
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ==========================================
# MODELOS DE DATOS (PYDANTIC)
# ==========================================
class WalletUpdate(BaseModel):
    cash: float
    bank: float

class UserSync(BaseModel):
    uid: str
    name: str
    email: str
    wallet: WalletUpdate

class SaleCreate(BaseModel):
    uid_user: str
    id: str 
    op: str
    prod: str
    monto: float
    costo: float
    ganancia: float
    phone: str
    customerName: str
    date: str
    time: str
    timestamp: int
    esSuper: bool
    expireTimestamp: Optional[int] = None

# ==========================================
# RUTAS DE LA API (ENDPOINTS BACKEND)
# ==========================================
@app.post("/users/sync")
def sync_user(user: UserSync, db: Session = Depends(get_db)):
    db_user = db.query(database.UsuarioDB).filter(database.UsuarioDB.uid == user.uid).first()
    if not db_user:
        db_user = database.UsuarioDB(uid=user.uid, name=user.name, email=user.email, wallet_cash=user.wallet.cash, wallet_bank=user.wallet.bank)
        db.add(db_user)
    else:
        db_user.wallet_cash = user.wallet.cash
        db_user.wallet_bank = user.wallet.bank
    db.commit()
    return {"msg": "Usuario sincronizado"}

@app.post("/sales/new")
def save_sale(sale: SaleCreate, db: Session = Depends(get_db)):
    nueva_venta = database.VentaDB(
        user_uid=sale.uid_user, order_id=str(sale.id), operador=sale.op, producto=sale.prod, 
        monto=sale.monto, costo=sale.costo, ganancia=sale.ganancia, telefono=sale.phone, 
        customer_name=sale.customerName, fecha_str=sale.date, hora_str=sale.time, 
        timestamp=sale.timestamp, es_super=sale.esSuper, expire_timestamp=sale.expireTimestamp
    )
    db.add(nueva_venta)
    db.commit()
    return {"msg": "Venta guardada", "order_id": sale.id}

@app.get("/sales/{uid_user}")
def get_sales(uid_user: str, db: Session = Depends(get_db)):
    ventas = db.query(database.VentaDB).filter(database.VentaDB.user_uid == uid_user).order_by(database.VentaDB.timestamp.desc()).all()
    return ventas

# ==========================================
# RUTAS DEL FRONTEND (HTML, CSS, JS)
# ==========================================

# 1. Al entrar a la raíz de la web, carga el index.html
@app.get("/")
def serve_index():
    return FileResponse("index.html")

# 2. Montar carpetas estáticas para que el HTML encuentre los estilos e imágenes
if os.path.isdir("css"):
    app.mount("/css", StaticFiles(directory="css"), name="css")
if os.path.isdir("js"):
    app.mount("/js", StaticFiles(directory="js"), name="js")
if os.path.isdir("img"):
    app.mount("/img", StaticFiles(directory="img"), name="img")
if os.path.isdir("frontend"):
    app.mount("/frontend", StaticFiles(directory="frontend"), name="frontend")
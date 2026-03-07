from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, BigInteger, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Credenciales tomadas de tu archivo original para conectarse a Render
SQLALCHEMY_DATABASE_URL = "postgresql://mario_admin:GfAndxsDIdo3mBD4zgVV05n3I4WzFrus@dpg-d675lin5r7bs73ba59ig-a.oregon-postgres.render.com/rapi_db?sslmode=require"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# ==========================================
# TABLA 1: USUARIOS Y BILLETERA
# ==========================================
class UsuarioDB(Base):
    __tablename__ = "usuarios_recargas"

    uid = Column(String, primary_key=True, index=True) # El ID de Google/Firebase
    name = Column(String)
    email = Column(String)
    wallet_cash = Column(Float, default=0.0) # Dinero en efectivo (caja)
    wallet_bank = Column(Float, default=0.0) # Saldo disponible para vender

# ==========================================
# TABLA 2: HISTORIAL DE VENTAS Y CRM
# ==========================================
class VentaDB(Base):
    __tablename__ = "ventas_recargas"

    id = Column(Integer, primary_key=True, index=True)
    user_uid = Column(String, ForeignKey("usuarios_recargas.uid")) # Relación con el usuario
    order_id = Column(String, index=True)
    operador = Column(String) # Tigo o Claro
    producto = Column(String)
    monto = Column(Float)
    costo = Column(Float)
    ganancia = Column(Float)
    telefono = Column(String)
    customer_name = Column(String)
    
    # Tiempos
    fecha_str = Column(String)
    hora_str = Column(String)
    timestamp = Column(BigInteger, index=True) # Para ordenar cronológicamente
    
    # Lógica de CRM (Vencimientos)
    es_super = Column(Boolean, default=False)
    expire_timestamp = Column(BigInteger, nullable=True)

def crear_db():
    # Esta función crea las tablas si no existen en Postgres
    Base.metadata.create_all(bind=engine)
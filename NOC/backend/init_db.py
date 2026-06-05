from database import Base, SessionLocal, engine
from modules.auth import models as auth_models
from modules.mensajeria import models as mensajeria_models
from modules.portal.dashboard import models as dashboard_models
from modules.portal.ingresos import models as ingresos_models
from modules.portal.presupuesto import models as presupuesto_models
from security import get_password_hash

def init_db():
    print("Creando tablas en la base de datos (si no existen)...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    user = db.query(auth_models.User).filter(auth_models.User.username == "QA").first()
    
    if not user:
        print("Creando usuario administrador de control (QA)...")
        admin_user = auth_models.User(
            username="QA",
            email="QA@yopmail.com",
            full_name="QA Admin",
            hashed_password=get_password_hash("QA"), 
            is_active=True,
            role="admin",
            is_online=False,
            permissions="roles,dashboard,ingresos,presupuesto,mensajeria"
        )
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        print(f"Usuario administrador creado: {admin_user.username} ({admin_user.email})")
    else:
        print("El usuario administrador 'QA' ya existe.")
    
    db.close()

if __name__ == "__main__":
    init_db()
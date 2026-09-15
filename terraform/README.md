# ☁️ Aprovisionamiento de Azure Service Bus con Terraform (NOC Scheduler)

Este módulo de Terraform aprovisiona la infraestructura necesaria en **Microsoft Azure** para el agendamiento y ejecución automática de noticias sin polling (Event-Driven / Scheduled Messages).

---

## 📦 Recursos que aprovisiona:

1. **`azurerm_servicebus_namespace`**: Espacio de nombres de Service Bus (SKU Básico o Estándar).
2. **`azurerm_servicebus_queue`**: Cola `noc-news-schedules` con configuración de TTL (14 días), Dead Lettering y retención de mensajes programados.
3. **`azurerm_servicebus_namespace_authorization_rule`**: Llave de acceso `NocBackendAccessKey` con permisos `Send` y `Listen` para conectar el backend de forma segura.

---

## 🚀 Pasos de Ejecución:

### 1. Iniciar sesión en Azure CLI:
```bash
az login
az account set --subscription "TU_SUBSCRIPTION_ID_O_NAME"
```

### 2. Configurar variables:
Copia el archivo de ejemplo y ajusta los valores (nombre del Resource Group y Región):
```bash
cp terraform.tfvars.example terraform.tfvars
```

### 3. Inicializar y aplicar Terraform:
```bash
cd terraform
terraform init
terraform plan
terraform apply
```

### 4. Obtener las variables de entorno para el Backend:
Para ver el snippet listo para pegar en `backend/.env`:
```bash
terraform output -raw env_configuration_snippet
```

O para obtener únicamente la cadena de conexión:
```bash
terraform output -raw servicebus_primary_connection_string
```

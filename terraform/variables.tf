variable "create_resource_group" {
  type        = bool
  description = "Crear nuevo Resource Group (true) o usar existente (false)."
  default     = false
}

variable "resource_group_name" {
  type        = string
  description = "Nombre del Resource Group en Azure."
  default     = "voc-project"
}

variable "location" {
  type        = string
  description = "Región de Azure."
  default     = "eastus"
}

variable "static_web_app_location" {
  type        = string
  description = "Región para Azure Static Web App (ej. eastus2, centralus, westus2)."
  default     = "eastus2"
}

variable "environment" {
  type        = string
  description = "Entorno de despliegue."
  default     = "test"
}

# --- Database Variables ---
variable "sql_admin_username" {
  type        = string
  description = "Usuario admin de SQL Server."
  default     = "vocadmin"
}

variable "sql_admin_password" {
  type        = string
  description = "Contraseña de SQL Server."
  sensitive   = true
  default     = "VocTestP@ssw0rd2026!"
}

variable "sql_database_name" {
  type        = string
  description = "Nombre de la base de datos para pruebas."
  default     = "voc_db_test"
}

variable "sql_sku" {
  type        = string
  description = "SKU de Azure SQL Database para pruebas (Basic = económico)."
  default     = "Basic"
}

# --- App Service (Backend Test) ---
variable "app_service_sku" {
  type        = string
  description = "SKU del plan para Backend Test (B1 recomendado para Node.js Windows)."
  default     = "B1"
}

variable "backend_app_name" {
  type        = string
  description = "Nombre del Web App para Backend de pruebas."
  default     = "voc-backend-test"
}

variable "jwt_secret" {
  type        = string
  description = "Clave JWT para entorno de pruebas."
  sensitive   = true
  default     = "VocTestSecureJwtSecretKey2026!"
}

# --- Service Bus & Storage ---
variable "servicebus_sku" {
  type        = string
  description = "SKU de Service Bus (Basic para colas)."
  default     = "Basic"
}

variable "queue_name" {
  type        = string
  description = "Nombre de la cola de noticias."
  default     = "noc-news-schedules"
}

# --- GitHub Actions OIDC (Test) ---
variable "github_org" {
  type        = string
  description = "Organización o usuario GitHub."
  default     = "RDiaZ-2025"
}

variable "github_repo" {
  type        = string
  description = "Repositorio GitHub."
  default     = "front-conciliaciones"
}

variable "deploy_branch" {
  type        = string
  description = "Rama de GitHub para pruebas."
  default     = "test"
}

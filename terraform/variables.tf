variable "create_resource_group" {
  type        = bool
  description = "Define si Terraform debe crear un nuevo Resource Group (true) o usar uno existente (false)."
  default     = false
}

variable "resource_group_name" {
  type        = string
  description = "Nombre del Resource Group en Azure (ej: rg-voc-dev o rg-voc-prod)."
  default     = "rg-voc-dev"
}

variable "location" {
  type        = string
  description = "Región de Azure donde se desplegará el Service Bus (ej: eastus2, brazilsouth, eastus)."
  default     = "eastus2"
}

variable "environment" {
  type        = string
  description = "Entorno de despliegue (dev, qa, prod)."
  default     = "dev"
}

variable "servicebus_namespace_name" {
  type        = string
  description = "Nombre específico para el Service Bus Namespace. Si se deja vacío, se generará automáticamente."
  default     = ""
}

variable "servicebus_sku" {
  type        = string
  description = "Nivel de precios del Service Bus (Basic o Standard). Basic es ideal para colas estándar y mensajes programados."
  default     = "Basic"
}

variable "queue_name" {
  type        = string
  description = "Nombre de la cola para los agendamientos de noticias."
  default     = "noc-news-schedules"
}

variable "create_resource_group" {
  type        = bool
  description = "Define si Terraform debe crear un nuevo Resource Group (true) o usar uno existente (false)."
  default     = false
}

variable "resource_group_name" {
  type        = string
  description = "Nombre del Resource Group en Azure."
  default     = "voc-project"
}

variable "location" {
  type        = string
  description = "Región de Azure donde se desplegará el Service Bus."
  default     = "eastus"
}

variable "environment" {
  type        = string
  description = "Entorno de despliegue (dev, qa, prod)."
  default     = "prod"
}

variable "servicebus_namespace_name" {
  type        = string
  description = "Nombre específico para el Service Bus Namespace."
  default     = "sb-voc-project"
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

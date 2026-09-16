terraform {
  required_version = ">= 1.3.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.90"
    }
  }
}

provider "azurerm" {
  features {}
}

# 1. Resource Group (Se puede usar uno existente o crear uno nuevo según la variable)
resource "azurerm_resource_group" "rg" {
  count    = var.create_resource_group ? 1 : 0
  name     = var.resource_group_name
  location = var.location

  tags = {
    Environment = var.environment
    Project     = "VOC-NOC"
    ManagedBy   = "Terraform"
  }
}

locals {
  rg_name     = var.create_resource_group ? azurerm_resource_group.rg[0].name : var.resource_group_name
  rg_location = var.create_resource_group ? azurerm_resource_group.rg[0].location : var.location
}

# 2. Azure Service Bus Namespace
resource "azurerm_servicebus_namespace" "sb_namespace" {
  name                = var.servicebus_namespace_name != "" ? var.servicebus_namespace_name : "sb-voc-${var.environment}-${var.location}"
  location            = local.rg_location
  resource_group_name = local.rg_name
  sku                 = var.servicebus_sku

  tags = {
    Environment = var.environment
    Project     = "VOC-NOC"
    Service     = "News-Scheduler"
  }
}

# 3. Service Bus Queue para los agendamientos de noticias
resource "azurerm_servicebus_queue" "news_schedule_queue" {
  name         = var.queue_name
  namespace_id = azurerm_servicebus_namespace.sb_namespace.id

  # Configuración recomendada para mensajes programados y confiabilidad
  enable_partitioning                   = false
  max_delivery_count                    = 10
  default_message_ttl                   = "P14D" # 14 días
  dead_lettering_on_message_expiration = true
}

# 4. Directiva de Acceso Compartido para la aplicación Backend
resource "azurerm_servicebus_namespace_authorization_rule" "app_rule" {
  name         = "NocBackendAccessKey"
  namespace_id = azurerm_servicebus_namespace.sb_namespace.id

  listen = true
  send   = true
  manage = false
}

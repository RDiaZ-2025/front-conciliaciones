# Generador de sufijo aleatorio para nombres únicos
resource "random_string" "suffix" {
  length  = 5
  special = false
  upper   = false
}

# 1. Resource Group
resource "azurerm_resource_group" "rg" {
  count    = var.create_resource_group ? 1 : 0
  name     = var.resource_group_name
  location = var.location

  tags = {
    Environment = var.environment
    Project     = "VOC"
    ManagedBy   = "Terraform"
  }
}

locals {
  rg_name     = var.create_resource_group ? azurerm_resource_group.rg[0].name : var.resource_group_name
  rg_location = var.create_resource_group ? azurerm_resource_group.rg[0].location : var.location

  tags = {
    Environment = var.environment
    Project     = "VOC"
    ManagedBy   = "Terraform"
  }
}

# 2. Log Analytics Workspace para Test
resource "azurerm_log_analytics_workspace" "logs_test" {
  name                = "voc-log-workspace-test-${random_string.suffix.result}"
  location            = local.rg_location
  resource_group_name = local.rg_name
  sku                 = "PerGB2018"
  retention_in_days   = 30

  tags = local.tags
}

# 3. Application Insights para Backend Test
resource "azurerm_application_insights" "app_insights_test" {
  name                = "voc-backend-test-${random_string.suffix.result}"
  location            = local.rg_location
  resource_group_name = local.rg_name
  workspace_id        = azurerm_log_analytics_workspace.logs_test.id
  application_type    = "Node.JS"

  tags = local.tags
}

# 1. Plan de App Service para Backend Test (Windows con soporte iisnode de backend/web.config)
resource "azurerm_service_plan" "asp_test" {
  name                = "voc-backend-test-plan"
  location            = local.rg_location
  resource_group_name = local.rg_name
  os_type             = "Windows"
  sku_name            = var.app_service_sku

  tags = local.tags
}

# 2. App Service - Entorno de Test (voc-backend-test)
resource "azurerm_windows_web_app" "backend_test" {
  name                = var.backend_app_name
  location            = local.rg_location
  resource_group_name = local.rg_name
  service_plan_id     = azurerm_service_plan.asp_test.id

  site_config {
    always_on = var.app_service_sku == "F1" ? false : true
    application_stack {
      current_stack = "node"
      node_version  = "~20"
    }
  }

  app_settings = {
    "NODE_ENV"                              = "test"
    "WEBSITE_NODE_DEFAULT_VERSION"         = "~20"
    "SCM_DO_BUILD_DURING_DEPLOYMENT"        = "false"
    "PORT"                                  = "22741"
    "DB_SERVER"                             = azurerm_mssql_server.sql_server_test.fully_qualified_domain_name
    "DB_PORT"                               = "1433"
    "DB_USER"                               = var.sql_admin_username
    "DB_PASSWORD"                           = var.sql_admin_password
    "DB_DATABASE"                           = azurerm_mssql_database.voc_db_test.name
    "DB_ENCRYPT"                            = "true"
    "DB_TRUST_SERVER_CERTIFICATE"           = "false"
    "JWT_SECRET"                            = var.jwt_secret
    "JWT_EXPIRES_IN"                        = "24h"
    "JWT_REFRESH_EXPIRES_IN"                = "7d"
    "AZURE_STORAGE_ACCOUNT_NAME"            = azurerm_storage_account.storage_test.name
    "AZURE_STORAGE_ACCOUNT_KEY"             = azurerm_storage_account.storage_test.primary_access_key
    "AZURE_STORAGE_CONTAINER_NAME"          = "private"
    "AZURE_SERVICE_BUS_CONNECTION_STRING"   = azurerm_servicebus_namespace_authorization_rule.app_rule_test.primary_connection_string
    "AZURE_SERVICE_BUS_QUEUE_NAME"          = azurerm_servicebus_queue.news_queue_test.name
    "APPLICATIONINSIGHTS_CONNECTION_STRING" = azurerm_application_insights.app_insights_test.connection_string
    "LOG_LEVEL"                             = "debug"
  }

  tags = local.tags
}

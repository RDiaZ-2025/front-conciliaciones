# 1. Azure SQL Server para Test
resource "azurerm_mssql_server" "sql_server_test" {
  name                         = "voc-sql-test-${random_string.suffix.result}"
  resource_group_name          = local.rg_name
  location                     = local.rg_location
  version                      = "12.0"
  administrator_login          = var.sql_admin_username
  administrator_login_password = var.sql_admin_password
  minimum_tls_version          = "1.2"

  tags = local.tags
}

# 2. Regla de Firewall: Permite que el App Service de Test se conecte a la base de datos
resource "azurerm_mssql_firewall_rule" "allow_azure_services" {
  name             = "AllowAzureServices"
  server_id        = azurerm_mssql_server.sql_server_test.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}

# 3. Base de Datos SQL para Test
resource "azurerm_mssql_database" "voc_db_test" {
  name        = var.sql_database_name
  server_id   = azurerm_mssql_server.sql_server_test.id
  collation   = "SQL_Latin1_General_CP1_CI_AS"
  sku_name    = var.sql_sku
  max_size_gb = 2

  tags = local.tags
}

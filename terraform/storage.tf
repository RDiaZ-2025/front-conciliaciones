# 1. Storage Account para entorno de Test
resource "azurerm_storage_account" "storage_test" {
  name                     = "vocstoretest${random_string.suffix.result}"
  resource_group_name      = local.rg_name
  location                 = local.rg_location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  min_tls_version          = "TLS1_2"

  tags = local.tags
}

# 2. Contenedores de Blobs para Test
resource "azurerm_storage_container" "public_container" {
  name                  = "public"
  storage_account_name  = azurerm_storage_account.storage_test.name
  container_access_type = "blob"
}

resource "azurerm_storage_container" "private_container" {
  name                  = "private"
  storage_account_name  = azurerm_storage_account.storage_test.name
  container_access_type = "private"
}

# 3. File Share para Test
resource "azurerm_storage_share" "file_share" {
  name                 = "conciliaciones-test-share"
  storage_account_name = azurerm_storage_account.storage_test.name
  quota                = 20
}

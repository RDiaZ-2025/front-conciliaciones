# 1. Service Bus Namespace para Test
resource "azurerm_servicebus_namespace" "sb_namespace_test" {
  name                = "sb-voc-test-${random_string.suffix.result}"
  location            = local.rg_location
  resource_group_name = local.rg_name
  sku                 = var.servicebus_sku

  tags = local.tags
}

# 2. Cola para noticias programadas en Test
resource "azurerm_servicebus_queue" "news_queue_test" {
  name         = var.queue_name
  namespace_id = azurerm_servicebus_namespace.sb_namespace_test.id

  partitioning_enabled                  = false
  max_delivery_count                    = 10
  default_message_ttl                   = "P14D"
  dead_lettering_on_message_expiration = true
}

# 3. Directiva de Acceso Compartido para Backend Test
resource "azurerm_servicebus_namespace_authorization_rule" "app_rule_test" {
  name         = "VocBackendAccessKey"
  namespace_id = azurerm_servicebus_namespace.sb_namespace_test.id

  listen = true
  send   = true
  manage = false
}

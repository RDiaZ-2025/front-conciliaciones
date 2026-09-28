# Static Web App para Frontend del entorno de Test
resource "azurerm_static_web_app" "frontend_test" {
  name                = "voc-frontend-test"
  resource_group_name = local.rg_name
  location            = var.static_web_app_location
  sku_tier            = "Free"
  sku_size            = "Free"

  tags = local.tags
}

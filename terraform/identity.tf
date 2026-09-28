# 1. Managed Identity para despliegues de GitHub Actions en el entorno de Test
resource "azurerm_user_assigned_identity" "github_deployer_test" {
  name                = "voc-github-actions-test-msi"
  location            = local.rg_location
  resource_group_name = local.rg_name

  tags = local.tags
}

# 2. Credencial federada OIDC exclusiva para la rama 'test'
resource "azurerm_federated_identity_credential" "github_test_branch" {
  name                = "gh-deploy-test"
  resource_group_name = local.rg_name
  parent_id           = azurerm_user_assigned_identity.github_deployer_test.id
  audience            = ["api://AzureADTokenExchange"]
  issuer              = "https://token.actions.githubusercontent.com"
  subject             = "repo:${var.github_org}/${var.github_repo}:ref:refs/heads/${var.deploy_branch}"
}

# 3. Permisos de despliegue sobre el Resource Group para el Web App de Test
resource "azurerm_role_assignment" "deployer_web_contributor_test" {
  scope                = "/subscriptions/${data.azurerm_client_config.current.subscription_id}/resourceGroups/${local.rg_name}"
  role_definition_name = "Website Contributor"
  principal_id         = azurerm_user_assigned_identity.github_deployer_test.principal_id
}

data "azurerm_client_config" "current" {}

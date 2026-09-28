output "azure_static_web_apps_api_token_test" {
  description = "Token para GitHub Secret AZURE_STATIC_WEB_APPS_API_TOKEN_TEST"
  value       = azurerm_static_web_app.frontend_test.api_key
  sensitive   = true
}

output "azureappservice_clientid_test" {
  description = "Client ID para GitHub Secret AZUREAPPSERVICE_CLIENTID_TEST"
  value       = azurerm_user_assigned_identity.github_deployer_test.client_id
}

output "azureappservice_tenantid_test" {
  description = "Tenant ID para GitHub Secret AZUREAPPSERVICE_TENANTID_TEST"
  value       = azurerm_user_assigned_identity.github_deployer_test.tenant_id
}

output "azureappservice_subscriptionid_test" {
  description = "Subscription ID para GitHub Secret AZUREAPPSERVICE_SUBSCRIPTIONID_TEST"
  value       = data.azurerm_client_config.current.subscription_id
}

output "azureappservice_appname_test" {
  description = "Nombre del Web App de Test"
  value       = azurerm_windows_web_app.backend_test.name
}

output "backend_test_url" {
  description = "URL pública del Backend de Test"
  value       = "https://${azurerm_windows_web_app.backend_test.default_hostname}"
}

output "frontend_test_url" {
  description = "URL pública del Frontend de Test"
  value       = "https://${azurerm_static_web_app.frontend_test.default_host_name}"
}

output "sql_server_test_fqdn" {
  description = "Servidor SQL para pruebas (DB_SERVER)"
  value       = azurerm_mssql_server.sql_server_test.fully_qualified_domain_name
}

output "github_secrets_to_copy" {
  description = "Secretos de GitHub listos para configurar en el repositorio"
  value       = <<EOT
=== SECRETOS PARA GITHUB ACTIONS (TEST) ===
AZURE_STATIC_WEB_APPS_API_TOKEN_TEST = (ejecute: terraform output -raw azure_static_web_apps_api_token_test)
AZUREAPPSERVICE_CLIENTID_TEST        = ${azurerm_user_assigned_identity.github_deployer_test.client_id}
AZUREAPPSERVICE_TENANTID_TEST        = ${azurerm_user_assigned_identity.github_deployer_test.tenant_id}
AZUREAPPSERVICE_SUBSCRIPTIONID_TEST  = ${data.azurerm_client_config.current.subscription_id}
AZUREAPPSERVICE_APPNAME_TEST         = ${azurerm_windows_web_app.backend_test.name}
EOT
}

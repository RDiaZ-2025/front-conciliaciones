output "servicebus_namespace_name" {
  description = "Nombre del Service Bus Namespace creado en Azure."
  value       = azurerm_servicebus_namespace.sb_namespace.name
}

output "servicebus_queue_name" {
  description = "Nombre de la cola de Service Bus."
  value       = azurerm_servicebus_queue.news_schedule_queue.name
}

output "servicebus_primary_connection_string" {
  description = "Cadena de conexión principal para configurar en el backend (.env)."
  value       = azurerm_servicebus_namespace_authorization_rule.app_rule.primary_connection_string
  sensitive   = true
}

output "env_configuration_snippet" {
  description = "Líneas de configuración para copiar directamente en backend/.env"
  value       = <<EOT
AZURE_SERVICE_BUS_CONNECTION_STRING="${azurerm_servicebus_namespace_authorization_rule.app_rule.primary_connection_string}"
AZURE_SERVICE_BUS_QUEUE_NAME="${azurerm_servicebus_queue.news_schedule_queue.name}"
EOT
  sensitive   = true
}

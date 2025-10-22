# Azure Deployment Script

This directory contains scripts and configuration files for deploying your VOC backend to Azure App Service.

## Quick Start

1. **Prerequisites**
   - Install [Azure CLI](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli)
   - Ensure you have Node.js 20+ installed
   - Have an Azure subscription

2. **Simple Deployment**
   ```powershell
   .\deploy-to-azure.ps1
   ```

3. **Deployment with Parameters**
   ```powershell
   .\deploy-to-azure.ps1 -ResourceGroup "my-rg" -AppName "my-app" -SubscriptionId "sub-id"
   ```

## Script Parameters

| Parameter | Description | Required | Default |
|-----------|-------------|----------|---------|
| `ResourceGroup` | Azure Resource Group name | No | Prompted |
| `AppName` | Azure App Service name | No | Prompted |
| `SubscriptionId` | Azure Subscription ID | No | Auto-detected |
| `SkipBuild` | Skip the build step | No | false |
| `SkipDependencies` | Skip dependency installation | No | false |

## Configuration Files

### azure-deployment-config.json
This file is automatically created after your first deployment and stores your deployment settings for future use.

### azure-deployment-config.template.json
Template file showing all available configuration options. Copy this to `azure-deployment-config.json` and customize as needed.

## What the Script Does

1. **Validates Prerequisites**
   - Checks Azure CLI installation
   - Verifies Azure login status
   - Validates Azure resources

2. **Builds Application**
   - Installs dependencies (`npm ci`)
   - Builds the backend (`npm run build`)

3. **Prepares Deployment**
   - Creates deployment package
   - Copies necessary files (dist, package.json, .env, node_modules)
   - Creates deployment ZIP

4. **Deploys to Azure**
   - Configures App Service settings
   - Uploads and deploys the application
   - Verifies deployment

5. **Cleanup**
   - Removes temporary files
   - Saves configuration for future deployments

## Environment Variables

The script will automatically configure these App Service settings:

- `NODE_ENV=production`
- `WEBSITE_NODE_DEFAULT_VERSION=20.x`
- `SCM_DO_BUILD_DURING_DEPLOYMENT=false`

You'll need to manually configure:
- Database connection strings
- JWT secrets
- CORS settings
- Any other environment-specific variables

## Troubleshooting

### Common Issues

1. **Azure CLI not found**
   - Install Azure CLI from the official Microsoft documentation

2. **Not logged in to Azure**
   - Run `az login` manually or let the script handle it

3. **Resource Group doesn't exist**
   - The script will offer to create it for you

4. **App Service doesn't exist**
   - The script will offer to create it for you

5. **Build failures**
   - Ensure all dependencies are properly installed
   - Check for TypeScript compilation errors

### Getting Logs

View real-time logs from your deployed application:
```bash
az webapp log tail --resource-group "your-rg" --name "your-app"
```

Download logs for offline analysis:
```bash
az webapp log download --resource-group "your-rg" --name "your-app"
```

### Manual Configuration

After deployment, you may need to configure:

1. **Database Connection**
   ```bash
   az webapp config connection-string set \
     --resource-group "your-rg" \
     --name "your-app" \
     --connection-string-type SQLServer \
     --settings DefaultConnection="your-connection-string"
   ```

2. **Environment Variables**
   ```bash
   az webapp config appsettings set \
     --resource-group "your-rg" \
     --name "your-app" \
     --settings JWT_SECRET="your-secret"
   ```

3. **CORS Settings**
   ```bash
   az webapp cors add \
     --resource-group "your-rg" \
     --name "your-app" \
     --allowed-origins "https://your-frontend.com"
   ```

## Security Notes

- Never commit sensitive information like passwords or secrets to version control
- Use Azure Key Vault for sensitive configuration
- Configure proper CORS settings for your frontend domain
- Enable HTTPS only in production

## Support

For issues with the deployment script, check:
1. Azure CLI documentation
2. Azure App Service documentation
3. The deployment logs in Azure portal
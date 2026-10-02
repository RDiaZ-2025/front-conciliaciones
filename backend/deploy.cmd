@if "%SCM_TRACE_LEVEL%" NEQ "4" @echo off

:: ----------------------------------------------------------------------
:: VOC Backend Custom Deployment Script
:: Implements Differential KuduSync to avoid slow node_modules transfers
:: ----------------------------------------------------------------------

IF NOT DEFINED KUDU_SYNC_CMD (
  IF EXIST "%appdata%\npm\node_modules\kuduSync\bin\kuduSync" (
    SET KUDU_SYNC_CMD=node "%appdata%\npm\node_modules\kuduSync\bin\kuduSync"
  ) ELSE (
    SET KUDU_SYNC_CMD=kuduSync
  )
)

IF NOT DEFINED DEPLOYMENT_SOURCE (
  SET DEPLOYMENT_SOURCE=%~dp0.
)

IF NOT DEFINED DEPLOYMENT_TARGET (
  SET DEPLOYMENT_TARGET=%~dp0..\wwwroot
)

IF NOT DEFINED NEXT_MANIFEST_PATH (
  SET NEXT_MANIFEST_PATH=%DEPLOYMENT_TARGET%\..\manifest
)

IF NOT DEFINED PREVIOUS_MANIFEST_PATH (
  SET PREVIOUS_MANIFEST_PATH=%DEPLOYMENT_TARGET%\..\manifest
)

:: 1. If source package contains node_modules, sync everything including node_modules
IF EXIST "%DEPLOYMENT_SOURCE%\node_modules" (
  echo [VOC Deploy] Full package with node_modules detected. Synchronizing updated dependencies...
  call %KUDU_SYNC_CMD% -v 50 -f "%DEPLOYMENT_SOURCE%" -t "%DEPLOYMENT_TARGET%" -n "%NEXT_MANIFEST_PATH%" -p "%PREVIOUS_MANIFEST_PATH%" -i ".git;.hg;.deployment;deploy.cmd"
  IF %ERRORLEVEL% NEQ 0 (
    echo [VOC Deploy] KuduSync failed with error code %ERRORLEVEL%.
    exit /b %ERRORLEVEL%
  )
  goto finish
)

:: 2. If source package does NOT contain node_modules, preserve existing server node_modules
echo [VOC Deploy] Code-only package detected. Preserving existing server node_modules...
call %KUDU_SYNC_CMD% -v 50 -f "%DEPLOYMENT_SOURCE%" -t "%DEPLOYMENT_TARGET%" -n "%NEXT_MANIFEST_PATH%" -p "%PREVIOUS_MANIFEST_PATH%" -i ".git;.hg;.deployment;deploy.cmd;node_modules"
IF %ERRORLEVEL% NEQ 0 (
  echo [VOC Deploy] KuduSync failed with error code %ERRORLEVEL%.
  exit /b %ERRORLEVEL%
)

:: 3. Safety fallback: if target somehow has no node_modules, install them on target
IF NOT EXIST "%DEPLOYMENT_TARGET%\node_modules" (
  echo [VOC Deploy] WARNING: node_modules not found in %DEPLOYMENT_TARGET%. Running fallback npm install...
  pushd "%DEPLOYMENT_TARGET%"
  call npm install --omit=dev --no-audit --no-fund
  popd
)

:finish
echo [VOC Deploy] Deployment finished successfully.

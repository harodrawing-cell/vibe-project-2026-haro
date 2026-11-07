param([string]$ToolsPath = (Join-Path $env:TEMP 'haro-security-tools-20261108'))
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot
Set-Location -LiteralPath $projectRoot
$cli = Join-Path $ToolsPath 'node_modules/firebase-tools/lib/bin/firebase.js'
if (-not (Test-Path -LiteralPath $cli)) { throw 'Install the isolated QA dependencies described in document/QNA_SECURITY_FIX.md first.' }
$javaExecutable = Get-ChildItem (Join-Path $ToolsPath 'java') -Filter java.exe -Recurse | Select-Object -First 1 -ExpandProperty FullName
if (-not $javaExecutable) { throw 'A temporary Java runtime is required.' }
$env:HARO_RULES_MODULES = $ToolsPath
$env:NODE_USE_SYSTEM_CA = '1'
$env:FIREBASE_EMULATORS_PATH = Join-Path $ToolsPath 'emulators'
$env:XDG_CONFIG_HOME = Join-Path $ToolsPath 'config'
$env:CI = 'true'
$env:NO_UPDATE_NOTIFIER = '1'
$env:PATH = (Split-Path $javaExecutable) + ';' + $env:PATH
New-Item -ItemType Directory -Path 'test-results/security' -Force | Out-Null
$testCommand = 'node --test --test-concurrency=1 tests/notice-rules.test.cjs tests/qna-rules.test.cjs tests/qna-security.test.cjs tests/account-emulator.test.cjs'
$ErrorActionPreference = 'Continue'
& node $cli emulators:exec --only firestore,auth --project demo-haro-security --config firebase.security-emulator.json $testCommand 2>&1 | Tee-Object -FilePath 'test-results/security/emulator-tests.log'
exit $LASTEXITCODE

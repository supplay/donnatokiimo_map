param([string]$AppId = "d3nlv05moq0vc5", [string]$Branch = "dev", [string]$Region = "ap-northeast-1")

$root = "c:\Users\suppl\Desktop\donnatokiimo_map"
$distPath = "$root\dist"
$zipPath = "$root\deploy_fs.zip"

Add-Type -AssemblyName System.IO.Compression.FileSystem

if (Test-Path $zipPath) { Remove-Item $zipPath }

$zip = [System.IO.Compression.ZipFile]::Open($zipPath, [System.IO.Compression.ZipArchiveMode]::Create)
Get-ChildItem -Path $distPath -Recurse -File | ForEach-Object {
    $entryName = $_.FullName.Substring("$distPath\".Length).Replace('\', '/')
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $entryName) | Out-Null
}
$zip.Dispose()
Write-Host "zip created: $zipPath"

$r = aws amplify create-deployment --app-id $AppId --branch-name $Branch --region $Region | ConvertFrom-Json
Write-Host "jobId: $($r.jobId)"

Invoke-WebRequest -Uri $r.zipUploadUrl -Method PUT -InFile $zipPath -ContentType "application/zip" -UseBasicParsing | Out-Null
Write-Host "uploaded"

aws amplify start-deployment --app-id $AppId --branch-name $Branch --job-id $r.jobId --region $Region

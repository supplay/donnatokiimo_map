param([string]$AppId = "d3nlv05moq0vc5", [string]$Branch = "dev", [string]$Region = "ap-northeast-1")

$root = "c:\Users\suppl\Desktop\donnatokiimo_map"
$distPath = "$root\dist"
$zipPath = "$root\deploy_fs.zip"

# Python を使って / 区切りの正しい zip を作成する
# (PowerShell の Compress-Archive は \ 区切りになり Amplify の Linux サーバーが
#  assets/ サブディレクトリを認識できず 404 になるため)
if (Test-Path $zipPath) { Remove-Item $zipPath }
python -c @"
import zipfile, os
dist = r'$distPath'
out  = r'$zipPath'
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk(dist):
        for file in files:
            abspath = os.path.join(root, file)
            relpath = os.path.relpath(abspath, dist).replace(os.sep, '/')
            zf.write(abspath, relpath)
"@
Write-Host "zip created: $zipPath ($([Math]::Round((Get-Item $zipPath).Length/1KB)) KB)"

$r = aws amplify create-deployment --app-id $AppId --branch-name $Branch --region $Region | ConvertFrom-Json
Write-Host "jobId: $($r.jobId)"

Invoke-WebRequest -Uri $r.zipUploadUrl -Method PUT -InFile $zipPath -ContentType "application/zip" -UseBasicParsing | Out-Null
Write-Host "uploaded"

aws amplify start-deployment --app-id $AppId --branch-name $Branch --job-id $r.jobId --region $Region

param(
    [string]$OutputPath = (Join-Path $env:TEMP "deckd-blender-smoke.glb")
)

$ErrorActionPreference = "Stop"

$blenderCommand = Get-Command blender -ErrorAction SilentlyContinue
$blenderPath = if ($blenderCommand) {
    $blenderCommand.Source
} else {
    Get-ChildItem -LiteralPath (Join-Path $env:ProgramFiles "Blender Foundation") -Directory -ErrorAction SilentlyContinue |
        Sort-Object Name -Descending |
        ForEach-Object { Join-Path $_.FullName "blender.exe" } |
        Where-Object { Test-Path -LiteralPath $_ } |
        Select-Object -First 1
}

if (-not $blenderPath) {
    throw "Blender was not found on PATH or under Program Files."
}

$exportScript = Join-Path $PSScriptRoot "export-smoke.py"
& $blenderPath --background --factory-startup --python $exportScript -- --output $OutputPath
if ($LASTEXITCODE -ne 0) {
    throw "Blender export failed with exit code $LASTEXITCODE."
}

$resolvedOutput = (Resolve-Path -LiteralPath $OutputPath).Path
$bytes = [System.IO.File]::ReadAllBytes($resolvedOutput)
if ($bytes.Length -lt 12) {
    throw "Exported file is too small to be a GLB."
}

$magic = [System.Text.Encoding]::ASCII.GetString($bytes, 0, 4)
$version = [System.BitConverter]::ToUInt32($bytes, 4)
$declaredLength = [System.BitConverter]::ToUInt32($bytes, 8)
if ($magic -ne "glTF" -or $version -ne 2 -or $declaredLength -ne $bytes.Length) {
    throw "Invalid GLB header: magic=$magic version=$version declared=$declaredLength actual=$($bytes.Length)."
}

$jsonChunkLength = [System.BitConverter]::ToUInt32($bytes, 12)
$jsonChunkType = [System.Text.Encoding]::ASCII.GetString($bytes, 16, 4)
if ($jsonChunkType -ne "JSON" -or (20 + $jsonChunkLength) -gt $bytes.Length) {
    throw "The first GLB chunk is not valid JSON metadata."
}
$jsonText = [System.Text.Encoding]::UTF8.GetString($bytes, 20, $jsonChunkLength).TrimEnd("`0", " ")
$manifest = $jsonText | ConvertFrom-Json
if (-not $manifest.meshes -or -not $manifest.materials -or -not $manifest.animations) {
    throw "GLB is missing the expected mesh, PBR material, or animation."
}

Write-Output "Blender: $blenderPath"
Write-Output "GLB: $resolvedOutput"
Write-Output "GLB header: magic=$magic version=$version bytes=$($bytes.Length)"
Write-Output "GLB content: meshes=$($manifest.meshes.Count) materials=$($manifest.materials.Count) animations=$($manifest.animations.Count)"

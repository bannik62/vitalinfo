# Script PowerShell pour extraire toutes les images depuis honeycapture vers honeyimage
# Double-cliquez sur ce fichier pour l'exécuter

$ErrorActionPreference = "Continue"

$source = "C:\Users\Yo\Downloads\honeycapture"
$dest = "C:\Users\Yo\Downloads\honeyimage"

# Extensions d'images supportées
$imageExtensions = @("*.png", "*.jpg", "*.jpeg", "*.gif", "*.bmp", "*.webp")

Write-Host "📸 Extraction des images depuis honeycapture vers honeyimage..." -ForegroundColor Cyan
Write-Host ""

# Vérifier que le dossier source existe
if (-not (Test-Path $source)) {
    Write-Host "❌ Le dossier source n'existe pas: $source" -ForegroundColor Red
    Read-Host "Appuyez sur Entrée pour quitter"
    exit 1
}

# Créer le dossier de destination s'il n'existe pas
if (-not (Test-Path $dest)) {
    New-Item -ItemType Directory -Path $dest -Force | Out-Null
    Write-Host "✅ Dossier créé: $dest" -ForegroundColor Green
}

Write-Host "🔍 Recherche des images dans: $source" -ForegroundColor Yellow
Write-Host "📁 Destination: $dest" -ForegroundColor Yellow
Write-Host "🔄 Copie uniquement des images qui n'existent pas encore..." -ForegroundColor Yellow
Write-Host ""

# Compter et copier les images
$copied = 0
$skipped = 0
$errors = 0

Get-ChildItem -Path $source -Include $imageExtensions -Recurse -File | ForEach-Object {
    $fileName = $_.Name
    $destFile = Join-Path $dest $fileName
    
    # Si le fichier n'existe pas déjà, le copier
    if (-not (Test-Path $destFile)) {
        try {
            Copy-Item $_.FullName -Destination $destFile -Force
            Write-Host "✅ Copié: $fileName" -ForegroundColor Green
            $copied++
        }
        catch {
            Write-Host "❌ Erreur lors de la copie de $fileName : $_" -ForegroundColor Red
            $errors++
        }
    } else {
        $skipped++
    }
}

Write-Host ""
if ($errors -eq 0) {
    Write-Host "✅ Terminé! $copied nouvelle(s) image(s) copiée(s), $skipped déjà existante(s) ignorée(s)" -ForegroundColor Green
} else {
    Write-Host "⚠️ Terminé avec des erreurs: $copied copié(s), $skipped ignorée(s), $errors erreur(s)" -ForegroundColor Yellow
}

Write-Host ""
Read-Host "Appuyez sur Entrée pour quitter"


@echo off
chcp 65001 >nul
echo 📸 Extraction des images depuis honeycapture vers honeyimage...
echo.

set "SOURCE=C:\Users\Yo\Downloads\honeycapture"
set "DEST=C:\Users\Yo\Downloads\honeyimage"

REM Créer le dossier de destination s'il n'existe pas
if not exist "%DEST%" mkdir "%DEST%"

echo 🔍 Recherche des images dans: %SOURCE%
echo 📁 Destination: %DEST%
echo 🔄 Copie uniquement des images qui n'existent pas encore...
echo.

REM Copier seulement les images qui n'existent pas déjà
setlocal enabledelayedexpansion
set "copied=0"
set "skipped=0"
for /r "%SOURCE%" %%f in (*.png *.jpg *.jpeg *.gif *.bmp *.webp) do (
    set "destFile=%DEST%\%%~nxf"
    if not exist "!destFile!" (
        copy "%%f" "!destFile!" >nul 2>&1
        if !errorlevel! equ 0 (
            set /a copied+=1
            echo ✅ Copié: %%~nxf
        )
    ) else (
        set /a skipped+=1
    )
)
echo.
echo ✅ Terminé! !copied! nouvelle(s) image(s) copiée(s), !skipped! déjà existante(s) ignorée(s)
endlocal
echo.
pause


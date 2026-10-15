@echo off
REM Aufruf: scripts\release.bat [--dry-run] [--beta] [patch/minor/major/X.Y.Z/X.Y.Z-beta.N]
REM
REM Ohne Version: schlaegt patch/minor/major vor (mit --beta: setzt eine offene Beta-Serie fort).
REM --beta:       Vorabversion; kommt aus dem Branch dev, stabile Releases aus main.
REM --dry-run:    zeigt nur, was passieren wuerde, und aendert nichts.
REM
REM Setzt die Version in package.json, tauri.conf.json, Cargo.toml und Cargo.lock,
REM committet, taggt und pusht. Der Tag startet .github/workflows/release.yml.
setlocal enabledelayedexpansion

set "BETA=0"
set "DRY_RUN=0"
set "REQUEST="

REM Ohne Sprungmarken: cmd findet Marken in Dateien mit LF-Zeilenenden nicht zuverlaessig.
for %%a in (%*) do (
  if /I "%%~a"=="--beta" (
    set "BETA=1"
  ) else if /I "%%~a"=="--dry-run" (
    set "DRY_RUN=1"
  ) else (
    if defined REQUEST (
      echo Fehler: nur eine Version angeben.
      exit /b 1
    )
    set "REQUEST=%%~a"
  )
)

cd /d "%~dp0.."

REM Kanal schon vor der Rueckfrage bekannt: der Branch wird zuerst geprueft.
if defined REQUEST (
  echo !REQUEST!| findstr /L /C:"-beta." >nul && set "BETA=1"
)
if "%BETA%"=="1" (
  set "EXPECTED_BRANCH=dev"
  set "PLAN_FLAG=--beta"
) else (
  set "EXPECTED_BRANCH=main"
  set "PLAN_FLAG="
)

for /f "delims=" %%b in ('git rev-parse --abbrev-ref HEAD') do set "BRANCH=%%b"
if not "%BRANCH%"=="%EXPECTED_BRANCH%" (
  echo Fehler: Releases dieses Kanals kommen aus '%EXPECTED_BRANCH%', aktuell ist '%BRANCH%' ausgecheckt.
  exit /b 1
)

for /f %%i in ('git status --porcelain') do (
  echo Fehler: Es gibt nicht committete Aenderungen. Erst committen oder stashen.
  git status --short
  exit /b 1
)

REM Ueber eine Datei statt for /f: so bleibt die Rueckfrage im Fenster bedienbar.
set "VERSION_FILE=%TEMP%\wettkampftools-release-version.txt"
if exist "%VERSION_FILE%" del "%VERSION_FILE%"
call node scripts\version.mjs plan %PLAN_FLAG% --out "%VERSION_FILE%" %REQUEST% || exit /b 1
set /p VERSION=<"%VERSION_FILE%"
del "%VERSION_FILE%"
set "TAG=v%VERSION%"

for /f "delims=" %%b in ('node scripts\version.mjs branch %VERSION%') do set "VERSION_BRANCH=%%b"
if not "%VERSION_BRANCH%"=="%EXPECTED_BRANCH%" (
  echo Fehler: %VERSION% passt nicht zum gewaehlten Kanal ^(--beta^).
  exit /b 1
)

REM Dieselbe Regel wie im Release-Ablauf, nur frueher: die Datei ersetzt die Notes.
call node scripts\version.mjs notes %TAG% || exit /b 1

if "%BETA%"=="1" (
  set "CHANNEL=Beta (Vorabversion, nur NSIS-Installer)"
) else (
  set "CHANNEL=stabil"
)
set "VERSION_FILES=package.json src-tauri/tauri.conf.json src-tauri/Cargo.toml src-tauri/Cargo.lock"

if "%DRY_RUN%"=="1" (
  echo Probelauf - es wird nichts geaendert.
  echo   Version: %VERSION% ^(!CHANNEL!^)
  echo   Branch:  %BRANCH%
  echo   Dateien:
  call node scripts\version.mjs apply --dry-run %VERSION% || exit /b 1
  echo   Danach: Pruefungen ^(check, test, format:check, cargo test, cargo clippy^),
  echo           Commit "chore: release %TAG%", Tag %TAG%, Push von %BRANCH% und %TAG%.
  exit /b 0
)

echo -^> Pruefungen vor dem Release ...
call npm run check || exit /b 1
call npm test || exit /b 1
call npm run format:check || exit /b 1
pushd src-tauri
cargo test || (popd & exit /b 1)
cargo clippy --all-targets -- -D warnings || (popd & exit /b 1)
popd

echo -^> Release %TAG% ^(!CHANNEL!^)
call node scripts\version.mjs apply %VERSION% || exit /b 1

git add %VERSION_FILES% || exit /b 1
git commit -m "chore: release %TAG%" || exit /b 1
git tag -a "%TAG%" -m "%TAG%" || exit /b 1
git push origin HEAD || exit /b 1
git push origin "%TAG%" || exit /b 1

echo.
echo %TAG% getaggt - der Build laeuft auf GitHub.
if "%BETA%"=="1" (
  echo   Beta: als Vorabversion veroeffentlicht. Wer "Beta-Versionen erhalten" eingeschaltet hat, bekommt sie.
)
echo   https://github.com/joe2824/wettkampftools/actions
endlocal
exit /b 0

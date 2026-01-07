@echo off
echo ==========================================
echo      RunFlow 1-Click Git Push
echo ==========================================
echo.

:: Add all changes
echo [1/3] Adding changes...
git add .
if %ERRORLEVEL% NEQ 0 (
    echo Error adding files!
    pause
    exit /b %ERRORLEVEL%
)

:: Prompt for commit message
set /p CommitMessage="Enter commit message (Press Enter for 'Update'): "
if "%CommitMessage%"=="" set CommitMessage="Update"

:: Commit
echo [2/3] Committing with message: "%CommitMessage%"...
git commit -m "%CommitMessage%"

:: Push
echo [3/3] Pushing to GitHub...
git push
if %ERRORLEVEL% NEQ 0 (
    echo Error pushing to GitHub!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ==========================================
echo         Success! All done.
echo ==========================================
pool
timeout /t 5

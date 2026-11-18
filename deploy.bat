@echo off
REM Build and deploy EZTAP to Firebase (Windows).
cd /d %~dp0
echo === 1/4 Installing packages ===
call npm install || goto :fail
echo === 2/4 Building the site ===
call npm run build || goto :fail
echo === 3/4 Logging in to Firebase (a browser window will open) ===
call npx firebase-tools login || goto :fail
echo === 4/4 Deploying site + security rules ===
call npx firebase-tools deploy || goto :fail
echo.
echo DONE. Your live link:  https://eztap-8a876.web.app
pause
exit /b 0
:fail
echo.
echo Something failed. Scroll up, check the error text above.
pause
exit /b 1

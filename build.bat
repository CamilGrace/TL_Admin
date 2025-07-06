@echo off
echo Building for deployment...

REM Define the output directory
set BUILD_DIR=dist

REM Clean up the old build directory if it exists
if exist %BUILD_DIR% (
    echo Cleaning old build...
    rmdir /s /q %BUILD_DIR%
)

REM Create a new build directory
mkdir %BUILD_DIR%

REM Copy all non-JS files (HTML, CSS, images)
echo Copying assets...
xcopy *.html %BUILD_DIR%\ /Y
xcopy css %BUILD_DIR%\css\ /E /I /Y
xcopy img %BUILD_DIR%\img\ /E /I /Y

REM Concatenate and copy JS files in the correct order
echo Concatenating JavaScript files...
copy /b config.js + js\admin_auth.js + js\admin_dashboard.js %BUILD_DIR%\app.js

REM Update the script tags in the deployed HTML files to use the single app.js file
echo Updating script tags in HTML...
powershell -Command "(Get-Content %BUILD_DIR%\admin_login.html) -replace '<script defer src=\"admin_auth.js\"></script>', '' | Set-Content %BUILD_DIR%\admin_login.html"
powershell -Command "(Get-Content %BUILD_DIR%\admin_login.html) -replace '<script defer src=\"admin_dashboard.js\"></script>', '' | Set-Content %BUILD_DIR%\admin_login.html"
powershell -Command "(Get-Content %BUILD_DIR%\admin_login.html) -replace '<script src=\"config.js\"></script>', '<script src=\"app.js\"></script>' | Set-Content %BUILD_DIR%\admin_login.html"

REM Repeat for other HTML files
powershell -Command "(Get-Content %BUILD_DIR%\admin_register.html) -replace '<script defer src=\"admin_auth.js\"></script>', '' | Set-Content %BUILD_DIR%\admin_register.html"
powershell -Command "(Get-Content %BUILD_DIR%\admin_register.html) -replace '<script defer src=\"admin_dashboard.js\"></script>', '' | Set-Content %BUILD_DIR%\admin_register.html"
powershell -Command "(Get-Content %BUILD_DIR%\admin_register.html) -replace '<script src=\"config.js\"></script>', '<script src=\"app.js\"></script>' | Set-Content %BUILD_DIR%\admin_register.html"

powershell -Command "(Get-Content %BUILD_DIR%\admin_dashboard.html) -replace '<script defer src=\"admin_auth.js\"></script>', '' | Set-Content %BUILD_DIR%\admin_dashboard.html"
powershell -Command "(Get-Content %BUILD_DIR%\admin_dashboard.html) -replace '<script defer src=\"admin_dashboard.js\"></script>', '' | Set-Content %BUILD_DIR%\admin_dashboard.html"
powershell -Command "(Get-Content %BUILD_DIR%\admin_dashboard.html) -replace '<script src=\"config.js\"></script>', '<script src=\"app.js\"></script>' | Set-Content %BUILD_DIR%\admin_dashboard.html"

echo Build complete! The 'dist' folder is ready for deployment.
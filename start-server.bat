@echo off
echo.
echo ========================================
echo  Little Treat - Local Development Server
echo ========================================
echo.
echo Starting server at http://localhost:8000
echo.
echo Open your browser and go to:
echo   http://localhost:8000
echo.
echo Press Ctrl+C to stop the server
echo ========================================
echo.

cd /d "%~dp0"
python -m http.server 8000


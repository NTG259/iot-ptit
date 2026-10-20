@echo off
echo [1/2] Starting Mosquitto broker...
docker compose up -d
if %errorlevel% neq 0 (
    echo ERROR: Docker is not running. Start Docker Desktop first.
    pause
    exit /b 1
)

echo [2/2] Starting Spring Boot backend...
cd backend
call mvnw.cmd spring-boot:run

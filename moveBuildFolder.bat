@echo off
REM Check if .next folder exists
if not exist ".next" (
    echo Error: .next folder does not exist.
    exit /b 1
)

REM Remove the destination folder if it exists
if exist "..\system-management" (
    echo Removing existing destination folder...
    rmdir /s /q "..\system-management"
    if errorlevel 1 (
        echo Error: Failed to remove destination folder. Check permissions.
        exit /b 1
    )
)

REM Copy the .next folder to the destination
echo Copying .next folder to destination...
xcopy /E /I /H /Y ".next" "..\system-management"
if errorlevel 1 (
    echo Error: Failed to copy .next folder. Check permissions.
    exit /b 1
)

REM Check if the operation was successful
if exist "..\system-management" (
    echo Success: .next folder copied and renamed to system-management.
) else (
    echo Error: Failed to copy and rename the .next folder.
    exit /b 1
)

@REM hello world
@echo off
REM Check if .next folder exists
if not exist ".next" (
    echo Error: .next folder does not exist.
    exit /b 1
)

REM Remove the destination folder if it exists
if exist "..\system-management" (
    rmdir /s /q "..\system-management"
)

REM Move and rename the .next folder
move ".next" "..\system-management"

REM Check if the operation was successful
if exist "..\system-management" (
    echo Success: .next folder moved and renamed to system-management.
) else (
    echo Error: Failed to move and rename the .next folder.
    exit /b 1
)


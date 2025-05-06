@echo off
setlocal enabledelayedexpansion

echo ===== JSONPlaceholder - generator dokumentacji =====

REM Utworzenie katalogu dla diagramów UML, jeśli nie istnieje
if not exist plantuml (
    echo Tworzenie katalogu dla diagramow UML...
    mkdir plantuml
)

REM Sprawdzenie, czy plik jar PlantUML istnieje
if not exist plantuml.jar (
    echo Pobieranie PlantUML...
    powershell -Command "Invoke-WebRequest -Uri 'https://github.com/plantuml/plantuml/releases/download/v1.2024.3/plantuml-1.2024.3.jar' -OutFile 'plantuml.jar'"
)

REM Sprawdzenie, czy Java jest zainstalowana
java -version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo BLAD: Java nie jest zainstalowana lub nie jest dostepna w PATH.
    echo Zainstaluj Jave i uruchom skrypt ponownie.
    exit /b 1
)

echo ===== Generowanie diagramow UML =====

echo Generowanie diagramu klas...
java -jar plantuml.jar plantuml/class_diagram.puml

echo Generowanie diagramu sekwencji...
java -jar plantuml.jar plantuml/sequence_diagram.puml

echo Generowanie diagramu komponentow...
java -jar plantuml.jar plantuml/component_diagram.puml

REM Sprawdzenie czy diagramy zostały wygenerowane
if not exist "plantuml\Class Diagram.png" (
    echo BLAD: Nie udalo sie wygenerowac diagramu klas.
    exit /b 1
)

if not exist "plantuml\Sequence Diagram.png" (
    echo BLAD: Nie udalo sie wygenerowac diagramu sekwencji.
    exit /b 1
)

if not exist "plantuml\Component Diagram.png" (
    echo BLAD: Nie udalo sie wygenerowac diagramu komponentow.
    exit /b 1
)

echo Diagramy UML wygenerowane pomyslnie.

REM Przygotowanie plików do użycia w LaTeX (kopiowanie z poprawnymi nazwami)
echo Przygotowanie plikow PNG do uzycia w LaTeX...
copy "plantuml\Class Diagram.png" "plantuml\class_diagram.png" >nul
copy "plantuml\Sequence Diagram.png" "plantuml\sequence_diagram.png" >nul
copy "plantuml\Component Diagram.png" "plantuml\component_diagram.png" >nul

echo ===== Kompilacja dokumentu LaTeX =====

REM Utworzenie katalogu dla plików tymczasowych
if not exist build (
    mkdir build
)

REM Kompilacja LaTeX (dwa razy, aby prawidłowo wygenerować spis treści)
echo Pierwsza kompilacja dokumentu LaTeX...
pdflatex -interaction=nonstopmode main.tex

echo Druga kompilacja dokumentu LaTeX...
pdflatex -interaction=nonstopmode main.tex

REM Sprawdzenie czy dokument PDF został wygenerowany
if not exist main.pdf (
    echo BLAD: Nie udalo sie skompilowac dokumentu LaTeX.
    exit /b 1
) else (
    echo Dokument PDF wygenerowany pomyslnie.
)

echo ===== Generowanie zakonczone =====
echo Plik PDF zostal zapisany jako main.pdf
echo.
echo Mozesz otworzyc plik PDF przy uzyciu komendy: main.pdf

REM Czyszczenie plików tymczasowych
echo Czy chcesz usunac pliki tymczasowe LaTeX? (T/N)
set /p CLEAN=
if /i "!CLEAN!"=="T" (
    echo Usuwanie plikow tymczasowych...
    del *.aux *.log *.out *.toc
    echo Pliki tymczasowe usuniete.
)

echo Dziekujemy za skorzystanie z generatora dokumentacji. 
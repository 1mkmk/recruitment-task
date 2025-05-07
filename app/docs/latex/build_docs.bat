@echo off
setlocal

echo ===== JSONPlaceholder - kompilacja dokumentacji =====

REM Sprawdz czy istnieje katalog plantuml
if not exist plantuml (
    echo Tworzenie katalogu plantuml...
    mkdir plantuml
)

REM Sprawdz czy istnieje plik JAR PlantUML
if not exist plantuml.jar (
    echo Pobieranie PlantUML...
    powershell -Command "Invoke-WebRequest -Uri 'https://github.com/plantuml/plantuml/releases/download/v1.2024.3/plantuml-1.2024.3.jar' -OutFile 'plantuml.jar'"
)

echo Generowanie diagramow UML...
java -jar plantuml.jar plantuml/class_diagram.puml
java -jar plantuml.jar plantuml/sequence_diagram.puml
java -jar plantuml.jar plantuml/component_diagram.puml

echo Kompilowanie dokumentacji LaTeX...
pdflatex -interaction=nonstopmode main.tex
pdflatex -interaction=nonstopmode main.tex

echo Dokumentacja zostala wygenerowana jako main.pdf

pause 
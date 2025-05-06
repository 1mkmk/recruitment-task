# Makefile dla dokumentacji LaTeX

# Zmienne konfiguracyjne
MAIN_DOC = main
ARCHITECTURE_DOC = architecture
OUTPUT_DIR = build
PDF_VIEWER = start
PLANTUML_JAR = plantuml.jar
PLANTUML_URL = https://github.com/plantuml/plantuml/releases/download/v1.2024.3/plantuml-1.2024.3.jar

# Główny dokument
all: diagrams $(MAIN_DOC).pdf architecture

# Diagram architektury
architecture: $(ARCHITECTURE_DOC).pdf

# Utworzenie katalogu wyjściowego, jeśli nie istnieje
$(OUTPUT_DIR):
	mkdir -p $(OUTPUT_DIR)

# Sprawdzenie czy PlantUML istnieje, w razie potrzeby pobieranie
$(PLANTUML_JAR):
	curl -L -o $(PLANTUML_JAR) $(PLANTUML_URL)

# Generowanie diagramów UML
diagrams: $(PLANTUML_JAR)
	java -jar $(PLANTUML_JAR) plantuml/class_diagram.puml
	java -jar $(PLANTUML_JAR) plantuml/sequence_diagram.puml
	java -jar $(PLANTUML_JAR) plantuml/component_diagram.puml

# Kompilacja głównego dokumentu
$(MAIN_DOC).pdf: $(MAIN_DOC).tex diagrams | $(OUTPUT_DIR)
	pdflatex -output-directory=$(OUTPUT_DIR) $(MAIN_DOC).tex
	pdflatex -output-directory=$(OUTPUT_DIR) $(MAIN_DOC).tex
	cp $(OUTPUT_DIR)/$(MAIN_DOC).pdf ./

# Kompilacja diagramu architektury
$(ARCHITECTURE_DOC).pdf: $(ARCHITECTURE_DOC).tex | $(OUTPUT_DIR)
	pdflatex -output-directory=$(OUTPUT_DIR) $(ARCHITECTURE_DOC).tex
	cp $(OUTPUT_DIR)/$(ARCHITECTURE_DOC).pdf ./

# Wyświetlenie głównego dokumentu (specyficzne dla Windows)
view: $(MAIN_DOC).pdf
	$(PDF_VIEWER) $(MAIN_DOC).pdf

# Wyświetlenie diagramu architektury (specyficzne dla Windows)
view-arch: $(ARCHITECTURE_DOC).pdf
	$(PDF_VIEWER) $(ARCHITECTURE_DOC).pdf

# Czyszczenie plików tymczasowych
clean:
	rm -f $(OUTPUT_DIR)/*.aux $(OUTPUT_DIR)/*.log $(OUTPUT_DIR)/*.toc

# Czyszczenie wszystkich wygenerowanych plików
clean-all: clean
	rm -f $(OUTPUT_DIR)/*.pdf *.pdf plantuml/*.png

.PHONY: all clean clean-all view view-arch architecture diagrams 
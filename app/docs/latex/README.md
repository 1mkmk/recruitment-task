# Dokumentacja LaTeX dla Pobieracza Postów JSONPlaceholder

Ten katalog zawiera dokumentację LaTeX dla projektu Pobieracz Postów JSONPlaceholder.

## Zawartość

- `main.tex` - Główny plik dokumentacji
- `architecture.tex` - Diagram architektury aplikacji
- `Makefile` - Instrukcje budowania do kompilacji dokumentacji
- `build.bat` - Skrypt do kompilacji dokumentacji w systemie Windows

## Wymagania

Do kompilacji dokumentów LaTeX potrzebujesz:

- Dystrybucji LaTeX (takiej jak TeX Live, MiKTeX lub MacTeX)
- Następujących pakietów LaTeX:
  - inputenc
  - fontenc
  - lmodern
  - graphicx
  - hyperref
  - listings
  - xcolor
  - geometry
  - babel (z opcją polish)
  - tikz (z bibliotekami: shapes.geometric, arrows, positioning, fit, arrows.meta)

## Budowanie dokumentacji

### Za pomocą Makefile

Jeśli masz zainstalowany program `make`, możesz użyć dostarczonego pliku Makefile:

```bash
# Kompilacja wszystkich dokumentów
make all

# Kompilacja tylko głównego dokumentu
make main.pdf

# Kompilacja tylko diagramu architektury
make architecture

# Czyszczenie plików tymczasowych
make clean

# Czyszczenie wszystkich wygenerowanych plików
make clean-all
```

### Kompilacja ręczna

Jeśli nie masz zainstalowanego programu `make`, możesz skompilować dokumenty ręcznie:

```bash
# Utworzenie katalogu build
mkdir -p build

# Kompilacja głównego dokumentu
pdflatex -output-directory=build main.tex
pdflatex -output-directory=build main.tex
cp build/main.pdf ./

# Kompilacja diagramu architektury
pdflatex -output-directory=build architecture.tex
cp build/architecture.pdf ./
```

### Za pomocą skryptu build.bat (Windows)

W systemie Windows można użyć dostarczonego skryptu batch:

```
build.bat
```

## Pliki wyjściowe

Po kompilacji otrzymasz następujące pliki PDF:

- `main.pdf` - Kompletna dokumentacja
- `architecture.pdf` - Diagram architektury 
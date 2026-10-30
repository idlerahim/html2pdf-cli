# HTML & MHTML to PDF

Convert `.html` and `.mhtml` files to a single-page PDF with Puppeteer. The script measures the document dimensions automatically unless you override them.

## Setup

Install [Node.js](https://nodejs.org/) and then install the project dependencies from the project directory:

```powershell
npm init -y
npm install puppeteer
```

Puppeteer downloads a compatible Chrome browser during installation.

## Usage

```text
node html2pdf-cli.js <input.html|input.mhtml> [output.pdf] [--height <auto|size>] [--width <auto|size>]
```

If `output.pdf` is omitted, the PDF is saved beside the input using the same base name. For example, `report.html` becomes `report.pdf`. If the destination PDF already exists, it is replaced.

When dimensions are omitted, both are measured automatically:

```powershell
node .\html2pdf-cli.js ".\input.html"
```

Use `auto` to request measurement explicitly. You can combine automatic and fixed dimensions:

```powershell
node .\html2pdf-cli.js ".\input.html" --height auto --width auto
node .\html2pdf-cli.js ".\input.html" --height auto --width a4
node .\html2pdf-cli.js ".\input.html" --height 7050 --width a4
```

Dimension values support pixels (`px`), inches (`in`), millimeters (`mm`), or `a4`. Bare numbers are pixels. A4 is portrait: 8.27 inches wide by 11.69 inches high.

To choose an output path explicitly:

```powershell
node .\html2pdf-cli.js ".\input.mhtml" ".\exports\input.pdf" --height 200 --width 8.5in
```

The maximum output height is capped at 20,000 pixels to avoid issues with some PDF viewers.

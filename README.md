# HTML & MHTML to PDF (No Pagination)

Convert `.html` & `.mhtml` files to a **single-page PDF** using Puppeteer.  
This script automatically measures the full content height and width, so your PDF is not broken into multiple pages.

## Features

- Converts `.html` & `.mhtml` web archive files to PDF
- Automatically detects page width and height
- Optionally override dimensions with command-line arguments
- Supports units: `px`, `in`, `mm`, or `a4`
- Prevents pagination (produces one tall PDF page)
- Works with Node.js + Puppeteer

## Requirements

- [Node.js](https://nodejs.org/) v16 or higher
- [Puppeteer](https://pptr.dev/)

Install Puppeteer:  
`bash
npm install puppeteer`

### Usage
Basic  
`node mhtml-to-pdf.js "input.html" output.pdf`
This measures the full page width and height and generates a single-page PDF.

With custom dimensions
You can override width and height.
`node mhtml-to-pdf.js "input.mhtml" output.pdf --height 200 --width 50`

Numbers without unit default to pixels
You can also use px, in, mm
Examples:

# Force width=50px, height=200px
`node mhtml-to-pdf.js "input.mhtml" output.pdf --height 200 --width 50`

# Width in pixels, height in inches
`node mhtml-to-pdf.js "input.mhtml" output.pdf --height 200 --width 8.5in`

# A4 paper size (portrait, 8.27in × 11.69in)
`node mhtml-to-pdf.js "input.mhtml" output.pdf --height a4 --width a4`

# Mixed units: height=200px, width=A4
`node mhtml-to-pdf.js "input.mhtml" output.pdf --height 200 --width a4`

# Notes:  
By default, the script calculates width and height automatically.
Very tall pages are capped at 20000px height (~208 inches) to avoid issues with some PDF viewers. You can increase this limit in the script if needed.
Using a4 sets both width and height to A4 size (portrait).

Example Output
Running:
`node mhtml-to-pdf.js "ChatGPT - ISM.mhtml" output.pdf`

Produces:

Using PDF size: 1200px x 7500px
PDF written to output.pdf

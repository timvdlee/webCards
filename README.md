# 📇 Card PDF Generator - Web App

Web application for generating print-ready PDF cards from images. **Runs entirely in your browser—no server required!**

> **Project History:** This is an AI-assisted rewrite of [timvdlee/Cards](https://github.com/timvdlee/Cards), which is a fork of the original [Chuntttttt/Cards](https://github.com/Chuntttttt/Cards) Python project.

## ✨ Features

- 📤 **Upload multiple card images** - Support for PNG/JPG formats (up to 50 MB per image)
- 🎨 **Automatic layout** - Configure grid layout (columns × rows) for your PDF
- 📋 **Print counts** - Set how many copies of each card to print (1-100 per card)
- 🔄 **Back card support** - Optional back cards with automatic horizontal reversal
- ✏️ **Customizable dimensions** - Set custom paper sizes, padding, and margins
- 📏 **Guide lines** - Optional cutting guides for precise card cutting
- 📊 **Live preview** - See calculated card dimensions and page count before generating
- 🚀 **Instant generation** - Generate PDFs instantly without uploading to any server
- 🔒 **100% Private** - All processing happens in your browser; no data leaves your device

## 🚀 Quick Start

### Option 1: Online (Hosted)

Visit the hosted version: **https://example.com/cards**

### Option 2: Local File Access

1. Clone or download this repository
2. Open `web_app/index.html` directly in your web browser
3. Ensure you have internet access so the jsPDF CDN library can load

> **Note:** All processing happens in your browser—no backend server needed.

## 💡 How to Use

1. **Upload Front Card Images**
   - Click "Choose Files" and select one or more PNG/JPG images
   - Thumbnails will appear with sliders to set print counts for each card

2. **Configure PDF Layout**
   - Set the number of columns and rows per page
   - Choose paper size (A4, Letter, or custom dimensions)
   - Adjust margins and padding as needed
   - Preview shows your calculated card dimensions

3. **Optional: Add Back Cards**
   - Check "Include back cards in PDF" to enable
   - Upload back card images
   - They'll automatically be reversed and alternated with front cards

4. **Generate PDF**
   - Click "Generate PDF" button
   - Your browser will download the PDF file ready for printing
   - No data is sent to any server!

## 📋 Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| **Columns** | 4 | Number of card columns per page |
| **Rows** | 7 | Number of card rows per page |
| **Paper Size** | A4 | Pre-set sizes or custom dimensions |
| **Horizontal Padding** | 12.35 mm | Left/right margins |
| **Vertical Padding** | 6.75 mm | Top/bottom margins |
| **Guide Lines** | ✓ Enabled | Show cutting guides on PDF |
| **Back Cards** | ✗ Disabled | Include reversed back cards |

## 📐 Card Dimensions with Default Settings

- **Paper Size:** A4 (210×297 mm)
- **Cards per Page:** 28 (4 columns × 7 rows)
- **Card Size:** ~48.5×37.9 mm each
- **Printed Items:** PDF ready for printing and cutting

## 🔧 Technical Details

### Architecture

- **Frontend:** Vanilla HTML/CSS/JavaScript (no framework dependencies)
- **PDF Generation:** [jsPDF 2.5.1](https://github.com/parallax/jsPDF) library
- **Image Processing:** HTML5 Canvas API for image flipping and manipulation
- **Storage:** All images stored in browser memory (not persisted)

### JavaScript Modules

- **`js/utilities.js`** - Helper functions for image grouping, flipping, and calculations
- **`js/imageManager.js`** - Manages image uploads, print counts, and thumbnails
- **`js/pdfGenerator.js`** - Core PDF generation logic (mirrors Python's CardWriter class)
- **`js/app.js`** - Main application controller and UI orchestration
- **`css/styles.css`** - Responsive styling

### Browser Compatibility

✅ **All modern browsers:**
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Opera 76+

⚠️ **Not supported:** Internet Explorer 11 (no FileReader API or Canvas)

## 🔒 Privacy & Security

- ✅ **100% client-side** - All processing happens in your browser
- ✅ **No data uploaded** - Images never leave your computer
- ✅ **No cookies** - No tracking or analytics
- ✅ **No server calls** - Works completely offline (after initial page load)




## 📚 File Structure

```
web_app/
├── index.html              # Main HTML file
├── css/
│   └── styles.css          # Styling (modern, responsive)
├── js/
│   ├── utilities.js        # Helper functions
│   ├── imageManager.js     # Image upload & management
│   ├── pdfGenerator.js     # PDF generation (mirrors Python logic)
│   └── app.js              # Main application controller
└── README.md               # This file
```


This project is an AI-assisted rewrite of the original Python project.

---

**Happy card printing! 🎨📇**

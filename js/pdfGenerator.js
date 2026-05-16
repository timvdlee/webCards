/**
 * PDF Generator
 * Mirrors the Python CardWriter class functionality
 */

class PDFGenerator {
    constructor(config = {}) {
        // Configuration defaults
        this.paperSize = config.paperSize || 'A4';
        this.customWidth = config.customWidth || 210;
        this.customHeight = config.customHeight || 297;
        this.colNum = config.colNum || 4;
        this.rowNum = config.rowNum || 7;
        this.horizontalPadding = config.horizontalPadding || 12.35;
        this.verticalPadding = config.verticalPadding || 6.75;
        this.guidesEnabled = config.guidesEnabled !== false;
        this.generateBacks = config.generateBacks || false;

        // Paper dimensions in mm
        const paperDims = getPaperDimensions(this.paperSize, this.customWidth, this.customHeight);
        this.width = paperDims.width;
        this.height = paperDims.height;

        // Calculate card dimensions
        const cardDims = calculateCardDimensions(
            this.width,
            this.height,
            this.colNum,
            this.rowNum,
            this.horizontalPadding,
            this.verticalPadding
        );
        this.cardWidth = cardDims.cardWidth;
        this.cardHeight = cardDims.cardHeight;

        // jsPDF instance
        this.doc = null;
        this.imageDimensionsCache = new Map();
    }

    /**
     * Generates PDF from front and back images
     * 
     * @param {Array<string>} frontCards - Array of front card data URLs
     * @param {Array<string>} backCards - Array of back card data URLs (or empty)
     * @returns {Promise<jsPDF>} - Promise resolving to generated PDF
     */
    async generatePDF(frontCards, backCards = []) {
        // Check if jsPDF is available - try multiple names
        const jsPDFLib = window.jsPDF || window.jspdf || (typeof jsPDF !== 'undefined' ? jsPDF : null);
        
        if (!jsPDFLib) {
            throw new Error('jsPDF library not loaded. Please refresh the page and ensure you have internet access.');
        }

        // Initialize jsPDF with custom paper size
        // Handle both direct constructor and named export
        const jsPDFConstructor = jsPDFLib.jsPDF || jsPDFLib;
        
        if (typeof jsPDFConstructor !== 'function') {
            console.error('jsPDF object:', jsPDFLib);
            throw new Error('jsPDF library loaded but constructor not found.');
        }
        this.doc = new jsPDFConstructor({
            orientation: 'portrait',
            unit: 'mm',
            format: [this.width, this.height]
        });

        // Group images into pages
        const frontPages = groupImages(frontCards, this.colNum, this.rowNum);
        
        let pages = frontPages;

        // Handle back cards if enabled
        if (this.generateBacks && backCards.length > 0) {
            // Flip back cards horizontally
            const flippedBacks = await flipImagesHorizontally(backCards);
            const backPages = groupImages(flippedBacks, this.colNum, this.rowNum);
            
            // Align back cards (reverse order)
            const alignedBacks = this._alignBackCards(backPages);
            
            // Interleave front and back pages
            pages = [];
            for (let i = 0; i < frontPages.length; i++) {
                pages.push(frontPages[i]);
                if (i < alignedBacks.length) {
                    pages.push(alignedBacks[i]);
                }
            }
        }

        // Add images to PDF
        for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
            if (pageIndex > 0) {
                this.doc.addPage([this.width, this.height]);
            }
            
            await this._addImagesPage(pages[pageIndex]);
        }

        return this.doc;
    }

    /**
     * Adds a page of images to the PDF
     * Mirrors Python's __add_images method
     * 
     * @private
     * @param {Array<Array<string>>} pageImages - 2D array of images [rows][cols]
     * @returns {Promise<void>}
     */
    async _addImagesPage(pageImages) {
        for (let rowIndex = 0; rowIndex < pageImages.length; rowIndex++) {
            const row = pageImages[rowIndex];
            if (!row) continue;

            for (let colIndex = 0; colIndex < row.length; colIndex++) {
                const imageUrl = row[colIndex];
                if (!imageUrl) continue;

                const { x0, y0, x1, y1 } = getCardRect(
                    colIndex,
                    rowIndex,
                    this.cardWidth,
                    this.cardHeight,
                    this.horizontalPadding,
                    this.verticalPadding
                );

                const imageDimensions = await this._getImageDimensions(imageUrl);
                const fittedDimensions = containRect(
                    imageDimensions.width,
                    imageDimensions.height,
                    this.cardWidth,
                    this.cardHeight
                );
                const drawX = x0 + (this.cardWidth - fittedDimensions.width) / 2;
                const drawY = y0 + (this.cardHeight - fittedDimensions.height) / 2;
                const imageFormat = imageUrl.startsWith('data:image/jpeg') || imageUrl.startsWith('data:image/jpg') ? 'JPEG' : 'PNG';

                // Add image to PDF
                try {
                    this.doc.addImage(
                        imageUrl,
                        imageFormat,
                        drawX,
                        drawY,
                        fittedDimensions.width,
                        fittedDimensions.height
                    );
                } catch (error) {
                    console.warn(`Failed to add image at (${colIndex}, ${rowIndex}):`, error);
                    // Continue with next image if one fails
                }

            }
        }

        // Draw guides once per page so intersections are not duplicated per card.
        if (this.guidesEnabled) {
            this._drawGuidesForPage();
        }
    }

    /**
     * Gets cached image dimensions.
     *
     * @private
     * @param {string} imageUrl
     * @returns {Promise<{width: number, height: number}>}
     */
    async _getImageDimensions(imageUrl) {
        if (!this.imageDimensionsCache.has(imageUrl)) {
            this.imageDimensionsCache.set(imageUrl, getImageDimensions(imageUrl));
        }

        return this.imageDimensionsCache.get(imageUrl);
    }

    /**
     * Draws guide crosses at every card-grid intersection on the page.
     *
     * @private
     */
    _drawGuidesForPage() {
        const size = 3; // Size of guide marks in mm
        const lineColor = [0, 0, 0]; // Black

        this.doc.setDrawColor(...lineColor);
        this.doc.setLineWidth(0.1);

        const xPositions = [];
        const yPositions = [];

        const horizontalGuideOffset = this.horizontalPadding / 2;
        const verticalGuideOffset = this.verticalPadding / 2;

        for (let colIndex = 0; colIndex <= this.colNum; colIndex++) {
            xPositions.push(horizontalGuideOffset + colIndex * (this.cardWidth + this.horizontalPadding));
        }

        for (let rowIndex = 0; rowIndex <= this.rowNum; rowIndex++) {
            yPositions.push(verticalGuideOffset + rowIndex * (this.cardHeight + this.verticalPadding));
        }

        for (const x of xPositions) {
            for (const y of yPositions) {
                this.doc.line(x, y - size, x, y + size);
                this.doc.line(x - size, y, x + size, y);
            }
        }
    }

    /**
     * Aligns back cards by reversing row and column order
     * Mirrors Python's __align_back_cards method
     * 
     * @private
     * @param {Array<Array<Array<string>>>} backPages - 3D array of back card images
     * @returns {Array<Array<Array<string>>>} - Aligned back cards
     */
    _alignBackCards(backPages) {
        const alignedCards = [];
        
        for (const page of backPages) {
            if (!page) {
                alignedCards.push(page);
                continue;
            }

            const pageCards = [];
            alignedCards.push(pageCards);

            for (const row of page) {
                if (!row) {
                    pageCards.push(row);
                    continue;
                }

                // Reverse each row (horizontal flip order)
                pageCards.push([...row].reverse());
            }
        }

        return alignedCards;
    }

    /**
     * Saves PDF to file
     * 
     * @param {string} filename - Filename for download
     */
    savePDF(filename = 'cards.pdf') {
        if (this.doc) {
            this.doc.save(filename);
        }
    }

    /**
     * Gets PDF as blob
     * 
     * @returns {Blob}
     */
    getPDFBlob() {
        if (this.doc) {
            return this.doc.output('blob');
        }
        return null;
    }

    /**
     * Gets calculated card dimensions
     * 
     * @returns {{cardWidth: number, cardHeight: number}}
     */
    getCardDimensions() {
        return {
            cardWidth: this.cardWidth,
            cardHeight: this.cardHeight
        };
    }

    /**
     * Gets paper dimensions
     * 
     * @returns {{width: number, height: number}}
     */
    getPaperDimensions() {
        return {
            width: this.width,
            height: this.height
        };
    }
}


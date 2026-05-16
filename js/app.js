/**
 * Main Application Controller
 * Coordinates UI and PDF generation
 */

class CardPDFApp {
    constructor() {
        this.imageManager = imageManager;
        this.currentConfig = {};
        this.isGenerating = false;

        this._initializeEventListeners();
        this._updateUI();
    }

    /**
     * Initialize all event listeners
     * 
     * @private
     */
    _initializeEventListeners() {
        // Image uploads
        document.getElementById('front-images-input').addEventListener('change', (e) => this._handleFrontImagesUpload(e));
        document.getElementById('back-images-input').addEventListener('change', (e) => this._handleBackImagesUpload(e));

        // Configuration changes
        document.getElementById('paper-size-select').addEventListener('change', (e) => this._handlePaperSizeChange(e));
        document.getElementById('columns').addEventListener('change', () => this._updatePreview());
        document.getElementById('rows').addEventListener('change', () => this._updatePreview());
        document.getElementById('horizontal-padding').addEventListener('change', () => this._updatePreview());
        document.getElementById('vertical-padding').addEventListener('change', () => this._updatePreview());
        document.getElementById('custom-width').addEventListener('change', () => this._updatePreview());
        document.getElementById('custom-height').addEventListener('change', () => this._updatePreview());
        document.getElementById('guides-enabled').addEventListener('change', () => this._updatePreview());
        document.getElementById('generate-backs').addEventListener('change', (e) => this._handleBackCardsToggle(e));

        // Generate button
        document.getElementById('generate-button').addEventListener('click', () => this._handleGeneratePDF());
    }

    /**
     * Handle front images upload
     * 
     * @private
     */
    async _handleFrontImagesUpload(event) {
        clearMessages();
        await this.imageManager.loadImages(event.target.files, true);
        this._renderImagesList();
        this._updateUI();
        this._updatePreview();
    }

    /**
     * Handle back images upload
     * 
     * @private
     */
    async _handleBackImagesUpload(event) {
        clearMessages();
        if (event.target.files.length > 0) {
            await this.imageManager.loadImages(event.target.files, false);
            showMessage(`Loaded ${this.imageManager.backImages.length} back card image(s)`, 'success', 3000);
        } else {
            this.imageManager.backImages = [];
        }
        this._updatePreview();
    }

    /**
     * Handle paper size change
     * 
     * @private
     */
    _handlePaperSizeChange(event) {
        const paperSize = event.target.value;
        const customGroup = document.getElementById('custom-paper-group');
        
        if (paperSize === 'custom') {
            customGroup.style.display = 'block';
        } else {
            customGroup.style.display = 'none';
        }

        this._updatePreview();
    }

    /**
     * Handle back cards toggle
     * 
     * @private
     */
    _handleBackCardsToggle(event) {
        const info = document.getElementById('back-cards-info');
        const backInput = document.getElementById('back-images-input');
        
        if (event.target.checked) {
            info.style.display = 'block';
            if (!this.imageManager.hasBackImages()) {
                showMessage('Note: No back card images loaded. You can upload them anytime.', 'info', 4000);
            }
        } else {
            info.style.display = 'none';
        }

        this._updatePreview();
    }

    /**
     * Render list of uploaded front images with print counts
     * 
     * @private
     */
    async _renderImagesList() {
        const container = document.getElementById('images-container');
        const list = document.getElementById('images-list');
        const totalCardsEl = document.getElementById('total-cards');

        if (!this.imageManager.hasFrontImages()) {
            container.style.display = 'none';
            list.innerHTML = '';
            totalCardsEl.textContent = '0';
            return;
        }

        container.style.display = 'block';
        list.innerHTML = '';

        // Create image items with thumbnails and print count sliders
        for (const image of this.imageManager.getFrontImages()) {
            const item = document.createElement('div');
            item.className = 'image-item';

            // Create thumbnail
            const thumbnail = await this.imageManager.createThumbnail(image.dataUrl, 80, 120);

            const printCount = this.imageManager.getPrintCount(image.filename);

            item.innerHTML = `
                <img src="${thumbnail}" alt="${image.filename}" class="image-thumbnail">
                <div class="image-info">
                    <p class="image-name">${image.filename}</p>
                    <div class="print-count-control">
                        <label for="count-${image.filename}">Print copies:</label>
                        <input 
                            type="number" 
                            id="count-${image.filename}"
                            class="print-count-input"
                            value="${printCount}"
                            min="1"
                            max="100"
                            data-filename="${image.filename}"
                        >
                    </div>
                </div>
            `;

            // Add event listener for print count changes
            const countInput = item.querySelector('.print-count-input');
            countInput.addEventListener('change', (e) => {
                const newCount = parseInt(e.target.value) || 1;
                this.imageManager.setPrintCount(image.filename, newCount);
                this._updateTotalCards();
                this._updatePreview();
            });

            list.appendChild(item);
        }

        this._updateTotalCards();
    }

    /**
     * Update total cards count display
     * 
     * @private
     */
    _updateTotalCards() {
        const total = this.imageManager.getTotalCardCount();
        document.getElementById('total-cards').textContent = total;
    }

    /**
     * Update preview with calculated dimensions
     * 
     * @private
     */
    _updatePreview() {
        // Get current configuration
        const paperSize = document.getElementById('paper-size-select').value;
        const customWidth = parseFloat(document.getElementById('custom-width').value) || 210;
        const customHeight = parseFloat(document.getElementById('custom-height').value) || 297;
        const colNum = parseInt(document.getElementById('columns').value) || 4;
        const rowNum = parseInt(document.getElementById('rows').value) || 7;
        const horizontalPadding = parseFloat(document.getElementById('horizontal-padding').value) || 12.35;
        const verticalPadding = parseFloat(document.getElementById('vertical-padding').value) || 6.75;

        // Get paper dimensions
        const paperDims = getPaperDimensions(paperSize, customWidth, customHeight);
        
        // Calculate card dimensions
        const cardDims = calculateCardDimensions(
            paperDims.width,
            paperDims.height,
            colNum,
            rowNum,
            horizontalPadding,
            verticalPadding
        );

        // Calculate pages
        const cardsPerPage = colNum * rowNum;
        const totalCards = this.imageManager.getTotalCardCount();
        const totalPages = calculateTotalPages(totalCards, cardsPerPage);

        // Update preview display
        document.getElementById('preview-paper').textContent = `${paperDims.width}×${paperDims.height} mm`;
        document.getElementById('preview-card-size').textContent = `${cardDims.cardWidth}×${cardDims.cardHeight} mm`;
        document.getElementById('preview-cards-per-page').textContent = cardsPerPage;
        document.getElementById('preview-total-pages').textContent = totalCards === 0 ? 0 : totalPages;

        // Store current config
        this.currentConfig = {
            paperSize,
            customWidth,
            customHeight,
            colNum,
            rowNum,
            horizontalPadding,
            verticalPadding,
            guidesEnabled: document.getElementById('guides-enabled').checked,
            generateBacks: document.getElementById('generate-backs').checked
        };
    }

    /**
     * Update UI visibility based on app state
     * 
     * @private
     */
    _updateUI() {
        const hasFrontImages = this.imageManager.hasFrontImages();
        
        document.getElementById('config-section').style.display = hasFrontImages ? 'block' : 'none';
        document.getElementById('generation-section').style.display = hasFrontImages ? 'block' : 'none';

        // Enable/disable generate button
        const generateBtn = document.getElementById('generate-button');
        generateBtn.disabled = !hasFrontImages || this.isGenerating;
    }

    /**
     * Handle PDF generation
     * 
     * @private
     */
    async _handleGeneratePDF() {
        clearMessages();

        // Validation
        if (!this.imageManager.hasFrontImages()) {
            showMessage('Please upload at least one front card image', 'error');
            return;
        }

        // Check if jsPDF is available
        const jsPDFLib = window.jsPDF || window.jspdf || (typeof jsPDF !== 'undefined' ? jsPDF : null);
        if (!jsPDFLib) {
            showMessage('❌ PDF library not loaded. Please refresh the page and ensure you have internet access.', 'error', 0);
            return;
        }

        this.isGenerating = true;
        const generateBtn = document.getElementById('generate-button');
        const originalText = generateBtn.innerHTML;
        generateBtn.disabled = true;
        generateBtn.innerHTML = '⏳ Generating...';

        try {
            // Create new PDF generator with current config
            const generator = new PDFGenerator(this.currentConfig);

            // Get images
            const frontCards = this.imageManager.getExpandedFrontCards();
            const backCards = this.currentConfig.generateBacks ? this.imageManager.getBackCardImages() : [];

            // Generate PDF
            showMessage('Generating PDF... This may take a moment.', 'info', 0);
            await generator.generatePDF(frontCards, backCards);

            // Save PDF
            generator.savePDF('cards.pdf');

            clearMessages();
            showMessage(
                `✅ PDF generated successfully! ${frontCards.length} cards on ${Math.ceil(frontCards.length / (this.currentConfig.colNum * this.currentConfig.rowNum))} page(s). Downloading now...`,
                'success',
                6000
            );
        } catch (error) {
            console.error('PDF generation error:', error);
            showMessage(`Error generating PDF: ${error.message}`, 'error', 0);
        } finally {
            this.isGenerating = false;
            generateBtn.disabled = false;
            generateBtn.innerHTML = originalText;
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new CardPDFApp();
});

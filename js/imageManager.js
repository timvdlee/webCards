/**
 * Image Manager
 * Handles image uploads, storage, and print count management
 */

class ImageManager {
    constructor() {
        this.frontImages = []; // Array of {filename, dataUrl, printCount}
        this.backImages = []; // Array of {filename, dataUrl}
        this.printCounts = {}; // Map of filename -> count
    }

    /**
     * Loads images from file input
     * 
     * @param {FileList} fileList - Files from input element
     * @param {boolean} isFront - True for front cards, false for back
     * @returns {Promise<void>}
     */
    async loadImages(fileList, isFront = true) {
        const images = isFront ? this.frontImages : this.backImages;
        images.length = 0; // Clear existing

        for (let file of fileList) {
            if (!isValidImageSize(file)) {
                showMessage(`File ${file.name} is too large (max 50MB)`, 'warning');
                continue;
            }

            try {
                const dataUrl = await this._fileToDataUrl(file);
                const filename = file.name;
                
                if (isFront) {
                    images.push({
                        filename: filename,
                        dataUrl: dataUrl,
                        printCount: 1
                    });
                    // Initialize print count
                    if (!this.printCounts[filename]) {
                        this.printCounts[filename] = 1;
                    }
                } else {
                    // For back cards, just store the image
                    images.push({
                        filename: filename,
                        dataUrl: dataUrl
                    });
                }
            } catch (error) {
                showMessage(`Failed to load ${file.name}: ${error.message}`, 'error');
            }
        }
    }

    /**
     * Converts File to data URL using FileReader
     * 
     * @private
     * @param {File} file
     * @returns {Promise<string>}
     */
    async _fileToDataUrl(file) {
        if (typeof createImageBitmap === 'function') {
            try {
                const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
                const canvas = document.createElement('canvas');
                canvas.width = bitmap.width;
                canvas.height = bitmap.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(bitmap, 0, 0);
                bitmap.close?.();
                return canvas.toDataURL(file.type || 'image/png');
            } catch (error) {
                console.warn('Falling back to FileReader image loading:', error);
            }
        }

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    }

    /**
     * Sets print count for a specific front image
     * 
     * @param {string} filename - Image filename
     * @param {number} count - Number of times to print
     */
    setPrintCount(filename, count) {
        count = Math.max(1, Math.min(100, parseInt(count) || 1)); // Clamp to 1-100
        this.printCounts[filename] = count;
        
        // Update in frontImages array
        const img = this.frontImages.find(i => i.filename === filename);
        if (img) {
            img.printCount = count;
        }
    }

    /**
     * Gets print count for an image
     * 
     * @param {string} filename
     * @returns {number}
     */
    getPrintCount(filename) {
        return this.printCounts[filename] || 1;
    }

    /**
     * Gets expanded list of front card images (duplicated by print count)
     * Mirrors Python's __images_from_path logic
     * 
     * @returns {Array<string>} - Array of image data URLs
     */
    getExpandedFrontCards() {
        const expanded = [];
        for (const img of this.frontImages) {
            const count = this.printCounts[img.filename] || 1;
            for (let i = 0; i < count; i++) {
                expanded.push(img.dataUrl);
            }
        }
        return expanded;
    }

    /**
     * Gets all front card images (without duplication)
     * 
     * @returns {Array<{filename, dataUrl, printCount}>}
     */
    getFrontImages() {
        return this.frontImages;
    }

    /**
     * Gets back card image(s)
     * If multiple back cards, returns array; if one, returns single image repeated
     * 
     * @returns {Array<string>}
     */
    getBackCardImages() {
        if (this.backImages.length === 0) {
            return [];
        }
        
        // If only one back card, repeat it for each front card
        if (this.backImages.length === 1) {
            const totalFrontCards = this.getExpandedFrontCards().length;
            return Array(totalFrontCards).fill(this.backImages[0].dataUrl);
        }
        
        // If multiple back cards, use them in order
        const expanded = [];
        for (const img of this.backImages) {
            expanded.push(img.dataUrl);
        }
        
        // Pad with last back card if fewer back cards than front
        const totalFrontCards = this.getExpandedFrontCards().length;
        while (expanded.length < totalFrontCards) {
            expanded.push(this.backImages[this.backImages.length - 1].dataUrl);
        }
        
        return expanded;
    }

    /**
     * Gets total number of cards to print
     * 
     * @returns {number}
     */
    getTotalCardCount() {
        return this.getExpandedFrontCards().length;
    }

    /**
     * Checks if front images are loaded
     * 
     * @returns {boolean}
     */
    hasFrontImages() {
        return this.frontImages.length > 0;
    }

    /**
     * Checks if back images are loaded
     * 
     * @returns {boolean}
     */
    hasBackImages() {
        return this.backImages.length > 0;
    }

    /**
     * Clears all images
     */
    clearAll() {
        this.frontImages = [];
        this.backImages = [];
        this.printCounts = {};
    }

    /**
     * Creates a thumbnail for display
     * 
     * @param {string} dataUrl - Image data URL
     * @param {number} maxWidth - Max width in pixels
     * @param {number} maxHeight - Max height in pixels
     * @returns {string} - Canvas data URL
     */
    createThumbnail(dataUrl, maxWidth = 100, maxHeight = 100) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Calculate dimensions to maintain aspect ratio
                let width = img.width;
                let height = img.height;
                const ratio = width / height;
                
                if (width > maxWidth) {
                    width = maxWidth;
                    height = width / ratio;
                }
                if (height > maxHeight) {
                    height = maxHeight;
                    width = height * ratio;
                }
                
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                
                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = () => reject(new Error('Failed to create thumbnail'));
            img.src = dataUrl;
        });
    }
}

// Global instance
const imageManager = new ImageManager();

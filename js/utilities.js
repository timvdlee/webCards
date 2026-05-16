/**
 * Utility functions for card PDF generator
 */

// Paper size definitions (in mm)
const PAPER_SIZES = {
    'A4': { width: 210, height: 297 },
    'Letter': { width: 215.9, height: 279.4 },
    'custom': null // Will be set dynamically
};

/**
 * Replicates Python's grouper function using zip_longest
 * Groups items into tuples of size n, filling with null if needed
 * 
 * @param {Array} iterable - The array to group
 * @param {number} n - Group size
 * @returns {Array<Array>} - Array of groups
 */
function grouper(iterable, n) {
    const groups = [];
    for (let i = 0; i < iterable.length; i += n) {
        const group = iterable.slice(i, i + n);
        // Pad with null to ensure consistent group size
        while (group.length < n) {
            group.push(null);
        }
        groups.push(group);
    }
    return groups;
}

/**
 * Groups a flat array of images into pages (2D matrices)
 * Mirrors Python's CardWriter.__group_images()
 * 
 * @param {Array<string>} images - Array of image data URLs
 * @param {number} colNum - Number of columns
 * @param {number} rowNum - Number of rows
 * @returns {Array<Array<Array<string>>>} - 3D array: [pages][rows][cols]
 */
function groupImages(images, colNum, rowNum) {
    // Group into rows
    const groupedRows = grouper(images, colNum);
    
    // Group rows into pages
    const groupedPages = grouper(groupedRows, rowNum);
    
    return groupedPages;
}

/**
 * Flips an image horizontally using Canvas
 * Used for back card reversal
 * 
 * @param {string} dataUrl - Image data URL (PNG or JPEG)
 * @returns {Promise<string>} - Promise resolving to flipped image data URL
 */
function flipImageHorizontally(dataUrl) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            
            // Flip horizontally
            ctx.scale(-1, 1);
            ctx.drawImage(img, -img.width, 0);
            
            const flipped = canvas.toDataURL('image/png');
            resolve(flipped);
        };
        img.onerror = () => reject(new Error('Failed to load image for flipping'));
        img.src = dataUrl;
    });
}

/**
 * Flips multiple images horizontally in parallel
 * 
 * @param {Array<string>} dataUrls - Array of image data URLs
 * @returns {Promise<Array<string>>} - Promise resolving to array of flipped images
 */
function flipImagesHorizontally(dataUrls) {
    return Promise.all(dataUrls.map(url => flipImageHorizontally(url)));
}

/**
 * Calculates paper dimensions in mm
 * 
 * @param {string} paperSize - Paper size name ('A4', 'Letter', 'custom')
 * @param {number} customWidth - Custom width in mm (if paperSize is 'custom')
 * @param {number} customHeight - Custom height in mm (if paperSize is 'custom')
 * @returns {{width: number, height: number}}
 */
function getPaperDimensions(paperSize, customWidth, customHeight) {
    if (paperSize === 'custom') {
        return { width: customWidth, height: customHeight };
    }
    return PAPER_SIZES[paperSize] || PAPER_SIZES['A4'];
}

/**
 * Calculates card dimensions based on paper size, padding, and grid.
 * The padding value is used both as the outer margin and the gap between cards.
 * 
 * @param {number} paperWidth - Paper width in mm
 * @param {number} paperHeight - Paper height in mm
 * @param {number} colNum - Number of columns
 * @param {number} rowNum - Number of rows
 * @param {number} horizontalPadding - Horizontal padding in mm
 * @param {number} verticalPadding - Vertical padding in mm
 * @returns {{cardWidth: number, cardHeight: number}}
 */
function calculateCardDimensions(paperWidth, paperHeight, colNum, rowNum, horizontalPadding, verticalPadding) {
    const totalHorizontalGaps = horizontalPadding * (colNum + 1);
    const totalVerticalGaps = verticalPadding * (rowNum + 1);
    const cardWidth = (paperWidth - totalHorizontalGaps) / colNum;
    const cardHeight = (paperHeight - totalVerticalGaps) / rowNum;
    
    return {
        cardWidth: Math.round(cardWidth * 100) / 100,
        cardHeight: Math.round(cardHeight * 100) / 100
    };
}

/**
 * Calculates the positioned rectangle for a card cell.
 * 
 * @param {number} colIndex - Zero-based column index
 * @param {number} rowIndex - Zero-based row index
 * @param {number} cardWidth - Card width in mm
 * @param {number} cardHeight - Card height in mm
 * @param {number} horizontalPadding - Horizontal padding in mm
 * @param {number} verticalPadding - Vertical padding in mm
 * @returns {{x0: number, y0: number, x1: number, y1: number}}
 */
function getCardRect(colIndex, rowIndex, cardWidth, cardHeight, horizontalPadding, verticalPadding) {
    const x0 = horizontalPadding + colIndex * (cardWidth + horizontalPadding);
    const y0 = verticalPadding + rowIndex * (cardHeight + verticalPadding);

    return {
        x0,
        y0,
        x1: x0 + cardWidth,
        y1: y0 + cardHeight
    };
}

/**
 * Loads an image and resolves with its natural dimensions.
 * 
 * @param {string} dataUrl - Image data URL.
 * @returns {Promise<{width: number, height: number}>}
 */
function getImageDimensions(dataUrl) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.width, height: img.height });
        img.onerror = () => reject(new Error('Failed to load image dimensions'));
        img.src = dataUrl;
    });
}

/**
 * Calculates a contain-fit rectangle inside a box while preserving aspect ratio.
 * 
 * @param {number} contentWidth - Natural content width.
 * @param {number} contentHeight - Natural content height.
 * @param {number} boxWidth - Available box width.
 * @param {number} boxHeight - Available box height.
 * @returns {{width: number, height: number}}
 */
function containRect(contentWidth, contentHeight, boxWidth, boxHeight) {
    const scale = Math.min(boxWidth / contentWidth, boxHeight / contentHeight);
    return {
        width: contentWidth * scale,
        height: contentHeight * scale
    };
}

/**
 * Calculates total number of pages needed
 * 
 * @param {number} totalCards - Total number of cards to print
 * @param {number} cardsPerPage - Cards per page (colNum * rowNum)
 * @returns {number} - Number of pages
 */
function calculateTotalPages(totalCards, cardsPerPage) {
    return Math.ceil(totalCards / cardsPerPage);
}

/**
 * Converts mm to points (1 mm = 72/25.4 points)
 * Useful for PDF coordinate conversion
 * 
 * @param {number} mm - Value in millimeters
 * @returns {number} - Value in points
 */
function mmToPoints(mm) {
    return (mm * 72) / 25.4;
}

/**
 * Converts points to mm
 * 
 * @param {number} points - Value in points
 * @returns {number} - Value in millimeters
 */
function pointsToMm(points) {
    return (points * 25.4) / 72;
}

/**
 * Validates image file size
 * 
 * @param {File} file - File object
 * @param {number} maxSizeMB - Maximum size in MB (default 50)
 * @returns {boolean} - True if valid
 */
function isValidImageSize(file, maxSizeMB = 50) {
    const maxBytes = maxSizeMB * 1024 * 1024;
    return file.size <= maxBytes;
}

/**
 * Shows a message to the user
 * 
 * @param {string} message - Message text
 * @param {string} type - Message type ('success', 'error', 'warning', 'info')
 * @param {number} duration - Duration to show in ms (0 = permanent)
 */
function showMessage(message, type = 'info', duration = 5000) {
    const container = document.getElementById('message-container');
    if (!container) return;
    
    const messageEl = document.createElement('div');
    messageEl.className = `message message-${type}`;
    messageEl.textContent = message;
    
    container.appendChild(messageEl);
    
    if (duration > 0) {
        setTimeout(() => {
            messageEl.remove();
        }, duration);
    }
    
    return messageEl;
}

/**
 * Clears all messages
 */
function clearMessages() {
    const container = document.getElementById('message-container');
    if (container) {
        container.innerHTML = '';
    }
}

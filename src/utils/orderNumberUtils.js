/**
 * Generates the next order number (1-100) resetting daily.
 * Uses localStorage to persist the counter and date.
 * @returns {number} The next order number.
 */
/**
 * Peeks at the next order number without incrementing it.
 * @returns {number} The next order number.
 */
export const peekNextOrderNumber = () => {
    const today = new Date().toISOString().split('T')[0];
    const storedDate = localStorage.getItem('kiosk_order_date');
    let currentCount = parseInt(localStorage.getItem('kiosk_order_count') || '0', 10);

    // If date changed, next is 1
    if (storedDate !== today) {
        return 1;
    }

    // Increment counter
    let next = currentCount + 1;

    // Reset to 1 if > 100
    if (next > 100) {
        next = 1;
    }

    return next;
};

/**
 * Commits the next order number to storage.
 * Call this only when the order is confirmed.
 * @returns {number} The committed order number.
 */
export const commitOrderNumber = () => {
    const next = peekNextOrderNumber();
    const today = new Date().toISOString().split('T')[0];
    
    localStorage.setItem('kiosk_order_date', today);
    localStorage.setItem('kiosk_order_count', next.toString());
    
    return next;
};

/**
 * Gets the current order info (number and date) without incrementing.
 * @returns {object|null} { number, date } or null if not set.
 */
export const getCurrentOrderInfo = () => {
    const storedDate = localStorage.getItem('kiosk_order_date');
    const storedCount = localStorage.getItem('kiosk_order_count');
    
    if (!storedDate || !storedCount) return null;
    
    return {
        number: parseInt(storedCount, 10),
        date: storedDate
    };
};

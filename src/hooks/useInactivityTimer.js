import { useEffect, useRef, useCallback } from 'react';

/**
 * Fires onIdle() after `timeout` ms of no user interaction.
 * Any touch / mouse / key event resets the timer.
 * Returns resetTimer() so callers can reset it programmatically.
 */
const useInactivityTimer = (onIdle, timeout = 30000, enabled = true) => {
    const timerRef = useRef(null);
    const onIdleRef = useRef(onIdle);

    // Keep the callback ref fresh without re-registering listeners
    useEffect(() => { onIdleRef.current = onIdle; }, [onIdle]);

    const resetTimer = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => onIdleRef.current?.(), timeout);
    }, [timeout]);

    useEffect(() => {
        if (!enabled) {
            if (timerRef.current) clearTimeout(timerRef.current);
            return;
        }

        const events = ['mousemove', 'mousedown', 'touchstart', 'keydown', 'scroll', 'click'];
        events.forEach(e => document.addEventListener(e, resetTimer, { passive: true }));

        // Start the timer immediately
        resetTimer();

        return () => {
            events.forEach(e => document.removeEventListener(e, resetTimer));
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [enabled, resetTimer]);

    return { resetTimer };
};

export default useInactivityTimer;

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { version } from '../../package.json';

const VersionFooter = () => {
    const navigate = useNavigate();
    const [clickCount, setClickCount] = useState(0);

    const handleVersionClick = () => {
        const nextCount = clickCount + 1;
        if (nextCount >= 5) {
            setClickCount(0);
            navigate('/login');
        } else {
            setClickCount(nextCount);
        }
    };

    // Reset count after 2 seconds of inactivity
    useEffect(() => {
        if (clickCount > 0) {
            const timer = setTimeout(() => setClickCount(0), 2000);
            return () => clearTimeout(timer);
        }
    }, [clickCount]);

    return (
        <div className="fixed bottom-2 right-2 z-50 flex items-center gap-2 pointer-events-auto">
            <div className="bg-black/80 backdrop-blur-md text-white text-[10px] px-3 py-1.5 rounded-md shadow-lg border border-white/10 flex items-center gap-3 transition-all duration-300">
                <span
                    className="opacity-70 font-mono cursor-pointer select-none hover:text-white"
                    onClick={handleVersionClick}
                    title="Version Info"
                >
                    v{version}
                </span>

                <div className="h-3 w-[1px] bg-white/20 mx-1" />

                <div className="flex gap-3 text-[9px] uppercase tracking-wider font-bold">
                    <button onClick={() => navigate('/legal/legal')} className="opacity-50 hover:opacity-100 transition-opacity">Legal</button>
                    <button onClick={() => navigate('/legal/privacy')} className="opacity-50 hover:opacity-100 transition-opacity">Privacidad</button>
                    <button onClick={() => navigate('/legal/cookies')} className="opacity-50 hover:opacity-100 transition-opacity">Cookies</button>
                    <button onClick={() => navigate('/legal/terms')} className="opacity-50 hover:opacity-100 transition-opacity">Condiciones</button>
                </div>
            </div>
        </div>
    );
};

export default VersionFooter;

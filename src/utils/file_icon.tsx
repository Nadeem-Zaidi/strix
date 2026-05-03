export const FileIcon = ({ ext }: { ext: string }) => {
    // color by extension
    const color: Record<string, string> = {
        pdf: '#E53935',
        png: '#8E24AA', jpg: '#8E24AA', jpeg: '#8E24AA', gif: '#8E24AA', webp: '#8E24AA',
        json: '#F9A825',
        ts: '#1565C0', tsx: '#1565C0', js: '#F57F17', jsx: '#F57F17',
        md: '#00897B',
        txt: '#546E7A',
        csv: '#2E7D32',
        zip: '#6D4C41', rar: '#6D4C41',
    };
    const bg = color[ext.toLowerCase()] ?? '#546E7A';

    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
                d="M6 2H14L20 8V21C20 21.5523 19.5523 22 19 22H5C4.44772 22 4 21.5523 4 21V3C4 2.44772 4.44772 2 5 2H6Z"
                fill={bg}
                opacity="0.15"
                stroke={bg}
                strokeWidth="1.2"
            />
            {/* folded corner */}
            <path d="M14 2L20 8H14V2Z" fill={bg} opacity="0.4" />
            {/* extension label */}
            <text
                x="12"
                y="17"
                textAnchor="middle"
                fontSize="5.5"
                fontWeight="700"
                fontFamily="monospace"
                fill={bg}
            >
                {ext.toUpperCase().slice(0, 4)}
            </text>
        </svg>
    );
};
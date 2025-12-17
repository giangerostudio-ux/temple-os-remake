// ============================================
// CONSTANTS & STATIC DATA
// ============================================

// Bible verses for Word of God feature
export const bibleVerses = [
    { text: "In the beginning God created the heaven and the earth.", ref: "Genesis 1:1" },
    { text: "The LORD is my shepherd; I shall not want.", ref: "Psalm 23:1" },
    { text: "For God so loved the world, that he gave his only begotten Son.", ref: "John 3:16" },
    { text: "I can do all things through Christ which strengtheneth me.", ref: "Philippians 4:13" },
    { text: "Trust in the LORD with all thine heart; and lean not unto thine own understanding.", ref: "Proverbs 3:5" },
    { text: "The fear of the LORD is the beginning of wisdom.", ref: "Proverbs 9:10" },
    { text: "Be strong and of a good courage; be not afraid.", ref: "Joshua 1:9" },
    { text: "And we know that all things work together for good to them that love God.", ref: "Romans 8:28" },
    { text: "Create in me a clean heart, O God; and renew a right spirit within me.", ref: "Psalm 51:10" },
    { text: "The LORD is my light and my salvation; whom shall I fear?", ref: "Psalm 27:1" },
];

// Oracle word list (TempleOS authenticity)
export const oracleWordList = [
    'DIVINE', 'GLORY', 'TEMPLE', 'ALTAR', 'PROPHET', 'WISDOM', 'COVENANT', 'CHERUB', 'SERAPH', 'JUBILEE',
    'SABBATH', 'PSALM', 'GOSPEL', 'REVELATION', 'KINGDOM', 'RIGHTEOUS', 'HOLY', 'TRUTH', 'LIGHT', 'MERCY',
    'FAITH', 'GRACE', 'PEACE', 'JUDGMENT', 'BREAD', 'WATER', 'VINE', 'LAMB', 'CROWN', 'SWORD',
    'ORACLE', 'VISION', 'DREAM', 'VOICE', 'SIGN', 'SEAL', 'SCROLL', 'TRUMPET', 'THRONE', 'RIVER',
    'STONE', 'PILLAR', 'GATE', 'CITY', 'GARDEN', 'PATH', 'STAR', 'FIRE', 'WIND', 'CLOUD',
];

// Terry Davis quotes (authentic and legendary)
export const terryQuotes = [
    'An idiot admires complexity, a genius admires simplicity.',
    'I like doing big things. It feels like a calling.',
    'The best programs are written when you are inspired.',
    'Keep it simple and it will work better.',
    'Computers are not about computers. They are about God.',
    'God is the best programmer.',
    'The CIA glows in the dark; you can see them if you\'re driving.',
    'I wrote my own compiler, my own assembler, my own editor, my own graphics library.',
    'Minimalism is Godliness.',
    'If you want to talk to God, you have to do it on His terms.',
    '640x480 16 color is a sacred covenant.',
    'I am the smartest programmer that has ever lived.',
    'Just run them over. That\'s what you do.',
    'They have to be glowing.',
    'Everything I do is for God.',
    'The Holy Spirit guides my typing.',
];

// Prayers
export const prayers = [
    'Lord, grant me wisdom today, and keep my heart humble.',
    'Father, guide my steps and bless the work of my hands.',
    'God of peace, calm my mind and strengthen my faith.',
    'Lord Jesus Christ, have mercy on me and lead me in truth.',
    'Holy God, make me bold for good and gentle with others.',
];

// Fortune cookie wisdom
export const fortunes = [
    'Simplicity is divine.',
    'Write code as if you will read it in 10 years.',
    'A small, correct tool beats a large, broken one.',
    'Blessed are the curious; they debug with patience.',
    'Measure twice, cut once, and test always.',
];

// Konami code sequence
export const KONAMI_CODE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

// 16-color VGA palette (TempleOS authenticity)
export const VGA_PALETTE = [
    '#000000', '#0000AA', '#00AA00', '#00AAAA',
    '#AA0000', '#AA00AA', '#AA5500', '#AAAAAA',
    '#555555', '#5555FF', '#55FF55', '#55FFFF',
    '#FF5555', '#FF55FF', '#FFFF55', '#FFFFFF'
];

// File icon mapping
export const FILE_ICON_MAP: Record<string, string> = {
    // Documents
    'txt': '📄', 'md': '📄', 'doc': '📄', 'docx': '📄', 'pdf': '📕',
    // Code
    'ts': '📜', 'js': '📜', 'py': '🐍', 'hc': '✝️', 'c': '📜', 'cpp': '📜', 'h': '📜',
    'html': '🌐', 'css': '🎨', 'json': '📋', 'xml': '📋',
    // Media
    'jpg': '🖼️', 'jpeg': '🖼️', 'png': '🖼️', 'gif': '🖼️', 'svg': '🖼️', 'webp': '🖼️',
    'mp3': '🎵', 'wav': '🎵', 'ogg': '🎵', 'flac': '🎵',
    'mp4': '🎬', 'mkv': '🎬', 'avi': '🎬', 'webm': '🎬',
    // Archives
    'zip': '📦', 'tar': '📦', 'gz': '📦', 'rar': '📦', '7z': '📦',
    // Executables
    'exe': '⚙️', 'sh': '⚙️', 'bin': '⚙️', 'AppImage': '⚙️',
};

// Image file extensions
export const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'];

// Video file extensions
export const VIDEO_EXTENSIONS = ['mp4', 'mkv', 'avi', 'webm', 'mov', 'flv', 'wmv'];

// Audio file extensions
export const AUDIO_EXTENSIONS = ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma'];

// Default window dimensions
export const DEFAULT_WINDOW = {
    width: 800,
    height: 600,
    x: 100,
    y: 100,
};

// Snap margin for window snapping (pixels)
export const SNAP_MARGIN = 20;

// Taskbar height
export const TASKBAR_HEIGHT = 50;

// System monitor refresh interval (ms)
export const MONITOR_REFRESH_INTERVAL = 2000;

// CPU history buffer size (for graphing)
export const CPU_HISTORY_SIZE = 60;

// Notification display duration (ms)
export const NOTIFICATION_DURATION = 5000;

// Auto-lock default timeout (ms)
export const DEFAULT_LOCK_TIMEOUT = 300000; // 5 minutes

// Slideshow default interval (ms)
export const SLIDESHOW_INTERVAL = 3000; // 3 seconds

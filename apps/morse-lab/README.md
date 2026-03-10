# Morse Code App

A feature-rich, production-ready Morse code encoder, decoder, and training application with a modern premium UI.

## Features

### Encode & Decode
- Real-time text to Morse code conversion
- Decode Morse code back to text
- Support for letters, numbers, and punctuation
- Copy Morse code or decoded text to clipboard

### Audio Playback
- Play Morse code audio with adjustable speed (5-35 WPM)
- Adjustable frequency (400-1000 Hz)
- Volume control
- Multiple audio profiles (Clean, Radio, Telegraph, CW, etc.)
- Farnsworth spacing for learners
- Loop playback option
- Visual waveform display

### Practice Mode
- Multiple difficulty levels (Beginner to Expert)
- Various drill types:
  - Single Characters
  - Common Words
  - Call Signs
  - Sentences
  - Listen & Type (audio recognition)
- Real-time feedback and scoring
- Streak tracking
- Adaptive learning (identifies weak characters)

### Progress Tracking
- Session statistics
- Overall accuracy tracking
- Daily streak system
- Achievement system (15 unlockable achievements)
- Weak character identification
- Practice time tracking

### Preset Packs
- Emergency (SOS, MAYDAY, etc.)
- Ham Radio (CQ, QTH, 73, etc.)
- Aviation (WILCO, ROGER, etc.)
- Maritime (SECURITE, etc.)
- Greetings
- Practice phrases

### Export & Share
- Download as MP3 or WAV
- Share via Web Share API
- QR code generation for messages
- Shareable links with encoded message

### Additional Features
- Dark/Light theme toggle
- Keyboard shortcuts
- Message history
- Reference chart with search
- Fully responsive design
- Offline support (PWA)
- Installable on mobile/desktop

## Installation

Simply open `index.html` in a modern web browser, or deploy to any static hosting service.

For the best experience, install the app using your browser's "Add to Home Screen" or "Install" option.

## Development

No build step required. The app uses vanilla JavaScript with ES modules.

### File Structure
```
morse/
├── index.html          # Main HTML file
├── manifest.json       # PWA manifest
├── sw.js              # Service worker for offline support
├── css/
│   └── styles.css     # All styles
├── js/
│   ├── app.js         # Main application logic
│   ├── morse.js       # Morse code encoding/decoding
│   ├── audio.js       # Audio generation and playback
│   ├── export.js      # MP3/WAV export and sharing
│   ├── practice.js    # Practice mode logic
│   └── stats.js       # Statistics and progress tracking
└── icons/
    └── icon.svg       # App icon
```

## Browser Support

- Chrome/Edge 80+
- Firefox 75+
- Safari 13+
- Mobile browsers (iOS Safari, Chrome for Android)

## Keyboard Shortcuts

- `Ctrl/Cmd + Enter` - Play/Stop audio
- `Esc` - Stop playback / Close modals
- `Enter` - Submit answer (in Practice mode)
- Arrow keys - Navigate tabs

## Technologies

- Vanilla JavaScript (ES modules)
- Web Audio API for audio generation
- localStorage for persistence
- Service Worker for offline support
- lamejs for MP3 encoding

## License

MIT License - feel free to use and modify for your own projects.

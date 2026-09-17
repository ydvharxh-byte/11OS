# Class 11 Study OS

A personal, data-driven Class 11 CBSE study and academic management system backed by SQLite and Node.js.

## ✨ Features

- **📚 Real CBSE Class 11 Syllabus Engine**: Full chapter and topic trees for Physics, Chemistry, Mathematics, Computer Science, and English. Derived subject mastery from real evaluations.
- **⚡ Priority Study Planner & Smart Time Budget**: Dynamically balances daily school rhythms, upcoming exams, teacher-important topics (⭐), high-priority backlog, and multi-day school notebook chunking.
- **📱 Real Telegram MTProto Integration**:
  - Direct connection to Telegram Data Centers with session persistence.
  - Monitors student channels & groups.
  - Automatic keyword-based CBSE content classification (NCERT, Notes, Question Sheets, Tests).
  - Multi-item Import Review queue with one-click approval into topic resources.
- **🎧 Spotify In-Site Study Music**:
  - Embedded Study Music Player with instant streams (*Lofi Study, Deep Focus, Peaceful Piano, Classical Study*) requiring 0 developer keys.
  - Official Spotify Web API OAuth connector for personal playlists and live search.
- **📓 Dedicated School Notebook Tracker**:
  - Tracks physical school notebook submission and homework separately from academic mastery.
  - Full lifecycle support: `NOT_STARTED` → `IN_PROGRESS` → `COMPLETED` → `NEEDS_CORRECTION` → `RESUBMITTED`.
  - Realistic multi-day session chunking in the daily planner.
- **📝 CBSE Practice & AI Marking Rubric**:
  - Interactive CBSE board-style practice questions across all topics.
  - Step-by-step scoring for concept understanding, formula/method, algebraic accuracy, and CBSE presentation.
- **☁️ Google Drive Resource Linking**:
  - Automatic file ID extraction from Drive URLs with instant document preview.

## 🚀 Getting Started

### Prerequisites
- Node.js 22+ (uses Node's native SQLite support).

### Installation & Run

1. Clone this repository:
   ```bash
   git clone https://github.com/ydvharxh-byte/11OS.git
   cd 11OS
   ```

2. Copy the environment template:
   ```bash
   cp .env.example .env
   ```

3. (Optional) Configure credentials in `.env`:
   - `TELEGRAM_API_ID` & `TELEGRAM_API_HASH` (from [my.telegram.org](https://my.telegram.org))
   - `SPOTIFY_CLIENT_ID` & `SPOTIFY_CLIENT_SECRET` (from [developer.spotify.com](https://developer.spotify.com))
   - `GEMINI_API_KEY` (for automated CBSE board-examiner grading)

4. Run the server:
   ```powershell
   node server.js
   ```

5. Open [http://localhost:4173](http://localhost:4173) in your browser.

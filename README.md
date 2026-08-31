# 🎓 Student Task Manager

A modern, responsive, and feature-packed web application designed specifically for students to manage coursework, assignments, exams, study sessions, and deadlines with ease.

![Student Task Manager](https://img.shields.io/badge/Status-Ready%20to%20Use-success)
![Storage](https://img.shields.io/badge/Storage-LocalStorage%20(Offline%20First)-indigo)
![License](https://img.shields.io/badge/License-MIT-blue)

---

## ✨ Features

### 📋 1. Coursework & Task Tracking
- **Multi-Category Tasks**: Organize by *Assignment*, *Exam / Quiz*, *Project*, *Reading*, *Homework*, or *Revision*.
- **Course / Subject Tagging**: Assign tasks to color-coded courses (Computer Science, Math, Physics, Chemistry, History, Literature, or your own custom subjects).
- **Priority & Deadlines**: Priority badges (High, Medium, Low) with smart overdue and "Due Today" alerts.
- **Subtask Milestones**: Break large projects down into bite-sized checklist items with automatic progress calculation.
- **Estimated Study Durations**: Keep track of required study hours/minutes per assignment.

### 📊 2. Kanban Workflow Board
- Visualize workflow stages: **To Do**, **In Progress**, and **Completed**.
- Interactive cards with subject tags, subtask progress, and deadline reminders.
- Move tasks across columns to track daily progress.

### 📅 3. Interactive Deadlines Calendar
- Monthly grid view displaying upcoming deadlines and exam schedules.
- Color-coded indicators per subject for quick visual scanning.
- Day inspection drawer with one-click task addition for specific dates.

### ⏱️ 4. Pomodoro Study Focus Timer
- Integrated study clock with configurable intervals (25m Focus / 5m Short Break / 15m Long Break).
- **Web Audio API Chimes**: Gentle bell alert chords on session completion (no external audio assets required).
- **Task Linking**: Directly attach the active study timer to any task from your coursework list.
- Tracks completed focus sessions and study streaks.

### 📈 5. Productivity & Analytics Dashboard
- Overall completion rate percentage and progress metrics.
- Subject-by-subject workload distribution bars.
- Priority and category distribution graphs.
- Daily study streak counter.

### 🎨 6. Customization & Backup
- **Dark Mode & Light Mode**: Seamless theme switching with saved preference.
- **Custom Subject Manager**: Add and delete custom courses with personalized color palettes.
- **Offline-First & Data Persistence**: Data is automatically saved in `localStorage`.
- **JSON Backup & Restore**: One-click export and import of all student data.

---

## 🚀 Getting Started

Simply open `index.html` in any modern web browser:

1. Double-click `index.html` in your file explorer, OR
2. Serve locally using any HTTP server:
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js (npx)
   npx serve .
   ```
3. Open `http://localhost:8000` (or `file:///.../index.html`) in your browser.

---

## 📁 Project Structure

```
anti gravity/
├── index.html          # Main web application layout and modal views
├── css/
│   └── styles.css      # Custom animations, dark mode utilities, and scrollbars
├── js/
│   ├── app.js          # Main app coordinator, theme toggle, modals & toasts
│   ├── storage.js      # LocalStorage manager, export/import & default student tasks
│   ├── taskManager.js  # Task CRUD, filters, search, sorting & Kanban board
│   ├── pomodoro.js     # Pomodoro study timer with Web Audio API synthesizer
│   ├── calendar.js     # Monthly deadlines calendar
│   └── stats.js        # Productivity stats & subject workload visualization
└── README.md           # Documentation & feature guide
```

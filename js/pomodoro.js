/**
 * Pomodoro Study Timer Module
 * Features: Work/Break intervals, Web Audio API sound synthesis, task linking, and study stats.
 */

class PomodoroTimer {
  constructor() {
    this.mode = 'work'; // 'work', 'shortBreak', 'longBreak'
    this.status = 'idle'; // 'idle', 'running', 'paused'
    this.timeLeft = 25 * 60;
    this.totalDuration = 25 * 60;
    this.timerId = null;
    this.cycleCount = 0;
    this.selectedTaskId = null;
    
    this.audioContext = null;
  }

  init() {
    this.loadSettings();
    this.render();
    this.bindEvents();
  }

  loadSettings() {
    const settings = window.storageService.getSettings();
    if (this.mode === 'work') {
      this.totalDuration = (settings.pomodoroWork || 25) * 60;
    } else if (this.mode === 'shortBreak') {
      this.totalDuration = (settings.pomodoroShortBreak || 5) * 60;
    } else if (this.mode === 'longBreak') {
      this.totalDuration = (settings.pomodoroLongBreak || 15) * 60;
    }
    if (this.status === 'idle') {
      this.timeLeft = this.totalDuration;
      this.updateDisplay();
    }
  }

  setMode(mode) {
    if (this.status === 'running') {
      this.pause();
    }
    this.mode = mode;
    this.status = 'idle';
    this.loadSettings();
    this.updateDisplay();
    this.updateModeButtons();
  }

  start() {
    if (this.status === 'running') return;
    
    // Initialize Web Audio API on user gesture
    if (!this.audioContext) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.audioContext = new AudioCtx();
    }
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    this.status = 'running';
    document.getElementById('pomodoro-card')?.classList.add('timer-running');
    
    this.timerId = setInterval(() => {
      this.tick();
    }, 1000);

    this.updateControls();
  }

  pause() {
    if (this.status !== 'running') return;
    this.status = 'paused';
    clearInterval(this.timerId);
    this.timerId = null;
    document.getElementById('pomodoro-card')?.classList.remove('timer-running');
    this.updateControls();
  }

  reset() {
    this.pause();
    this.status = 'idle';
    this.loadSettings();
    this.updateDisplay();
    this.updateControls();
    document.getElementById('pomodoro-card')?.classList.remove('timer-running');
  }

  tick() {
    if (this.timeLeft > 0) {
      this.timeLeft--;
      this.updateDisplay();
    } else {
      this.onComplete();
    }
  }

  onComplete() {
    this.pause();
    this.playSound();

    const settings = window.storageService.getSettings();

    if (this.mode === 'work') {
      this.cycleCount++;
      const studyMins = settings.pomodoroWork || 25;
      
      // Update global stats
      const stats = window.storageService.getStats();
      stats.pomodoroMinutes = (stats.pomodoroMinutes || 0) + studyMins;
      stats.sessionsCompleted = (stats.sessionsCompleted || 0) + 1;
      window.storageService.saveStats(stats);

      if (window.app) {
        window.app.showToast(`🎉 Great job! Study session of ${studyMins}m completed.`, 'success');
        if (window.taskStats) window.taskStats.render();
      }

      // Determine next mode
      if (this.cycleCount % 4 === 0) {
        this.setMode('longBreak');
      } else {
        this.setMode('shortBreak');
      }
    } else {
      if (window.app) {
        window.app.showToast('🔔 Break finished! Ready to get back to focus?', 'info');
      }
      this.setMode('work');
    }

    if (settings.autoStartBreaks) {
      this.start();
    }
  }

  playSound() {
    const settings = window.storageService.getSettings();
    if (!settings.soundEnabled) return;

    try {
      if (!this.audioContext) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.audioContext = new AudioCtx();
      }
      if (this.audioContext) {
        const ctx = this.audioContext;
        const now = ctx.currentTime;
        
        // Gentle bell chime chords (C5 - G5 - C6)
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, index) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + index * 0.15);
          
          gain.gain.setValueAtTime(0, now + index * 0.15);
          gain.gain.linearRampToValueAtTime(0.2, now + index * 0.15 + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.15 + 1.2);
          
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.start(now + index * 0.15);
          osc.stop(now + index * 0.15 + 1.2);
        });
      }
    } catch (e) {
      console.warn('Audio playback error:', e);
    }
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  updateDisplay() {
    const timeStr = this.formatTime(this.timeLeft);
    const displayEl = document.getElementById('pomodoro-timer-display');
    if (displayEl) {
      displayEl.textContent = timeStr;
    }

    // Document title update
    const modeName = this.mode === 'work' ? 'Study' : 'Break';
    document.title = this.status === 'running' ? `(${timeStr}) ${modeName} - Student Task Manager` : 'Student Task Manager';

    // Progress circle / bar
    const progressBar = document.getElementById('pomodoro-progress-bar');
    if (progressBar && this.totalDuration > 0) {
      const percentage = ((this.totalDuration - this.timeLeft) / this.totalDuration) * 100;
      progressBar.style.width = `${percentage}%`;
    }
  }

  updateModeButtons() {
    const btnWork = document.getElementById('pomo-btn-work');
    const btnShort = document.getElementById('pomo-btn-short');
    const btnLong = document.getElementById('pomo-btn-long');

    const activeClasses = ['bg-indigo-600', 'text-white', 'shadow-md'];
    const inactiveClasses = ['text-slate-600', 'dark:text-slate-300', 'hover:bg-slate-200', 'dark:hover:bg-slate-700'];

    [
      { el: btnWork, mode: 'work' },
      { el: btnShort, mode: 'shortBreak' },
      { el: btnLong, mode: 'longBreak' }
    ].forEach(({ el, mode }) => {
      if (!el) return;
      if (this.mode === mode) {
        el.classList.add(...activeClasses);
        el.classList.remove(...inactiveClasses);
      } else {
        el.classList.remove(...activeClasses);
        el.classList.add(...inactiveClasses);
      }
    });

    const cycleBadge = document.getElementById('pomo-cycle-badge');
    if (cycleBadge) {
      cycleBadge.textContent = `Completed Cycles: ${this.cycleCount}`;
    }
  }

  updateControls() {
    const startBtn = document.getElementById('pomo-start-btn');
    const pauseBtn = document.getElementById('pomo-pause-btn');

    if (startBtn && pauseBtn) {
      if (this.status === 'running') {
        startBtn.classList.add('hidden');
        pauseBtn.classList.remove('hidden');
      } else {
        startBtn.classList.remove('hidden');
        pauseBtn.classList.add('hidden');
      }
    }
  }

  render() {
    this.updateDisplay();
    this.updateModeButtons();
    this.updateControls();
    this.populateTaskSelector();
  }

  populateTaskSelector() {
    const select = document.getElementById('pomodoro-task-select');
    if (!select) return;

    const tasks = window.storageService.getTasks().filter(t => t.status !== 'completed');
    
    select.innerHTML = '<option value="">-- Optional: Link a Task to Focus on --</option>' +
      tasks.map(t => `<option value="${t.id}">${t.title}</option>`).join('');

    if (this.selectedTaskId) {
      select.value = this.selectedTaskId;
    }
  }

  bindEvents() {
    document.getElementById('pomo-btn-work')?.addEventListener('click', () => this.setMode('work'));
    document.getElementById('pomo-btn-short')?.addEventListener('click', () => this.setMode('shortBreak'));
    document.getElementById('pomo-btn-long')?.addEventListener('click', () => this.setMode('longBreak'));

    document.getElementById('pomo-start-btn')?.addEventListener('click', () => this.start());
    document.getElementById('pomo-pause-btn')?.addEventListener('click', () => this.pause());
    document.getElementById('pomo-reset-btn')?.addEventListener('click', () => this.reset());
    document.getElementById('pomo-skip-btn')?.addEventListener('click', () => this.onComplete());

    document.getElementById('pomodoro-task-select')?.addEventListener('change', (e) => {
      this.selectedTaskId = e.target.value;
      if (this.selectedTaskId && window.app) {
        const task = window.storageService.getTasks().find(t => t.id === this.selectedTaskId);
        if (task) {
          window.app.showToast(`Focused on: "${task.title}"`, 'info');
        }
      }
    });
  }
}

window.pomodoroTimer = new PomodoroTimer();

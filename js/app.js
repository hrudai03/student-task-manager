/**
 * Main Application Controller
 * Coordinates views, modals, theme toggles, subjects management, settings, and toast notifications.
 */

class App {
  constructor() {
    this.currentView = 'list'; // 'list', 'kanban', 'calendar', 'pomodoro', 'analytics'
  }

  init() {
    this.initTheme();
    this.populateSubjectFilters();

    // Initialize modules
    if (window.taskManager) window.taskManager.init();
    if (window.taskCalendar) window.taskCalendar.init();
    if (window.pomodoroTimer) window.pomodoroTimer.init();
    if (window.taskStats) window.taskStats.init();

    this.bindGlobalEvents();
    this.updateSubjectManagerList();
    this.loadSettingsToForm();

    // Render Lucide icons if available
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  // --- Theme Controller ---
  initTheme() {
    const settings = window.storageService.getSettings();
    const isDark = settings.theme === 'dark' || (!settings.theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    this.updateThemeButtonIcon(isDark);
  }

  toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    const settings = window.storageService.getSettings();
    settings.theme = isDark ? 'dark' : 'light';
    window.storageService.saveSettings(settings);
    this.updateThemeButtonIcon(isDark);
    this.showToast(`Switched to ${isDark ? 'Dark' : 'Light'} Mode`, 'info');
  }

  updateThemeButtonIcon(isDark) {
    const themeIcon = document.getElementById('theme-toggle-icon');
    if (themeIcon) {
      themeIcon.textContent = isDark ? '☀️' : '🌙';
    }
  }

  // --- View Switcher ---
  switchView(viewName) {
    this.currentView = viewName;
    const views = ['list', 'kanban', 'calendar', 'pomodoro', 'analytics'];
    
    views.forEach(v => {
      const el = document.getElementById(`view-${v}`);
      if (el) {
        if (v === viewName) {
          el.classList.remove('hidden');
        } else {
          el.classList.add('hidden');
        }
      }
    });

    // Update nav tab highlights
    document.querySelectorAll('.view-nav-tab').forEach(tab => {
      const target = tab.getAttribute('data-view');
      if (target === viewName) {
        tab.classList.add('bg-indigo-600', 'text-white', 'shadow-md');
        tab.classList.remove('text-slate-600', 'dark:text-slate-300', 'hover:bg-slate-100', 'dark:hover:bg-slate-800');
      } else {
        tab.classList.remove('bg-indigo-600', 'text-white', 'shadow-md');
        tab.classList.add('text-slate-600', 'dark:text-slate-300', 'hover:bg-slate-100', 'dark:hover:bg-slate-800');
      }
    });

    // Refresh view specific components
    if (viewName === 'calendar' && window.taskCalendar) window.taskCalendar.render();
    if (viewName === 'analytics' && window.taskStats) window.taskStats.render();
    if (viewName === 'pomodoro' && window.pomodoroTimer) window.pomodoroTimer.populateTaskSelector();
  }

  // --- Populate Subject Dropdowns & Filters ---
  populateSubjectFilters() {
    const filterSubject = document.getElementById('filter-subject');
    if (!filterSubject) return;

    const subjects = window.storageService.getSubjects();
    filterSubject.innerHTML = '<option value="all">All Subjects / Courses</option>' +
      subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
  }

  // --- Subjects Management Modal ---
  openSubjectModal() {
    this.updateSubjectManagerList();
    document.getElementById('subject-modal')?.classList.remove('hidden');
  }

  closeSubjectModal() {
    document.getElementById('subject-modal')?.classList.add('hidden');
  }

  updateSubjectManagerList() {
    const listContainer = document.getElementById('subject-manager-list');
    if (!listContainer) return;

    const subjects = window.storageService.getSubjects();
    const tasks = window.storageService.getTasks();

    listContainer.innerHTML = subjects.map(sub => {
      const taskCount = tasks.filter(t => t.subjectId === sub.id).length;

      return `
        <div class="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
          <div class="flex items-center gap-2.5">
            <span class="w-4 h-4 rounded-full shadow-inner" style="background-color: ${sub.color};"></span>
            <div>
              <p class="text-xs font-bold text-slate-800 dark:text-slate-200">${sub.name}</p>
              <p class="text-[10px] text-slate-400">${taskCount} active tasks</p>
            </div>
          </div>
          <div class="flex items-center gap-1">
            <button onclick="window.app.deleteSubject('${sub.id}')" class="p-1 text-slate-400 hover:text-rose-600 transition-colors text-xs" title="Delete subject">
              🗑️
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  addNewSubject(name, color) {
    if (!name.trim()) return;
    const subjects = window.storageService.getSubjects();
    const newSubject = {
      id: 'sub-' + Date.now(),
      name: name.trim(),
      color: color || '#6366f1'
    };

    subjects.push(newSubject);
    window.storageService.saveSubjects(subjects);
    this.populateSubjectFilters();
    this.updateSubjectManagerList();
    if (window.taskManager) window.taskManager.render();
    this.showToast(`Subject "${name}" added!`, 'success');
  }

  deleteSubject(id) {
    const subjects = window.storageService.getSubjects();
    if (subjects.length <= 1) {
      alert('You must have at least one subject/course.');
      return;
    }

    if (!confirm('Are you sure you want to delete this subject? Tasks under this subject will remain.')) return;

    const updated = subjects.filter(s => s.id !== id);
    window.storageService.saveSubjects(updated);
    this.populateSubjectFilters();
    this.updateSubjectManagerList();
    if (window.taskManager) window.taskManager.render();
    this.showToast('Subject deleted', 'info');
  }

  // --- Settings Modal ---
  openSettingsModal() {
    this.loadSettingsToForm();
    document.getElementById('settings-modal')?.classList.remove('hidden');
  }

  closeSettingsModal() {
    document.getElementById('settings-modal')?.classList.add('hidden');
  }

  loadSettingsToForm() {
    const settings = window.storageService.getSettings();
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val;
    };
    const setChecked = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.checked = !!val;
    };

    setVal('setting-pomo-work', settings.pomodoroWork || 25);
    setVal('setting-pomo-short', settings.pomodoroShortBreak || 5);
    setVal('setting-pomo-long', settings.pomodoroLongBreak || 15);
    setChecked('setting-sound', settings.soundEnabled);
    setChecked('setting-auto-break', settings.autoStartBreaks);
  }

  saveSettingsFromForm() {
    const settings = {
      theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
      pomodoroWork: parseInt(document.getElementById('setting-pomo-work')?.value, 10) || 25,
      pomodoroShortBreak: parseInt(document.getElementById('setting-pomo-short')?.value, 10) || 5,
      pomodoroLongBreak: parseInt(document.getElementById('setting-pomo-long')?.value, 10) || 15,
      soundEnabled: document.getElementById('setting-sound')?.checked ?? true,
      autoStartBreaks: document.getElementById('setting-auto-break')?.checked ?? false
    };

    window.storageService.saveSettings(settings);
    if (window.pomodoroTimer) window.pomodoroTimer.loadSettings();
    this.closeSettingsModal();
    this.showToast('Settings saved successfully!', 'success');
  }

  exportDataToFile() {
    const dataStr = window.storageService.exportData();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `student-task-manager-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('Backup JSON exported!', 'success');
  }

  importDataFromFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      const res = window.storageService.importData(content);
      if (res.success) {
        this.populateSubjectFilters();
        this.updateSubjectManagerList();
        if (window.taskManager) window.taskManager.render();
        if (window.pomodoroTimer) window.pomodoroTimer.loadSettings();
        this.showToast(res.message, 'success');
        this.closeSettingsModal();
      } else {
        alert(res.message);
      }
    };
    reader.readAsText(file);
  }

  resetAllData() {
    if (confirm('⚠️ WARNING: Are you sure you want to reset all data and restore defaults? This cannot be undone.')) {
      window.storageService.resetAllData();
      this.populateSubjectFilters();
      this.updateSubjectManagerList();
      if (window.taskManager) window.taskManager.render();
      this.closeSettingsModal();
      this.showToast('Data reset to default student sample tasks!', 'info');
    }
  }

  // --- Toast Notification System ---
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    const bgColors = {
      success: 'bg-emerald-600 text-white',
      error: 'bg-rose-600 text-white',
      info: 'bg-slate-800 text-white dark:bg-slate-700'
    };

    toast.className = `px-4 py-2.5 rounded-xl shadow-xl text-xs font-semibold flex items-center gap-2 transform transition-all duration-300 translate-y-4 opacity-0 ${bgColors[type] || bgColors.info}`;
    toast.textContent = message;

    container.appendChild(toast);

    // Animate in
    setTimeout(() => {
      toast.classList.remove('translate-y-4', 'opacity-0');
      toast.classList.add('translate-y-0', 'opacity-100');
    }, 10);

    // Animate out
    setTimeout(() => {
      toast.classList.remove('translate-y-0', 'opacity-100');
      toast.classList.add('translate-y-4', 'opacity-0');
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  // --- Global Event Bindings ---
  bindGlobalEvents() {
    // Theme toggle
    document.getElementById('theme-toggle-btn')?.addEventListener('click', () => this.toggleTheme());

    // Navigation tab view switching
    document.querySelectorAll('.view-nav-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const view = tab.getAttribute('data-view');
        this.switchView(view);
      });
    });

    // Add Task Button
    document.getElementById('btn-add-task-header')?.addEventListener('click', () => {
      window.taskManager.openTaskModal();
    });

    // Subjects Modal triggers
    document.getElementById('btn-manage-subjects')?.addEventListener('click', () => this.openSubjectModal());
    document.getElementById('subject-modal-close')?.addEventListener('click', () => this.closeSubjectModal());
    document.getElementById('form-add-subject')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameInput = document.getElementById('new-subject-name');
      const colorInput = document.getElementById('new-subject-color');
      if (nameInput && nameInput.value.trim()) {
        this.addNewSubject(nameInput.value, colorInput.value);
        nameInput.value = '';
      }
    });

    // Settings Modal triggers
    document.getElementById('btn-open-settings')?.addEventListener('click', () => this.openSettingsModal());
    document.getElementById('settings-modal-close')?.addEventListener('click', () => this.closeSettingsModal());
    document.getElementById('settings-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveSettingsFromForm();
    });

    document.getElementById('btn-export-json')?.addEventListener('click', () => this.exportDataToFile());
    document.getElementById('file-import-json')?.addEventListener('change', (e) => this.importDataFromFile(e));
    document.getElementById('btn-reset-data')?.addEventListener('click', () => this.resetAllData());
  }
}

// Bootstrap on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
  window.app.init();
});

/**
 * Stats & Analytics Module - Visual Workload & Productivity Dashboard
 */

class TaskStats {
  constructor() {}

  init() {
    this.render();
  }

  render() {
    const tasks = window.storageService.getTasks();
    const subjects = window.storageService.getSubjects();
    const statsData = window.storageService.getStats();

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const inProgress = tasks.filter(t => t.status === 'in_progress').length;
    const todo = tasks.filter(t => t.status === 'todo').length;
    const overdue = tasks.filter(t => t.status !== 'completed' && t.dueDate && t.dueDate < todayStr).length;
    const dueToday = tasks.filter(t => t.status !== 'completed' && t.dueDate === todayStr).length;

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Update Overview Metric Cards
    const totalEl = document.getElementById('stat-total-tasks');
    const compEl = document.getElementById('stat-completed-tasks');
    const pendingEl = document.getElementById('stat-pending-tasks');
    const overdueEl = document.getElementById('stat-overdue-tasks');
    const dueTodayEl = document.getElementById('stat-due-today-tasks');
    const rateEl = document.getElementById('stat-completion-rate');

    if (totalEl) totalEl.textContent = total;
    if (compEl) compEl.textContent = completed;
    if (pendingEl) pendingEl.textContent = inProgress + todo;
    if (overdueEl) overdueEl.textContent = overdue;
    if (dueTodayEl) dueTodayEl.textContent = dueToday;
    if (rateEl) rateEl.textContent = `${completionRate}%`;

    // Render Progress Bar in stats overview
    const mainProgressBar = document.getElementById('main-completion-bar');
    if (mainProgressBar) {
      mainProgressBar.style.width = `${completionRate}%`;
    }

    // Render Pomodoro & Study Stats
    const pomoMinsEl = document.getElementById('stat-pomo-minutes');
    const pomoSessionsEl = document.getElementById('stat-pomo-sessions');
    const streakEl = document.getElementById('stat-study-streak');

    if (pomoMinsEl) pomoMinsEl.textContent = `${statsData.pomodoroMinutes || 0}m`;
    if (pomoSessionsEl) pomoSessionsEl.textContent = statsData.sessionsCompleted || 0;
    if (streakEl) streakEl.textContent = `${statsData.streak || 1} 🔥`;

    // Render Subject Workload Breakdown
    this.renderSubjectWorkload(tasks, subjects);

    // Render Category Breakdown
    this.renderCategoryBreakdown(tasks);

    // Render Priority Breakdown
    this.renderPriorityBreakdown(tasks);
  }

  renderSubjectWorkload(tasks, subjects) {
    const container = document.getElementById('stats-subject-breakdown');
    if (!container) return;

    if (tasks.length === 0) {
      container.innerHTML = '<p class="text-xs text-slate-400 py-4 text-center">No tasks available to show breakdown.</p>';
      return;
    }

    const subjectCounts = {};
    const subjectCompleted = {};
    subjects.forEach(s => {
      subjectCounts[s.id] = 0;
      subjectCompleted[s.id] = 0;
    });

    tasks.forEach(t => {
      if (subjectCounts[t.subjectId] !== undefined) {
        subjectCounts[t.subjectId]++;
        if (t.status === 'completed') {
          subjectCompleted[t.subjectId]++;
        }
      }
    });

    const activeSubjects = subjects.filter(s => subjectCounts[s.id] > 0);

    if (activeSubjects.length === 0) {
      container.innerHTML = '<p class="text-xs text-slate-400 py-4 text-center">No subject tasks found.</p>';
      return;
    }

    container.innerHTML = activeSubjects.map(sub => {
      const count = subjectCounts[sub.id];
      const comp = subjectCompleted[sub.id];
      const pct = Math.round((comp / count) * 100);
      const totalPct = Math.round((count / tasks.length) * 100);

      return `
        <div class="space-y-1.5">
          <div class="flex items-center justify-between text-xs">
            <div class="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-200">
              <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${sub.color}"></span>
              <span>${sub.name}</span>
            </div>
            <div class="text-slate-400">
              <span class="font-semibold text-slate-700 dark:text-slate-300">${comp}/${count}</span> tasks (${pct}%)
            </div>
          </div>
          <div class="w-full bg-slate-100 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden flex">
            <div class="h-full rounded-full transition-all duration-500" style="width: ${pct}%; background-color: ${sub.color};"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  renderCategoryBreakdown(tasks) {
    const container = document.getElementById('stats-category-breakdown');
    if (!container) return;

    const categories = ['Assignment', 'Exam', 'Project', 'Reading', 'Homework', 'Revision'];
    const categoryColors = {
      Assignment: 'bg-blue-500',
      Exam: 'bg-rose-500',
      Project: 'bg-purple-500',
      Reading: 'bg-emerald-500',
      Homework: 'bg-amber-500',
      Revision: 'bg-cyan-500'
    };

    const counts = {};
    categories.forEach(c => counts[c] = 0);
    tasks.forEach(t => {
      if (counts[t.category] !== undefined) counts[t.category]++;
    });

    const activeCategories = categories.filter(c => counts[c] > 0);

    if (activeCategories.length === 0) {
      container.innerHTML = '<p class="text-xs text-slate-400 py-4 text-center">No categories recorded yet.</p>';
      return;
    }

    container.innerHTML = activeCategories.map(cat => {
      const count = counts[cat];
      const pct = Math.round((count / tasks.length) * 100);
      const color = categoryColors[cat] || 'bg-indigo-500';

      return `
        <div class="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full ${color}"></span>
            <span class="text-xs font-medium text-slate-700 dark:text-slate-300">${cat}</span>
          </div>
          <div class="text-xs font-bold text-slate-800 dark:text-slate-100">${count} <span class="text-[10px] font-normal text-slate-400">(${pct}%)</span></div>
        </div>
      `;
    }).join('');
  }

  renderPriorityBreakdown(tasks) {
    const container = document.getElementById('stats-priority-breakdown');
    if (!container) return;

    const priorities = ['High', 'Medium', 'Low'];
    const colors = {
      High: 'bg-rose-500 text-rose-500',
      Medium: 'bg-amber-500 text-amber-500',
      Low: 'bg-emerald-500 text-emerald-500'
    };

    const counts = { High: 0, Medium: 0, Low: 0 };
    tasks.forEach(t => {
      if (counts[t.priority] !== undefined) counts[t.priority]++;
    });

    container.innerHTML = priorities.map(p => {
      const count = counts[p];
      const pct = tasks.length > 0 ? Math.round((count / tasks.length) * 100) : 0;
      return `
        <div class="text-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50">
          <span class="text-xs font-bold uppercase tracking-wider ${p === 'High' ? 'text-red-500' : p === 'Medium' ? 'text-amber-500' : 'text-emerald-500'}">${p}</span>
          <div class="text-xl font-extrabold text-slate-800 dark:text-slate-100 mt-1">${count}</div>
          <div class="text-[10px] text-slate-400 mt-0.5">${pct}% of all tasks</div>
        </div>
      `;
    }).join('');
  }
}

window.taskStats = new TaskStats();

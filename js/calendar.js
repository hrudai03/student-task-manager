/**
 * Calendar Module - Monthly/Weekly Deadlines and Task Schedule
 */

class TaskCalendar {
  constructor() {
    this.currentDate = new Date();
    this.selectedDate = null;
  }

  init() {
    this.render();
    this.bindEvents();
  }

  render() {
    const calendarContainer = document.getElementById('calendar-grid');
    const monthYearTitle = document.getElementById('calendar-month-year');
    if (!calendarContainer || !monthYearTitle) return;

    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    monthYearTitle.textContent = `${monthNames[month]} ${year}`;

    // First day of month (0 = Sun, 1 = Mon, ..., 6 = Sat)
    const firstDayIndex = new Date(year, month, 1).getDay();
    // Last date of month
    const lastDate = new Date(year, month + 1, 0).getDate();
    // Last date of previous month
    const prevLastDate = new Date(year, month, 0).getDate();

    const tasks = window.storageService.getTasks();
    const subjects = window.storageService.getSubjects();
    const subjectMap = Object.fromEntries(subjects.map(s => [s.id, s]));

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    let html = '';

    // Day headers
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    html += '<div class="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">';
    days.forEach(d => {
      html += `<div class="py-1">${d}</div>`;
    });
    html += '</div>';

    // Calendar grid
    html += '<div class="grid grid-cols-7 gap-1 sm:gap-2 auto-rows-fr">';

    // Previous month filler days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevLastDate - i;
      html += `
        <div class="min-h-[70px] sm:min-h-[90px] p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 text-slate-400 dark:text-slate-600 opacity-50 text-xs select-none">
          <span>${dayNum}</span>
        </div>
      `;
    }

    // Days of the current month
    for (let day = 1; day <= lastDate; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isToday = dateStr === todayStr;
      const isSelected = this.selectedDate === dateStr;

      // Filter tasks due on this date
      const dayTasks = tasks.filter(t => t.dueDate === dateStr);

      html += `
        <div class="calendar-day-cell group min-h-[70px] sm:min-h-[95px] p-1.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between
          ${isToday ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/70 hover:border-indigo-300 dark:hover:border-indigo-700'}
          ${isSelected ? 'ring-2 ring-indigo-500' : ''}"
          data-date="${dateStr}">
          
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold ${isToday ? 'px-1.5 py-0.5 rounded-full bg-indigo-600 text-white' : 'text-slate-700 dark:text-slate-300'}">${day}</span>
            ${dayTasks.length > 0 ? `<span class="text-[10px] px-1.5 py-0.2 rounded-full font-medium ${dayTasks.some(t => t.status !== 'completed' && t.dueDate < todayStr) ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'}">${dayTasks.length}</span>` : ''}
          </div>

          <div class="mt-1 space-y-1 overflow-hidden max-h-[50px] sm:max-h-[60px]">
            ${dayTasks.slice(0, 2).map(task => {
              const sub = subjectMap[task.subjectId] || { color: '#6366f1' };
              const isCompleted = task.status === 'completed';
              return `
                <div class="text-[11px] truncate px-1.5 py-0.5 rounded flex items-center gap-1 font-medium ${isCompleted ? 'line-through opacity-50 bg-slate-100 dark:bg-slate-700 text-slate-500' : 'text-slate-800 dark:text-slate-200'}"
                     style="border-left: 3px solid ${sub.color}; background: ${sub.color}15;"
                     title="${task.title} (${task.priority} Priority)">
                  <span class="truncate">${task.title}</span>
                </div>
              `;
            }).join('')}
            ${dayTasks.length > 2 ? `<div class="text-[10px] text-slate-400 pl-1 font-medium">+${dayTasks.length - 2} more</div>` : ''}
          </div>
        </div>
      `;
    }

    // Remaining empty cells for end of month
    const totalCells = firstDayIndex + lastDate;
    const remainingCells = (7 - (totalCells % 7)) % 7;
    for (let i = 1; i <= remainingCells; i++) {
      html += `
        <div class="min-h-[70px] sm:min-h-[90px] p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 text-slate-400 dark:text-slate-600 opacity-50 text-xs select-none">
          <span>${i}</span>
        </div>
      `;
    }

    html += '</div>';
    calendarContainer.innerHTML = html;

    // Attach click events on day cells
    calendarContainer.querySelectorAll('.calendar-day-cell').forEach(cell => {
      cell.addEventListener('click', () => {
        const dateStr = cell.getAttribute('data-date');
        this.selectDate(dateStr);
      });
    });

    this.renderSelectedDayTasks();
  }

  selectDate(dateStr) {
    this.selectedDate = this.selectedDate === dateStr ? null : dateStr;
    this.render();
  }

  renderSelectedDayTasks() {
    const container = document.getElementById('calendar-selected-day-tasks');
    if (!container) return;

    if (!this.selectedDate) {
      container.innerHTML = `
        <div class="text-center py-6 text-slate-400 text-sm">
          <p>Click on any date in the calendar to view scheduled tasks & deadlines.</p>
        </div>
      `;
      return;
    }

    const tasks = window.storageService.getTasks().filter(t => t.dueDate === this.selectedDate);
    const dateObj = new Date(this.selectedDate + 'T00:00:00');
    const formattedDate = dateObj.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });

    if (tasks.length === 0) {
      container.innerHTML = `
        <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-center">
          <p class="text-sm font-semibold text-slate-700 dark:text-slate-300">📅 ${formattedDate}</p>
          <p class="text-xs text-slate-400 mt-1">No tasks due on this date. Enjoy your free time or add a new task!</p>
          <button onclick="window.taskManager.openTaskModal(null, '${this.selectedDate}')" class="mt-3 text-xs px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow">
            + Add Task for this Day
          </button>
        </div>
      `;
      return;
    }

    const subjects = window.storageService.getSubjects();
    const subjectMap = Object.fromEntries(subjects.map(s => [s.id, s]));

    container.innerHTML = `
      <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
        <div class="flex items-center justify-between mb-3">
          <h4 class="text-sm font-bold text-slate-800 dark:text-slate-200">📅 Deadlines for ${formattedDate}</h4>
          <button onclick="window.taskManager.openTaskModal(null, '${this.selectedDate}')" class="text-xs px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow">
            + Add
          </button>
        </div>
        <div class="space-y-2">
          ${tasks.map(task => {
            const sub = subjectMap[task.subjectId] || { name: 'General', color: '#6366f1' };
            const isCompleted = task.status === 'completed';
            return `
              <div class="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                <div class="flex items-center gap-2.5 min-w-0">
                  <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background-color: ${sub.color};"></span>
                  <div class="min-w-0">
                    <p class="text-xs font-semibold ${isCompleted ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200'} truncate">${task.title}</p>
                    <p class="text-[10px] text-slate-400">${sub.name} • ${task.category} • ${task.dueTime || 'No time'}</p>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-[10px] font-semibold px-2 py-0.5 rounded ${task.priority === 'High' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' : task.priority === 'Medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'}">${task.priority}</span>
                  <button onclick="window.taskManager.openTaskModal('${task.id}')" class="text-xs text-indigo-500 hover:text-indigo-600 p-1">
                    ✏️
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  prevMonth() {
    this.currentDate.setMonth(this.currentDate.getMonth() - 1);
    this.render();
  }

  nextMonth() {
    this.currentDate.setMonth(this.currentDate.getMonth() + 1);
    this.render();
  }

  goToToday() {
    this.currentDate = new Date();
    this.render();
  }

  bindEvents() {
    document.getElementById('cal-prev-month')?.addEventListener('click', () => this.prevMonth());
    document.getElementById('cal-next-month')?.addEventListener('click', () => this.nextMonth());
    document.getElementById('cal-today-btn')?.addEventListener('click', () => this.goToToday());
  }
}

window.taskCalendar = new TaskCalendar();

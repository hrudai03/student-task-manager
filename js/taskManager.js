/**
 * Task Manager Module
 * Handles Task CRUD, filtering, search, sorting, Kanban Board, and Subtasks.
 */

class TaskManager {
  constructor() {
    this.filterStatus = 'all'; // 'all', 'active', 'completed', 'overdue'
    this.filterSubject = 'all';
    this.filterPriority = 'all';
    this.filterCategory = 'all';
    this.searchQuery = '';
    this.sortBy = 'dueDate_asc'; // 'dueDate_asc', 'dueDate_desc', 'priority', 'title'
    this.activeModalTaskId = null;
    this.tempSubtasks = [];
    this.draggedTaskId = null;
  }

  init() {
    this.render();
    this.bindEvents();
    this.setupKanbanDragDrop();
  }

  getFilteredTasks() {
    const tasks = window.storageService.getTasks();
    const today = new Date().toISOString().split('T')[0];

    return tasks.filter(task => {
      // Status Filter
      if (this.filterStatus === 'active' && task.status === 'completed') return false;
      if (this.filterStatus === 'completed' && task.status !== 'completed') return false;
      if (this.filterStatus === 'overdue' && (task.status === 'completed' || !task.dueDate || task.dueDate >= today)) return false;

      // Subject Filter
      if (this.filterSubject !== 'all' && task.subjectId !== this.filterSubject) return false;

      // Priority Filter
      if (this.filterPriority !== 'all' && task.priority !== this.filterPriority) return false;

      // Category Filter
      if (this.filterCategory !== 'all' && task.category !== this.filterCategory) return false;

      // Search Query
      if (this.searchQuery.trim()) {
        const query = this.searchQuery.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(query);
        const matchesNotes = task.notes && task.notes.toLowerCase().includes(query);
        const sub = window.storageService.getSubjectById(task.subjectId);
        const matchesSubject = sub && sub.name.toLowerCase().includes(query);
        if (!matchesTitle && !matchesNotes && !matchesSubject) return false;
      }

      return true;
    }).sort((a, b) => {
      // Sorting
      if (this.sortBy === 'dueDate_asc') {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate) || (a.dueTime || '').localeCompare(b.dueTime || '');
      }
      if (this.sortBy === 'dueDate_desc') {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return b.dueDate.localeCompare(a.dueDate);
      }
      if (this.sortBy === 'priority') {
        const weights = { High: 3, Medium: 2, Low: 1 };
        return (weights[b.priority] || 0) - (weights[a.priority] || 0);
      }
      if (this.sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });
  }

  render() {
    this.renderListView();
    this.renderKanbanView();
    this.renderExamCountdowns();
    if (window.taskStats) window.taskStats.render();
    if (window.taskCalendar) window.taskCalendar.render();
    if (window.pomodoroTimer) window.pomodoroTimer.populateTaskSelector();
  }

  // --- List View Rendering ---
  renderListView() {
    const container = document.getElementById('task-list-container');
    const emptyState = document.getElementById('task-list-empty');
    if (!container) return;

    const filteredTasks = this.getFilteredTasks();
    const subjects = window.storageService.getSubjects();
    const subjectMap = Object.fromEntries(subjects.map(s => [s.id, s]));

    if (filteredTasks.length === 0) {
      container.innerHTML = '';
      if (emptyState) emptyState.classList.remove('hidden');
      return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    const todayStr = new Date().toISOString().split('T')[0];

    container.innerHTML = filteredTasks.map(task => {
      const sub = subjectMap[task.subjectId] || { name: 'General', color: '#6366f1' };
      const isCompleted = task.status === 'completed';
      const isOverdue = !isCompleted && task.dueDate && task.dueDate < todayStr;
      const isDueToday = !isCompleted && task.dueDate === todayStr;

      // Subtask progress
      const subtasks = task.subtasks || [];
      const completedSubtasks = subtasks.filter(st => st.completed).length;
      const hasSubtasks = subtasks.length > 0;

      // Priority badge styling
      const priorityClass = task.priority === 'High' 
        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800'
        : task.priority === 'Medium'
        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800'
        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';

      // Due date text and tag
      let dueBadge = '';
      if (task.dueDate) {
        const [y, m, d] = task.dueDate.split('-');
        const dateObj = new Date(y, m - 1, d);
        const dateFormatted = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        
        if (isOverdue) {
          dueBadge = `<span class="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300 animate-pulse">⚠️ Overdue (${dateFormatted})</span>`;
        } else if (isDueToday) {
          dueBadge = `<span class="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">⏰ Due Today</span>`;
        } else {
          dueBadge = `<span class="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium">📅 ${dateFormatted} ${task.dueTime ? `at ${task.dueTime}` : ''}</span>`;
        }
      }

      return `
        <div class="group relative rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-850/90 hover:shadow-lg transition-all duration-200 p-4 sm:p-5 flex flex-col gap-3 ${isCompleted ? 'opacity-70 bg-slate-50/50 dark:bg-slate-900/40' : ''}" style="border-left: 4px solid ${sub.color};">
          
          <!-- Header row: Checkbox, Title, Actions -->
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-start gap-3 min-w-0 flex-1">
              <!-- Custom Checkbox -->
              <button onclick="window.taskManager.toggleTaskCompletion('${task.id}')" 
                      class="mt-1 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0
                      ${isCompleted ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 dark:border-slate-600 hover:border-indigo-500'}">
                ${isCompleted ? '<svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>' : ''}
              </button>

              <div class="min-w-0 flex-1">
                <div class="flex items-center flex-wrap gap-2 mb-1">
                  <!-- Subject badge -->
                  <span class="text-[11px] font-semibold px-2.5 py-0.5 rounded-full text-white shadow-xs" style="background-color: ${sub.color};">
                    ${sub.name}
                  </span>
                  <!-- Category badge -->
                  <span class="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    ${task.category || 'Task'}
                  </span>
                  <!-- Priority badge -->
                  <span class="text-[11px] font-semibold px-2 py-0.5 rounded-md border ${priorityClass}">
                    ${task.priority}
                  </span>
                </div>

                <!-- Title -->
                <h3 class="text-base font-bold ${isCompleted ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-slate-100'} cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400"
                    onclick="window.taskManager.openTaskModal('${task.id}')">
                  ${task.title}
                </h3>

                <!-- Notes preview -->
                ${task.notes ? `<p class="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">${task.notes}</p>` : ''}
              </div>
            </div>

            <!-- Action buttons -->
            <div class="flex items-center gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
              <button onclick="window.taskManager.startPomodoroForTask('${task.id}')" 
                      title="Focus on this task with Pomodoro Timer"
                      class="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors">
                ⏱️
              </button>
              <button onclick="window.taskManager.openTaskModal('${task.id}')" 
                      title="Edit task"
                      class="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors">
                ✏️
              </button>
              <button onclick="window.taskManager.deleteTask('${task.id}')" 
                      title="Delete task"
                      class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors">
                🗑️
              </button>
            </div>
          </div>

          <!-- Subtasks checklist accordion -->
          ${hasSubtasks ? `
            <div class="pl-8 pt-1 border-t border-slate-100 dark:border-slate-800/60 mt-1">
              <div class="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                <span class="font-semibold">Subtasks (${completedSubtasks}/${subtasks.length})</span>
                <span>${Math.round((completedSubtasks / subtasks.length) * 100)}%</span>
              </div>
              <div class="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mb-2">
                <div class="h-full bg-indigo-500 rounded-full transition-all" style="width: ${(completedSubtasks / subtasks.length) * 100}%"></div>
              </div>
              <div class="space-y-1.5">
                ${subtasks.map(st => `
                  <label class="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                    <input type="checkbox" ${st.completed ? 'checked' : ''} 
                           onchange="window.taskManager.toggleSubtask('${task.id}', '${st.id}')"
                           class="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600">
                    <span class="${st.completed ? 'line-through text-slate-400 dark:text-slate-500' : ''}">${st.text}</span>
                  </label>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Footer details: Estimated time & Due Date -->
          <div class="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800/60 text-slate-500 dark:text-slate-400">
            <div class="flex items-center gap-3">
              ${dueBadge}
              ${task.estimatedMinutes ? `<span class="inline-flex items-center gap-1 text-[11px]">⏳ ~${task.estimatedMinutes} mins</span>` : ''}
            </div>
            
            <!-- Quick Status Switcher Dropdown -->
            <select onchange="window.taskManager.changeStatus('${task.id}', this.value)"
                    class="text-[11px] font-semibold py-0.5 px-2 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer outline-hidden">
              <option value="todo" ${task.status === 'todo' ? 'selected' : ''}>To Do</option>
              <option value="in_progress" ${task.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
              <option value="completed" ${task.status === 'completed' ? 'selected' : ''}>Completed</option>
            </select>
          </div>

        </div>
      `;
    }).join('');
  }

  // --- Kanban Board View Rendering ---
  renderKanbanView() {
    const colTodo = document.getElementById('kanban-col-todo');
    const colInProgress = document.getElementById('kanban-col-in_progress');
    const colCompleted = document.getElementById('kanban-col-completed');

    if (!colTodo || !colInProgress || !colCompleted) return;

    const filteredTasks = this.getFilteredTasks();
    const subjects = window.storageService.getSubjects();
    const subjectMap = Object.fromEntries(subjects.map(s => [s.id, s]));

    const todoTasks = filteredTasks.filter(t => t.status === 'todo');
    const inProgressTasks = filteredTasks.filter(t => t.status === 'in_progress');
    const completedTasks = filteredTasks.filter(t => t.status === 'completed');

    // Update Kanban Counters
    const countTodo = document.getElementById('kanban-count-todo');
    const countInProgress = document.getElementById('kanban-count-in_progress');
    const countCompleted = document.getElementById('kanban-count-completed');

    if (countTodo) countTodo.textContent = todoTasks.length;
    if (countInProgress) countInProgress.textContent = inProgressTasks.length;
    if (countCompleted) countCompleted.textContent = completedTasks.length;

    const renderColumnTasks = (taskList) => {
      if (taskList.length === 0) {
        return '<div class="h-28 flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700/60 rounded-xl text-xs text-slate-400">No tasks</div>';
      }

      return taskList.map(task => {
        const sub = subjectMap[task.subjectId] || { name: 'General', color: '#6366f1' };
        const subtasks = task.subtasks || [];
        const completedSub = subtasks.filter(st => st.completed).length;

        const prevStatus = task.status === 'completed' ? 'in_progress' : (task.status === 'in_progress' ? 'todo' : null);
        const nextStatus = task.status === 'todo' ? 'in_progress' : (task.status === 'in_progress' ? 'completed' : null);

        return `
          <div class="kanban-card p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing transition-all space-y-2"
               draggable="true" 
               data-task-id="${task.id}">
            
            <div class="flex items-center justify-between gap-2">
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full text-white truncate max-w-[120px]" style="background-color: ${sub.color};">
                ${sub.name}
              </span>
              <div class="flex items-center gap-1.5">
                <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded ${task.priority === 'High' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' : task.priority === 'Medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'}">
                  ${task.priority}
                </span>
                <button onclick="window.taskManager.openTaskModal('${task.id}')" class="text-slate-400 hover:text-indigo-600 p-0.5 text-xs" title="Edit task">
                  ✏️
                </button>
              </div>
            </div>

            <h4 class="text-xs font-bold text-slate-800 dark:text-slate-100 leading-snug line-clamp-2 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400"
                onclick="window.taskManager.openTaskModal('${task.id}')">
              ${task.title}
            </h4>

            ${subtasks.length > 0 ? `
              <div class="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                <span>☑️ ${completedSub}/${subtasks.length} subtasks</span>
              </div>
            ` : ''}

            <div class="flex items-center justify-between text-[11px] text-slate-400 pt-1.5 border-t border-slate-100 dark:border-slate-700/60">
              <span>📅 ${task.dueDate || 'No deadline'}</span>
              <div class="flex items-center gap-1">
                ${prevStatus ? `<button onclick="window.taskManager.changeStatus('${task.id}', '${prevStatus}')" class="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-[10px] font-bold text-slate-600 dark:text-slate-300" title="Move back">←</button>` : ''}
                ${nextStatus ? `<button onclick="window.taskManager.changeStatus('${task.id}', '${nextStatus}')" class="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-[10px] font-bold text-slate-600 dark:text-slate-300" title="Move forward">→</button>` : ''}
              </div>
            </div>

          </div>
        `;
      }).join('');
    };

    colTodo.innerHTML = renderColumnTasks(todoTasks);
    colInProgress.innerHTML = renderColumnTasks(inProgressTasks);
    colCompleted.innerHTML = renderColumnTasks(completedTasks);

    this.setupKanbanDragDrop();
  }

  // --- Upcoming Exam / Major Deadlines Countdown Widget ---
  renderExamCountdowns() {
    const container = document.getElementById('exam-countdown-container');
    if (!container) return;

    const tasks = window.storageService.getTasks();
    const subjects = window.storageService.getSubjects();
    const subjectMap = Object.fromEntries(subjects.map(s => [s.id, s]));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Upcoming exams or high priority tasks
    const upcomingHighPriority = tasks
      .filter(t => t.status !== 'completed' && t.dueDate && (t.category === 'Exam' || t.priority === 'High'))
      .map(t => {
        const [y, m, d] = t.dueDate.split('-');
        const targetDate = new Date(y, m - 1, d);
        const diffTime = targetDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return { ...t, diffDays };
      })
      .filter(t => t.diffDays >= 0)
      .sort((a, b) => a.diffDays - b.diffDays)
      .slice(0, 3);

    if (upcomingHighPriority.length === 0) {
      container.innerHTML = `
        <div class="p-3 text-center text-xs text-slate-400">
          No urgent exams or high-priority deadlines approaching. Keep up the good work! 🌟
        </div>
      `;
      return;
    }

    container.innerHTML = upcomingHighPriority.map(item => {
      const sub = subjectMap[item.subjectId] || { name: 'General', color: '#6366f1' };
      let countdownLabel = `${item.diffDays} days left`;
      if (item.diffDays === 0) countdownLabel = 'Today!';
      else if (item.diffDays === 1) countdownLabel = 'Tomorrow!';

      return `
        <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between gap-3">
          <div class="flex items-center gap-2.5 min-w-0">
            <span class="w-3 h-3 rounded-full flex-shrink-0" style="background-color: ${sub.color};"></span>
            <div class="min-w-0">
              <h5 class="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">${item.title}</h5>
              <span class="text-[10px] text-slate-400 font-medium">${sub.name} • ${item.category}</span>
            </div>
          </div>
          <div class="text-right flex-shrink-0">
            <span class="text-xs font-extrabold px-2.5 py-1 rounded-lg ${item.diffDays <= 1 ? 'bg-rose-500 text-white animate-pulse' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300'}">
              ${countdownLabel}
            </span>
          </div>
        </div>
      `;
    }).join('');
  }

  // --- CRUD Operations ---
  createTask(taskData) {
    const tasks = window.storageService.getTasks();
    const newTask = {
      id: 'task-' + Date.now(),
      title: taskData.title.trim(),
      subjectId: taskData.subjectId,
      category: taskData.category || 'Assignment',
      priority: taskData.priority || 'Medium',
      status: taskData.status || 'todo',
      dueDate: taskData.dueDate || null,
      dueTime: taskData.dueTime || null,
      estimatedMinutes: parseInt(taskData.estimatedMinutes, 10) || 0,
      notes: taskData.notes || '',
      subtasks: taskData.subtasks || [],
      createdAt: new Date().toISOString(),
      completedAt: taskData.status === 'completed' ? new Date().toISOString() : null
    };

    tasks.unshift(newTask);
    window.storageService.saveTasks(tasks);
    this.render();

    if (window.app) window.app.showToast('✅ Task created successfully!', 'success');
  }

  updateTask(taskId, updatedData) {
    const tasks = window.storageService.getTasks();
    const index = tasks.findIndex(t => t.id === taskId);
    if (index === -1) return;

    tasks[index] = {
      ...tasks[index],
      title: updatedData.title.trim(),
      subjectId: updatedData.subjectId,
      category: updatedData.category,
      priority: updatedData.priority,
      status: updatedData.status,
      dueDate: updatedData.dueDate,
      dueTime: updatedData.dueTime,
      estimatedMinutes: parseInt(updatedData.estimatedMinutes, 10) || 0,
      notes: updatedData.notes,
      subtasks: updatedData.subtasks || tasks[index].subtasks || [],
      completedAt: updatedData.status === 'completed' && !tasks[index].completedAt ? new Date().toISOString() : (updatedData.status !== 'completed' ? null : tasks[index].completedAt)
    };

    window.storageService.saveTasks(tasks);
    this.render();

    if (window.app) window.app.showToast('✏️ Task updated!', 'success');
  }

  deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) return;

    const tasks = window.storageService.getTasks().filter(t => t.id !== taskId);
    window.storageService.saveTasks(tasks);
    this.render();

    if (window.app) window.app.showToast('🗑️ Task deleted', 'info');
  }

  toggleTaskCompletion(taskId) {
    const tasks = window.storageService.getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    if (task.status === 'completed') {
      task.status = 'todo';
      task.completedAt = null;
    } else {
      task.status = 'completed';
      task.completedAt = new Date().toISOString();
    }

    window.storageService.saveTasks(tasks);
    this.render();
  }

  changeStatus(taskId, newStatus) {
    const tasks = window.storageService.getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    task.status = newStatus;
    task.completedAt = newStatus === 'completed' ? new Date().toISOString() : null;

    window.storageService.saveTasks(tasks);
    this.render();
  }

  toggleSubtask(taskId, subtaskId) {
    const tasks = window.storageService.getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (!task || !task.subtasks) return;

    const subtask = task.subtasks.find(st => st.id === subtaskId);
    if (subtask) {
      subtask.completed = !subtask.completed;
      window.storageService.saveTasks(tasks);
      this.render();
    }
  }

  startPomodoroForTask(taskId) {
    if (window.pomodoroTimer) {
      window.pomodoroTimer.selectedTaskId = taskId;
      const select = document.getElementById('pomodoro-task-select');
      if (select) select.value = taskId;
      
      if (window.app) {
        window.app.switchView('pomodoro');
        const task = window.storageService.getTasks().find(t => t.id === taskId);
        if (task) {
          window.app.showToast(`🎯 Focused on "${task.title}". Ready to study!`, 'info');
        }
      }
    }
  }

  // --- Modal Operations ---
  openTaskModal(taskId = null, prefillDate = null) {
    this.activeModalTaskId = taskId;
    const modal = document.getElementById('task-modal');
    const modalTitle = document.getElementById('task-modal-title');
    const form = document.getElementById('task-form');

    if (!modal || !form) return;

    this.populateSubjectSelect();

    if (taskId) {
      modalTitle.textContent = 'Edit Task';
      const task = window.storageService.getTasks().find(t => t.id === taskId);
      if (task) {
        document.getElementById('task-input-title').value = task.title;
        document.getElementById('task-input-subject').value = task.subjectId;
        document.getElementById('task-input-category').value = task.category;
        document.getElementById('task-input-priority').value = task.priority;
        document.getElementById('task-input-status').value = task.status;
        document.getElementById('task-input-date').value = task.dueDate || '';
        document.getElementById('task-input-time').value = task.dueTime || '';
        document.getElementById('task-input-duration').value = task.estimatedMinutes || '';
        document.getElementById('task-input-notes').value = task.notes || '';
        this.tempSubtasks = JSON.parse(JSON.stringify(task.subtasks || []));
      }
    } else {
      modalTitle.textContent = 'Add New Student Task';
      form.reset();
      document.getElementById('task-input-date').value = prefillDate || '';
      document.getElementById('task-input-status').value = 'todo';
      document.getElementById('task-input-priority').value = 'Medium';
      this.tempSubtasks = [];
    }

    this.renderModalSubtasks();
    modal.classList.remove('hidden');
    document.getElementById('task-input-title')?.focus();
  }

  closeTaskModal() {
    const modal = document.getElementById('task-modal');
    if (modal) modal.classList.add('hidden');
    this.activeModalTaskId = null;
    this.tempSubtasks = [];
  }

  populateSubjectSelect() {
    const select = document.getElementById('task-input-subject');
    if (!select) return;

    const subjects = window.storageService.getSubjects();
    select.innerHTML = subjects.map(s => `
      <option value="${s.id}">${s.name}</option>
    `).join('');
  }

  renderModalSubtasks() {
    const container = document.getElementById('modal-subtasks-list');
    if (!container) return;

    if (this.tempSubtasks.length === 0) {
      container.innerHTML = '<p class="text-xs text-slate-400 py-1">No checklist items added yet.</p>';
      return;
    }

    container.innerHTML = this.tempSubtasks.map((st, index) => `
      <div class="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
        <div class="flex items-center gap-2 min-w-0">
          <input type="checkbox" ${st.completed ? 'checked' : ''} onchange="window.taskManager.tempSubtasks[${index}].completed = this.checked" class="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5">
          <span class="text-xs text-slate-700 dark:text-slate-300 truncate">${st.text}</span>
        </div>
        <button type="button" onclick="window.taskManager.removeTempSubtask(${index})" class="text-rose-500 hover:text-rose-700 p-1 text-xs">
          ✕
        </button>
      </div>
    `).join('');
  }

  addTempSubtask() {
    const input = document.getElementById('modal-subtask-input');
    if (!input || !input.value.trim()) return;

    this.tempSubtasks.push({
      id: 'st-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
      text: input.value.trim(),
      completed: false
    });

    input.value = '';
    this.renderModalSubtasks();
    input.focus();
  }

  removeTempSubtask(index) {
    this.tempSubtasks.splice(index, 1);
    this.renderModalSubtasks();
  }

  // --- Kanban Drag and Drop Logic ---
  setupKanbanDragDrop() {
    const cards = document.querySelectorAll('.kanban-card');
    const columns = document.querySelectorAll('.kanban-column');

    cards.forEach(card => {
      card.addEventListener('dragstart', (e) => {
        this.draggedTaskId = card.getAttribute('data-task-id');
        card.classList.add('dragging');
        e.dataTransfer.setData('text/plain', this.draggedTaskId);
      });

      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        this.draggedTaskId = null;
      });
    });

    columns.forEach(col => {
      col.addEventListener('dragover', (e) => {
        e.preventDefault();
        col.classList.add('drag-over');
      });

      col.addEventListener('dragleave', () => {
        col.classList.remove('drag-over');
      });

      col.addEventListener('drop', (e) => {
        e.preventDefault();
        col.classList.remove('drag-over');
        const targetStatus = col.getAttribute('data-status');
        const taskId = e.dataTransfer.getData('text/plain') || this.draggedTaskId;

        if (taskId && targetStatus) {
          this.changeStatus(taskId, targetStatus);
        }
      });
    });
  }

  // --- Event Bindings ---
  bindEvents() {
    // Task modal form submit
    document.getElementById('task-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const taskData = {
        title: document.getElementById('task-input-title').value,
        subjectId: document.getElementById('task-input-subject').value,
        category: document.getElementById('task-input-category').value,
        priority: document.getElementById('task-input-priority').value,
        status: document.getElementById('task-input-status').value,
        dueDate: document.getElementById('task-input-date').value || null,
        dueTime: document.getElementById('task-input-time').value || null,
        estimatedMinutes: document.getElementById('task-input-duration').value || 0,
        notes: document.getElementById('task-input-notes').value || '',
        subtasks: this.tempSubtasks
      };

      if (this.activeModalTaskId) {
        this.updateTask(this.activeModalTaskId, taskData);
      } else {
        this.createTask(taskData);
      }

      this.closeTaskModal();
    });

    // Subtask add button in modal
    document.getElementById('btn-add-subtask')?.addEventListener('click', () => this.addTempSubtask());
    document.getElementById('modal-subtask-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.addTempSubtask();
      }
    });

    // Close modal triggers
    document.getElementById('task-modal-close')?.addEventListener('click', () => this.closeTaskModal());
    document.getElementById('task-modal-cancel')?.addEventListener('click', () => this.closeTaskModal());

    // Search & Filter controls
    document.getElementById('filter-search')?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value;
      this.render();
    });

    document.getElementById('filter-subject')?.addEventListener('change', (e) => {
      this.filterSubject = e.target.value;
      this.render();
    });

    document.getElementById('filter-priority')?.addEventListener('change', (e) => {
      this.filterPriority = e.target.value;
      this.render();
    });

    document.getElementById('filter-category')?.addEventListener('change', (e) => {
      this.filterCategory = e.target.value;
      this.render();
    });

    document.getElementById('sort-by')?.addEventListener('change', (e) => {
      this.sortBy = e.target.value;
      this.render();
    });

    // Status filter tabs (All, Active, Completed, Overdue)
    document.querySelectorAll('.status-filter-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.status-filter-tab').forEach(t => {
          t.classList.remove('bg-indigo-600', 'text-white', 'shadow-sm');
          t.classList.add('text-slate-600', 'dark:text-slate-300', 'hover:bg-slate-100', 'dark:hover:bg-slate-800');
        });
        tab.classList.add('bg-indigo-600', 'text-white', 'shadow-sm');
        tab.classList.remove('text-slate-600', 'dark:text-slate-300', 'hover:bg-slate-100', 'dark:hover:bg-slate-800');
        
        this.filterStatus = tab.getAttribute('data-status');
        this.render();
      });
    });
  }
}

window.taskManager = new TaskManager();

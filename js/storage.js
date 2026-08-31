/**
 * Storage Module - Manages LocalStorage, Data Persistence, Export & Import
 */

const STORAGE_KEYS = {
  TASKS: 'stm_tasks_v1',
  SUBJECTS: 'stm_subjects_v1',
  SETTINGS: 'stm_settings_v1',
  STATS: 'stm_stats_v1'
};

const DEFAULT_SUBJECTS = [
  { id: 'sub-cs', name: 'Computer Science', color: '#6366f1', icon: 'code' },
  { id: 'sub-math', name: 'Mathematics', color: '#3b82f6', icon: 'calculator' },
  { id: 'sub-phys', name: 'Physics', color: '#ec4899', icon: 'atom' },
  { id: 'sub-chem', name: 'Chemistry', color: '#10b981', icon: 'flask-conical' },
  { id: 'sub-hist', name: 'History', color: '#f59e0b', icon: 'landmark' },
  { id: 'sub-lit', name: 'Literature', color: '#8b5cf6', icon: 'book-open' }
];

const DEFAULT_SETTINGS = {
  theme: 'dark',
  pomodoroWork: 25,
  pomodoroShortBreak: 5,
  pomodoroLongBreak: 15,
  soundEnabled: true,
  autoStartBreaks: false
};

// Generates sample tasks relative to current date so deadlines look fresh
function generateDefaultTasks() {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const inThreeDays = new Date(now);
  inThreeDays.setDate(inThreeDays.getDate() + 3);
  const inThreeDaysStr = inThreeDays.toISOString().split('T')[0];

  const inOneWeek = new Date(now);
  inOneWeek.setDate(inOneWeek.getDate() + 7);
  const inOneWeekStr = inOneWeek.toISOString().split('T')[0];

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  return [
    {
      id: 'task-1',
      title: 'Complete Data Structures & Algorithms Assignment 3',
      subjectId: 'sub-cs',
      category: 'Assignment',
      priority: 'High',
      status: 'in_progress', // 'todo', 'in_progress', 'completed'
      dueDate: today,
      dueTime: '23:59',
      estimatedMinutes: 90,
      notes: 'Implement Binary Search Tree and AVL tree balancing in C++/Java. Test edge cases with duplicate keys.',
      subtasks: [
        { id: 'st-1', text: 'Implement BST insertion & deletion', completed: true },
        { id: 'st-2', text: 'Implement AVL rotation helpers', completed: true },
        { id: 'st-3', text: 'Write unit tests for edge cases', completed: false },
        { id: 'st-4', text: 'Format PDF report and upload', completed: false }
      ],
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      completedAt: null
    },
    {
      id: 'task-2',
      title: 'Calculus II Midterm Exam Revision',
      subjectId: 'sub-math',
      category: 'Exam',
      priority: 'High',
      status: 'todo',
      dueDate: inThreeDaysStr,
      dueTime: '10:00',
      estimatedMinutes: 180,
      notes: 'Focus on Integration techniques: Integration by parts, trigonometric substitution, and partial fractions.',
      subtasks: [
        { id: 'st-5', text: 'Review Chapter 7 formulas', completed: false },
        { id: 'st-6', text: 'Solve 2019-2023 past exam papers', completed: false },
        { id: 'st-7', text: 'Clarify polar coordinates with professor', completed: false }
      ],
      createdAt: new Date().toISOString(),
      completedAt: null
    },
    {
      id: 'task-3',
      title: 'Physics Lab Report: Rotational Dynamics',
      subjectId: 'sub-phys',
      category: 'Project',
      priority: 'Medium',
      status: 'in_progress',
      dueDate: tomorrowStr,
      dueTime: '17:00',
      estimatedMinutes: 60,
      notes: 'Calculate moment of inertia from experimental time readings and plot angular acceleration graph in Excel.',
      subtasks: [
        { id: 'st-8', text: 'Input raw sensor data into spreadsheet', completed: true },
        { id: 'st-9', text: 'Plot error bars and trendline', completed: false },
        { id: 'st-10', text: 'Write error analysis section', completed: false }
      ],
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      completedAt: null
    },
    {
      id: 'task-4',
      title: 'Read World History Chapter 5: The Renaissance',
      subjectId: 'sub-hist',
      category: 'Reading',
      priority: 'Low',
      status: 'todo',
      dueDate: inOneWeekStr,
      dueTime: '20:00',
      estimatedMinutes: 45,
      notes: 'Summarize the impact of the printing press on scientific revolution and societal spread of knowledge.',
      subtasks: [
        { id: 'st-11', text: 'Read pages 140-185', completed: false },
        { id: 'st-12', text: 'Create flashcards on key figures', completed: false }
      ],
      createdAt: new Date().toISOString(),
      completedAt: null
    },
    {
      id: 'task-5',
      title: 'Organic Chemistry Nomenclature Quiz Prep',
      subjectId: 'sub-chem',
      category: 'Revision',
      priority: 'Medium',
      status: 'completed',
      dueDate: yesterdayStr,
      dueTime: '14:00',
      estimatedMinutes: 40,
      notes: 'Master IUPAC naming rules for alkanes, alkenes, alkynes, and functional groups.',
      subtasks: [
        { id: 'st-13', text: 'Memorize priority rules for functional groups', completed: true },
        { id: 'st-14', text: 'Practice 30 IUPAC naming problems', completed: true }
      ],
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      completedAt: new Date().toISOString()
    }
  ];
}

class StorageService {
  constructor() {
    this.init();
  }

  init() {
    if (!localStorage.getItem(STORAGE_KEYS.SUBJECTS)) {
      this.saveSubjects(DEFAULT_SUBJECTS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
      this.saveSettings(DEFAULT_SETTINGS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.TASKS)) {
      this.saveTasks(generateDefaultTasks());
    }
    if (!localStorage.getItem(STORAGE_KEYS.STATS)) {
      this.saveStats({ pomodoroMinutes: 50, sessionsCompleted: 2, streak: 3, lastActive: new Date().toISOString().split('T')[0] });
    }
  }

  // Tasks
  getTasks() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS)) || [];
    } catch (e) {
      console.error('Error loading tasks:', e);
      return [];
    }
  }

  saveTasks(tasks) {
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  }

  // Subjects
  getSubjects() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.SUBJECTS)) || DEFAULT_SUBJECTS;
    } catch (e) {
      console.error('Error loading subjects:', e);
      return DEFAULT_SUBJECTS;
    }
  }

  saveSubjects(subjects) {
    localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(subjects));
  }

  getSubjectById(id) {
    const subjects = this.getSubjects();
    return subjects.find(s => s.id === id) || { id: 'unknown', name: 'General', color: '#64748b', icon: 'bookmark' };
  }

  // Settings
  getSettings() {
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS)) };
    } catch (e) {
      return DEFAULT_SETTINGS;
    }
  }

  saveSettings(settings) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }

  // Stats
  getStats() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.STATS)) || { pomodoroMinutes: 0, sessionsCompleted: 0, streak: 1, lastActive: new Date().toISOString().split('T')[0] };
    } catch (e) {
      return { pomodoroMinutes: 0, sessionsCompleted: 0, streak: 1, lastActive: new Date().toISOString().split('T')[0] };
    }
  }

  saveStats(stats) {
    localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
  }

  // Export / Import
  exportData() {
    const backup = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      tasks: this.getTasks(),
      subjects: this.getSubjects(),
      settings: this.getSettings(),
      stats: this.getStats()
    };
    return JSON.stringify(backup, null, 2);
  }

  importData(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (data.tasks && Array.isArray(data.tasks)) {
        this.saveTasks(data.tasks);
      }
      if (data.subjects && Array.isArray(data.subjects)) {
        this.saveSubjects(data.subjects);
      }
      if (data.settings) {
        this.saveSettings(data.settings);
      }
      if (data.stats) {
        this.saveStats(data.stats);
      }
      return { success: true, message: 'Data imported successfully!' };
    } catch (error) {
      return { success: false, message: 'Invalid JSON file format.' };
    }
  }

  resetAllData() {
    localStorage.removeItem(STORAGE_KEYS.TASKS);
    localStorage.removeItem(STORAGE_KEYS.SUBJECTS);
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    localStorage.removeItem(STORAGE_KEYS.STATS);
    this.init();
  }
}

window.storageService = new StorageService();

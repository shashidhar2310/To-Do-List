class TaskManager {
    constructor() {
        this.tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        this.reminders = JSON.parse(localStorage.getItem('reminders')) || [];
        this.currentTimer = 25 * 60;
        this.isRunning = false;
        this.currentDate = new Date(2026, 1, 13);
        this.init();
    }

    init() {
        this.bindEvents();
        this.renderTasks();
        this.renderReminders();
        this.renderCalendar();
        this.updateGreeting();
        this.loadTimerSettings();
    }

    bindEvents() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const tab = e.currentTarget.dataset.tab;
                this.switchTab(tab);
            });
        });

        document.getElementById('add-task-btn').addEventListener('click', () => this.openTaskModal('task'));
        document.getElementById('add-reminder-btn').addEventListener('click', () => this.openTaskModal('reminder'));
        document.getElementById('save-task').addEventListener('click', () => this.saveTask());
        document.getElementById('cancel-task').addEventListener('click', () => this.closeTaskModal());
        document.getElementById('task-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.saveTask();
        });

        document.getElementById('start-timer').addEventListener('click', () => this.startTimer());
        document.getElementById('pause-timer').addEventListener('click', () => this.pauseTimer());
        document.getElementById('reset-timer').addEventListener('click', () => this.resetTimer());
        document.getElementById('category-select').addEventListener('change', (e) => this.filterTasks(e.target.value));
        document.getElementById('prev-month').addEventListener('click', () => this.prevMonth());
        document.getElementById('next-month').addEventListener('click', () => this.nextMonth());

        document.getElementById('work-min').addEventListener('change', (e) => localStorage.setItem('workMin', e.target.value));
        document.getElementById('break-min').addEventListener('change', (e) => localStorage.setItem('breakMin', e.target.value));
    }

    switchTab(tabName) {
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        document.getElementById(`${tabName}-tab`).classList.add('active');
        event.currentTarget.classList.add('active');
        
        if (tabName === 'tasks') this.renderTasks();
        if (tabName === 'calendar') this.renderCalendar();
    }

    openTaskModal(type = 'task') {
        document.getElementById('task-modal').classList.add('active');
        document.getElementById('modal-title').textContent = type === 'reminder' ? 'New Reminder' : 'Add Task';
        document.getElementById('task-input').focus();
        document.getElementById('task-category').value = 'Work';
    }

    closeTaskModal() {
        document.getElementById('task-modal').classList.remove('active');
        document.getElementById('task-input').value = '';
    }

    saveTask() {
        const name = document.getElementById('task-input').value.trim();
        if (!name) {
            this.showNotification('Please enter a task name!');
            return;
        }

        const task = {
            id: Date.now(),
            name,
            category: document.getElementById('task-category').value,
            completed: false,
            created: new Date().toISOString(),
            date: document.getElementById('task-date').value || null
        };

        const isReminder = document.getElementById('modal-title').textContent.includes('Reminder');
        if (isReminder) {
            this.reminders.unshift(task);
            localStorage.setItem('reminders', JSON.stringify(this.reminders));
            this.renderReminders();
            this.showNotification(`🔔 Reminder "${name}" added!`);
        } else {
            this.tasks.unshift(task);
            localStorage.setItem('tasks', JSON.stringify(this.tasks));
            this.renderTasks();
            if (task.date) this.renderCalendar();
            this.showNotification(`✅ Task "${name}" added!`);
        }

        this.closeTaskModal();
    }

    renderTasks(filteredCategory = 'All') {
        const container = document.getElementById('tasks-list');
        container.innerHTML = '';

        let tasksToShow = filteredCategory === 'All' ? this.tasks : 
                          this.tasks.filter(t => t.category === filteredCategory);
        tasksToShow.sort((a, b) => new Date(b.created) - new Date(a.created));

        tasksToShow.forEach(task => {
            const taskDiv = document.createElement('div');
            taskDiv.className = 'task-item';
            taskDiv.draggable = true;
            taskDiv.dataset.taskId = task.id;
            
            taskDiv.innerHTML = `
                <div class="task-checkbox">
                    <input type="checkbox">
                </div>
                <label class="task-text">${task.name}</label>
                <span class="category-badge category-${task.category.toLowerCase()}">${task.category}</span>
                <span class="task-time">${this.formatTimeAgo(task.created)}</span>
            `;
            
            // AUTO-DELETE ON CHECK ✅
            const checkbox = taskDiv.querySelector('input[type="checkbox"]');
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    this.tasks = this.tasks.filter(t => t.id !== task.id);
                    localStorage.setItem('tasks', JSON.stringify(this.tasks));
                    this.showNotification(`✅ "${task.name}" completed & removed!`);
                    this.renderTasks();
                }
            });

            // Manual delete button
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-task-btn';
            deleteBtn.innerHTML = '×';
            deleteBtn.title = 'Delete';
            deleteBtn.addEventListener('click', () => {
                this.tasks = this.tasks.filter(t => t.id !== task.id);
                localStorage.setItem('tasks', JSON.stringify(this.tasks));
                this.showNotification(`🗑️ "${task.name}" deleted`);
                this.renderTasks();
            });
            taskDiv.appendChild(deleteBtn);

            container.appendChild(taskDiv);
        });
    }

    filterTasks(category) {
        this.renderTasks(category);
    }

    renderReminders() {
        const container = document.getElementById('reminders-list');
        container.innerHTML = '';
        this.reminders.forEach((reminder, index) => {
            const div = document.createElement('div');
            div.className = 'task-item';
            div.innerHTML = `
                <span class="icon">🔔</span>
                <span class="task-text">${reminder.name}</span>
                <span class="task-time">${reminder.date ? new Date(reminder.date).toLocaleString() : 'No time'}</span>
                <button class="delete-task-btn">×</button>
            `;
            div.querySelector('.delete-task-btn').addEventListener('click', () => {
                this.reminders.splice(index, 1);
                localStorage.setItem('reminders', JSON.stringify(this.reminders));
                this.renderReminders();
            });
            container.appendChild(div);
        });
    }

    loadTimerSettings() {
        document.getElementById('work-min').value = localStorage.getItem('workMin') || 25;
        document.getElementById('break-min').value = localStorage.getItem('breakMin') || 5;
    }

    startTimer() {
        if (this.isRunning) return;
        const minutes = parseInt(document.getElementById('work-min').value);
        this.currentTimer = minutes * 60;
        this.isRunning = true;
        const startBtn = document.getElementById('start-timer');
        startBtn.classList.add('running');
        startBtn.textContent = 'Working...';
        
        const interval = setInterval(() => {
            this.currentTimer--;
            this.updateTimerDisplay();
            if (this.currentTimer <= 0) {
                clearInterval(interval);
                this.timerComplete();
            }
        }, 1000);
    }

    updateTimerDisplay() {
        const mins = Math.floor(this.currentTimer / 60);
        const secs = this.currentTimer % 60;
        document.getElementById('timer-display').textContent = 
            `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    pauseTimer() { this.isRunning = false; }
    
    resetTimer() {
        this.isRunning = false;
        this.currentTimer = parseInt(document.getElementById('work-min').value) * 60;
        document.getElementById('start-timer').classList.remove('running');
        document.getElementById('start-timer').textContent = 'Start';
        this.updateTimerDisplay();
    }

    timerComplete() {
        this.showNotification('⏰ Time\'s up! Take a break 🎉');
        this.resetTimer();
    }

    renderCalendar() {
        const grid = document.getElementById('calendar-grid');
        const monthYear = document.getElementById('month-year');
        
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        monthYear.textContent = this.currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        
        grid.innerHTML = '';
        
        ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(day => {
            const dayDiv = document.createElement('div');
            dayDiv.className = 'calendar-header-day';
            dayDiv.textContent = day;
            grid.appendChild(dayDiv);
        });
        
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        for (let i = 0; i < firstDay; i++) {
            grid.appendChild(document.createElement('div'));
        }
        
        for (let day = 1; day <= daysInMonth; day++) {
            const dayDiv = document.createElement('div');
            dayDiv.className = 'calendar-day';
            dayDiv.textContent = day;
            
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            if (this.tasks.some(t => t.date && t.date.startsWith(dateStr))) {
                dayDiv.classList.add('has-event');
            }
            
            if (day === 13 && month === 1 && year === 2026) {
                dayDiv.classList.add('today');
            }
            
            dayDiv.addEventListener('click', () => {
                document.getElementById('task-date').value = dateStr + 'T09:00';
                this.showNotification(`📅 Date selected: ${dayDiv.textContent} ${monthYear.textContent}`);
            });
            
            grid.appendChild(dayDiv);
        }
    }

    prevMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        this.renderCalendar();
    }

    nextMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        this.renderCalendar();
    }

    formatTimeAgo(dateStr) {
        const diff = Date.now() - new Date(dateStr).getTime();
        const minutes = Math.floor(diff / 60000);
        if (minutes < 60) return minutes === 0 ? 'Just now' : `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        return `${hours}h ago`;
    }

    updateGreeting() {
        const hour = new Date().getHours();
        const greetings = [
            { range: [0, 5], text: 'Good Night' },
            { range: [6, 11], text: 'Good Morning' },
            { range: [12, 17], text: 'Good Afternoon' },
            { range: [18, 23], text: 'Good Evening' }
        ];
        const greeting = greetings.find(g => hour >= g.range[0] && hour <= g.range[1])?.text || 'Hello';
        document.getElementById('greeting-text').textContent = greeting;
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => notification.classList.add('show'), 100);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => document.body.removeChild(notification), 300);
        }, 4000);
    }
}

new TaskManager();

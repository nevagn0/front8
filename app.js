class TodoApp {
    constructor() {
        this.todos = JSON.parse(localStorage.getItem('todos')) || [];
        this.todoInput = document.getElementById('todo-input');
        this.addButton = document.getElementById('add-todo');
        this.todoList = document.getElementById('todo-list');
        this.notificationButton = document.getElementById('notification-button');
        this.currentFilter = 'all';
        this.reminderInterval = null;

        this.init();
    }

    init() {
        this.addButton.addEventListener('click', () => this.addTodo());
        this.todoInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addTodo();
        });
        this.notificationButton.addEventListener('click', () => this.toggleNotifications());
        this.setupFilters();
        this.renderTodos();
        this.setupReminder();
    }

    setupFilters() {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelector('.filter-btn.active').classList.remove('active');
                btn.classList.add('active');
                this.currentFilter = btn.dataset.filter;
                this.renderTodos();
            });
        });
    }

    async toggleNotifications() {
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();

            if (subscription) {
                await subscription.unsubscribe();
                this.notificationButton.textContent = 'Включить уведомления';
                this.stopReminder();
            } else {
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    const subscription = await registration.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: this.urlBase64ToUint8Array('YOUR_PUBLIC_VAPID_KEY')
                    });
                    this.notificationButton.textContent = 'Отключить уведомления';
                    this.startReminder();
                }
            }
        } catch (error) {
            console.error('Error toggling notifications:', error);
        }
    }

    setupReminder() {
        const subscription = localStorage.getItem('pushSubscription');
        if (subscription) {
            this.startReminder();
        }
    }

    startReminder() {
        this.reminderInterval = setInterval(() => {
            const activeTodos = this.todos.filter(todo => !todo.completed);
            if (activeTodos.length > 0) {
                this.showNotification(
                    'Напоминание',
                    `У вас есть ${activeTodos.length} невыполненных задач`
                );
            }
        }, 2 * 60 * 60 * 1000); // 2 часа
    }

    stopReminder() {
        if (this.reminderInterval) {
            clearInterval(this.reminderInterval);
            this.reminderInterval = null;
        }
    }

    async showNotification(title, body) {
        try {
            const registration = await navigator.serviceWorker.ready;
            await registration.showNotification(title, {
                body,
                icon: '/icons/icon-192.png',
                badge: '/icons/icon-192.png',
                vibrate: [200, 100, 200]
            });
        } catch (error) {
            console.error('Error showing notification:', error);
        }
    }

    addTodo() {
        const content = this.todoInput.value.trim();
        if (!content) return;

        const todo = {
            id: Date.now(),
            content,
            completed: false,
            createdAt: new Date().toISOString()
        };

        this.todos.unshift(todo);
        this.saveTodos();
        this.renderTodos();
        this.todoInput.value = '';

        // Отправляем уведомление о новой задаче
        this.showNotification('Новая задача', `Добавлена задача: ${content}`);
    }

    toggleTodo(id) {
        this.todos = this.todos.map(todo => {
            if (todo.id === id) {
                return { ...todo, completed: !todo.completed };
            }
            return todo;
        });
        this.saveTodos();
        this.renderTodos();
    }

    deleteTodo(id) {
        this.todos = this.todos.filter(todo => todo.id !== id);
        this.saveTodos();
        this.renderTodos();
    }

    saveTodos() {
        localStorage.setItem('todos', JSON.stringify(this.todos));
    }

    renderTodos() {
        this.todoList.innerHTML = '';
        
        const filteredTodos = this.todos.filter(todo => {
            if (this.currentFilter === 'active') return !todo.completed;
            if (this.currentFilter === 'completed') return todo.completed;
            return true;
        });

        filteredTodos.forEach(todo => {
            const todoElement = document.createElement('div');
            todoElement.className = 'todo-item';
            
            const content = document.createElement('div');
            content.className = 'todo-content';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'todo-checkbox';
            checkbox.checked = todo.completed;
            checkbox.addEventListener('change', () => this.toggleTodo(todo.id));
            
            const text = document.createElement('span');
            text.className = `todo-text ${todo.completed ? 'completed' : ''}`;
            text.textContent = todo.content;
            
            const actions = document.createElement('div');
            actions.className = 'todo-actions';
            
            const deleteButton = document.createElement('button');
            deleteButton.className = 'delete-btn';
            deleteButton.textContent = 'Удалить';
            deleteButton.addEventListener('click', () => this.deleteTodo(todo.id));
            
            content.appendChild(checkbox);
            content.appendChild(text);
            actions.appendChild(deleteButton);
            todoElement.appendChild(content);
            todoElement.appendChild(actions);
            
            this.todoList.appendChild(todoElement);
        });
    }

    // Вспомогательная функция для конвертации VAPID ключа
    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    new TodoApp();
}); 
// Demo11 Application JavaScript

class Demo11App {
    constructor() {
        this.init();
    }

    async init() {
        console.log('Demo11 Application starting...');
        
        // Initialize components
        this.initEventListeners();
        await this.loadSystemStatus();
        await this.checkAzureOpenAI();
    }

    initEventListeners() {
        // Chat input event listeners
        const messageInput = document.getElementById('message-input');
        const sendButton = document.getElementById('send-button');

        if (messageInput && sendButton) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });

            sendButton.addEventListener('click', () => {
                this.sendMessage();
            });
        }
    }

    async loadSystemStatus() {
        try {
            const response = await fetch('/api/health');
            const data = await response.json();
            
            const statusElement = document.getElementById('status-info');
            if (statusElement) {
                statusElement.innerHTML = `
                    <i class="fas fa-check-circle" style="color: #28a745;"></i> System Status: ${data.status}
                    <br>Timestamp: ${data.timestamp}
                    <br>Azure OpenAI: ${data.azure_openai_available ? 'Available' : 'Not configured'}
                `;
            }
        } catch (error) {
            console.error('Failed to load system status:', error);
            const statusElement = document.getElementById('status-info');
            if (statusElement) {
                statusElement.innerHTML = `
                    <i class="fas fa-exclamation-triangle" style="color: #dc3545;"></i> Failed to load system status
                `;
            }
        }
    }

    async checkAzureOpenAI() {
        try {
            const response = await fetch('/api/health');
            const data = await response.json();
            
            const messageInput = document.getElementById('message-input');
            const sendButton = document.getElementById('send-button');
            const chatStatus = document.getElementById('chat-status');

            if (data.azure_openai_available) {
                if (messageInput) messageInput.disabled = false;
                if (sendButton) sendButton.disabled = false;
                if (chatStatus) {
                    chatStatus.innerHTML = '<i class="fas fa-check-circle" style="color: #28a745;"></i> Azure OpenAI ready';
                }
            } else {
                if (chatStatus) {
                    chatStatus.innerHTML = '<i class="fas fa-exclamation-triangle" style="color: #ffc107;"></i> Azure OpenAI not configured. Set AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_KEY environment variables.';
                }
            }
        } catch (error) {
            console.error('Failed to check Azure OpenAI availability:', error);
        }
    }

    async sendMessage() {
        const messageInput = document.getElementById('message-input');
        const message = messageInput?.value?.trim();
        
        if (!message) return;

        // Add user message to chat
        this.addChatMessage(message, 'user');
        messageInput.value = '';

        // Show loading message
        const loadingId = this.addChatMessage('考え中...', 'bot');

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: message })
            });

            const data = await response.json();

            // Remove loading message
            this.removeChatMessage(loadingId);

            if (response.ok) {
                this.addChatMessage(data.reply, 'bot');
            } else {
                this.addChatMessage(`エラー: ${data.error || 'Unknown error'}`, 'bot');
            }
        } catch (error) {
            console.error('Chat error:', error);
            this.removeChatMessage(loadingId);
            this.addChatMessage('通信エラーが発生しました。', 'bot');
        }
    }

    addChatMessage(message, sender) {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return null;

        const messageId = 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        const messageElement = document.createElement('div');
        messageElement.className = `chat-message ${sender}`;
        messageElement.id = messageId;
        messageElement.textContent = message;

        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        return messageId;
    }

    removeChatMessage(messageId) {
        const messageElement = document.getElementById(messageId);
        if (messageElement) {
            messageElement.remove();
        }
    }
}

// API Testing Functions
async function testEndpoint(endpoint) {
    const responseElement = document.getElementById('api-response');
    if (!responseElement) return;

    responseElement.textContent = 'Loading...';

    try {
        const response = await fetch(endpoint);
        const data = await response.json();
        
        responseElement.textContent = JSON.stringify(data, null, 2);
        responseElement.style.borderLeftColor = response.ok ? '#28a745' : '#dc3545';
    } catch (error) {
        responseElement.textContent = `Error: ${error.message}`;
        responseElement.style.borderLeftColor = '#dc3545';
    }
}

async function testChatEndpoint() {
    const responseElement = document.getElementById('api-response');
    if (!responseElement) return;

    responseElement.textContent = 'Testing chat endpoint...';

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: 'Hello, this is a test message.' })
        });

        const data = await response.json();
        
        responseElement.textContent = JSON.stringify(data, null, 2);
        responseElement.style.borderLeftColor = response.ok ? '#28a745' : '#dc3545';
    } catch (error) {
        responseElement.textContent = `Error: ${error.message}`;
        responseElement.style.borderLeftColor = '#dc3545';
    }
}

// Utility Functions
function formatTimestamp(timestamp) {
    return new Date(timestamp).toLocaleString('ja-JP');
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Style the notification
    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '1rem 1.5rem',
        borderRadius: '5px',
        color: 'white',
        backgroundColor: type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : '#667eea',
        zIndex: '9999',
        transform: 'translateX(400px)',
        transition: 'transform 0.3s ease'
    });

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new Demo11App();
});

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    showNotification('An unexpected error occurred.', 'error');
});

// Service worker registration (for future PWA features)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/static/js/sw.js')
            .then((registration) => {
                console.log('SW registered: ', registration);
            })
            .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}
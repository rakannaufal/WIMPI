<script setup>
import { ref, watch, nextTick, computed, onMounted, onBeforeUnmount } from 'vue';
import { useFinanceStore } from '@/store/finance';
import { sendMessageToGemini, buildFinancialContext, quickActions } from '@/services/geminiService';
import feather from 'feather-icons';

const financeStore = useFinanceStore();

// State
const isOpen = ref(false);
const isMinimized = ref(false);
const inputMessage = ref('');
const isLoading = ref(false);
const messages = ref([]);
const chatContainer = ref(null);

// Greeting message
const greetingMessage = computed(() => {
  const hour = new Date().getHours();
  let greeting = 'Halo';
  if (hour < 11) greeting = 'Selamat Pagi';
  else if (hour < 15) greeting = 'Selamat Siang';
  else if (hour < 19) greeting = 'Selamat Sore';
  else greeting = 'Selamat Malam';
  
  const userName = financeStore.user?.email?.split('@')[0] || 'Pengguna';
  const capitalizedName = userName.charAt(0).toUpperCase() + userName.slice(1);
  
  return `${greeting}, ${capitalizedName}! 👋\n\nSaya **Wimpi AI**, asisten keuangan pribadimu. Ada yang bisa saya bantu hari ini?`;
});

// Initialize dengan greeting
onMounted(() => {
  messages.value = [{
    id: Date.now(),
    type: 'ai',
    content: greetingMessage.value,
    timestamp: new Date()
  }];
  nextTick(() => feather.replace());
});

// Toggle chat window
const toggleChat = () => {
  isOpen.value = !isOpen.value;
  isMinimized.value = false;
  nextTick(() => {
    feather.replace();
    scrollToBottom();
  });
};

// Minimize chat
const minimizeChat = () => {
  isMinimized.value = true;
};

// Close chat
const closeChat = () => {
  isOpen.value = false;
  isMinimized.value = false;
};

// Scroll to bottom of chat
const scrollToBottom = () => {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
    }
  });
};

// Send message
const sendMessage = async (messageText = null) => {
  const text = messageText || inputMessage.value.trim();
  if (!text || isLoading.value) return;

  // Add user message
  messages.value.push({
    id: Date.now(),
    type: 'user',
    content: text,
    timestamp: new Date()
  });
  
  inputMessage.value = '';
  isLoading.value = true;
  scrollToBottom();

  try {
    const financialContext = buildFinancialContext(financeStore);
    const response = await sendMessageToGemini(text, financialContext);
    
    messages.value.push({
      id: Date.now() + 1,
      type: 'ai',
      content: response,
      timestamp: new Date()
    });
  } catch (error) {
    messages.value.push({
      id: Date.now() + 1,
      type: 'ai',
      content: `Maaf, terjadi kesalahan: ${error.message}. Silakan coba lagi. 🙏`,
      timestamp: new Date(),
      isError: true
    });
  } finally {
    isLoading.value = false;
    scrollToBottom();
    nextTick(() => feather.replace());
  }
};

// Handle quick action
const handleQuickAction = (action) => {
  sendMessage(action.prompt);
};

// Handle enter key
const handleKeyPress = (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
};

// Format message content with markdown-like styling
const formatMessage = (content) => {
  if (!content) return '';
  
  return content
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Line breaks
    .replace(/\n/g, '<br>')
    // Lists
    .replace(/^- (.*)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
    // Numbered lists
    .replace(/^\d+\. (.*)$/gm, '<li>$1</li>');
};

// Watch for feather icons
watch([messages, isOpen], () => {
  nextTick(() => feather.replace());
}, { deep: true });
</script>

<template>
  <div class="ai-chat-wrapper">
    <!-- Floating Button -->
    <button 
      v-if="!isOpen" 
      class="chat-toggle-btn"
      @click="toggleChat"
      title="Chat dengan AI"
    >
      <div class="btn-content">
        <svg class="ai-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
          <circle cx="8" cy="14" r="1"/>
          <circle cx="16" cy="14" r="1"/>
          <path d="M9 18h6"/>
        </svg>
      </div>
      <span class="btn-label">Wimpi AI</span>
    </button>

    <!-- Minimized State -->
    <div v-if="isOpen && isMinimized" class="chat-minimized" @click="isMinimized = false">
      <div class="minimized-content">
        <svg class="ai-icon-small" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
        </svg>
        <span>Wimpi AI</span>
        <button class="close-minimized" @click.stop="closeChat">
          <i data-feather="x"></i>
        </button>
      </div>
    </div>

    <!-- Chat Window -->
    <transition name="chat-slide">
      <div v-if="isOpen && !isMinimized" class="chat-window">
        <!-- Header -->
        <div class="chat-header">
          <div class="header-info">
            <div class="ai-avatar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
                <circle cx="8" cy="14" r="1"/>
                <circle cx="16" cy="14" r="1"/>
                <path d="M9 18h6"/>
              </svg>
            </div>
            <div class="header-text">
              <h3>Wimpi AI</h3>
              <span class="status">
                <span class="status-dot"></span>
                Online
              </span>
            </div>
          </div>
          <div class="header-actions">
            <button class="header-btn" @click="minimizeChat" title="Minimize">
              <i data-feather="minus"></i>
            </button>
            <button class="header-btn" @click="closeChat" title="Tutup">
              <i data-feather="x"></i>
            </button>
          </div>
        </div>

        <!-- Messages Container -->
        <div class="chat-messages" ref="chatContainer">
          <div 
            v-for="message in messages" 
            :key="message.id"
            :class="['message', message.type, { error: message.isError }]"
          >
            <div v-if="message.type === 'ai'" class="message-avatar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
              </svg>
            </div>
            <div class="message-bubble" v-html="formatMessage(message.content)"></div>
          </div>

          <!-- Typing Indicator -->
          <div v-if="isLoading" class="message ai">
            <div class="message-avatar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
              </svg>
            </div>
            <div class="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="quick-actions">
          <button 
            v-for="action in quickActions" 
            :key="action.id"
            class="quick-btn"
            @click="handleQuickAction(action)"
            :disabled="isLoading"
          >
            <span class="quick-icon">{{ action.icon }}</span>
            <span class="quick-label">{{ action.label }}</span>
          </button>
        </div>

        <!-- Input Area -->
        <div class="chat-input-area">
          <input
            v-model="inputMessage"
            type="text"
            placeholder="Tanya apa saja tentang keuanganmu..."
            @keypress="handleKeyPress"
            :disabled="isLoading"
            class="chat-input"
          />
          <button 
            class="send-btn" 
            @click="sendMessage()"
            :disabled="!inputMessage.trim() || isLoading"
          >
            <i data-feather="send"></i>
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.ai-chat-wrapper {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 9999;
  font-family: inherit;
}

/* Floating Button */
.chat-toggle-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 50px;
  cursor: pointer;
  box-shadow: 0 8px 32px rgba(102, 126, 234, 0.4);
  transition: all 0.3s ease;
  color: white;
  animation: float 3s ease-in-out infinite;
}

.chat-toggle-btn:hover {
  transform: translateY(-4px) scale(1.02);
  box-shadow: 0 12px 40px rgba(102, 126, 234, 0.5);
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

.btn-content {
  display: flex;
  align-items: center;
  justify-content: center;
}

.ai-icon {
  width: 24px;
  height: 24px;
}

.btn-label {
  font-weight: 600;
  font-size: 14px;
  white-space: nowrap;
}

/* Minimized State */
.chat-minimized {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50px;
  padding: 12px 20px;
  cursor: pointer;
  box-shadow: 0 8px 32px rgba(102, 126, 234, 0.4);
  transition: all 0.3s ease;
}

.chat-minimized:hover {
  transform: scale(1.02);
}

.minimized-content {
  display: flex;
  align-items: center;
  gap: 10px;
  color: white;
  font-weight: 500;
}

.ai-icon-small {
  width: 20px;
  height: 20px;
}

.close-minimized {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: white;
  margin-left: 8px;
}

.close-minimized:hover {
  background: rgba(255, 255, 255, 0.3);
}

.close-minimized i {
  width: 14px;
  height: 14px;
}

/* Chat Window */
.chat-window {
  width: 420px;
  height: 600px;
  background: var(--surface-color, #ffffff);
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--border-color, #e2e8f0);
}

/* Slide Animation */
.chat-slide-enter-active,
.chat-slide-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.chat-slide-enter-from,
.chat-slide-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}

/* Header */
.chat-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: white;
}

.header-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ai-avatar {
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ai-avatar svg {
  width: 24px;
  height: 24px;
}

.header-text h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  opacity: 0.9;
}

.status-dot {
  width: 8px;
  height: 8px;
  background: #68D391;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.header-actions {
  display: flex;
  gap: 8px;
}

.header-btn {
  background: rgba(255, 255, 255, 0.15);
  border: none;
  border-radius: 8px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: white;
  transition: background 0.2s ease;
}

.header-btn:hover {
  background: rgba(255, 255, 255, 0.25);
}

.header-btn i {
  width: 18px;
  height: 18px;
}

/* Messages */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: var(--background-color-light, #f7fafc);
}

.message {
  display: flex;
  gap: 10px;
  animation: messageSlide 0.3s ease;
}

@keyframes messageSlide {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message.user {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.message-avatar svg {
  width: 18px;
  height: 18px;
  color: white;
}

.message-bubble {
  max-width: 85%;
  padding: 14px 16px;
  border-radius: 16px;
  line-height: 1.6;
  font-size: 13px;
  word-wrap: break-word;
  overflow-wrap: break-word;
  white-space: pre-wrap;
}

.message.ai .message-bubble {
  background: var(--surface-color, white);
  color: var(--text-primary, #2d3748);
  border-bottom-left-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.message.user .message-bubble {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-bottom-right-radius: 4px;
}

.message.error .message-bubble {
  background: #FED7D7;
  color: #C53030;
}

.message-bubble :deep(ul) {
  margin: 8px 0;
  padding-left: 20px;
}

.message-bubble :deep(li) {
  margin: 4px 0;
}

.message-bubble :deep(strong) {
  font-weight: 600;
}

/* Typing Indicator */
.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 12px 16px;
  background: var(--surface-color, white);
  border-radius: 16px;
  border-bottom-left-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  background: #667eea;
  border-radius: 50%;
  animation: typing 1.4s infinite ease-in-out;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
  30% { transform: translateY(-8px); opacity: 1; }
}

/* Quick Actions */
.quick-actions {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  overflow-x: auto;
  border-top: 1px solid var(--border-color, #e2e8f0);
  background: var(--surface-color, white);
}

.quick-actions::-webkit-scrollbar {
  display: none;
}

.quick-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: var(--background-color-light, #f7fafc);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 20px;
  cursor: pointer;
  white-space: nowrap;
  font-size: 12px;
  color: var(--text-secondary, #718096);
  transition: all 0.2s ease;
}

.quick-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-color: transparent;
  transform: translateY(-2px);
}

.quick-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.quick-icon {
  font-size: 14px;
}

.quick-label {
  font-weight: 500;
}

/* Input Area */
.chat-input-area {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: var(--surface-color, white);
  border-top: 1px solid var(--border-color, #e2e8f0);
}

.chat-input {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 12px;
  font-size: 14px;
  background: var(--background-color-light, #f7fafc);
  color: var(--text-primary, #2d3748);
  transition: all 0.2s ease;
}

.chat-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15);
}

.chat-input::placeholder {
  color: var(--text-secondary, #a0aec0);
}

.send-btn {
  width: 44px;
  height: 44px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  transition: all 0.2s ease;
}

.send-btn:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.send-btn i {
  width: 20px;
  height: 20px;
}

/* Mobile Responsive */
@media (max-width: 480px) {
  .ai-chat-wrapper {
    bottom: 16px;
    right: 16px;
    left: 16px;
  }

  .chat-toggle-btn {
    width: 100%;
    justify-content: center;
  }

  .chat-window {
    width: 100%;
    height: calc(100vh - 120px);
    max-height: 600px;
    border-radius: 16px;
  }
  
  .quick-actions {
    padding: 10px;
  }

  .quick-btn {
    padding: 6px 12px;
    font-size: 11px;
  }
}

/* Dark Mode Support */
body.dark-theme .chat-window {
  background: #1a202c;
  border-color: #2d3748;
}

body.dark-theme .chat-messages {
  background: #171923;
}

body.dark-theme .message.ai .message-bubble {
  background: #2d3748;
  color: #e2e8f0;
}

body.dark-theme .chat-input-area {
  background: #1a202c;
  border-color: #2d3748;
}

body.dark-theme .chat-input {
  background: #2d3748;
  border-color: #4a5568;
  color: #e2e8f0;
}

body.dark-theme .quick-actions {
  background: #1a202c;
  border-color: #2d3748;
}

body.dark-theme .quick-btn {
  background: #2d3748;
  border-color: #4a5568;
  color: #a0aec0;
}

body.dark-theme .quick-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

body.dark-theme .typing-indicator {
  background: #2d3748;
}
</style>

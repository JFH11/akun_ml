// == Modal Chat UI ==
const aiChatBtn = document.getElementById('ai-chat-btn');
const aiChatModal = document.getElementById('ai-chat-modal');
const closeAiModalBtn = document.getElementById('close-ai-modal-btn');

aiChatBtn.addEventListener('click', e => {
    e.preventDefault();
    aiChatModal.classList.remove('hidden');
});

const closeModal = () => aiChatModal.classList.add('hidden');
closeAiModalBtn.addEventListener('click', closeModal);
aiChatModal.addEventListener('click', e => {
    if (e.target === aiChatModal) closeModal();
});

// == Interaksi Chat ==
const aiChatForm = document.getElementById('ai-chat-form');
const aiChatInput = document.getElementById('ai-chat-input');
const aiChatBody = document.getElementById('ai-chat-body');

const appendMessage = (message, sender) => {
    const messageDiv = document.createElement('div');
    messageDiv.className = `flex ${sender === 'user' ? 'justify-end' : 'justify-start'}`;
    messageDiv.innerHTML = `<div class="${sender === 'user' ? 'bg-gray-700' : 'bg-indigo-600'} text-white p-3 rounded-lg max-w-sm"><p>${message}</p></div>`;
    aiChatBody.appendChild(messageDiv);
    aiChatBody.scrollTop = aiChatBody.scrollHeight;
};

const showTypingIndicator = () => {
    const typingDiv = document.createElement('div');
    typingDiv.id = 'typing-indicator';
    typingDiv.className = 'flex justify-start';
    typingDiv.innerHTML = `<div class="bg-gray-700 p-4 rounded-lg"><div class="dot-flashing"></div></div>`;
    aiChatBody.appendChild(typingDiv);
    aiChatBody.scrollTop = aiChatBody.scrollHeight;
};

const removeTypingIndicator = () => {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) indicator.remove();
};

// Mengirim pesan ke backend, bukan langsung ke Gemini API
const getAiResponse = async (prompt) => {
    try {
        const response = await fetch
        ('https://h8wpqdjh.up.railway.app/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt })
        });

        const result = await response.json();
        return result.reply || "Tidak ada balasan dari AI.";
    } catch (error) {
        console.error("Error:", error);
        return "Terjadi kesalahan saat menghubungi server.";
    }
};

aiChatForm.addEventListener('submit', async e => {
    e.preventDefault();
    const userMessage = aiChatInput.value.trim();
    if (!userMessage) return;

    appendMessage(userMessage, 'user');
    aiChatInput.value = '';
    showTypingIndicator();

    const aiMessage = await getAiResponse(userMessage);
    removeTypingIndicator();
    appendMessage(aiMessage, 'ai');
});

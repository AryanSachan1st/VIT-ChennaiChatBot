// DOM elements for chatbot page
const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const logoutButton = document.getElementById('logoutButton');

// Function to add a message to the chat interface
function addMessage(content, isUser = false, sources = null, timestamp = null) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}`;

    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    messageContent.textContent = content;

    const messageTimestamp = document.createElement('div');
    messageTimestamp.className = 'message-timestamp';
    messageTimestamp.textContent = timestamp ? formatTimestamp(timestamp) : getCurrentTime();

    messageDiv.appendChild(messageContent);
    messageDiv.appendChild(messageTimestamp);

    // Add sources if provided
    if (sources && sources.length > 0) {
        const sourcesDiv = document.createElement('div');
        sourcesDiv.className = 'message-sources';
        sourcesDiv.innerHTML = '<strong>Sources:</strong><br>';

        sources.forEach(source => {
            const sourceLink = document.createElement('a');
            sourceLink.href = source.source || '#';
            sourceLink.textContent = source.title;
            sourceLink.className = 'source-link';
            sourceLink.target = '_blank';
            sourceLink.rel = 'noopener noreferrer';
            sourcesDiv.appendChild(sourceLink);
            sourcesDiv.appendChild(document.createElement('br'));
        });

        messageDiv.appendChild(sourcesDiv);
    }

    chatMessages.appendChild(messageDiv);

    // Scroll to the bottom of the chat
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Function to get current time in HH:MM format
function getCurrentTime() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}

// Format a stored timestamp (ISO string or Date) as HH:MM DD/MM/YYYY
function formatTimestamp(ts) {
    const d = new Date(ts);
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${hours}:${minutes}  ${day}/${month}/${year}`;
}

// Add a visual separator in the chat
function addHistorySeparator(label) {
    const sep = document.createElement('div');
    sep.className = 'history-separator';
    sep.textContent = label;
    chatMessages.appendChild(sep);
}

// Load and display the user's previous chat history
async function loadChatHistory() {
    try {
        const response = await fetch('/chat/history', {
            method: 'GET',
            credentials: 'include'
        });

        if (!response.ok) return; // silently skip if not authenticated or error

        const data = await response.json();
        const history = data.history || [];

        if (history.length === 0) return;

        addHistorySeparator('— Previous conversations —');

        history.forEach(entry => {
            addMessage(entry.userMessage, true, null, entry.timestamp);
            addMessage(entry.botResponse, false, null, entry.timestamp);
        });

        addHistorySeparator('— New conversation —');
    } catch (error) {
        console.error('Error loading chat history:', error);
    }
}

// Function to send message to backend
async function sendMessage(message) {
    // Create and show thinking indicator
    const thinkingDiv = document.createElement('div');
    thinkingDiv.className = 'thinking-indicator';
    thinkingDiv.innerHTML = `
        <div class="dot"></div>
        <div class="dot"></div>
        <div class="dot"></div>
    `;
    chatMessages.appendChild(thinkingDiv);

    // Scroll to the bottom of the chat
    chatMessages.scrollTop = chatMessages.scrollHeight;

    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message }),
            credentials: 'include'
        });

        // Remove thinking indicator
        chatMessages.removeChild(thinkingDiv);

        const data = await response.json();

        if (response.ok) {
            addMessage(data.response, false, data.sources);
        } else {
            addMessage(`Error: ${data.error}`, false);
        }
    } catch (error) {
        // Remove thinking indicator even if there's an error
        if (thinkingDiv.parentNode) {
            chatMessages.removeChild(thinkingDiv);
        }
        console.error('Error sending message:', error);
        addMessage('Sorry, I encountered an error while processing your request.', false);
    }
}

// Function to handle user input submission
function handleSubmit() {
    const message = userInput.value.trim();

    if (message) {
        // Add user message to chat
        addMessage(message, true);

        // Clear input field
        userInput.value = '';

        // Send message to backend
        sendMessage(message);
    }
}

// Event listeners for chatbot
sendButton.addEventListener('click', handleSubmit);

userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleSubmit();
    }
});

// Logout functionality
logoutButton.addEventListener('click', async () => {
    try {
        const response = await fetch('/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (response.ok) {
            // Redirect to login page
            window.location.href = '/';
        } else {
            alert(`Logout failed: ${data.error}`);
        }
    } catch (error) {
        console.error('Error during logout:', error);
        alert('An error occurred during logout. Please try again.');
    }
});

// On page load: fetch and render chat history, then focus input
loadChatHistory().then(() => {
    userInput.focus();
});

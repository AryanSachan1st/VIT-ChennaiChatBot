// DOM elements for chatbot page
const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const logoutButton = document.getElementById('logoutButton');

// Function to add a message to the chat interface
function addMessage(content, isUser = false, sources = null) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}`;

    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    messageContent.textContent = content;

    const timestamp = document.createElement('div');
    timestamp.className = 'message-timestamp';
    timestamp.textContent = getCurrentTime();

    messageDiv.appendChild(messageContent);
    messageDiv.appendChild(timestamp);

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

// Initial focus on input field
userInput.focus();

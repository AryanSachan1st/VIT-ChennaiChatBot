// Check if we're on the auth page or chatbot page
const isAuthPage = document.getElementById('loginForm') !== null;

if (isAuthPage) {
    // DOM elements for authentication
    const loginTab = document.getElementById('loginTab');
    const signupTab = document.getElementById('signupTab');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const googleLoginButton = document.getElementById('googleLogin');
    const googleSignupButton = document.getElementById('googleSignup');

    // Tab switching functionality
    loginTab.addEventListener('click', () => {
        loginTab.classList.add('active');
        signupTab.classList.remove('active');
        loginForm.classList.remove('hidden');
        signupForm.classList.add('hidden');
    });

    signupTab.addEventListener('click', () => {
        signupTab.classList.add('active');
        loginTab.classList.remove('active');
        signupForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
    });

    // Login form submission
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                // Redirect to chatbot page
                window.location.href = '/chatbot.html';
            } else {
                alert(`Login failed: ${data.error}`);
            }
        } catch (error) {
            console.error('Error during login:', error);
            alert('An error occurred during login. Please try again.');
        }
    });

    // Signup form submission
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('signupUsername').value;
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;

        try {
            const response = await fetch('/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, email, password })
            });

            const data = await response.json();

            if (response.ok) {
                // Show OTP verification form
                showOtpForm(email);
            } else {
                alert(`Signup failed: ${data.error}`);
            }
        } catch (error) {
            console.error('Error during signup:', error);
            alert('An error occurred during signup. Please try again.');
        }
    });

    // OTP form submission
    const otpForm = document.getElementById('otpForm');
    const otpEmail = document.getElementById('otpEmail');
    const otpCode = document.getElementById('otpCode');
    const resendOtp = document.getElementById('resendOtp');

    otpForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = otpEmail.value;
        const otp = otpCode.value;

        try {
            const response = await fetch('/verify-otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, otp })
            });

            const data = await response.json();

            if (response.ok) {
                // Redirect to chatbot page
                window.location.href = '/chatbot.html';
            } else {
                alert(`OTP verification failed: ${data.error}`);
            }
        } catch (error) {
            console.error('Error during OTP verification:', error);
            alert('An error occurred during OTP verification. Please try again.');
        }
    });

    // Resend OTP button
    resendOtp.addEventListener('click', async () => {
        const email = otpEmail.value;
        
        try {
            const response = await fetch('/resend-otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email: email })
            });

            const data = await response.json();

            if (response.ok) {
                alert('OTP has been resent to your email.');
            } else {
                alert(`Failed to resend OTP: ${data.error}`);
            }
        } catch (error) {
            console.error('Error resending OTP:', error);
            alert('An error occurred while resending OTP. Please try again.');
        }
    });

    // Function to show OTP verification form
    function showOtpForm(email) {
        signupForm.classList.add('hidden');
        otpForm.classList.remove('hidden');
        otpEmail.value = email;
    }

    // Google OAuth buttons
    googleLoginButton.addEventListener('click', () => {
        window.location.href = '/auth/google/login';
    });

    googleSignupButton.addEventListener('click', () => {
        window.location.href = '/auth/google/signup';
    });

    // Check for Google auth errors in URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const signupError = urlParams.get('signupError');
    const loginError = urlParams.get('loginError');
    
    if (signupError) {
        alert(`Google Signup failed: ${signupError}`);
    } else if (loginError) {
        alert(`Google Login failed: ${loginError}`);
    }
} else {
    // DOM elements for chatbot
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
}

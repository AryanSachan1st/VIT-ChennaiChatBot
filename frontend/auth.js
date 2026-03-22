// DOM elements for authentication page
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
            // Show error message in UI instead of alert
            showErrorMessage(`Login failed: ${data.error}`);
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
            // Show error message in UI instead of alert
            showErrorMessage(`Signup failed: ${data.error}`);
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
            // Show error message in UI instead of alert
            showErrorMessage(`OTP verification failed: ${data.error}`);
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
            showErrorMessage('OTP has been resent to your email.');
        } else {
            showErrorMessage(`Failed to resend OTP: ${data.error}`);
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

// Function to show error messages in UI
function showErrorMessage(message) {
    // Remove any existing error messages
    const existingError = document.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }

    // Create error message element
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;

    // Insert error message before the form
    const authFormContainer = document.querySelector('.auth-form-container');
    authFormContainer.parentNode.insertBefore(errorDiv, authFormContainer);
}

// Check for Google auth errors in URL parameters
const urlParams = new URLSearchParams(window.location.search);
const signupError = urlParams.get('signupError');
const loginError = urlParams.get('loginError');

if (signupError) {
    showErrorMessage(`Google Signup failed: ${signupError}`);
} else if (loginError) {
    showErrorMessage(`Google Login failed: ${loginError}`);
}

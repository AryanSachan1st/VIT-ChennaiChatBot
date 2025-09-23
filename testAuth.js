const fetch = require('node-fetch').default;

async function testAuthFlow() {
  const baseUrl = 'http://localhost:3000';
  
  try {
    // Test 1: Try to access chat endpoint without authentication
    console.log('Test 1: Accessing chat endpoint without authentication');
    const chatResponse1 = await fetch(`${baseUrl}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'vit cultural fest' })
    });
    
    console.log('Chat response status:', chatResponse1.status);
    console.log('Chat response body:', await chatResponse1.text());
    
    // Test 2: Register a new user
    console.log('\nTest 2: Registering a new user');
    const signupResponse = await fetch(`${baseUrl}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        username: 'testuser', 
        email: 'test@example.com', 
        password: 'testpassword123' 
      })
    });
    
    console.log('Signup response status:', signupResponse.status);
    const signupData = await signupResponse.json();
    console.log('Signup response body:', signupData);
    
    // Test 3: Verify OTP (using a dummy OTP since we don't have the actual one)
    console.log('\nTest 3: Verifying OTP');
    const otpResponse = await fetch(`${baseUrl}/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: 'test@example.com', 
        otp: '123456' 
      })
    });
    
    console.log('OTP verification response status:', otpResponse.status);
    const otpData = await otpResponse.json();
    console.log('OTP verification response body:', otpData);
    
    // Test 4: Login with the registered user
    console.log('\nTest 4: Logging in with the registered user');
    const loginResponse = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: 'test@example.com', 
        password: 'testpassword123' 
      })
    });
    
    console.log('Login response status:', loginResponse.status);
    const loginData = await loginResponse.json();
    console.log('Login response body:', loginData);
    
    // Extract cookies from login response
    const cookies = loginResponse.headers.raw()['set-cookie'];
    console.log('Cookies received:', cookies);
    
    // Test 5: Access chat endpoint with authentication
    console.log('\nTest 5: Accessing chat endpoint with authentication');
    const chatResponse2 = await fetch(`${baseUrl}/chat`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookies ? cookies.join('; ') : ''
      },
      body: JSON.stringify({ message: 'vit cultural fest' })
    });
    
    console.log('Chat response status:', chatResponse2.status);
    console.log('Chat response body:', await chatResponse2.text());
    
    // Test 6: Access chat endpoint with authentication - asking about places to visit
    console.log('\nTest 6: Accessing chat endpoint with authentication - asking about places to visit');
    const chatResponse3 = await fetch(`${baseUrl}/chat`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookies ? cookies.join('; ') : ''
      },
      body: JSON.stringify({ message: 'what are some good places to visit near vit chennai' })
    });
    
    console.log('Chat response status:', chatResponse3.status);
    console.log('Chat response body:', await chatResponse3.text());
    
  } catch (error) {
    console.error('Error during testing:', error);
  }
}

testAuthFlow();

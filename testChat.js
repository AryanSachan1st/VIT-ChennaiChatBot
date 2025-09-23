const fetch = require('node-fetch').default;

async function testChat() {
  const baseUrl = 'http://localhost:3000';
  
  try {
    // First, login to get session cookie
    console.log('Logging in to get authentication cookie');
    const loginResponse = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: 'sachanaryaniit@gmail.com', 
        password: 'Aryan@01' 
      })
    });
    
    console.log('Login response status:', loginResponse.status);
    const loginData = await loginResponse.json();
    console.log('Login response body:', loginData);
    
    if (loginResponse.status !== 200) {
      console.log('Login failed');
      return;
    }
    
    // Extract cookies from login response
    const cookies = loginResponse.headers.raw()['set-cookie'];
    const cookieHeader = cookies ? cookies.join('; ') : '';
    console.log('Authentication cookie obtained');
    
    // Test the chat endpoint with a hostel query
    console.log('Testing chat endpoint with hostel query');
    const response = await fetch(`${baseUrl}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader
      },
      body: JSON.stringify({ message: 'tell me about vit chennai hostels' })
    });
    
    const data = await response.json();
    console.log('Chat response:', data);
    
    if (data.response) {
      console.log('Response text:', data.response);
    } else {
      console.log('No response text found');
    }
    
    if (data.sources) {
      console.log('Sources count:', data.sources.length);
      if (data.sources.length > 0) {
        console.log('First source:', data.sources[0]);
        console.log('Source URL:', data.sources[0].source);
      } else {
        console.log('No sources provided (this is expected when no relevant blog posts are found)');
      }
    } else {
      console.log('No sources field in response');
    }
  } catch (error) {
    console.error('Error testing chat:', error);
  }
}

testChat();

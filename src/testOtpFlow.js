// Test script to debug OTP flow
async function testOtpFlow() {
  const testEmail = "test@example.com";
  const API_BASE_URL = "http://localhost:5000";
  
  console.log("🧪 Starting OTP flow test...");
  
  try {
    // Step 1: Request OTP
    console.log("📧 Step 1: Sending forgot password request...");
    const forgotResponse = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmail }),
    });
    
    const forgotData = await forgotResponse.json();
    console.log("📧 Forgot password response:", forgotData);
    
    if (!forgotResponse.ok) {
      console.error("❌ Forgot password failed:", forgotData.message);
      return;
    }
    
    // Step 2: Test OTP verification
    console.log("🔐 Step 2: Testing OTP verification...");
    
    // Test with invalid OTP first
    const invalidOtpResponse = await fetch(`${API_BASE_URL}/api/auth/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmail, otp: "000000" }),
    });
    
    const invalidOtpData = await invalidOtpResponse.json();
    console.log("🔐 Invalid OTP response:", invalidOtpData);
    
    // Now let's check what OTP was actually generated (for debugging only)
    console.log("📋 Check the server logs for the generated OTP to test with valid OTP");
    
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Run the test
testOtpFlow();

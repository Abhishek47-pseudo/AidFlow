import fetch from "node-fetch";

async function testImageAnalysis() {
  const url = "http://localhost:5000/api/emergency/analyze-image";
  const payload = {
    imageData: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    location: { lat: 30.901, lon: 75.857 },
    userId: "test_user_id"
  };

  console.log("Sending POST request to:", url);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const status = res.status;
    const data = await res.json();
    console.log(`Response Status: ${status}`);
    console.log("Response Body:", JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error sending request:", error);
  }
}

testImageAnalysis();

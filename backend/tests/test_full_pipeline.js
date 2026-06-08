import fetch from "node-fetch";

async function runPipeline() {
  const loginUrl = "http://localhost:5000/api/login";
  const loginPayload = {
    username: "admin@punjab.gov.in",
    password: "AdminPassword123"
  };

  console.log("1. Logging in as admin...");
  try {
    const loginRes = await fetch(loginUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(loginPayload)
    });

    if (!loginRes.ok) {
      throw new Error(`Login failed with status ${loginRes.status}: ${await loginRes.text()}`);
    }

    const { token, _id } = await loginRes.json();
    console.log("✅ Logged in successfully! Token acquired.");

    // 2. Test Image Analysis Endpoint
    const analyzeImageUrl = "http://localhost:5000/api/emergency/analyze-image";
    const imagePayload = {
      imageData: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      location: { lat: 30.901, lon: 75.857 },
      userId: _id
    };

    console.log("2. Testing image analysis endpoint /api/emergency/analyze-image...");
    const imageRes = await fetch(analyzeImageUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(imagePayload)
    });

    const imageData = await imageRes.json();
    console.log(`Response Status: ${imageRes.status}`);
    console.log("Image Analysis Response:", JSON.stringify(imageData, null, 2));

    // 3. Test Full Emergency Request Endpoint
    const requestUrl = "http://localhost:5000/api/emergency/request";
    const requestPayload = {
      lat: 30.901,
      lon: 75.857,
      message: "HELP! Extreme flood in Ludhiana, the roads are completely blocked and water is rising. Need immediate evacuation and medical kits!",
      address: "Ludhiana, Punjab, India",
      userId: _id
    };

    console.log("3. Testing emergency request endpoint /api/emergency/request...");
    const reqRes = await fetch(requestUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(requestPayload)
    });

    const reqData = await reqRes.json();
    console.log(`Response Status: ${reqRes.status}`);
    console.log("Emergency Request Response:", JSON.stringify(reqData, null, 2));

  } catch (error) {
    console.error("❌ Pipeline test failed:", error);
  }
}

runPipeline();

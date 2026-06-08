import fetch from "node-fetch";

async function testPublicRequest() {
  const url = "http://localhost:5000/api/emergency/public-request";
  const payload = {
    lat: 30.901,
    lon: 75.857,
    message: "HELP! Heavy flooding in our area! The street is full of water and we are trapped on the roof! We need clean water and food packets urgently!",
    address: "Ludhiana, Punjab, India"
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

testPublicRequest();

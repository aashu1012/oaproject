const video = document.getElementById("camera");
const canvas = document.getElementById("snapshot");
const answerBox = document.getElementById("answer");
const captureBtn = document.getElementById("capture");
const statusBox = document.getElementById("status");

// Backend URL - Update this with your Render URL after deployment
const BACKEND_URL = 'https://your-app-name.onrender.com'; // Replace with your actual Render URL

let stream = null;

// Initialize camera
async function initCamera() {
  try {
    statusBox.innerText = "Initializing camera...";
    stream = await navigator.mediaDevices.getUserMedia({ 
      video: { 
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'environment' // Use back camera if available
      } 
    });
    video.srcObject = stream;
    statusBox.innerText = "Camera ready! Click 'Capture & Solve' to take a photo.";
    captureBtn.disabled = false;
  } catch (err) {
    console.error("Camera error:", err);
    statusBox.innerText = "Camera access denied. Please allow camera permissions and refresh the page.";
    captureBtn.disabled = true;
  }
}

// Start camera when page loads
initCamera();

captureBtn.addEventListener("click", async () => {
  if (!stream) {
    statusBox.innerText = "Camera not available. Please refresh the page.";
    return;
  }

  try {
    // Show loading state
    captureBtn.disabled = true;
    statusBox.innerText = "Processing image...";
    answerBox.innerText = "";

    // Draw snapshot
    const context = canvas.getContext("2d");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageBase64 = canvas.toDataURL("image/png");

    // Send to backend
    const response = await fetch(`${BACKEND_URL}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: imageBase64 })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.answer) {
      answerBox.innerText = result.answer;
      statusBox.innerText = "Analysis complete!";
    } else {
      answerBox.innerText = "Error: " + result.error;
      statusBox.innerText = "Analysis failed. Please try again.";
    }
  } catch (error) {
    console.error("Error:", error);
    answerBox.innerText = "Error: " + error.message;
    statusBox.innerText = "Failed to process image. Please check if the backend is running.";
  } finally {
    captureBtn.disabled = false;
  }
});

// Clean up camera when page unloads
window.addEventListener('beforeunload', () => {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }
});

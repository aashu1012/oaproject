const video = document.getElementById("camera");
const canvas = document.getElementById("snapshot");
const answerBox = document.getElementById("answer");
const captureBtn = document.getElementById("capture");
const statusBox = document.getElementById("status");
const searchAgainBtn = document.getElementById("searchAgain");

// Backend URL - Connected to deployed Render backend
const BACKEND_URL = 'https://mcq-solver-backends.onrender.com';

let stream = null;
let lastCapturedImage = null; // Store the last captured image

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

// Function to process image and get answer
async function processImage(imageBase64) {
  try {
    // Show loading state
    captureBtn.disabled = true;
    searchAgainBtn.disabled = true;
    statusBox.innerText = "Processing image...";
    answerBox.innerText = "";

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
      // Show the Search Again button
      searchAgainBtn.style.display = "inline-block";
    } else {
      answerBox.innerText = "Error: " + result.error;
      statusBox.innerText = "Analysis failed. Please try again.";
      searchAgainBtn.style.display = "none";
    }
  } catch (error) {
    console.error("Error:", error);
    answerBox.innerText = "Error: " + error.message;
    statusBox.innerText = "Failed to process image. Please check if the backend is running.";
    searchAgainBtn.style.display = "none";
  } finally {
    captureBtn.disabled = false;
    searchAgainBtn.disabled = false;
  }
}

captureBtn.addEventListener("click", async () => {
  if (!stream) {
    statusBox.innerText = "Camera not available. Please refresh the page.";
    return;
  }

  // Draw snapshot
  const context = canvas.getContext("2d");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  const imageBase64 = canvas.toDataURL("image/png");
  
  // Store the captured image for Search Again functionality
  lastCapturedImage = imageBase64;
  
  // Process the image
  await processImage(imageBase64);
});

// Search Again button functionality
searchAgainBtn.addEventListener("click", async () => {
  if (lastCapturedImage) {
    statusBox.innerText = "Searching again...";
    await processImage(lastCapturedImage);
  } else {
    statusBox.innerText = "No previous image to search. Please capture a new image first.";
  }
});

// Clean up camera when page unloads
window.addEventListener('beforeunload', () => {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }
});

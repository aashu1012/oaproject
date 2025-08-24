from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import base64
import google.generativeai as genai
from PIL import Image
import io
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Set your Gemini API key here
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "AIzaSyAEq7_mrLraibzJqOxkYs0IDizLPHVMKFY")

try:
    genai.configure(api_key=GEMINI_API_KEY)
    print(f"Gemini API configured successfully with key: {GEMINI_API_KEY[:10]}...")
except Exception as e:
    print(f"Error configuring Gemini API: {e}")

@app.route('/')
def index():
    return '''
    <!DOCTYPE html>
    <html>
    <head>
        <title>MCQ Solver Backend</title>
    </head>
    <body>
        <h1>MCQ Solver Backend is Running!</h1>
        <p>Backend server is working correctly.</p>
        <p>Open the frontend/index.html file in your browser to use the application.</p>
        <p><a href="/health">Health Check</a></p>
        <p><a href="/test-gemini">Test Gemini API</a></p>
    </body>
    </html>
    '''

@app.route('/test-gemini')
def test_gemini():
    try:
        # Test Gemini API connection
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content("Hello! Please respond with 'Gemini API is working' if you can see this message.")
        return jsonify({
            "status": "success",
            "message": "Gemini API test successful",
            "response": response.text
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": "Gemini API test failed",
            "error": str(e)
        }), 500

@app.route('/analyze', methods=['POST'])
def analyze_image():
    try:
        data = request.json
        if not data or 'image' not in data:
            return jsonify({"error": "No image data received"}), 400
            
        image_base64 = data['image']
        if not image_base64.startswith('data:image/'):
            return jsonify({"error": "Invalid image format"}), 400
            
        print(f"Processing image: {len(image_base64)} characters")
        
        image_bytes = base64.b64decode(image_base64.split(",")[1])
        image = Image.open(io.BytesIO(image_bytes))
        print(f"Image opened successfully: {image.size}")

        # Load Gemini model - using a more reliable model name
        try:
            model = genai.GenerativeModel("gemini-1.5-flash")
            print("Gemini model loaded successfully")
        except Exception as model_error:
            print(f"Error loading Gemini model: {model_error}")
            # Fallback to try different model names
            try:
                model = genai.GenerativeModel("gemini-1.5-pro")
                print("Fallback to gemini-1.5-pro successful")
            except Exception as fallback_error:
                print(f"Fallback model also failed: {fallback_error}")
                return jsonify({"error": f"Failed to load Gemini model: {fallback_error}"}), 500

        # Send image + prompt
        print("Sending request to Gemini...")
        response = model.generate_content(
            [image, "This is an MCQ question. Give me ONLY the correct option (A/B/C/D) with explanation."]
        )
        print("Received response from Gemini")

        return jsonify({"answer": response.text})
    except Exception as e:
        error_msg = f"Error processing image: {str(e)}"
        print(error_msg)
        return jsonify({"error": error_msg}), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy", 
        "message": "Backend server is running",
        "gemini_configured": bool(GEMINI_API_KEY)
    })

# For Vercel deployment
if __name__ == "__main__":
    print("Starting MCQ Solver Backend Server...")
    print("Server will be available at: http://127.0.0.1:5000")
    print("Frontend should be opened from: frontend/index.html")
    print(f"Gemini API Key: {GEMINI_API_KEY[:10]}...")
    app.run(debug=True, host='127.0.0.1', port=5000)

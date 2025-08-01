from flask import Flask, render_template, request, jsonify
import markdown
import os
import requests
import json
import base64
import speech_recognition as sr
import io
import tempfile
import uuid
from pydub import AudioSegment
import google.generativeai as genai
import re
import traceback
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Set FFmpeg path explicitly
try:
    # Use the specific FFmpeg path from environment variable
    ffmpeg_path = os.getenv("FFMPEG_PATH")
    
    if os.path.isfile(ffmpeg_path):
        AudioSegment.converter = ffmpeg_path
        print(f"FFmpeg found at: {ffmpeg_path}")
    else:
        # Try to find ffmpeg in common Windows locations as fallback
        possible_ffmpeg_paths = [
            r"C:\Program Files\ffmpeg\bin\ffmpeg.exe",
            r"C:\ffmpeg\bin\ffmpeg.exe",
            os.path.expanduser("~") + r"\ffmpeg\bin\ffmpeg.exe"
        ]
        
        ffmpeg_path = None
        for path in possible_ffmpeg_paths:
            if os.path.isfile(path):
                ffmpeg_path = path
                break
        
        if ffmpeg_path:
            AudioSegment.converter = ffmpeg_path
            print(f"FFmpeg found at: {ffmpeg_path}")
        else:
            print("FFmpeg not found in common locations. Relying on PATH environment variable.")
except Exception as e:
    print(f"Error setting FFmpeg path: {str(e)}")

# Configure Google Gemini API
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=GEMINI_API_KEY)

# Configure OpenWeather API
OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")
OPENWEATHER_BASE_URL = "https://api.openweathermap.org/data/2.5"

# Initializing the app
app = Flask(__name__)

@app.route('/', methods=["GET"])
def home_page():
    return render_template('index.html')

@app.route('/api/weather', methods=["GET"])
def get_weather():
    """API endpoint for fetching weather data"""
    # Get request parameters
    location = request.args.get('location')
    lat = request.args.get('lat')
    lon = request.args.get('lon')
    request_type = request.args.get('type', 'current')  # 'current' or 'forecast'
    
    if not location and not (lat and lon):
        return jsonify({"error": "Missing location or coordinates"}), 400
    
    try:
        # Build API URL based on request type
        if request_type == 'current':
            endpoint = f"{OPENWEATHER_BASE_URL}/weather"
        else:
            endpoint = f"{OPENWEATHER_BASE_URL}/forecast"
        
        # Build request parameters
        params = {
            "appid": OPENWEATHER_API_KEY,
            "units": "metric"  # Use metric units (Celsius)
        }
        
        # Add location or coordinates to the parameters
        if location:
            params["q"] = location
        else:
            params["lat"] = lat
            params["lon"] = lon
        
        # Make the request to the OpenWeather API
        print(f"Making request to {endpoint} with params: {params}")
        response = requests.get(endpoint, params=params)
        
        # Check for errors
        if response.status_code != 200:
            error_message = response.json().get('message', 'Unknown error')
            print(f"Error from OpenWeather API: {response.status_code} - {error_message}")
            return jsonify({
                "error": f"Weather API error: {response.status_code} - {error_message}",
                "success": False
            }), response.status_code
        
        # Return the weather data
        data = response.json()
        return jsonify(data)
    
    except Exception as e:
        print(f"Error fetching weather data: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": str(e), "success": False}), 500

def get_image_data_url(image_data, image_format):
    """
    Converts image binary data to a data URL string.
    
    Args:
        image_data (bytes): The binary audio data
        image_format (str): The format of the image file (jpg, png, etc)
        
    Returns:
        str: The data URL of the image
    """
    encoded_image = base64.b64encode(image_data).decode("utf-8")
    return f"data:image/{image_format};base64,{encoded_image}"

def transcribe_audio(audio_data):
    """
    Transcribes audio data to text using SpeechRecognition.
    
    Args:
        audio_data (bytes): The binary audio data
        
    Returns:
        str: The transcribed text
    """
    recognizer = sr.Recognizer()
    
    # Generate temporary filenames with random UUID to avoid conflicts
    temp_input_filename = os.path.join(tempfile.gettempdir(), f"audio_input_{uuid.uuid4().hex}.webm")
    temp_wav_filename = os.path.join(tempfile.gettempdir(), f"audio_converted_{uuid.uuid4().hex}.wav")
    
    try:
        # Write the input audio data to a temporary file
        with open(temp_input_filename, 'wb') as f:
            f.write(audio_data)
        
        print(f"Audio file saved to: {temp_input_filename}")
        print(f"Audio file size: {os.path.getsize(temp_input_filename)} bytes")
        
        # Try multiple approaches to convert the audio
        try:
            print("Attempting to convert audio with pydub...")
            
            # Tell pydub where to find FFmpeg explicitly if not set yet
            if not hasattr(AudioSegment, 'converter') or not AudioSegment.converter:
                # Try to locate ffmpeg in system PATH
                import subprocess
                try:
                    ffmpeg_path = subprocess.check_output(['where', 'ffmpeg'], text=True).strip().split('\n')[0]
                    AudioSegment.converter = ffmpeg_path
                    print(f"Found ffmpeg at: {ffmpeg_path}")
                except Exception as e:
                    print(f"Could not find ffmpeg in PATH: {str(e)}")
            
            # Try to read as WebM (most common browser recording format)
            audio = AudioSegment.from_file(temp_input_filename, format="webm")
            print("Successfully read as WebM")
        except Exception as webm_error:
            print(f"Error reading as WebM: {str(webm_error)}")
            try:
                # Try to read as Ogg
                audio = AudioSegment.from_file(temp_input_filename, format="ogg")
                print("Successfully read as Ogg")
            except Exception as ogg_error:
                print(f"Error reading as Ogg: {str(ogg_error)}")
                try:
                    # Try to read as WAV
                    audio = AudioSegment.from_wav(temp_input_filename)
                    print("Successfully read as WAV")
                except Exception as wav_error:
                    print(f"Error reading as WAV: {str(wav_error)}")
                    # Try as a generic file and let pydub detect format
                    try:
                        audio = AudioSegment.from_file(temp_input_filename)
                        print("Successfully read as generic file")
                    except Exception as generic_error:
                        # As a last resort, try direct conversion with ffmpeg
                        print(f"Error reading as generic file: {str(generic_error)}")
                        print("Attempting direct conversion with ffmpeg subprocess...")
                        import subprocess
                        try:
                            subprocess.run([
                                'ffmpeg', '-y',
                                '-i', temp_input_filename,
                                '-ar', '16000', '-ac', '1',
                                temp_wav_filename
                            ], check=True)
                            print("Successfully converted with ffmpeg subprocess")
                        except Exception as ffmpeg_error:
                            print(f"Error with ffmpeg subprocess: {str(ffmpeg_error)}")
                            raise Exception(f"Failed to convert audio file: {str(generic_error)}")
        
        # Export to WAV if we didn't already use the subprocess approach
        if 'audio' in locals():
            print("Exporting to WAV format...")
            audio.export(temp_wav_filename, format="wav")
            print(f"Exported to {temp_wav_filename}")
        
        print(f"Converted WAV file size: {os.path.getsize(temp_wav_filename)} bytes")
        
        # Use the converted WAV file for recognition
        with sr.AudioFile(temp_wav_filename) as source:
            print("Loading audio into recognizer...")
            audio_data = recognizer.record(source)
            
            # Use Google's speech recognition service
            print("Sending to Google speech recognition...")
            text = recognizer.recognize_google(audio_data)
            print(f"Transcription result: {text}")
            return text
    except sr.UnknownValueError:
        print("Speech Recognition could not understand the audio")
        return "Speech Recognition could not understand the audio"
    except sr.RequestError as e:
        print(f"Could not request results from Speech Recognition service: {str(e)}")
        return f"Could not request results from Speech Recognition service: {str(e)}"
    except Exception as e:
        print(f"Error processing audio: {str(e)}")
        return f"Error processing audio: {str(e)}"
    finally:
        # Clean up the temporary files
        try:
            if os.path.exists(temp_input_filename):
                os.remove(temp_input_filename)
                print(f"Removed temporary input file: {temp_input_filename}")
            if os.path.exists(temp_wav_filename):
                os.remove(temp_wav_filename)
                print(f"Removed temporary WAV file: {temp_wav_filename}")
        except Exception as e:
            print(f"Error cleaning up temporary files: {str(e)}")

@app.route('/api/transcribe', methods=["POST"])
def transcribe():
    """API endpoint for handling audio transcription"""
    try:
        # Get audio data from request
        if 'audio' not in request.files:
            return jsonify({"error": "No audio file provided"}), 400
        
        audio_file = request.files['audio']
        audio_data = audio_file.read()
        
        if len(audio_data) == 0:
            return jsonify({"error": "Empty audio file"}), 400
        
        # Process the audio data
        transcribed_text = transcribe_audio(audio_data)
        
        return jsonify({"transcription": transcribed_text})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/chat', methods=["POST"])
def chat():
    # Get JSON data from the request
    data = request.json
    user_input = data.get('message', '')
    image_data = data.get('image', None)
    bot_name = data.get('bot', 'Articuno.AI')
    
    if not user_input and not image_data:
        return jsonify({"error": "No message or image provided"}), 400
    
    try:
        # Check which bot is selected and use appropriate API
        if bot_name == "Articuno.AI":
            # Use Gemini with special weather-focused system prompt
            return process_articuno_weather_request(user_input, image_data)
        elif bot_name == "Gemini 2.0 Flash" or bot_name.lower() == "gemini":
            return process_gemini_request(user_input, image_data)
        else:
            # Use Azure OpenAI API as fallback
            return process_azure_openai_request(user_input, image_data)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def detect_location_from_message(message):
    """
    Extracts location information from a user message.
    
    Args:
        message (str): The user message to analyze
        
    Returns:
        str or None: Detected location name or None if no location found
    """
    # Enhanced location detection - look for common location query patterns
    location_patterns = [
        r"weather\s+(?:in|at|for)\s+([A-Za-z\s,]+)",  # "weather in London"
        r"(?:in|at)\s+([A-Za-z\s,]+?)(?:\s+weather|\?|$)",  # "in Paris weather"
        r"^([A-Za-z\s,]+?)(?:\s+weather|\?|$)",  # "Tokyo weather"
        r"^([A-Za-z\s,]+?)$",  # Just the location name
        r"weather (?:of|for|in|at)\s+([A-Za-z\s,]+)",  # "weather of Tokyo"
        r"weather(?:.+?)(?:of|for|in|at)\s+([A-Za-z\s,]+)",  # "weather report of London"
        r"(?:show|get|tell|give)(?:.+?)weather(?:.+?)(?:of|for|in|at)\s+([A-Za-z\s,]+)",  # "give me weather of London"
        r"(?:show|get|tell|give)(?:.+?)(?:of|for|in|at)\s+([A-Za-z\s,]+?)(?:\s+weather|\?|$)",  # "give me of London weather"
        r"(?:how is|what is|what's)(?:.+?)weather(?:.+?)(?:of|for|in|at)\s+([A-Za-z\s,]+)",  # "how is the weather in London"
        r"(?:how's|what's)(?:.+?)(?:of|for|in|at)\s+([A-Za-z\s,]+?)(?:\s+weather|\?|$)"  # "what's in London weather like"
    ]
    
    for pattern in location_patterns:
        match = re.search(pattern, message, re.IGNORECASE)
        if match:
            location = match.group(1).strip()
            # Remove trailing punctuation if any
            location = re.sub(r'[.,;:!?]+$', '', location)
            return location
    
    # As a fallback, try to find any city name mentioned in the query
    # This is a simple approach - in a production system, you might use NER (Named Entity Recognition)
    words = message.split()
    for word in words:
        # Clean the word of punctuation
        clean_word = re.sub(r'[.,;:!?]+$', '', word)
        # If the word starts with a capital letter and is at least 3 characters, it might be a location
        if len(clean_word) >= 3 and clean_word[0].isupper() and clean_word.lower() not in [
            "what", "where", "when", "why", "how", "can", "could", "would", 
            "should", "will", "shall", "the", "this", "that", "these", "those",
            "give", "show", "tell", "about", "weather", "forecast", "temperature",
            "conditions"
        ]:
            return clean_word
    
    return None

def fetch_weather_data(location):
    """
    Fetches weather data from OpenWeather API for a specific location.
    
    Args:
        location (str): The location to fetch weather data for
        
    Returns:
        dict: Weather data for the location or error information
    """
    try:
        # Fetch current weather
        current_url = f"{OPENWEATHER_BASE_URL}/weather"
        params = {
            "q": location,
            "appid": OPENWEATHER_API_KEY,
            "units": "metric"  # Use metric units (Celsius)
        }
        
        response = requests.get(current_url, params=params)
        if response.status_code != 200:
            return {"error": f"Weather API error: {response.status_code} - {response.json().get('message', 'Unknown error')}"}
        
        current_data = response.json()
        
        # Fetch forecast (5 days / 3 hours)
        forecast_url = f"{OPENWEATHER_BASE_URL}/forecast"
        forecast_response = requests.get(forecast_url, params=params)
        
        if forecast_response.status_code != 200:
            return {
                "current": current_data,
                "forecast_error": f"Forecast API error: {forecast_response.status_code}"
            }
        
        forecast_data = forecast_response.json()
        
        # Return combined weather data
        return {
            "current": current_data,
            "forecast": forecast_data
        }
    except Exception as e:
        return {"error": f"Error fetching weather data: {str(e)}"}

def format_weather_data_for_gemini(weather_data, location):
    """
    Formats weather data into a structured prompt for Gemini model.
    
    Args:
        weather_data (dict): Weather data from OpenWeather API
        location (str): The location name
        
    Returns:
        str: Formatted weather data prompt
    """
    if "error" in weather_data:
        return f"Error: {weather_data['error']}"
    
    try:
        current = weather_data["current"]
        
        # Extract current weather data
        temp = current["main"]["temp"]
        feels_like = current["main"]["feels_like"]
        humidity = current["main"]["humidity"]
        weather_desc = current["weather"][0]["description"]
        weather_main = current["weather"][0]["main"]
        wind_speed = current["wind"]["speed"]
        
        # Extract location data
        city_name = current["name"]
        country = current["sys"]["country"]
        
        # Extract forecast if available
        forecast_text = ""
        if "forecast" in weather_data:
            forecast = weather_data["forecast"]
            forecast_text = "\n\nForecast for next few days:\n"
            
            # Group forecast by day
            day_forecasts = {}
            for item in forecast["list"]:
                dt = item["dt"]
                date = item["dt_txt"].split(" ")[0]
                
                if date not in day_forecasts:
                    day_forecasts[date] = []
                
                day_forecasts[date].append(item)
            
            # Generate a summary for each day
            for date, items in list(day_forecasts.items())[:3]:  # Limit to 3 days
                # Calculate average temp for the day
                avg_temp = sum(item["main"]["temp"] for item in items) / len(items)
                
                # Find most common weather condition
                conditions = [item["weather"][0]["main"] for item in items]
                most_common_condition = max(set(conditions), key=conditions.count)
                
                forecast_text += f"- {date}: Average temperature {avg_temp:.1f}°C, {most_common_condition}\n"
        
        # Format the weather data as a prompt for Gemini
        prompt = f"""Weather data for {city_name}, {country} (User asked about: {location}):
        
Current conditions:
- Temperature: {temp}°C (feels like {feels_like}°C)
- Weather: {weather_desc} ({weather_main})
- Humidity: {humidity}%
- Wind speed: {wind_speed} m/s
{forecast_text}

Now, provide a friendly and helpful response about this weather information to the user. Use emojis, formatting, and a conversational tone. Include useful advice based on the weather conditions.
"""
        return prompt
    except Exception as e:
        return f"Error formatting weather data: {str(e)}"

def process_articuno_weather_request(user_input, image_data=None):
    """Process chat request specifically for Articuno.AI as a weather assistant"""
    try:
        # Configure the model
        generation_config = {
            "temperature": 0.7,
            "top_p": 1,
            "top_k": 32,
            "max_output_tokens": 1000,
        }
        
        # Create weather-focused system prompt
        weather_system_prompt = """Welcome to Articuno.AI – your friendly weather assistant!
You're here to help users explore weather updates with style, clarity, and a touch of personality 😊

Your Role:

You are a polite, knowledgeable, and conversational assistant.

Your answers should be concise, friendly, and easy to understand – even for someone not familiar with weather terms.

You may use emojis sparingly to enhance friendliness, but never in the middle of sentences.

If a user shares a location, provide current weather info and a quick summary of the next 2–3 days.

If the user clicks "Use My Location", confirm their location and offer immediate results.

Guide users clearly when they need help typing a location or understanding weather data.

Tone & Style:

Be warm, responsive, and never robotic.

Use short paragraphs and bullet points if helpful.

End most responses with a gentle question or suggestion to keep the flow going.
(e.g., "Would you like a forecast for the next few days?" or "Want me to break this down in simple terms?")

Example Starters:

🌤️ "Looks like it's sunny in Kolkata! Want to know what's coming this weekend?"

🌧️ "Rain ahead in London! Don't forget your umbrella ☔ Ready for a 3-day forecast?"

🌡️ "It's currently 30°C with light winds. Want me to check humidity too?"
"""
        
        # Create the model
        model = genai.GenerativeModel(model_name="gemini-1.5-flash", generation_config=generation_config)
        
        # Check if the user input contains a location
        location = detect_location_from_message(user_input)
        
        # If location found, fetch weather data
        weather_data = None
        weather_prompt = None
        
        if location:
            print(f"Detected location: {location}")
            weather_data = fetch_weather_data(location)
            weather_prompt = format_weather_data_for_gemini(weather_data, location)
            print(f"Formatted weather data: {weather_prompt}")
        
        # Handle messages with images
        if image_data:
            # Process the image data
            image_format = image_data.get("format", "jpeg")
            image_binary = base64.b64decode(image_data.get("data").split(",")[1])
            
            # Create image part for multimodal request
            image_parts = [
                {
                    "mime_type": f"image/{image_format}",
                    "data": image_binary
                }
            ]
            
            # Prepare content parts with system instructions and weather data if available
            if weather_prompt:
                # Include weather data in the prompt
                content_parts = [
                    {"role": "user", "parts": [{"text": weather_system_prompt}]},
                    {"role": "model", "parts": [{"text": "I understand. I'll be Articuno.AI, your weather assistant."}]},
                    {"role": "user", "parts": [{"text": f"{user_input}\n\n{weather_prompt}"}, image_parts[0]]}
                ]
            else:
                # No weather data, just use system prompt and user input
                content_parts = [
                    {"role": "user", "parts": [{"text": weather_system_prompt}]},
                    {"role": "model", "parts": [{"text": "I understand. I'll be Articuno.AI, your weather assistant."}]},
                    {"role": "user", "parts": [{"text": user_input}, image_parts[0]]}
                ]
            
            # Generate response with both text and image
            response = model.generate_content(content_parts)
        else:
            # Text-only request
            # If we have weather data, include it in the prompt
            if weather_prompt:
                content_parts = [
                    {"role": "user", "parts": [{"text": weather_system_prompt}]},
                    {"role": "model", "parts": [{"text": "I understand. I'll be Articuno.AI, your weather assistant."}]},
                    {"role": "user", "parts": [{"text": f"{user_input}\n\n{weather_prompt}"}]}
                ]
            else:
                # No location detected or weather data available
                if not any(term in user_input.lower() for term in ['weather', 'temperature', 'forecast', 'rain', 'sunny', 'cloudy', 'wind', 'humidity', 'climate']):
                    enhanced_input = f"Regarding weather information: {user_input}"
                else:
                    enhanced_input = user_input
                
                content_parts = [
                    {"role": "user", "parts": [{"text": weather_system_prompt}]},
                    {"role": "model", "parts": [{"text": "I understand. I'll be Articuno.AI, your weather assistant."}]},
                    {"role": "user", "parts": [{"text": enhanced_input}]}
                ]
            
            response = model.generate_content(content_parts)
        
        # Extract response text
        markdown_output = response.text
        html_response = markdown.markdown(markdown_output)
        
        return jsonify({"response": html_response})
    
    except Exception as e:
        print(f"Articuno Weather API error: {str(e)}")
        traceback.print_exc()  # Print the full stack trace for debugging
        return jsonify({"error": f"Error with Articuno Weather API: {str(e)}"}), 500

def process_gemini_request(user_input, image_data=None):
    """Process chat request using Google Gemini API"""
    try:
        # Configure the model
        generation_config = {
            "temperature": 0.9,
            "top_p": 1,
            "top_k": 32,
            "max_output_tokens": 1000,
        }
        
        # Create system prompt
        system_prompt = """You are Articuno.AI, a friendly virtual assistant thoughtfully developed by the Edubyte Team to provide 
        intelligent, user-friendly, and context-aware support. As a helpful assistant, your primary goal is 
        to deliver accurate, concise, and engaging responses.

        🧠 Identity
        Name: Articuno.AI
        Developed by: Edubyte Team
        Role: Friendly, fast, intelligent and supportive virtual assistant

        📝 Response Structure
        - Use clear headings (H1, H2, etc.) to organize information logically.
        - Present details using bullet points or numbered lists where appropriate for readability.
        - Include spaces after headings and between paragraphs for improved visual clarity.
        - Integrate appropriate emojis (e.g., ✅📌🚀) to enhance interactivity and user engagement, without overwhelming the message.

        🌟 Tone and Style
        - Maintain a professional yet friendly tone.
        - Be concise, yet ensure clarity and completeness.
        - Adapt your communication style based on the user's intent and tone.
        """
        
        model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            generation_config=generation_config,
            system_instruction=system_prompt
        )
        
        # Handle messages with images
        if image_data:
            # Process the image data
            image_format = image_data.get("format", "jpeg")
            image_binary = base64.b64decode(image_data.get("data").split(",")[1])
            
            # Create a temporary file to save the image
            temp_image_path = os.path.join(tempfile.gettempdir(), f"image_{uuid.uuid4().hex}.{image_format}")
            with open(temp_image_path, "wb") as f:
                f.write(image_binary)
            
            # Create image part for multimodal request
            image_parts = [
                {
                    "mime_type": f"image/{image_format}",
                    "data": image_binary
                }
            ]
            
            # Generate response with both text and image
            response = model.generate_content([user_input, image_parts[0]])
            
            # Clean up temp file
            try:
                os.remove(temp_image_path)
            except:
                pass
        else:
            # Text-only request
            response = model.generate_content(user_input)
        
        # Extract response text
        markdown_output = response.text
        html_response = markdown.markdown(markdown_output)
        
        return jsonify({"response": html_response})
    
    except Exception as e:
        print(f"Gemini API error: {str(e)}")
        return jsonify({"error": f"Error with Gemini API: {str(e)}"}), 500

def process_azure_openai_request(user_input, image_data=None):
    """Process chat request using Azure OpenAI API"""
    # OpenAI API Configuration from environment variables
    token = os.getenv("AZURE_OPENAI_API_KEY")
    endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
    model_name = os.getenv("AZURE_OPENAI_MODEL")
    
    try:
        # Prepare headers
        headers = {
            "Content-Type": "application/json",
            "api-key": token
        }
        
        # Prepare messages
        system_message = {
            "role": "system",
            "content": (
                "You are Eubyte, a friendly virtual assistant thoughtfully developed by the Edubyte Team to provide "
                "intelligent, user-friendly, and context-aware support. As a helpful assistant, your primary goal is "
                "to deliver accurate, concise, and engaging responses.\n\n"

                "🧠 Identity\n"
                "Name: Eubyte\n"
                "Developed by: Edubyte Team\n"
                "Role: Friendly, fast, intelligent and supportive virtual assistant\n\n"

                "📝 Response Structure\n"
                "- Use clear headings (H1, H2, etc.) to organize information logically.\n"
                "- Present details using bullet points or numbered lists where appropriate for readability.\n"
                "- Include spaces after headings and between paragraphs for improved visual clarity.\n"
                "- Integrate appropriate emojis (e.g., ✅📌🚀) to enhance interactivity and user engagement, without overwhelming the message.\n\n"

                "🌟 Tone and Style\n"
                "- Maintain a professional yet friendly tone.\n"
                "- Be concise, yet ensure clarity and completeness.\n"
                "- Adapt your communication style based on the user's intent and tone."
            )
        }
        
        # Handle regular text messages
        if image_data is None:
            user_message = {
                "role": "user",
                "content": user_input
            }
            messages = [system_message, user_message]
        # Handle messages with images
        else:
            # Process the image data
            image_format = image_data.get("format", "jpeg")
            image_binary = base64.b64decode(image_data.get("data").split(",")[1])
            image_url = get_image_data_url(image_binary, image_format)
            
            # Create multimodal message with both text and image
            user_message = {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": user_input
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": image_url,
                            "detail": "auto"
                        }
                    }
                ]
            }
            messages = [system_message, user_message]
        
        # Create the payload
        payload = {
            "messages": messages,
            "temperature": 1.0,
            "top_p": 1.0,
            "max_tokens": 1000,
            "model": model_name
        }
        
        # Make direct API call
        api_url = f"{endpoint}/openai/deployments/{model_name}/chat/completions?api-version=2024-02-15-preview"
        response = requests.post(api_url, headers=headers, json=payload)
        response_data = response.json()
        
        # Extract response text
        markdown_output = response_data["choices"][0]["message"]["content"]
        html_response = markdown.markdown(markdown_output)
        
        return jsonify({"response": html_response})
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
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

# Set FFmpeg path explicitly
try:
    # Use the specific FFmpeg path provided by the user
    ffmpeg_path = r"C:\Program Files\ffmpeg-7.1.1-essentials_build\ffmpeg-7.1.1-essentials_build\bin\ffmpeg.exe"
    
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
GEMINI_API_KEY = "AIzaSyCAk4mkNVUtb3Fqi1SoU_a4y6r7_sWhxxs"
genai.configure(api_key=GEMINI_API_KEY)

# Initializing the app
app = Flask(__name__)

@app.route('/', methods=["GET"])
def home_page():
    return render_template('index.html')

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
        weather_system_prompt = """You are Articuno.AI, a friendly and helpful weather assistant. Your primary purpose is to:
        
        1. Help users understand weather conditions for specific locations
        2. Interpret weather data and explain what it means for users' daily activities
        3. Provide weather forecasts and recommendations based on weather conditions
        4. Explain weather phenomena and patterns
        5. Answer questions about climate and weather-related topics
        
        Always assume the user is asking about weather unless they explicitly indicate otherwise. When the user asks about a location, provide current weather conditions and a short forecast if possible.
        
        If the user sends an image of weather conditions, clouds, or sky, try to interpret the weather conditions shown in the image.
        
        Your tone should be:
        - Friendly and conversational
        - Helpful and informative
        - Clear and concise
        
        Format your responses with:
        - Emoji indicators for weather conditions (☀️🌧️❄️)
        - Bold formatting for important temperature values
        - Bullet points for recommendations
        
        When users don't specify a location, politely ask which location they'd like to know about.
        """
        
        model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            generation_config=generation_config,
            system_instruction=weather_system_prompt
        )
        
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
            
            # Generate response with both text and image
            response = model.generate_content([user_input, image_parts[0]])
        else:
            # Text-only request
            # Enhance the user query with weather context if needed
            if not any(term in user_input.lower() for term in ['weather', 'temperature', 'forecast', 'rain', 'sunny', 'cloudy', 'wind', 'humidity', 'climate']):
                enhanced_input = f"Regarding weather information: {user_input}"
            else:
                enhanced_input = user_input
                
            response = model.generate_content(enhanced_input)
        
        # Extract response text
        markdown_output = response.text
        html_response = markdown.markdown(markdown_output)
        
        return jsonify({"response": html_response})
    
    except Exception as e:
        print(f"Articuno Weather API error: {str(e)}")
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
    # OpenAI API Configuration
    token = os.environ.get("Edubyte") # Add your API key here
    endpoint = "https://models.inference.ai.azure.com"
    model_name = "gpt-4o"
    
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
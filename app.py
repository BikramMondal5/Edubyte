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
    
    if not user_input and not image_data:
        return jsonify({"error": "No message or image provided"}), 400
    
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
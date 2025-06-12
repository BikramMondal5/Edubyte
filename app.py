from flask import Flask, render_template, request, jsonify
import markdown
import os
import requests
import json
import base64

# Initializing the app
app = Flask(__name__)

@app.route('/', methods=["GET"])
def home_page():
    return render_template('index.html')

def get_image_data_url(image_data, image_format):
    """
    Converts image binary data to a data URL string.
    
    Args:
        image_data (bytes): The binary image data
        image_format (str): The format of the image file (jpg, png, etc)
        
    Returns:
        str: The data URL of the image
    """
    encoded_image = base64.b64encode(image_data).decode("utf-8")
    return f"data:image/{image_format};base64,{encoded_image}"

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
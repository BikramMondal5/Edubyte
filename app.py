from flask import Flask, render_template, request, jsonify
import markdown
import os
import requests
import json

# Initializing the app
app = Flask(__name__)

@app.route('/', methods=["GET"])
def home_page():
    return render_template('index.html')

@app.route('/api/chat', methods=["POST"])
def chat():
    # Get JSON data from the request
    data = request.json
    user_input = data.get('message', '')
    
    if not user_input:
        return jsonify({"error": "No message provided"}), 400
    
    # OpenAI API Configuration
    token = os.environ.get("Edubyte") # Add your API key here
    endpoint = "https://models.inference.ai.azure.com"
    model_name = "gpt-4o"
    
    try:
        # Use requests library directly instead of OpenAI client
        headers = {
            "Content-Type": "application/json",
            "api-key": token
        }
        
        payload = {
            "messages": [
                {
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
                },
                {
                    "role": "user",
                    "content": user_input
                }
            ],
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
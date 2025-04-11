from flask import Flask, render_template, request, jsonify
from azure.ai.inference import ChatCompletionsClient
from azure.ai.inference.models import SystemMessage, UserMessage
from azure.core.credentials import AzureKeyCredential
import markdown
from openai import OpenAI
import os

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

        #OpenAI Client

        client = OpenAI(
            base_url=endpoint,
            api_key=token,
        )

        #OpenAI response
        
        response = client.chat.completions.create(
            messages=[
                {"role": "system", "content": "Your name is Eubyte, developed by edubyte team, a helpful assistant. Respond in well-structured format using headings, lists, spaces after a heading or paragraph and appropriate interactive emojis."},
                {"role": "user", "content": user_input}
            ],
            temperature=1.0,
            top_p=1.0,
            max_tokens=1000,
            model=model_name
        )

        

        # Extract response text
        markdown_output = response.choices[0].message.content 
        html_response = markdown.markdown(markdown_output)
        
        return jsonify({"response": html_response})
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)

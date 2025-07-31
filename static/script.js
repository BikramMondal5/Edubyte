// Add hover effect to tool items
document.querySelectorAll('.tool-item, .grid-item, .model-card, .tool-card').forEach(item => {
    item.addEventListener('mouseenter', () => {
        item.style.transform = 'translateY(-2px)';
        item.style.transition = 'transform 0.2s ease';
    });

    item.addEventListener('mouseleave', () => {
        item.style.transform = 'translateY(0)';
    });
});

// Add click effect to action buttons and other interactive elements
document.querySelectorAll('.action-button, .use-model-btn, .control-button').forEach(button => {
    button.addEventListener('click', () => {
        button.style.transform = 'scale(0.95)';
        setTimeout(() => {
            button.style.transform = 'scale(1)';
        }, 100);
    });
});

// Select elements
const chatInput = document.querySelector('.chat-input');
const sendButton = document.getElementById("send-button");
const contentArea = document.getElementById("content-area");
const mainGrid = document.querySelector(".main-grid-layout");
const chatbotInterface = document.getElementById('chatbot-interface');
const chatbotHeader = document.querySelector('.chatbot-header');
const chatbotAvatar = document.querySelector('.chatbot-avatar');
const chatbotName = document.querySelector('.chatbot-info h2');
const chatbotDescription = document.querySelector('.chatbot-info p');
const chatbotChatHistory = document.getElementById('chatbot-chat-history');

// Create chat history container if it doesn't exist
let chatHistory = document.querySelector(".chat-history");
if (!chatHistory) {
    chatHistory = document.createElement("div");
    chatHistory.className = "chat-history";
}

// Set initial user information
let userProfile = {
    name: "You",
    initial: ""
};

// Set assistant information - will use selected model
let assistantProfile = {
    name: "Eubyte",
    avatar: "edubyte-avatar"
};

// Bot descriptions (you can expand this with more details)
const botDescriptions = {
    "Articuno.AI": {
        name: "Articuno.AI",
        description: "Your AI-powered educational assistant for learning and development.",
        avatar: "Articuno-avatar"
    },
    "GPT-4o": {
        name: "GPT-4o",
        description: "Advanced multimodal capabilities for text and vision tasks.",
        avatar: "gpt-4o-avatar"
    },
    "DeepSeek R1": {
        name: "DeepSeek R1",
        description: "Specialized for code generation and technical reasoning.",
        avatar: "DeepSeek-avatar"
    },
    "Gemini 2.0 Flash": {
        name: "Gemini 2.0 Flash",
        description: "Fast response times with multimodal capabilities.",
        avatar: "gemini-avatar"
    },
    "Recipe Queen": {
        name: "Recipe Queen",
        description: "Your culinary assistant for recipes, cooking tips, and meal planning.",
        avatar: "recipe-queen-avatar"
    },
    "Code Copilot": {
        name: "Code Copilot",
        description: "Your AI pair programmer for faster, smarter coding.",
        avatar: "code-copilot-avatar"
    },
    "SQL Bot": {
        name: "SQL Bot",
        description: "Helps you write and optimize SQL queries.",
        avatar: "sql-bot-avatar"
    },
    "Python Bot": {
        name: "Python Bot",
        description: "Assists with Python programming and debugging.",
        avatar: "python-bot-avatar"
    },
    "Java Bot": {
        name: "Java Bot",
        description: "Provides support for Java development.",
        avatar: "java-bot-avatar"
    },
    "HTML Bot": {
        name: "HTML Bot",
        description: "Guides you through HTML structure and best practices.",
        avatar: "html-bot-avatar"
    },
    "CSS Bot": {
        name: "CSS Bot",
        description: "Helps with styling and responsive design using CSS.",
        avatar: "css-bot-avatar"
    },
    "JavaScript Bot": {
        name: "JavaScript Bot",
        description: "Assists with JavaScript programming and frameworks.",
        avatar: "javascript-bot-avatar"
    },
    "Ruby Bot": {
        name: "Ruby Bot",
        description: "Supports Ruby and Ruby on Rails development.",
        avatar: "ruby-bot-avatar"
    },
    "PHP Bot": {
        name: "PHP Bot",
        description: "Provides assistance for PHP development.",
        avatar: "php-bot-avatar"
    },
    "C++ Bot": {
        name: "C++ Bot",
        description: "Helps with C++ programming and algorithms.",
        avatar: "cpp-bot-avatar"
    }
};

// Variable to store the currently selected image
let selectedImage = null;

// Variables for audio recording
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;

// Initialize UI interaction handlers
function initializeUIHandlers() {
    // Grid items click handling
    document.querySelectorAll('.grid-item').forEach(item => {
        item.addEventListener('click', () => {
            const title = item.querySelector('h3').textContent;
            startChatWithPrompt(title);
        });
    });

    // Model card "Use Model" button handling
    document.querySelectorAll('.use-model-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const modelCard = btn.closest('.model-card');
            const modelName = modelCard.querySelector('h3').textContent;
            const modelAvatar = modelCard.querySelector('.model-avatar').id;
            
            // Update the active model
            switchActiveModel(modelName, modelAvatar);
            
            // Start chat with this model
            startChatWithPrompt(`Hi, I'd like to use ${modelName} for my queries`);
        });
    });
    
    // Tool card handling
    document.querySelectorAll('.tool-card').forEach(card => {
        card.addEventListener('click', () => {
            const toolName = card.querySelector('h3').textContent;
            startChatWithPrompt(`I want to use the ${toolName} tool`);
        });
    });

    // Bot selection in the sidebar
    document.querySelectorAll('.bot-item').forEach(botItem => {
        botItem.addEventListener('click', () => {
            const name = botItem.querySelector('span').textContent;
            const avatar = botItem.querySelector('.bot-avatar').id;
            
            // Update the active model
            switchActiveModel(name, avatar);

            // Show chatbot interface in bigger size in main content
            mainGrid.style.display = 'none';
            chatbotInterface.style.display = 'flex';

            // Adjust chatbot interface style for bigger display
            chatbotInterface.style.flexDirection = 'column';
            chatbotInterface.style.alignItems = 'center';
            chatbotInterface.style.justifyContent = 'center';

            // Show chatbot name prominently
            const chatbotNameDisplay = document.getElementById('chatbot-name-display');
            chatbotNameDisplay.style.fontSize = '3rem';
            chatbotNameDisplay.style.marginBottom = '0.5rem';

            // Show chatbot description below name
            const chatbotDescriptionDisplay = document.getElementById('chatbot-description-display');
            chatbotDescriptionDisplay.style.fontSize = '1.25rem';
            chatbotDescriptionDisplay.style.textAlign = 'center';
            chatbotDescriptionDisplay.style.maxWidth = '600px';
            chatbotDescriptionDisplay.style.margin = '0 auto 2rem auto';

            // Clear chat history for this view
            chatbotChatHistory.innerHTML = '';

            // Display welcome message
            addAIMessageToHistory(`Hello! I'm ${name}. How can I help you today?`, chatbotChatHistory);
        });
    });
    
    // Recent chat items click handling
    document.querySelectorAll('.recent-chat-item').forEach(item => {
        item.addEventListener('click', () => {
            const topic = item.querySelector('span').textContent;
            startChatWithPrompt(topic);
        });
    });
}

// Switch the active model/assistant
function switchActiveModel(name, avatarId) {
    // Update assistant profile
    assistantProfile.name = name;
    assistantProfile.avatar = avatarId;
    
    // Update the display in the chat input header
    document.querySelector('.chat-input-header .bot-avatar').id = avatarId;
    document.querySelector('.chat-input-header .models-name').textContent = name;

    // Update chatbot interface header
    const botInfo = botDescriptions[name];
    if (botInfo) {
        // Update the chatbot avatar display
        document.getElementById('chatbot-avatar-display').id = botInfo.avatar;
        // Update the chatbot name display
        document.getElementById('chatbot-name-display').textContent = botInfo.name;
        // Update the chatbot description display
        document.getElementById('chatbot-description-display').textContent = botInfo.description;
    } else {
        // If no specific bot info, use the provided name and avatar ID
        document.getElementById('chatbot-avatar-display').id = avatarId;
        document.getElementById('chatbot-name-display').textContent = name;
        document.getElementById('chatbot-description-display').textContent = "Your AI assistant for various tasks.";
    }

    // Clear chat history for the chatbot interface
    chatbotChatHistory.innerHTML = '';

    // Hide main grid and show chatbot interface
    mainGrid.style.display = 'none';
    chatbotInterface.style.display = 'flex';

    // Display welcome message for the selected model in the chatbot interface
    addAIMessageToHistory(`Hello! I'm ${name}. How can I help you today?`, chatbotChatHistory);
}

// Start a chat with a specific prompt
function startChatWithPrompt(prompt) {
    // Clear the main content area
    contentArea.innerHTML = '';
    
    // Add the chat history if it's not already there
    if (!document.querySelector('.chat-history')) {
        contentArea.appendChild(chatHistory);
    }
    
    // Set the input value to the prompt
    chatInput.value = prompt;
    
    // Send the message
    sendMessage();
}

// Send message function
async function sendMessage() {
    const message = chatInput.value.trim();
    if (!message && !selectedImage) {
        return; // Don't send empty messages without images
    }

    // If we're still on the main page with grid layout, clear it
    if (mainGrid.style.display !== 'none') {
        mainGrid.style.display = 'none';
        chatbotInterface.style.display = 'flex';
    }

    // Add user message to chat - make sure we're using the chatbot interface chat history
    addMessageToHistory(message, true, selectedImage, chatbotChatHistory);

    // Show loading indicator
    const loadingContainer = document.createElement("div");
    loadingContainer.className = "message-container ai-container";
    
    const profileInfo = document.createElement("div");
    profileInfo.className = "profile-info";
    
    const profileAvatar = document.createElement("div");
    profileAvatar.className = "profile-avatar";
    profileAvatar.id = assistantProfile.avatar;
    
    const profileName = document.createElement("div");
    profileName.className = "profile-name";
    profileName.textContent = assistantProfile.name;
    
    profileInfo.appendChild(profileAvatar);
    profileInfo.appendChild(profileName);
    
    const loadingDiv = document.createElement("div");
    loadingDiv.textContent = "Thinking...";
    loadingDiv.className = "loading-message";
    
    loadingContainer.appendChild(profileInfo);
    loadingContainer.appendChild(loadingDiv);
    
    chatbotChatHistory.appendChild(loadingContainer);

    // Clear input field and selected image
    chatInput.value = '';

    // Prepare the request payload
    const payload = { message: message };
    
    // Add image data if an image is selected
    if (selectedImage) {
        payload.image = {
            data: selectedImage.dataUrl,
            format: selectedImage.format
        };
        
        // Clear the selected image after sending
        clearSelectedImage();
    }

    try {
        // Fetch AI response
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        // Remove loading indicator
chatbotChatHistory.removeChild(loadingContainer);

        if (data.error) {
            addAIMessageToHistory("Error: " + data.error, chatbotChatHistory);
        } else {
            // Add AI response to chat
addAIMessageToHistory(data.response, chatbotChatHistory);
        }
    } catch (error) {
        // Remove loading indicator and show error
chatbotChatHistory.removeChild(loadingContainer);
        addAIMessageToHistory("Error: Unable to connect to the server. Please try again.", chatbotChatHistory);
    }
}

// Function to handle image selection
function handleImageSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        alert('Please select an image file.');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const dataUrl = e.target.result;
        const format = file.type.split('/')[1];
        
        // Store the selected image
        selectedImage = {
            dataUrl: dataUrl,
            format: format,
            name: file.name
        };
        
        // Show image preview
        showImagePreview(dataUrl, file.name);
    };
    
    reader.readAsDataURL(file);
}

// Function to show image preview
function showImagePreview(dataUrl, fileName) {
    // Create or update the image preview container
    let previewContainer = document.getElementById('image-preview-container');
    if (!previewContainer) {
        previewContainer = document.createElement('div');
        previewContainer.id = 'image-preview-container';
        previewContainer.className = 'image-preview-container';
        document.querySelector('.chat-input-container').insertBefore(previewContainer, document.querySelector('.chat-input-footer'));
    } else {
        previewContainer.innerHTML = '';
    }
    
    // Create the image preview
    const previewWrapper = document.createElement('div');
    previewWrapper.className = 'image-preview-wrapper';
    
    const previewImage = document.createElement('img');
    previewImage.src = dataUrl;
    previewImage.className = 'image-preview';
    previewImage.alt = fileName;
    
    // Create remove button
    const removeButton = document.createElement('button');
    removeButton.className = 'remove-image-button';
    removeButton.innerHTML = '&times;';
    removeButton.addEventListener('click', clearSelectedImage);
    
    // Create file name display
    const fileNameDisplay = document.createElement('div');
    fileNameDisplay.className = 'image-file-name';
    fileNameDisplay.textContent = fileName;
    
    // Assemble the preview
    previewWrapper.appendChild(previewImage);
    previewWrapper.appendChild(removeButton);
    previewContainer.appendChild(previewWrapper);
    previewContainer.appendChild(fileNameDisplay);
    
    // Adjust container height
    document.querySelector('.chat-input-container').style.height = 'auto';
}

// Function to clear selected image
function clearSelectedImage() {
    selectedImage = null;
    const previewContainer = document.getElementById('image-preview-container');
    if (previewContainer) {
        previewContainer.remove();
    }
    
    // Reset container height
    document.querySelector('.chat-input-container').style.height = '110px';
    document.querySelector('.chat-input-footer').style.height = '70px';
}

// Start voice recording
function startRecording() {
    // Check if the browser supports recording
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Your browser does not support audio recording.');
        return;
    }
    
    // Request microphone access
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            // Show recording indicator
            showRecordingIndicator();
            
            // Create media recorder
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];
            
            // Listen for data available event
            mediaRecorder.addEventListener('dataavailable', event => {
                audioChunks.push(event.data);
            });
            
            // Listen for stop event
            mediaRecorder.addEventListener('stop', () => {
                // Stop all audio tracks
                stream.getTracks().forEach(track => track.stop());
                
                // Process the recorded audio
                processAudio();
            });
            
            // Start recording
            mediaRecorder.start();
            isRecording = true;
            
            // Set a maximum recording time (30 seconds)
            setTimeout(() => {
                if (isRecording) {
                    stopRecording();
                }
            }, 30000);
        })
        .catch(error => {
            alert('Error accessing microphone: ' + error.message);
        });
}

// Stop voice recording
function stopRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        isRecording = false;
        
        // Hide recording indicator
        hideRecordingIndicator();
    }
}

// Process the recorded audio
async function processAudio() {
    if (audioChunks.length === 0) return;
    
    // Show processing indicator
    const micButton = document.querySelector('.control-button i.fa-microphone, .control-button i.fa-stop');
    if (!micButton) return;
    
    const buttonParent = micButton.parentNode;
    const originalText = buttonParent.getAttribute('title') || 'Voice input';
    buttonParent.setAttribute('title', 'Processing audio...');
    
    // Create audio blob with specific WAV MIME type
    const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
    
    // Create form data for sending to server
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.wav');
    
    try {
        // Send to transcription API
        const response = await fetch('/api/transcribe', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.error) {
            alert('Error transcribing audio: ' + data.error);
        } else if (data.transcription) {
            // Add the transcribed text to the chat input
            chatInput.value = data.transcription;
            
            // Focus the input for editing if needed
            chatInput.focus();
        }
    } catch (error) {
        alert('Error processing audio: ' + error.message);
    } finally {
        // Reset microphone button
        buttonParent.setAttribute('title', originalText);
    }
}

// Show recording indicator
function showRecordingIndicator() {
    // Add a recording indicator to the mic button
    const micButton = document.querySelector('.control-button i.fa-microphone');
    if (micButton) {
        micButton.classList.add('recording');
        micButton.parentNode.setAttribute('title', 'Stop recording');
        
        // Replace icon with stop icon
        micButton.classList.remove('fa-microphone');
        micButton.classList.add('fa-stop');
        
        // Add pulse animation
        micButton.style.animation = 'pulse 1.5s infinite';
        micButton.style.color = '#ff5c74';
    }
    
    // Add a recording indicator to the chat area
    let indicator = document.getElementById('recording-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'recording-indicator';
        indicator.className = 'recording-indicator';
        indicator.innerHTML = 'Recording... <span class="recording-dot"></span>';
        document.querySelector('.chat-input-container').appendChild(indicator);
    }
}

// Hide recording indicator
function hideRecordingIndicator() {
    // Reset the mic button
    const micButton = document.querySelector('.control-button i.fa-stop');
    if (micButton) {
        micButton.classList.remove('recording');
        micButton.parentNode.setAttribute('title', 'Voice input');
        
        // Restore original icon
        micButton.classList.remove('fa-stop');
        micButton.classList.add('fa-microphone');
        
        // Remove animation
        micButton.style.animation = '';
        micButton.style.color = '';
    }
    
    // Remove the recording indicator
    const indicator = document.getElementById('recording-indicator');
    if (indicator) {
        indicator.remove();
    }
}

// Append user message to chat history
function addMessageToHistory(message, isUser = false, image = null, targetChatHistory = chatHistory) {
    const messageContainer = document.createElement("div");
    messageContainer.className = isUser ? "message-container user-container" : "message-container ai-container";

    // Create profile info element
    const profileInfo = document.createElement("div");
    profileInfo.className = "profile-info";

    if (isUser) {
        // Create user avatar with initial
        const profileAvatar = document.createElement("div");
        profileAvatar.className = "profile-avatar user-avatar";
        profileAvatar.textContent = userProfile.initial;

        const profileName = document.createElement("div");
        profileName.className = "profile-name";
        profileName.textContent = userProfile.name;

        profileInfo.appendChild(profileAvatar);
        profileInfo.appendChild(profileName);
    } else {
        // Create assistant avatar
        const profileAvatar = document.createElement("div");
        profileAvatar.className = "profile-avatar";
        profileAvatar.id = assistantProfile.avatar;

        const profileName = document.createElement("div");
        profileName.className = "profile-name";
        profileName.textContent = assistantProfile.name;

        profileInfo.appendChild(profileAvatar);
        profileInfo.appendChild(profileName);
    }

    // Create message content wrapper
    const messageContentWrapper = document.createElement("div");
    messageContentWrapper.className = isUser ? "user-message-content" : "ai-message-content";

    // Create message element
    const messageDiv = document.createElement("div");
    messageDiv.className = isUser ? "user-message" : "ai-message";
    
    // Add message text if provided
    if (message) {
        messageDiv.textContent = message;
    }
    
    // Add image if provided (for user messages)
    if (image && isUser) {
        const imageContainer = document.createElement("div");
        imageContainer.className = "message-image-container";
        
        const messageImage = document.createElement("img");
        messageImage.src = image.dataUrl;
        messageImage.className = "message-image";
        messageImage.alt = "Uploaded image";
        
        imageContainer.appendChild(messageImage);
        messageContentWrapper.appendChild(imageContainer);
    }
    
    messageContentWrapper.appendChild(messageDiv);

    // Add animation
    messageContentWrapper.style.animation = "fadeIn 0.3s ease-in-out";

    // Append elements to container
    if (isUser) {
        messageContainer.appendChild(messageContentWrapper);
        messageContainer.appendChild(profileInfo);
    } else {
        messageContainer.appendChild(profileInfo);
        messageContainer.appendChild(messageContentWrapper);
    }

    targetChatHistory.appendChild(messageContainer);
    targetChatHistory.scrollTop = targetChatHistory.scrollHeight;
}

// Append AI message to chat history (with HTML support)
function addAIMessageToHistory(htmlContent, targetChatHistory = chatHistory) {
    const messageContainer = document.createElement("div");
    messageContainer.className = "message-container ai-container";

    // Create profile info element
    const profileInfo = document.createElement("div");
    profileInfo.className = "profile-info";

    // Create assistant avatar
    const profileAvatar = document.createElement("div");
    profileAvatar.className = "profile-avatar";
    profileAvatar.id = assistantProfile.avatar;

    const profileName = document.createElement("div");
    profileName.className = "profile-name";
    profileName.textContent = assistantProfile.name;

    profileInfo.appendChild(profileAvatar);
    profileInfo.appendChild(profileName);

    // Create message element
    const messageDiv = document.createElement("div");
    messageDiv.className = "ai-message";
    messageDiv.innerHTML = htmlContent;

    // Add animation
    messageDiv.style.animation = "fadeIn 0.3s ease-in-out";

    // Append elements to container
    messageContainer.appendChild(profileInfo);
    messageContainer.appendChild(messageDiv);

    targetChatHistory.appendChild(messageContainer);
    targetChatHistory.scrollTop = targetChatHistory.scrollHeight;
}

// Handle send button click
sendButton.addEventListener("click", sendMessage);

// Handle Enter key in chat input
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault(); // Prevent default to avoid newline
        sendMessage();
    }
});

// Create a hidden file input element for image uploads
const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.accept = 'image/*';
fileInput.style.display = 'none';
fileInput.addEventListener('change', handleImageSelect);
document.body.appendChild(fileInput);

// Add functionality to control buttons in the textarea
document.querySelectorAll('.control-button').forEach((button) => {
    button.addEventListener('click', (e) => {
        const icon = button.querySelector('i');
        
        // Handle each button based on its icon class
        if (icon.className.includes('fa-paperclip')) {
            // File attachment
            fileInput.click();
        } else if (icon.className.includes('fa-link')) {
            // Add link
            const url = prompt("Enter URL:");
            if (url) {
                insertTextAtCursor(chatInput, `[Link](${url})`);
            }
        } else if (icon.className.includes('fa-cog')) {
            // Settings
            alert("Settings panel coming soon!");
        } else if (icon.className.includes('fa-smile')) {
            // Emoji picker
            insertTextAtCursor(chatInput, " 😊");
        } else if (icon.className.includes('fa-microphone') || icon.className.includes('fa-stop')) {
            // Voice input toggle
            if (isRecording) {
                stopRecording();
            } else {
                startRecording();
            }
        } else if (icon.className.includes('fa-camera')) {
            // Image upload from camera
            fileInput.capture = 'environment';
            fileInput.click();
        } else if (icon.className.includes('fa-expand')) {
            // Expand textarea
            toggleTextareaExpand();
        }
    });
});

// Helper function to insert text at cursor position in textarea
function insertTextAtCursor(textarea, text) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = textarea.value.substring(0, start);
    const after = textarea.value.substring(end, textarea.value.length);
    
    textarea.value = before + text + after;
    textarea.selectionStart = textarea.selectionEnd = start + text.length;
    textarea.focus();
}

// Toggle textarea expanded state
function toggleTextareaExpand() {
    const container = document.querySelector('.chat-input-container');
    const footer = document.querySelector('.chat-input-footer');
    
    if (container.style.height === '160px') {
        container.style.height = '110px';
        footer.style.height = '70px';
    } else {
        container.style.height = '160px';
        footer.style.height = '120px';
    }
}

// Initialize UI when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeUIHandlers();
});

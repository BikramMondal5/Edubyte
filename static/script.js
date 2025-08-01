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
    name: "Articuno.AI", // Default bot
    avatar: "Articuno-avatar"
};

// Bot descriptions (you can expand this with more details)
const botDescriptions = {
    "Articuno.AI": {
        name: "Articuno.AI",
        description: "Your AI-powered weather assistant for forecasts, conditions, and climate information.",
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
            
            // Remove active class from all bot items
            document.querySelectorAll('.bot-item').forEach(item => {
                item.classList.remove('active');
            });
            
            // Add active class to clicked bot item
            botItem.classList.add('active');
            
            // Update the active model
            switchActiveModel(name, avatar);

            // Show chatbot showcase
            showChatbotShowcase(name, avatar);
        });
    });
    
    // Start chat button functionality
    const startChatBtn = document.getElementById('start-chat-btn');
    if (startChatBtn) {
        startChatBtn.addEventListener('click', () => {
            // Get current selected bot info
            const showcaseTitle = document.getElementById('showcase-title').textContent;
            
            // Check if it's Articuno.AI to show weather modal
            if (showcaseTitle === "Articuno.AI") {
                showWeatherModal();
            } else {
                // Original functionality for other bots
                const showcaseAvatar = document.getElementById('showcase-avatar').className;
                
                // Hide showcase and show chat interface
                document.getElementById('chatbot-showcase').style.display = 'none';
                chatbotInterface.style.display = 'flex';
                
                // Clear and setup chat history
                chatbotChatHistory.innerHTML = '';
                addAIMessageToHistory(`Hello! I'm ${showcaseTitle}. How can I help you today?`, chatbotChatHistory);
            }
        });
    }
    
    // Recent chat items click handling
    document.querySelectorAll('.recent-chat-item').forEach(item => {
        item.addEventListener('click', () => {
            const topic = item.querySelector('span').textContent;
            startChatWithPrompt(topic);
        });
    });

    // Weather modal close button
    const modalCloseBtn = document.getElementById('modal-close-btn');
    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', () => {
            hideWeatherModal();
            
            // When user manually closes the modal, navigate to chat interface
            document.getElementById('chatbot-showcase').style.display = 'none';
            chatbotInterface.style.display = 'flex';
            
            // Add a welcome message to the chat
            addAIMessageToHistory(`Hello! I'm Articuno.AI, your weather assistant. I've analyzed the weather for you. How else can I help with weather information?`, chatbotChatHistory);
        });
    }

    // Start analyzing button
    const startAnalyzingBtn = document.getElementById('start-analyzing-btn');
    if (startAnalyzingBtn) {
        startAnalyzingBtn.addEventListener('click', () => {
            startWeatherAnalysis();
            // We don't automatically hide modal or navigate to chat anymore
            // The modal will stay open until user clicks the close button
        });
    }
}

// Check if message likely contains a location name
function mayContainLocation(message) {
    // Simple check for common location patterns
    const locationPatterns = [
        /weather\s+(?:in|at|for)\s+([A-Za-z\s,]+)/i,  // "weather in London"
        /(?:in|at)\s+([A-Za-z\s,]+?)(?:\s+weather|\?|$)/i,  // "in Paris weather"
        /^([A-Za-z\s,]+?)(?:\s+weather|\?|$)/i,  // "Tokyo weather"
        /^([A-Za-z\s,]+?)$/i  // Just a location name
    ];
    
    for (const pattern of locationPatterns) {
        if (pattern.test(message)) {
            return true;
        }
    }
    
    // If message is short and doesn't contain common question words, it might be a location
    if (message.split(' ').length <= 3 && 
        !message.match(/what|where|when|why|how|can|could|would|should|is|are|am|will|shall/i)) {
        return true;
    }
    
    return false;
}

// Switch the active model/assistant
function switchActiveModel(name, avatarId) {
    console.log(`Switching to model: ${name} with avatar: ${avatarId}`);
    
    // Update assistant profile
    assistantProfile.name = name;
    assistantProfile.avatar = avatarId;
    
    // Update the chat input header
    const chatInputHeader = document.querySelector('.chat-input-header');
    if (chatInputHeader) {
        const headerAvatar = chatInputHeader.querySelector('.bot-avatar');
        const headerName = chatInputHeader.querySelector('.models-name');
        
        if (headerAvatar) {
            headerAvatar.id = avatarId;
        }
        
        if (headerName) {
            headerName.textContent = name;
        }
    }
    
    // Update the chatbot header info in interface
    if (chatbotName) {
        chatbotName.textContent = name;
    }
    
    if (document.querySelector('.chatbot-info p')) {
        const botInfo = botDescriptions[name];
        if (botInfo) {
            document.querySelector('.chatbot-info p').textContent = botInfo.description;
        }
    }
    
    // Update avatar in header
    if (document.getElementById('chatbot-avatar-display')) {
        document.getElementById('chatbot-avatar-display').id = avatarId;
    }
}

// Show chatbot showcase in main content area
function showChatbotShowcase(name, avatarId) {
    // Hide main grid layout and chatbot interface
    const mainGrid = document.querySelector('.main-grid-layout');
    const chatbotShowcase = document.getElementById('chatbot-showcase');
    const chatbotInterface = document.getElementById('chatbot-interface');
    
    if (mainGrid) mainGrid.style.display = 'none';
    if (chatbotInterface) chatbotInterface.style.display = 'none';
    if (chatbotShowcase) chatbotShowcase.style.display = 'flex';
    
    // Update showcase content
    const showcaseAvatar = document.getElementById('showcase-avatar');
    const showcaseTitle = document.getElementById('showcase-title');
    const showcaseDescription = document.getElementById('showcase-description');
    
    if (showcaseAvatar) {
        showcaseAvatar.className = `showcase-avatar ${avatarId}`;
    }
    
    if (showcaseTitle) {
        showcaseTitle.textContent = name;
    }
    
    if (showcaseDescription) {
        const botInfo = botDescriptions[name];
        if (botInfo) {
            showcaseDescription.textContent = botInfo.description;
        } else {
            showcaseDescription.textContent = `Your AI assistant for various tasks and conversations.`;
        }
    }
}

// Start a chat with a specific prompt
function startChatWithPrompt(prompt = "") {
    console.log("Starting chat with prompt:", prompt);
    
    // Hide the main grid and show chatbot interface
    const mainGrid = document.querySelector('.main-grid-layout');
    if (mainGrid) mainGrid.style.display = 'none';
    
    // Hide showcase if it's visible
    const chatbotShowcase = document.getElementById('chatbot-showcase');
    if (chatbotShowcase) chatbotShowcase.style.display = 'none';
    
    // Show chatbot interface
    if (chatbotInterface) chatbotInterface.style.display = 'flex';
    
    // Set the input value to the prompt
    if (chatInput) chatInput.value = prompt;
    
    // Send the message if there's a prompt
    if (prompt) {
        sendMessage();
    } else {
        // Add welcome message
        addAIMessageToHistory(`Hello! I'm ${assistantProfile.name}. How can I help you today?`, chatbotChatHistory);
    }
}

// Send message function
async function sendMessage() {
    const message = chatInput.value.trim();
    if (!message && !selectedImage) {
        return; // Don't send empty messages without images
    }

    console.log(`Sending message to ${assistantProfile.name}: ${message}`);

    // If we're still on the main page with grid layout, switch to chat interface
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
    chatbotChatHistory.scrollTop = chatbotChatHistory.scrollHeight;

    // Clear input field and selected image
    chatInput.value = '';

    // Special handling for Articuno.AI when message might contain a location
    const isArticuno = assistantProfile.name === "Articuno.AI";
    const mightBeLocation = isArticuno && mayContainLocation(message);

    // Log detection info for debugging
    if (isArticuno) {
        console.log(`Message might contain location: ${mightBeLocation ? 'Yes' : 'No'}`);
    }

    // Prepare the request payload
    const payload = { 
        message: message,
        bot: assistantProfile.name // Include the bot name in the request
    };
    
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
        console.log("Sending request to /api/chat with payload:", payload);
        
        // Fetch AI response
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        console.log("Received response:", data);

        // Remove loading indicator
        chatbotChatHistory.removeChild(loadingContainer);

        if (data.error) {
            console.error("API returned an error:", data.error);
            addAIMessageToHistory("Error: " + data.error, chatbotChatHistory);
        } else {
            // Add AI response to chat
            addAIMessageToHistory(data.response, chatbotChatHistory);
        }
    } catch (error) {
        console.error("Error communicating with server:", error);
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

// Show the weather modal
function showWeatherModal() {
    const modal = document.getElementById('weather-modal-overlay');
    if (modal) {
        modal.classList.add('active');
        
        // Focus on the location input
        setTimeout(() => {
            const locationInput = document.getElementById('location-input');
            if (locationInput) {
                locationInput.focus();
            }
        }, 300);
    }
}

// Hide the weather modal
function hideWeatherModal() {
    const modal = document.getElementById('weather-modal-overlay');
    if (modal) {
        modal.classList.remove('active');
    }
}

// OpenWeatherMap API settings
const weatherApiKey = 'ad68b088e28ee68d6181c931174d3440'; // Updated API key
const weatherApiBaseUrl = 'https://api.openweathermap.org/data/2.5';

// Get current weather data from OpenWeatherMap API
async function fetchCurrentWeather(location) {
    try {
        console.log(`Fetching weather for location: ${location}`);
        const response = await fetch(`${weatherApiBaseUrl}/weather?q=${encodeURIComponent(location)}&units=metric&appid=${weatherApiKey}`);
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('Weather API error response:', errorData);
            throw new Error(`Weather API error: ${response.status} - ${errorData.message || 'Unknown error'}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error fetching current weather:', error);
        throw error;
    }
}

// Get forecast data from OpenWeatherMap API
async function fetchForecast(location) {
    try {
        console.log(`Fetching forecast for location: ${location}`);
        const response = await fetch(`${weatherApiBaseUrl}/forecast?q=${encodeURIComponent(location)}&units=metric&appid=${weatherApiKey}`);
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('Forecast API error response:', errorData);
            throw new Error(`Forecast API error: ${response.status} - ${errorData.message || 'Unknown error'}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error fetching forecast:', error);
        throw error;
    }
}

// Get weather by coordinates from OpenWeatherMap API
async function fetchWeatherByCoords(lat, lon) {
    try {
        const response = await fetch(`${weatherApiBaseUrl}/weather?lat=${lat}&lon=${lon}&units=metric&appid=${weatherApiKey}`);
        
        if (!response.ok) {
            throw new Error(`Weather API error: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error fetching weather by coordinates:', error);
        throw error;
    }
}

// Get forecast by coordinates from OpenWeatherMap API
async function fetchForecastByCoords(lat, lon) {
    try {
        const response = await fetch(`${weatherApiBaseUrl}/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${weatherApiKey}`);
        
        if (!response.ok) {
            throw new Error(`Forecast API error: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error fetching forecast by coordinates:', error);
        throw error;
    }
}

// Process forecast data to get a simplified 3-day forecast
function processForcastData(forecastData) {
    const forecasts = forecastData.list;
    const dailyForecasts = {};
    
    // Group forecasts by day
    forecasts.forEach(forecast => {
        const date = new Date(forecast.dt * 1000);
        const day = date.toLocaleDateString('en-US', { weekday: 'short' });
        
        if (!dailyForecasts[day]) {
            dailyForecasts[day] = {
                temps: [],
                descriptions: [],
                icons: [],
                date: date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
            };
        }
        
        dailyForecasts[day].temps.push(forecast.main.temp);
        dailyForecasts[day].descriptions.push(forecast.weather[0].description);
        dailyForecasts[day].icons.push(forecast.weather[0].icon);
    });
    
    // Calculate average temp and most common description for each day
    const result = Object.keys(dailyForecasts).map(day => {
        const dayData = dailyForecasts[day];
        
        // Calculate average temperature
        const avgTemp = dayData.temps.reduce((a, b) => a + b, 0) / dayData.temps.length;
        
        // Find most common description
        const descCounts = {};
        dayData.descriptions.forEach(desc => {
            descCounts[desc] = (descCounts[desc] || 0) + 1;
        });
        const mostCommonDesc = Object.keys(descCounts).reduce((a, b) => 
            descCounts[a] > descCounts[b] ? a : b);
            
        // Find most common icon
        const iconCounts = {};
        dayData.icons.forEach(icon => {
            iconCounts[icon] = (iconCounts[icon] || 0) + 1;
        });
        const mostCommonIcon = Object.keys(iconCounts).reduce((a, b) => 
            iconCounts[a] > iconCounts[b] ? a : b);
        
        return {
            day,
            date: dayData.date,
            avgTemp: Math.round(avgTemp),
            description: mostCommonDesc,
            icon: mostCommonIcon
        };
    });
    
    // Return only the first 3 days
    return result.slice(0, 3);
}

// Get current location using browser's geolocation API
function useCurrentLocation() {
    const locationBtn = document.getElementById('use-location-btn');
    const originalText = locationBtn.innerHTML;
    
    // Show loading state
    locationBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Detecting location...';
    
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    // Get coordinates
                    const lat = position.coords.latitude;
                    const lon = position.coords.longitude;
                    
                    // Fetch current weather data
                    const weatherData = await fetchWeatherByCoords(lat, lon);
                    
                    // Update location input with the city name from API
                    document.getElementById('location-input').value = weatherData.name;
                    
                    // Fetch forecast data
                    const forecastData = await fetchForecastByCoords(lat, lon);
                    
                    // Update weather cards with real data
                    updateWeatherCardsWithAPIData(weatherData, forecastData);
                    
                    // Reset button
                    locationBtn.innerHTML = originalText;
                } catch (error) {
                    console.error("API error:", error);
                    locationBtn.innerHTML = originalText;
                    alert("Error fetching weather data. Please try again or enter your location manually.");
                }
            },
            (error) => {
                // Error with geolocation
                console.error("Geolocation error:", error);
                locationBtn.innerHTML = originalText;
                alert("Unable to get your location. Please enter it manually.");
            },
            { timeout: 10000 }
        );
    } else {
        locationBtn.innerHTML = originalText;
        alert("Geolocation is not supported by your browser. Please enter your location manually.");
    }
}

// Update weather cards with API data
function updateWeatherCardsWithAPIData(weatherData, forecastData) {
    // Update temperature card
    const temp = Math.round(weatherData.main.temp);
    const condition = weatherData.weather[0].description;
    document.getElementById('temperature-value').textContent = `${temp}°C`;
    document.getElementById('temperature-description').textContent = condition.charAt(0).toUpperCase() + condition.slice(1);
    
    // Update weather icon in temperature card
    const weatherIcon = document.querySelector('.weather-card:nth-child(1) .weather-card-icon i');
    const iconCode = weatherData.weather[0].icon;
    updateWeatherIcon(weatherIcon, iconCode);
    
    // Update wind and humidity card
    const windSpeed = Math.round(weatherData.wind.speed * 3.6); // Convert m/s to km/h
    const humidity = weatherData.main.humidity;
    document.getElementById('wind-value').textContent = `${windSpeed} km/h`;
    document.getElementById('humidity-value').textContent = `Humidity: ${humidity}%`;
    
    // Process forecast data for a 3-day summary
    const dailyForecasts = processForcastData(forecastData);
    
    // Update forecast card
    if (dailyForecasts.length > 0) {
        // Show next day forecast as primary
        const nextDay = dailyForecasts[0];
        document.getElementById('forecast-value').textContent = `${nextDay.avgTemp}°C`;
        document.getElementById('forecast-description').textContent = `${nextDay.day}: ${nextDay.description}`;
        
        // Update forecast icon
        const forecastIcon = document.querySelector('.weather-card:nth-child(3) .weather-card-icon i');
        updateWeatherIcon(forecastIcon, nextDay.icon);
    }
}

// Update weather icons based on OpenWeatherMap icon codes
function updateWeatherIcon(iconElement, iconCode) {
    // Remove all existing classes except the base fa class
    iconElement.className = '';
    iconElement.classList.add('fas');
    
    // Map OpenWeatherMap icon codes to Font Awesome icons
    const iconMap = {
        '01d': 'fa-sun', // clear sky day
        '01n': 'fa-moon', // clear sky night
        '02d': 'fa-cloud-sun', // few clouds day
        '02n': 'fa-cloud-moon', // few clouds night
        '03d': 'fa-cloud', // scattered clouds
        '03n': 'fa-cloud',
        '04d': 'fa-cloud', // broken clouds
        '04n': 'fa-cloud',
        '09d': 'fa-cloud-rain', // shower rain
        '09n': 'fa-cloud-rain',
        '10d': 'fa-cloud-sun-rain', // rain day
        '10n': 'fa-cloud-moon-rain', // rain night
        '11d': 'fa-bolt', // thunderstorm
        '11n': 'fa-bolt',
        '13d': 'fa-snowflake', // snow
        '13n': 'fa-snowflake',
        '50d': 'fa-smog', // mist
        '50n': 'fa-smog'
    };
    
    // Add the appropriate icon class
    if (iconMap[iconCode]) {
        iconElement.classList.add(iconMap[iconCode]);
    } else {
        // Default icon if no mapping exists
        iconElement.classList.add('fa-cloud');
    }
}

// Start weather analysis with real API data
async function startWeatherAnalysis() {
    const location = document.getElementById('location-input').value.trim();
    const analyzeBtn = document.getElementById('start-analyzing-btn');
    const originalText = analyzeBtn.textContent;
    
    if (!location) {
        alert("Please enter a location or use current location");
        return;
    }
    
    // Show loading state
    analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
    
    try {
        // Fetch weather data from API
        const weatherData = await fetchCurrentWeather(location);
        const forecastData = await fetchForecast(location);
        
        // Update the weather cards with the API data
        updateWeatherCardsWithAPIData(weatherData, forecastData);
        
        // Reset button with success message
        analyzeBtn.innerHTML = '<i class="fas fa-check"></i> Updated';
        setTimeout(() => {
            analyzeBtn.textContent = originalText;
        }, 2000);
        
        // Add animation to cards to indicate they've been updated
        document.querySelectorAll('.weather-card').forEach(card => {
            card.style.animation = 'none';
            setTimeout(() => {
                card.style.animation = 'pulse 1s';
            }, 10);
        });
        
    } catch (error) {
        console.error("Error during weather analysis:", error);
        analyzeBtn.textContent = originalText;
        alert(`Error fetching weather data for "${location}". Please check the location name and try again.`);
    }
}

// Initialize UI when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded - initializing UI handlers');
    initializeUIHandlers();
    
    // Enable the chat input by default
    if (chatInput) {
        chatInput.disabled = false;
    }
    
    // Make the chat input focusable
    chatInput.addEventListener('click', () => {
        // Show the chat interface when clicking on the input
        if (mainGrid.style.display !== 'none') {
            // If first time clicking, start with default AI
            startChatWithPrompt();
        }
    });
    
    // Make sure the "Use Current Location" button has a working event listener
    const useLocationBtn = document.getElementById('use-location-btn');
    if (useLocationBtn) {
        console.log('Adding direct event listener to Use Location button');
        useLocationBtn.addEventListener('click', useCurrentLocation);
    }
});

// Add hover effect to tool items
document.querySelectorAll('.tool-item').forEach(item => {
    item.addEventListener('mouseenter', () => {
        item.style.transform = 'translateY(-2px)';
        item.style.transition = 'transform 0.2s ease';
    });

    item.addEventListener('mouseleave', () => {
        item.style.transform = 'translateY(0)';
    });
});

// Add click effect to action buttons
document.querySelectorAll('.action-button').forEach(button => {
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

// Create chat history container if it doesn't exist
let chatHistory = document.querySelector(".chat-history");
if (!chatHistory) {
    chatHistory = document.createElement("div");
    chatHistory.className = "chat-history";
    contentArea.appendChild(chatHistory);
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

// Variable to store the currently selected image
let selectedImage = null;

// Send message function
async function sendMessage() {
    const message = chatInput.value.trim();
    if (!message && !selectedImage) {
        return; // Don't send empty messages without images
    }

    // Clear welcome content if this is the first message
    if (contentArea.querySelector('.heading')) {
        contentArea.innerHTML = '';
        contentArea.appendChild(chatHistory);
    }

    // Add user message to chat
    addMessageToHistory(message, true, selectedImage);

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
    
    chatHistory.appendChild(loadingContainer);

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
        chatHistory.removeChild(loadingContainer);

        if (data.error) {
            addAIMessageToHistory("Error: " + data.error);
        } else {
            // Add AI response to chat
            addAIMessageToHistory(data.response);
        }
    } catch (error) {
        // Remove loading indicator and show error
        chatHistory.removeChild(loadingContainer);
        addAIMessageToHistory("Error: Unable to connect to the server. Please try again.");
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

// Append user message to chat history
function addMessageToHistory(message, isUser = false, image = null) {
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

    chatHistory.appendChild(messageContainer);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

// Append AI message to chat history (with HTML support)
function addAIMessageToHistory(htmlContent) {
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

    chatHistory.appendChild(messageContainer);
    chatHistory.scrollTop = chatHistory.scrollHeight;
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
        const icon = button.querySelector('i').className;
        
        // Handle each button based on its icon
        if (icon.includes('paperclip')) {
            // File attachment
            fileInput.click();
        } else if (icon.includes('link')) {
            // Add link
            const url = prompt("Enter URL:");
            if (url) {
                insertTextAtCursor(chatInput, `[Link](${url})`);
            }
        } else if (icon.includes('cog')) {
            // Settings
            alert("Settings panel coming soon!");
        } else if (icon.includes('smile')) {
            // Emoji picker
            insertTextAtCursor(chatInput, " 😊");
        } else if (icon.includes('microphone')) {
            // Voice input
            alert("Voice input feature coming soon!");
        } else if (icon.includes('camera')) {
            // Image upload from camera
            fileInput.capture = 'environment';
            fileInput.click();
        } else if (icon.includes('expand')) {
            // Expand textarea
            toggleTextareaExpand();
        }
    });
});

// Add functionality for bot selection
document.querySelectorAll('.bot-item').forEach(botItem => {
    botItem.addEventListener('click', () => {
        // Get the bot avatar ID and name
        const avatar = botItem.querySelector('.bot-avatar').id;
        const name = botItem.querySelector('span').textContent;
        
        // Update assistant profile
        assistantProfile.name = name;
        assistantProfile.avatar = avatar;
        
        // Update the display in the chat input header
        document.querySelector('.chat-input-header .bot-avatar').id = avatar;
        document.querySelector('.chat-input-header .models-name').textContent = name;
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

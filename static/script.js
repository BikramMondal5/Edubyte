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

// Send message function
async function sendMessage() {
    const message = chatInput.value.trim();
    if (message) {
        // Clear welcome content if this is the first message
        if (contentArea.querySelector('.heading')) {
            contentArea.innerHTML = '';
            contentArea.appendChild(chatHistory);
        }
        
        // Add user message to chat
        addMessageToHistory(message, true);
        
        // Show loading indicator
        const loadingDiv = document.createElement("div");
        loadingDiv.textContent = "Thinking...";
        loadingDiv.className = "loading-message";
        chatHistory.appendChild(loadingDiv);
        
        // Clear input field
        chatInput.value = '';
        
        try {
            // Fetch AI response
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ message: message })
            });
            
            const data = await response.json();
            
            // Remove loading indicator
            chatHistory.removeChild(loadingDiv);
            
            if (data.error) {
                addMessageToHistory("Error: " + data.error);
            } else {
                // Add AI response to chat
                addAIMessageToHistory(data.response);
            }
        } catch (error) {
            // Remove loading indicator and show error
            chatHistory.removeChild(loadingDiv);
            addMessageToHistory("Error: Unable to connect to the server. Please try again.");
        }
    }
}

// Append user message to chat history
function addMessageToHistory(message, isUser = false) {
    const messageDiv = document.createElement("div");
    messageDiv.className = isUser ? "user-message" : "ai-message";
    messageDiv.textContent = message;
    
    // Add animation
    messageDiv.style.animation = "fadeIn 0.3s ease-in-out";
    
    chatHistory.appendChild(messageDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

// Append AI message to chat history (with HTML support)
function addAIMessageToHistory(htmlContent) {
    const messageDiv = document.createElement("div");
    messageDiv.className = "ai-message";
    messageDiv.innerHTML = htmlContent;
    
    // Add animation
    messageDiv.style.animation = "fadeIn 0.3s ease-in-out";
    
    chatHistory.appendChild(messageDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

// Handle send button click
sendButton.addEventListener("click", sendMessage);

// Handle Enter key in chat input
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

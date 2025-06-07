# WhatsApp Bot by RadjaShiqnals

This project is a WhatsApp bot created by [RadjaShiqnals](https://github.com/RadjaShiqnals).
The bot integrates with Google's Gemini AI to provide responses to user queries and generate images directly within WhatsApp.

## Bot Functionality

The bot listens for specific commands in WhatsApp messages:

*   **`!ask {user input}`**: Takes the user's input, sends it to the Gemini AI (`gemini-1.5-flash-latest` model) for a text-based answer, and replies directly to the user's message.
*   **`!image {user input}`**: Takes the user's input as a prompt, sends it to the Gemini AI (using the `gemini-2.0-flash-preview-image-generation` model), generates an image, and sends it back to the user.
*   **`!sticker {optional text}`**: Converts an image or GIF into a WhatsApp sticker. 
    *   You can either send an image/GIF with the command or reply to a message containing an image/GIF with the command.
    *   If you provide text after `!sticker` (e.g., `!sticker Hello World`), and the media is a static image (not a GIF), the text will be added to the bottom of the image before converting it to a sticker. Text cannot be added to animated GIFs.

*   **`!help`**: Displays a list of available commands, their descriptions, and usage instructions.

The bot is designed to handle multiple users simultaneously.

## Setup and Running Instructions

### Prerequisites

*   Node.js (v16+ recommended)
*   npm (comes with Node.js)
*   A Google Gemini API Key

### General Setup (Windows & Linux)

1.  **Clone the Repository** (if you haven't already):
    ```bash
    # If you have this project in a Git repository
    # git clone <repository-url>
    # cd whatsapp_bot
    ```

2.  **Create `.env` File**:
    Copy the contents of `.env.example` into a new file named `.env` in the root directory (`d:\Project Coding\whatsapp_bot`).
    Replace `"YOUR_GEMINI_API_KEY"` with your actual Gemini API Key.
    ```env
    // File: .env
    GEMINI_API_KEY="YOUR_ACTUAL_GEMINI_API_KEY"
    ```

3.  **Install Dependencies**:
    Open your terminal or command prompt in the project directory (`d:\Project Coding\whatsapp_bot`) and run:
    ```bash
    npm install
    ```

### Running the Bot

1.  **Start the Bot**:
    In your terminal or command prompt, from the project directory, run:
    ```bash
    npm start
    ```

2.  **Link WhatsApp**:
    A QR code will appear in the terminal. Open WhatsApp on your phone, go to `Settings > Linked Devices > Link a Device`, and scan the QR code.

3.  **Interact with the Bot**:
    Once the client is ready (you'll see "Client is ready!" in the terminal), you can send commands like `!ask What is AI?` or `!image A cat wearing a hat` to the WhatsApp account the bot is linked to.

### Platform-Specific Notes

#### Windows

*   The general setup and running instructions should work directly.
*   Ensure your firewall or antivirus isn't blocking Node.js or Chromium's network access.

#### Linux (e.g., Ubuntu)

*   The general setup and running instructions apply.
*   **Puppeteer Dependencies**: `whatsapp-web.js` uses Puppeteer, which runs a headless Chromium instance. On headless Linux systems (like servers), you might need to install additional dependencies for Chromium to function correctly.

    For Debian/Ubuntu, you may need to install libraries like:
    ```bash
    sudo apt-get update
    sudo apt-get install -y \
      gconf-service \
      libasound2 \
      libatk1.0-0 \
      libc6 \
      libcairo2 \
      libcups2 \
      libdbus-1-3 \
      libexpat1 \
      libfontconfig1 \
      libgcc1 \
      libgconf-2-4 \
      libgdk-pixbuf2.0-0 \
      libglib2.0-0 \
      libgtk-3-0 \
      libnspr4 \
      libpango-1.0-0 \
      libpangocairo-1.0-0 \
      libstdc++6 \
      libx11-6 \
      libx11-xcb1 \
      libxcb1 \
      libxcomposite1 \
      libxcursor1 \
      libxdamage1 \
      libxext6 \
      libxfixes3 \
      libxi6 \
      libxrandr2 \
      libxrender1 \
      libxss1 \
      libxtst6 \
      ca-certificates \
      fonts-liberation \
      libappindicator1 \
      libnss3 \
      lsb-release \
      xdg-utils \
      wget \
      --no-install-recommends
    ```
    The exact list can vary. Refer to the [Puppeteer troubleshooting documentation](https://pptr.dev/troubleshooting) for the most up-to-date list of dependencies if you encounter issues.

*   **Puppeteer Sandbox**: The `index.js` file includes `args: ['--no-sandbox', '--disable-setuid-sandbox']` for Puppeteer. This is often necessary when running in restricted environments like Docker containers or some CI/CD systems, and can be helpful on Linux servers. If you run into issues, these flags are a good first step for troubleshooting.

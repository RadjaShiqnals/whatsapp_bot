# WhatsApp Gemini Bot

A simple WhatsApp bot that uses Google's Gemini AI for conversational responses and image generation, plus some fun sticker-making features.

## Features

-   **AI Chat**: Talk to the bot by mentioning it in a group or sending a direct message.
-   **Ask Command**: Use `!ask` to get a direct answer from the Gemini Pro model.
-   **Image Generation**: Use `!image` to generate images from text descriptions using the Gemini Pro Vision model.
-   **Sticker Creator**: Use `!sticker` to create stickers from images and GIFs. You can add styled text to static images.

## Commands

-   `!ping`
    -   Checks if the bot is running. Responds with "pong".

-   `!ask {prompt}`
    -   Asks a question to the Gemini AI.
    -   Example: `!ask What is the capital of Australia?`

-   `!image {prompt}`
    -   Generates an AI image based on the provided text prompt.
    -   Example: `!image a photo of a racoon programming a computer`

-   `!sticker [url] [text] [--size=value] [--color=value] [--pos=value]`
    -   Creates a sticker from an image or GIF. It can use an image you send/reply to or fetch one from a direct URL.
    -   If you add text, it will be placed on the image (static images only).
    -   **Simple Sticker (from media)**: Send an image/GIF with the caption `!sticker`.
    -   **Simple Sticker (from URL)**: `!sticker https://i.imgur.com/example.png`
    -   **Sticker with Text**: Send an image with the caption `!sticker This is my meme`.
    -   **Sticker with Text (from URL)**: `!sticker https://i.imgur.com/example.png This is my meme`
    -   **Customized Text Sticker**: You can customize the text's font size, color, and position.
        -   `--size`: Font size in pixels (e.g., `40`). Default is auto-sized based on image height.
        -   `--color`: Text color name or hex code (e.g., `red`, `#FFFF00`). Default is `white`.
        -   `--pos`: Text position (`top`, `center`, `bottom`). Default is `bottom`.
        -   Example: `!sticker https://i.imgur.com/example.png TOP TEXT --size=45 --color=yellow --pos=top`

-   `!help`
    -   Shows a list of all available commands.

## Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/whatsapp-gemini-bot.git
    cd whatsapp-gemini-bot
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```
    > **Note for Windows users:** The `canvas` package might require some additional build tools. If you run into issues, follow the instructions on the [node-canvas wiki](https://github.com/Automattic/node-canvas/wiki/Installation:-Windows). You may need to install `windows-build-tools`.
    > `npm install --global --production windows-build-tools`

3.  **Set up your environment variables:**
    -   Create a `.env` file in the root directory.
    -   Add your Google Gemini API key to the `.env` file:
        ```
        GEMINI_API_KEY=your_api_key_here
        ```

4.  **Run the bot:**
    ```bash
    npm start
    ```

5.  **Connect to WhatsApp:**
    -   A QR code will appear in your terminal.
    -   Open WhatsApp on your phone, go to `Settings > Linked Devices > Link a Device`, and scan the QR code.
    -   The bot is now connected and ready to use.

## Dependencies

-   [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js)
-   [@google/generative-ai](https://www.npmjs.com/package/@google/generative-ai)
-   [dotenv](https://www.npmjs.com/package/dotenv)
-   [qrcode-terminal](https://www.npmjs.com/package/qrcode-terminal)
-   [canvas](https://www.npmjs.com/package/canvas) - For adding text to sticker images.
-   [axios](https://www.npmjs.com/package/axios) - For fetching images from URLs.
-   [fluent-ffmpeg](https://www.npmjs.com/package/fluent-ffmpeg) - For processing animated stickers.

## License

This project is licensed under the ISC License.

const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const qrcode = require('qrcode-terminal');
const dotenv = require('dotenv');
const { createCanvas, loadImage } = require('canvas');
const { default: axios } = require('axios');

dotenv.config();

const client = new Client({
    authStrategy: new LocalAuth()
});

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
    console.error("Error: GEMINI_API_KEY is not set in the .env file.");
    process.exit(1);
}

const STICKER_AUTHOR = process.env.STICKER_AUTHOR || "WhatsApp Bot";
const STICKER_PACK_NAME = process.env.STICKER_PACK_NAME || "Sticker Pack";
const GITHUB_LINK = "https://github.com/RadjaShiqnals";

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const textModelName = "gemini-1.5-flash-latest";
const imageGenerationModelName = "gemini-2.0-flash-preview-image-generation";

client.on('qr', (qr) => {
    console.log("Scan the QR code with WhatsApp on your phone.");
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('Client is ready!');
});

client.on('message', async (message) => {
    const content = message.body;

    if (content.startsWith('!sticker')) {
        await handleStickerCommand(message);
        return;
    }

    if (content === '!help') {
        const helpText = `*Available Commands*

*!ping*
_Checks if the bot is responsive._
Usage: \`!ping\`

*!ask {prompt}*
_Asks a question to the Gemini AI._
Usage: \`!ask Who is the president of Indonesia?\`

*!image {prompt}*
_Generates an image based on a description using AI._
Usage: \`!image A cat wearing a superhero cape\`

*!sticker {image_url} [text] [--option(value)]*
_Creates a sticker from an image URL, optionally with text._
Usage 1: \`!sticker https://example.com/image.png\`
Usage 2: \`!sticker https://example.com/image.png Hello World\`
Customization Options:
  \`--color(value)\`: Text color (e.g., white, #FF0000). Default: \`white\`.
  \`--size(value)\`: Font size in pixels. Default: \`50\`.
  \`--pos(value)\`: Text position (top, center, bottom). Default: \`bottom\`.
Example: \`!sticker {url} My Meme --color(yellow) --pos(top) --size(40)\`
`;
        message.reply(helpText);
        return;
    }

    // ...existing code...
});

async function handleStickerCommand(message) {
    try {
        const content = message.body;
        const urlMatch = content.match(/https?:\/\/[^\s]+/);

        if (!urlMatch) {
            message.reply('Please provide a valid image URL.');
            return;
        }
        const url = urlMatch[0];

        // Parse options
        const options = {
            color: 'white',
            size: 50,
            pos: 'bottom'
        };

        const optionRegex = /--(\w+)\(([^)]+)\)/g;
        let match;
        const optionsFound = [];

        while ((match = optionRegex.exec(content)) !== null) {
            const key = match[1].toLowerCase();
            const value = match[2];
            optionsFound.push(match[0]);

            if (key === 'pos' || key === 'position') {
                if (['top', 'center', 'bottom'].includes(value.toLowerCase())) {
                    options.pos = value.toLowerCase();
                }
            } else if (key === 'color') {
                options.color = value;
            } else if (key === 'size') {
                const sizeValue = Number(value);
                if (isNaN(sizeValue) || String(sizeValue) !== value) {
                    message.reply(`Invalid value for size: "${value}". It must be a whole number.`);
                    return;
                }
                options.size = sizeValue;
            }
        }

        // Extract text by removing command, URL, and options
        let text = content.replace('!sticker', '').replace(url, '');
        optionsFound.forEach(opt => {
            text = text.replace(opt, '');
        });
        text = text.trim();

        const imageBuffer = await axios.get(url, { responseType: 'arraybuffer' }).then(res => res.data);
        let finalMedia;

        if (text) {
            // Create sticker with text
            const image = await loadImage(imageBuffer);
            const canvas = createCanvas(image.width, image.height);
            const ctx = canvas.getContext('2d');

            // Draw original image
            ctx.drawImage(image, 0, 0, image.width, image.height);

            // Text styling
            const fontSize = options.size;
            ctx.font = `bold ${fontSize}px Impact, Arial, sans-serif`;
            ctx.fillStyle = options.color;
            ctx.strokeStyle = 'black';
            ctx.lineWidth = fontSize / 20; // Proportional outline
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Calculate position
            const x = canvas.width / 2;
            let y;
            switch (options.pos) {
                case 'top':
                    y = fontSize;
                    break;
                case 'center':
                    y = canvas.height / 2;
                    break;
                default: // bottom
                    y = canvas.height - (fontSize);
                    break;
            }

            // Draw text with outline
            ctx.strokeText(text.toUpperCase(), x, y);
            ctx.fillText(text.toUpperCase(), x, y);
            
            finalMedia = new MessageMedia('image/png', canvas.toBuffer().toString('base64'));

        } else {
            // Create sticker without text
            finalMedia = await MessageMedia.fromUrl(url, { unsafeMime: true });
        }

        const caption = text ? `Sticker created with settings:\n- Text: ${text}\n- Color: ${options.color}\n- Size: ${options.size}\n- Position: ${options.pos}` : 'Sticker created!';
        await message.reply(finalMedia, undefined, { 
            sendMediaAsSticker: true, 
            stickerName: STICKER_PACK_NAME, 
            stickerAuthor: STICKER_AUTHOR,
            caption: caption
        });

    } catch (error) {
        console.error('Sticker creation failed:', error);
        message.reply('Sorry, I couldn\'t create a sticker from that. The URL might be invalid or the image format is not supported.');
    }
}

console.log("Starting bot...");
console.log("Please ensure you have Chromium installed if not using a pre-packaged version.");

client.initialize();

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

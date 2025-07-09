const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const { v4: uuidv4 } = require('uuid');
const { createCanvas, loadImage } = require('canvas');
const axios = require('axios');

ffmpeg.setFfmpegPath(ffmpegPath);

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
    console.error("Error: GEMINI_API_KEY is not set in the .env file.");
    process.exit(1);
}

const STICKER_AUTHOR = process.env.STICKER_AUTHOR || "WhatsApp Bot";
const STICKER_PACK_NAME = process.env.STICKER_PACK_NAME || "Sticker Pack";
const GITHUB_LINK = "https://github.com/RadjaShiqnals";


async function addTextToImage(mediaData, textToAdd, options = {}) {
    const {
        size: customSize,
        color: customColor = 'white',
        pos: textPosition = 'bottom'
    } = options;

    const imageBuffer = Buffer.from(mediaData, 'base64');
    const image = await loadImage(imageBuffer);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');

    ctx.drawImage(image, 0, 0);

    const fontSize = customSize || Math.max(20, Math.floor(image.height / 12));
    ctx.font = `bold ${fontSize}px Impact, Arial, sans-serif`;
    ctx.fillStyle = customColor;
    ctx.strokeStyle = 'black';
    ctx.lineWidth = Math.max(1, fontSize / 18);
    ctx.textAlign = 'center';
    
    const maxWidth = image.width * 0.9;
    const lineHeight = fontSize * 1.2;
    const x = image.width / 2;
    
    const words = textToAdd.split(' ');
    let line = '';
    const lines = [];

    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
            lines.push(line.trim());
            line = words[n] + ' ';
        } else {
            line = testLine;
        }
    }
    lines.push(line.trim());

    let startY;
    const topPadding = fontSize * 1.2;
    const bottomPadding = fontSize * 0.5;

    if (textPosition === 'top') {
        startY = topPadding;
        ctx.textBaseline = 'top';
    } else if (textPosition === 'center') {
        const totalTextHeight = lines.length * lineHeight;
        startY = (image.height - totalTextHeight) / 2 + (lineHeight - fontSize) / 2;
        ctx.textBaseline = 'top';
    } else { // bottom
        startY = image.height - bottomPadding - (lines.length - 1) * lineHeight;
        ctx.textBaseline = 'bottom';
    }

    for (let i = 0; i < lines.length; i++) {
        const currentLineY = startY + (i * lineHeight);
        ctx.strokeText(lines[i], x, currentLineY);
        ctx.fillText(lines[i], x, currentLineY);
    }
    
    const outputBuffer = canvas.toBuffer('image/png');
    return new MessageMedia('image/png', outputBuffer.toString('base64'), 'sticker_with_text.png');
}


const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const textModelName = "gemini-1.5-flash-latest";
const imageGenerationModelName = "gemini-2.0-flash-preview-image-generation";

const tempMediaDir = path.join(__dirname, 'temp_media');
if (!fs.existsSync(tempMediaDir)) {
    fs.mkdirSync(tempMediaDir, { recursive: true });
}

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
    ffmpegPath: ffmpegPath
});

client.on('qr', (qr) => {
    console.log("Scan the QR code with WhatsApp on your phone.");
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('Client is ready!');
});

client.on('message_create', async (msg) => {
    try {
        if (msg.fromMe || msg.isStatus) return;

        const bodyLower = msg.body.toLowerCase();

        if (bodyLower.startsWith('!ask ')) {
            const userInput = msg.body.substring('!ask '.length).trim();
            if (!userInput) {
                await msg.reply("Please provide a question after `!ask `.");
                return;
            }

            const thinkingMessage = await msg.reply("Thinking...");

            try {
                const model = genAI.getGenerativeModel({ model: textModelName });
                const result = await model.generateContent(userInput);
                const response = await result.response;
                const text = response.text();
                
                await thinkingMessage.edit(text);
            } catch (aiError) {
                await thinkingMessage.edit("Sorry, I couldn't get an answer. Please try again.");
            }

        } else if (bodyLower.startsWith('!image ')) {
            const userInput = msg.body.substring('!image '.length).trim();
            if (!userInput) {
                await msg.reply("Please provide a prompt after `!image `.");
                return;
            }
            
            const generatingMessage = await msg.reply(`Generating image for: "${userInput}"... Please wait.`);

            try {
                const imageModel = genAI.getGenerativeModel({ model: imageGenerationModelName });
                const imagePrompt = `Generate an image of: ${userInput}`;
                
                const result = await imageModel.generateContent({
                    contents: [{ parts: [{ text: imagePrompt }] }],
                    generationConfig: {
                        responseModalities: ["TEXT", "IMAGE"], 
                    },
                });
                const response = await result.response;

                let imagePart = null;
                let textPartContent = null;

                if (response.candidates && response.candidates.length > 0) {
                    const candidate = response.candidates[0];
                    if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
                        for (const part of candidate.content.parts) {
                            if (part.inlineData && part.inlineData.mimeType.startsWith('image/')) {
                                imagePart = part;
                            } else if (part.text) {
                                textPartContent = part.text;
                            }
                        }
                    }
                }

                if (imagePart) {
                    let successMessageText = "Image generated!";
                    if (textPartContent && textPartContent.trim() !== "") {
                        successMessageText = textPartContent.trim(); 
                    }
                    await generatingMessage.edit(successMessageText);

                    const media = new MessageMedia(imagePart.inlineData.mimeType, imagePart.inlineData.data, `${userInput.replace(/\s+/g, '_')}.png`);
                    await msg.reply(media);
                    
                } else {
                    const errorMessage = textPartContent || "Sorry, I couldn't generate an image for that prompt. The model may not have returned image data or the format was unexpected.";
                    await generatingMessage.edit(errorMessage);
                }
            } catch (aiError) {
                let detailedError = "Sorry, an error occurred while generating the image. Please try again.";
                if (aiError.message) {
                    detailedError += ` (Details: ${aiError.message})`;
                }
                if (aiError.response && aiError.response.data && aiError.response.data.error && aiError.response.data.error.message) {
                    detailedError = `Error from AI: ${aiError.response.data.error.message}`;
                } else if (aiError.message && aiError.message.includes("responseModalities")) {
                     detailedError = "There was an issue configuring the AI for image generation. Please check model compatibility and API key.";
                }
                await generatingMessage.edit(detailedError);
            }
        } else if (bodyLower.startsWith('!sticker')) {
            const commandBody = msg.body.substring('!sticker'.length).trim();
            
            let mediaToProcess = null;
            let textForSticker = commandBody;

            if (msg.hasMedia) {
                mediaToProcess = await msg.downloadMedia();
            } else if (msg.hasQuotedMsg) {
                const quotedMsg = await msg.getQuotedMessage();
                if (quotedMsg.hasMedia) {
                    mediaToProcess = await quotedMsg.downloadMedia();
                }
            }

            const urlRegex = /(https?:\/\/[^\s]+)/;
            const urlMatch = commandBody.match(urlRegex);

            if (!mediaToProcess && urlMatch) {
                const imageUrl = urlMatch[0];
                textForSticker = commandBody.replace(imageUrl, '').trim();
                const stickerMessage = await msg.reply(`Fetching image from URL...`);
                try {
                    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
                    const mimeType = response.headers['content-type'];
                    if (!mimeType || !mimeType.startsWith('image/')) {
                        await stickerMessage.edit("The provided link is not a direct link to an image or the image type is not supported.");
                        return;
                    }
                    const imageData = Buffer.from(response.data, 'binary').toString('base64');
                    mediaToProcess = new MessageMedia(mimeType, imageData, 'sticker-from-url');
                    await stickerMessage.edit("Image fetched! Processing sticker...");
                } catch (fetchError) {
                    await stickerMessage.edit("Sorry, I couldn't fetch the image from the URL. Please make sure it's a valid and direct image link.");
                    return;
                }
            }
            
            const stickerOptions = {
                text: '',
                size: null,
                color: 'white',
                pos: 'bottom'
            };

            const parts = textForSticker.split(/ --/);
            stickerOptions.text = parts[0].trim();

            for (let i = 1; i < parts.length; i++) {
                const optionPart = parts[i];
                if (optionPart.startsWith('size=')) {
                    const sizeValue = parseInt(optionPart.substring('size='.length), 10);
                    if (!isNaN(sizeValue)) stickerOptions.size = sizeValue;
                } else if (optionPart.startsWith('color=')) {
                    stickerOptions.color = optionPart.substring('color='.length).trim();
                } else if (optionPart.startsWith('pos=')) {
                    const posValue = optionPart.substring('pos='.length).trim().toLowerCase();
                    if (['top', 'center', 'bottom'].includes(posValue)) {
                        stickerOptions.pos = posValue;
                    }
                }
            }

            if (!mediaToProcess) {
                await msg.reply("Please send an image/gif, reply to one, or provide an image URL with `!sticker`.");
                return;
            }

            const stickerMessage = await msg.reply("Processing sticker...");

            try {
                if (stickerOptions.text && mediaToProcess.mimetype.startsWith('image/') && mediaToProcess.mimetype !== 'image/gif') {
                    await stickerMessage.edit("Adding text and creating sticker...");
                    const modifiedMedia = await addTextToImage(mediaToProcess.data, stickerOptions.text, stickerOptions);
                    await client.sendMessage(msg.from, modifiedMedia, { 
                        sendMediaAsSticker: true, 
                        stickerAuthor: STICKER_AUTHOR, 
                        stickerName: STICKER_PACK_NAME 
                    });
                    
                    const finalSize = stickerOptions.size || 'auto';
                    const optionsUsed = `Text: "${stickerOptions.text}"\nOptions: size=${finalSize}, color=${stickerOptions.color}, pos=${stickerOptions.pos}`;
                    await stickerMessage.edit(`Here's your sticker with text!\n\n${optionsUsed}`);

                } else if (mediaToProcess.mimetype.startsWith('image/') && mediaToProcess.mimetype !== 'image/gif') {
                    await client.sendMessage(msg.from, mediaToProcess, { 
                        sendMediaAsSticker: true, 
                        stickerAuthor: STICKER_AUTHOR, 
                        stickerName: STICKER_PACK_NAME 
                    });
                    await stickerMessage.edit("Here's your sticker!");

                } else if (mediaToProcess.mimetype === 'image/gif') {
                    if (stickerOptions.text) {
                        await stickerMessage.edit("Adding text to animated GIFs is not supported. Creating sticker from GIF...");
                    }
                    const inputPath = path.join(tempMediaDir, `${uuidv4()}.gif`);
                    const outputPath = path.join(tempMediaDir, `${uuidv4()}.webp`);

                    fs.writeFileSync(inputPath, Buffer.from(mediaToProcess.data, 'base64'));

                    await new Promise((resolve, reject) => {
                        ffmpeg(inputPath)
                            .outputOptions([
                                "-vcodec libwebp",
                                "-vf", "scale=256:256:force_original_aspect_ratio=decrease,pad=256:256:(ow-iw)/2:(oh-ih)/2:color=white@0.0",
                                "-loop", "0",
                                "-preset", "default",
                                "-an",
                                "-vsync", "0",
                                "-qscale", "75"
                            ])
                            .toFormat('webp')
                            .save(outputPath)
                            .on('end', resolve)
                            .on('error', (err) => {
                                reject(err);
                            });
                    });

                    const webpMedia = MessageMedia.fromFilePath(outputPath);
                    await client.sendMessage(msg.from, webpMedia, { 
                        sendMediaAsSticker: true, 
                        stickerAuthor: STICKER_AUTHOR, 
                        stickerName: STICKER_PACK_NAME 
                    });
                    await stickerMessage.edit("Here's your animated sticker!");

                    fs.unlinkSync(inputPath);
                    fs.unlinkSync(outputPath);
                } else {
                    await stickerMessage.edit("Sorry, I can only create stickers from images and GIFs.");
                }
            } catch (stickerError) {
                let detailedStickerError = "Sorry, I couldn't create the sticker.";
                if (stickerError && stickerError.message) {
                    detailedStickerError += ` (Details: ${stickerError.message})`;
                }
                await stickerMessage.edit(detailedStickerError);
                
                const tempFiles = fs.readdirSync(tempMediaDir);
                tempFiles.forEach(file => {
                    if (file.endsWith('.gif') || file.endsWith('.webp')) {
                        try {
                            fs.unlinkSync(path.join(tempMediaDir, file));
                        } catch (cleanupError) {
                        }
                    }
                });
            }
        } else if (msg.body.trim().toLowerCase() === '!help') {
            const helpHeader = `This is a WhatsApp bot created by ${STICKER_AUTHOR}\n` +
                               `GitHub: ${GITHUB_LINK}\n` +
                               `Thanks for using it!\n` +
                               `------------------------------------`;

            const helpMessage = `${helpHeader}\n\n` +
                `*Available Commands:*\n\n` +
                `1.  *!ask <your question>*\n` +
                `    - Description: Ask the AI a question.\n` +
                `    - Usage: \`!ask What is the capital of France?\`\n\n` +
                `2.  *!image <your prompt>*\n` +
                `    - Description: Generate an image based on your prompt.\n` +
                `    - Usage: \`!image A cat wearing a superhero costume\`\n\n` +
                `3.  *!sticker [url] [text] [--options...]*\n` +
                `    - Description: Convert an image/GIF into a sticker. Can fetch from a URL or use attached/replied-to media. Text can be added to static images.\n` +
                `    - Usage (media): Send/reply to media with \`!sticker [text]\`.\n` +
                `    - Usage (URL): \`!sticker https://i.imgur.com/example.png [text]\`\n` +
                `    - Usage (custom text): \`!sticker [url] Your Text --size=40 --color=yellow --pos=top\`\n` +
                `      - \`--size\`: Font size (e.g., 40). Default is auto.\n` +
                `      - \`--color\`: Text color (e.g., red, #FFFF00). Default is white.\n` +
                `      - \`--pos\`: Position (top, center, bottom). Default is bottom.\n\n` +
                `4.  *!help*\n` +
                `    - Description: Shows this help message.\n` +
                `    - Usage: \`!help\`\n\n` +
                `------------------------------------\n` +
                `Bot created by ${STICKER_AUTHOR}\n` +
                `${GITHUB_LINK}`;

            try {
                await msg.reply(helpMessage);
            } catch (replyError) {
                try {
                    await msg.reply("Sorry, I couldn't display the full help message. Basic commands: !ask, !image, !sticker, !help.");
                } catch (fallbackError) {
                }
            }
        }
    } catch (error) {
        if (msg && typeof msg.reply === 'function' && !msg.isStatus && msg.body) {
            try {
                await msg.reply('Sorry, I encountered an unexpected error trying to process your request.');
            } catch (replyError) {
            }
        }
    }
});

client.initialize();

console.log("Starting bot...");
console.log("Please ensure you have Chromium installed if not using a pre-packaged version.");

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

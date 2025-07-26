/**
 * This file contains template code for each command in the bot.
 * You can use these snippets as a reference or a starting point for building your own commands.
 * This file is for reference purposes only and is not executed by the bot.
 * 
 * Note: These templates assume you have a `client` object initialized from whatsapp-web.js,
 * a `genAI` object from @google/generative-ai, and other necessary setup like `activePolls = {}`.
 */

// =================================================================================================
// 1. Ask Command Template
// =================================================================================================

/**
 * @description Asks the Generative AI a question and gets a text-based response.
 * This template shows how to handle a simple text-in, text-out command with a "Thinking..." message.
 */
client.on('message_create', async (msg) => {
    // Check if the message body starts with the command prefix.
    if (msg.body.toLowerCase().startsWith('!ask ')) {
        
        // Extract user input by removing the command prefix and trimming whitespace.
        const userInput = msg.body.substring('!ask '.length).trim();

        // Handle cases where the user sends the command without a question.
        if (!userInput) {
            await msg.reply("Please provide a question after `!ask `.");
            return; // Stop execution for this command.
        }

        // Send an initial message to let the user know the bot is working on the request.
        const thinkingMessage = await msg.reply("Thinking...");

        try {
            // Get the specific generative model for text generation.
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
            
            // Send the user's input to the AI model to generate content.
            const result = await model.generateContent(userInput);
            const response = await result.response;
            const text = response.text();
            
            // Edit the original "Thinking..." message to show the final answer from the AI.
            await thinkingMessage.edit(text);

        } catch (aiError) {
            // If there's an error during the AI call, inform the user.
            console.error("AI Error in !ask command:", aiError);
            await thinkingMessage.edit("Sorry, I couldn't get an answer. Please try again.");
        }
    }
});


// =================================================================================================
// 2. Image Command Template
// =================================================================================================

/**
 * @description Generates an image based on a text prompt.
 * This template shows how to use an image generation model and send the resulting image back.
 */
client.on('message_create', async (msg) => {
    if (msg.body.toLowerCase().startsWith('!image ')) {
        const userInput = msg.body.substring('!image '.length).trim();

        if (!userInput) {
            await msg.reply("Please provide a prompt after `!image `.");
            return;
        }
        
        const generatingMessage = await msg.reply(`Generating image for: "${userInput}"... Please wait.`);

        try {
            // Get the model specifically configured for image generation.
            const imageModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash-preview-image-generation" });
            
            // Generate content. The response is expected to contain an image.
            const result = await imageModel.generateContent(`Generate an image of: ${userInput}`);
            const response = await result.response;

            // Find the image data within the AI's response parts.
            const imagePart = response.candidates[0].content.parts.find(part => part.inlineData);

            if (imagePart) {
                await generatingMessage.edit("Image generated!");
                // Create a MessageMedia object from the base64 data provided by the AI.
                const media = new MessageMedia(imagePart.inlineData.mimeType, imagePart.inlineData.data);
                await msg.reply(media);
            } else {
                await generatingMessage.edit("Sorry, I couldn't generate an image for that prompt.");
            }
        } catch (aiError) {
            console.error("AI Error in !image command:", aiError);
            await generatingMessage.edit("Sorry, an error occurred while generating the image.");
        }
    }
});


// =================================================================================================
// 3. Sticker Command Template
// =================================================================================================

/**
 * @description Creates a sticker from media (image/gif).
 * This is a more complex example showing how to handle attached media, replied-to media, and send media as a sticker.
 */
client.on('message_create', async (msg) => {
    if (msg.body.toLowerCase().startsWith('!sticker')) {
        let mediaToProcess = null;

        // Check if the message itself contains media.
        if (msg.hasMedia) {
            mediaToProcess = await msg.downloadMedia();
        } 
        // Check if the message is a reply to another message that has media.
        else if (msg.hasQuotedMsg) {
            const quotedMsg = await msg.getQuotedMessage();
            if (quotedMsg.hasMedia) {
                mediaToProcess = await quotedMsg.downloadMedia();
            }
        }

        if (mediaToProcess) {
            const stickerMessage = await msg.reply("Processing sticker...");
            try {
                // Send the downloaded media back to the chat, with options to format it as a sticker.
                await client.sendMessage(msg.from, mediaToProcess, { 
                    sendMediaAsSticker: true, 
                    stickerAuthor: "My Bot", 
                    stickerName: "Generated Stickers"
                });
                await stickerMessage.edit("Here's your sticker!");
            } catch (stickerError) {
                console.error("Sticker Error:", stickerError);
                await stickerMessage.edit("Sorry, I couldn't create the sticker.");
            }
        } else {
            await msg.reply("Please send an image/gif or reply to one with `!sticker`.");
        }
    }
});


// =================================================================================================
// 4. Ping (Poll) Command Template
// =================================================================================================

/**
 * @description Uses a Poll as an interactive button alternative.
 * This requires two parts: one in 'message_create' to send the poll, and another in 'vote_update' to handle the response.
 * You must have `const activePolls = {};` declared in your global scope.
 */

// Part 1: Sending the poll when the `!ping` command is used.
client.on('message_create', async (msg) => {
    if (msg.body.toLowerCase().trim() === '!ping') {
        // Create a new Poll object with a title and an array of option strings.
        const poll = new Poll('Ping Test', ['Pong!', 'Hello!', 'Status?']);
        
        const sentPoll = await msg.reply(poll);
        
        // Store the poll's ID and the original author's ID to track who can trigger the response.
        activePolls[sentPoll.id._serialized] = {
            author: msg.author || msg.from,
            pollMessage: sentPoll
        };
    }
});

// Part 2: Handling the vote update when a user votes on any poll.
client.on('vote_update', async (vote) => {
    const pollId = vote.parentMessage.id._serialized;
    const trackedPoll = activePolls[pollId];

    // Check if this is a poll we are tracking AND if the voter is the original command author.
    if (trackedPoll && trackedPoll.author === vote.voter) {
        const selectedOptionName = vote.selectedOptions[0].name;
        const chat = await trackedPoll.pollMessage.getChat();

        let responseMessage = `You voted for: ${selectedOptionName}`;
        if (selectedOptionName === 'Status?') {
            responseMessage = '✅ All systems are operational.';
        } else if (selectedOptionName === 'Pong!') {
            responseMessage = '🏓 Pong back at you!';
        }

        await chat.sendMessage(responseMessage);

        // IMPORTANT: Delete the poll from tracking to prevent multiple responses from the same poll.
        delete activePolls[pollId];
    }
});


// =================================================================================================
// 5. Help Command Template
// =================================================================================================

/**
 * @description Displays a help message with a list of all commands.
 * This is a simple command that sends a pre-defined text response.
 */
client.on('message_create', async (msg) => {
    if (msg.body.trim().toLowerCase() === '!help') {
        const helpMessage = `
*🤖 Bot Commands*

*!ask <question>*
_Asks the AI a question._

*!image <prompt>*
_Generates an image from text._

*!sticker*
_Reply to an image/gif to create a sticker._

*!ping*
_Sends a test poll to check if the bot is responsive._

*!help*
_Shows this help message._
        `;
        await msg.reply(helpMessage);
    }
});
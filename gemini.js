import axios from "axios"

const geminiResponse = async (command, assistantName, userName) => {
    try {
        const apiUrl = process.env.GEMINI_API_URL

        if (!apiUrl) {
            console.error("GEMINI_API_URL is not set in .env")
            return null
        }

        const prompt = `You are a virtual assistant named ${assistantName} created by ${userName}.
You are not Google. You will now behave like a voice-enabled assistant.

Your task is to understand the user's natural language input and respond with a JSON object like this:

{
  "type": "general" | "google-search" | "youtube-search" | "youtube-play" | "get-time" | "get-date" | "get-day" | "get-month" | "calculator-open" | "instagram-open" | "facebook-open" | "weather-show",
  "userInput": "<original user input, remove assistant name if present>",
  "response": "<a short spoken response to read out loud to the user>"
}

Type meanings:
- "general": factual or informational question, answer it directly in response field
- "google-search": user wants to search on Google
- "youtube-search": user wants to search on YouTube
- "youtube-play": user wants to play a video or song
- "calculator-open": user wants to open a calculator
- "instagram-open": user wants to open Instagram
- "facebook-open": user wants to open Facebook
- "weather-show": user wants to know the weather
- "get-time": user asks for current time
- "get-date": user asks for today's date
- "get-day": user asks what day it is
- "get-month": user asks for the current month

Important:
- If asked who made you, say ${userName}
- Only respond with the raw JSON object, no markdown, no backticks, nothing else

User input: ${command}`

        const result = await axios.post(apiUrl, {
            contents: [{
                parts: [{ text: prompt }]
            }]
        })

        const text = result.data?.candidates?.[0]?.content?.parts?.[0]?.text
        console.log("Raw Gemini text:", text)
        return text

    } catch (error) {
        if (error.response) {
            console.error("Gemini API error:", error.response.status, JSON.stringify(error.response.data))
        } else {
            console.error("Gemini network error:", error.message)
        }
        return null
    }
}

export default geminiResponse

import uploadOnCloudinary from "../config/cloudinary.js"
import geminiResponse from "../gemini.js"
import User from "../models/user.model.js"
import moment from "moment"

export const getCurrentUser = async (req, res) => {
    try {
        const userId = req.userId
        const user = await User.findById(userId).select("-password")
        if (!user) {
            return res.status(400).json({ message: "user not found" })
        }
        return res.status(200).json(user)
    } catch (error) {
        return res.status(400).json({ message: "get current user error" })
    }
}

export const updateAssistant = async (req, res) => {
    try {
        const { assistantName, imageUrl } = req.body
        let assistantImage
        if (req.file) {
            assistantImage = await uploadOnCloudinary(req.file.path)
        } else {
            assistantImage = imageUrl
        }
        const user = await User.findByIdAndUpdate(req.userId, {
            assistantName, assistantImage
        }, { new: true }).select("-password")
        return res.status(200).json(user)
    } catch (error) {
        return res.status(400).json({ message: "updateAssistant error" })
    }
}

export const askToAssistant = async (req, res) => {
    try {
        const { command } = req.body
        const user = await User.findById(req.userId)

        if (!user) {
            return res.status(400).json({ response: "User not found" })
        }

        user.history.push(command)
        await user.save()  // BUG FIX 1: was missing await

        const userName = user.name
        const assistantName = user.assistantName

        // BUG FIX 2: geminiResponse can return undefined if Gemini API fails
        const result = await geminiResponse(command, assistantName, userName)

        if (!result) {
            console.error("Gemini returned empty response")
            return res.status(500).json({ response: "Gemini API failed. Check your API key or quota." })
        }

        // BUG FIX 3: strip markdown backticks Gemini sometimes wraps around JSON
        const cleaned = result.replace(/```json|```/g, "").trim()

        const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
            console.error("No JSON found in Gemini response:", result)
            return res.status(400).json({ response: "Sorry, I couldn't understand that." })
        }

        let gemResult
        try {
            gemResult = JSON.parse(jsonMatch[0])
        } catch (parseErr) {
            console.error("JSON parse failed:", jsonMatch[0])
            return res.status(400).json({ response: "Sorry, I got a bad response. Try again." })
        }

        console.log("Gemini result:", gemResult)
        const type = gemResult.type

        switch (type) {
            case 'get-date':
                return res.json({ type, userInput: gemResult.userInput, response: `Today's date is ${moment().format("MMMM Do, YYYY")}` })
            case 'get-time':
                return res.json({ type, userInput: gemResult.userInput, response: `Current time is ${moment().format("hh:mm A")}` })
            case 'get-day':
                return res.json({ type, userInput: gemResult.userInput, response: `Today is ${moment().format("dddd")}` })
            case 'get-month':
                return res.json({ type, userInput: gemResult.userInput, response: `Current month is ${moment().format("MMMM")}` })
            case 'google-search':
            case 'youtube-search':
            case 'youtube-play':
            case 'general':
            case 'calculator-open':
            case 'instagram-open':
            case 'facebook-open':
            case 'weather-show':
                return res.json({ type, userInput: gemResult.userInput, response: gemResult.response })
            default:
                // BUG FIX 4: fallback for unknown types instead of 400 error
                return res.json({ type: 'general', userInput: gemResult.userInput, response: gemResult.response || "I'm not sure how to help with that." })
        }

    } catch (error) {
        console.error("askToAssistant error:", error)
        return res.status(500).json({ response: "Internal server error. Check backend logs." })
    }
}

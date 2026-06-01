import mongoose from "mongoose"

const connectDb = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URL)
        console.log("db connected")

        // Drop stale userName_1 index if it exists (leftover from old schema)
        try {
            await mongoose.connection.collection("users").dropIndex("userName_1")
            console.log("Dropped stale userName_1 index")
        } catch (e) {
            // Index doesn't exist — that's fine, ignore
        }

    } catch (error) {
        console.log(error)
    }
}

export default connectDb

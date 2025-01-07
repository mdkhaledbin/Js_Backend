// require('dotenv').config({path: './env'})
// import 'dotenv/config'
import dotenv from "dotenv"
dotenv.config({
    path: './env'
})

import connectDB from "./db/index.js";

connectDB()









/*
import express from "express"
const app = express()

(async () => {
    try {
        await mongoose.connect.apply(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("error", () => {
            console.log("Error: ", error);
            throw error
        })
        app.listen(process.env.PORT, () => {
            console.log(`App is listening on ${process.env.PORT}`);   
        })
    } catch (error) {
        console.error("Error: ", error);
        throw error
    }
})();
*/
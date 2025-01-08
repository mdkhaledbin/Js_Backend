import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"

const registerUser = asyncHandler( async function (req, res) {
    // get user details from frontend
    // validation - not empty
    // check if user already exists: username and email
    // check for images
    // check for avatar
    // upload them in cloudinary, check avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res

    const {fullname, email, username, password} = req.body
    // console.log("email : ", email);

    // if(fullname === ""){
    //     throw new ApiError(400, "Fullname is required.")
    // }

    if(
        [fullname, email, username, password].some((field) => field?.trim() === "")
    ){
        throw new ApiError(400, "All fields are required.")
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })
    if(existedUser) {
        throw new ApiError(409, "User already exists.")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;
    
    if(!avatarLocalPath) {
        throw new ApiError(400, "Avatar Image is required.")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    console.log(avatar.url);
    

    if(!avatar){
        throw new ApiError(400, "Avatar Image is required.")
    }

    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        username: username.toLowerCase(),
        password,

    })

    const createdUser = await User.findById(user._id)

    if(!createdUser) {
        throw new ApiError(500, "Something went wrong when registering user.")
    }

    return res.status(201).json({
        response: new ApiResponse(200, createdUser, "User registered successfully")
    })

})


export {registerUser}

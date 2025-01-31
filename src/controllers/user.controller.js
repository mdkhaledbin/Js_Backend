import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"

const generateAccessAndRefereshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave : false})

        return {accessToken, refreshToken};
    } catch (error) {
        throw new ApiError(500, "Error while generating Access and Refresh Token.")
    }
}

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
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path
    }
    
    if(!avatarLocalPath) {
        throw new ApiError(400, "Avatar Image is required.")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    // console.log(avatar.url);
    

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

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser) {
        throw new ApiError(500, "Something went wrong when registering user.")
    }

    return res.status(201).json({
        response: new ApiResponse(200, createdUser, "User registered successfully")
    })

})

const loginUser = asyncHandler(async (req, res) =>{
    // req body -> data
    // username or email
    //find the user
    //password check
    //access and referesh token
    //send cookie

    const {email, username, password} = req.body
    console.log(email);

    if (!username && !email) {
        throw new ApiError(400, "username or email is required")
    }
    
    // Here is an alternative of above code based on logic discussed in video:
    // if (!(username || email)) {
    //     throw new ApiError(400, "username or email is required")
        
    // }

    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if (!user) {
        throw new ApiError(404, "User does not exist")
    }

   const isPasswordValid = await user.isPasswordCorrect(password)

   if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials")
    }

   const {accessToken, refreshToken} = await generateAccessAndRefereshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: false
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200, 
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged In Successfully"
        )
    )
    
})

const logoutUser = asyncHandler(async(req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1 // this removes the field from document
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"))
})

const RefreshAccessToken = asyncHandler(async (req, res) => {
    try {
        const incomingrefreshToken = await req.cookies?.refreshToken || req.body?.refreshToken
    
        if(!incomingrefreshToken) throw new ApiError(400, "invalid or expired refresh token");

        console.log(incomingrefreshToken);
        
        
        const decodedRefreshToken = jwt.verify(incomingrefreshToken, process.env.REFRESH_TOKEN_SECRET);

        const user = await User.findById(decodedRefreshToken._id)
        if(!user) throw new ApiError(400, "invalid refresh token");

        if (incomingrefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Invalid User or expired refresh token")
        }

        const {accessToken, refreshToken} = await generateAccessAndRefereshTokens(user._id)
        const options = {
            httpOnly: true,
            secure: true
        }
        console.log(refreshToken);

        return res.status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new ApiResponse(
                            200, 
                            {
                                accessToken, refreshToken
                            },
                            "Refreshed access token"
                        )
            );

    } catch (error) {
        throw new ApiError(500, error?.message || "error while refreshAccessToken")
    }
})


export {registerUser, loginUser, logoutUser, RefreshAccessToken}

import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"

const generateAccessAndRefreshToken = async (userId) => {
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

const loginUser = asyncHandler( async (req, res) => {
    // get login parameters from client
    // check actually parameters you get or not
    // check if user exist with email or username
    // encrypt password and check with db's password
    // generate refresh and access token
    // send cookies

    const {email, username, password} = req.body

    if(!username && !email){
        throw new ApiError(400, "username or email must required.");
    }else if(!password) throw new ApiError(400, "Password must required.");

    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if(!user){
        throw new ApiError(404, "user not found.")
    }
    const isValidUser = await user.isPasswordCorrect(password)

    if(!isValidUser){
        throw new ApiError(401, "Invalid user credintials.")
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id);
    const loggedUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    const options = {
        httpOnly: true,
        secure: true
    }
    return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedUser,
                    accessToken,
                    refreshToken
                },
                "User logged in successfully"
            )
        )
})

const logOutUser = asyncHandler( async (req, res) => {
    // delete cookies
    // reset refreshToken in db
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken: undefined
            }
        }
    );

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
        .clearCookie("accessToken", accessToken)
        .clearCookie("refreshToken", refreshToken)
        .json(
            new ApiResponse(
                200,
                {}, 
                "User Logged Out."
            )
        )
})


export {registerUser, loginUser, logOutUser}

const UserModel = require('../Models/UserModel')
const jwt = require('jsonwebtoken')
const bcryptjs = require('bcryptjs')
const nodemailer = require('nodemailer')
const EmailVerifyModel = require('../Models/EmailVerifyModel')

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: "1d",
    });
}

const mailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.AUTH_EMAIL,
        pass: process.env.AUTH_PASSWORD
    }
});

// if token is expired after 1 day then getCurrentUserData() controller will not be able to fetch the data 

const getCurrentUserData = async (req, res) => {
    const { token } = req.body;

    try {
        if (!token) {
            return res.json({
                status: "TOKEN_MISSING",
                message: "No token was provided in the request headers."
            });
        }
        const isTokenCorrect = jwt.verify(token, process.env.JWT_SECRET, (err, data) => {
            if (err) {
                return {
                    status: "TOKEN_EXPIRED",
                    message: err
                }
            }
            return {
                status: "TOKEN_VALID",
                message: data
            }
        });

        if (isTokenCorrect.status === "TOKEN_EXPIRED") {
            return res.json({
                status: "TOKEN_EXPIRED",
                message: isTokenCorrect.message
            })
        }

        const userID = isTokenCorrect.message.id;

        const dbdata = await UserModel.findOne({ _id: userID });

        if (dbdata) {
            return res.json({
                status: "DATA_FETCHED_SUCCESSFULLY",
                data1: dbdata,
                data2: isTokenCorrect,
            });
        } else {
            return res.json({
                status: "INVALID_TOKEN",
                data1: dbdata,
                data2: isTokenCorrect,
            });
        }
    }
    catch (error) {
        return res.json({
            status: "ERROR_OCCURED",
            message: error.message,
        });
    }
}

const loginController = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.json({
            status: "EMPTY_CREDENTIALS",
            message: "Please enter a valid and non-null name, email, and password.",
        });
    }

    try {
        const isUserExists = await UserModel.findOne({ email });

        if (!isUserExists) {
            return res.json({
                status: "NO_ACCOUNT_EXISTS",
                message: "Sorry! No account exists with this email ID. Please create an account first and then proceed to login.",
            });
        }

        const isPasswordCorrect = await bcryptjs.compare(password, isUserExists.password);

        if (isPasswordCorrect) {
            const token = generateToken(isUserExists._id);
            await UserModel.findOneAndUpdate({ email: email }, { isLoggedIn: true, isEmailVerified: true });

            return res.json({
                status: "LOGIN_SUCCESSFULL",
                name: isUserExists.name,
                email: isUserExists.email,
                isEmailVerified: isUserExists.isEmailVerified,
                isLoggedIn: isUserExists.isLoggedIn,
                token: token,
            });
        } else {
            return res.json({
                status: "PASSWORD_NOT_MATCHED",
                message: 
                "Incorrect password. Please enter the correct password or reset it.",
            });
        }
    } catch (error) {
        console.log(error);
        return res.json({
            status: "ERROR_OCCURED",
            message: error.message,
        });
    }
}

const registerController = async (req, res) => {
    const { name, email, password } = req.body

    if (!name || !email || !password) {
        return res.json({
            status: "EMPTY_CREDENTIALS",
            message: "Please enter a valid name, email, and password."
        })
    }

    try {
        const isUserAlreadyExists = await UserModel.findOne({ email });

        if (isUserAlreadyExists) {
            return res.json({
                status: "EMAIL_ALREADY_EXISTS",
                message: 
                "An account already exists with this email. Please try a new email or proceed to login."
            })
        }
// password provided by the user is hashed using bcryptjs.hash with a salt factor of 10 before storing it in the database.
        const encryptedPassword = await bcryptjs.hash(password, 10);

        const newUser = await UserModel.create({
            name: name,
            email: email,
            password: encryptedPassword,
            isEmailVerified: false,
            isLoggedIn: false,
        })

        if (newUser) {
            sendOtpVerificationEmail(newUser.email)  
            //  send an email for account verification. 
            return res.json({
                status: "REGISTRATION_SUCCESSFUL",
                _id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                isEmailVerified: newUser.isEmailVerified,
                isLoggedIn: newUser.isLoggedIn,
            })
        }
    }
    catch (error) {
        return res.json({
            status: "ERROR_OCCURED",
            message: error.message
        })
    }
}

const forgotPasswordController = async (req, res) => {
    const { email } = req.body

    try {
        const isUserExists = await UserModel.findOne({ email });

        if (!isUserExists) {
            return res.json({
                status: "NO_ACCOUNT_EXISTS",
                message: "No account exists with this email address. Please enter a valid email address or proceed to the SignUp page."
            })
        }

        // deleting previous otps sended
        await EmailVerifyModel.deleteMany({ email: email })

        // Send OTP verification email
        await sendOtpVerificationEmail(email)

        return res.json({
            status: "SUCCESSFULL",
            message: "An OTP has been sent to your email address. Please use it to verify your email. Note: This OTP is valid only for 10 minutes."
        })
    }
    catch (error) {
        return res.json({
            status: "ERROR_OCCURED",
            message: error.message
        })
    }
}

const changeResetPasswordController = async (req, res) => {
    const { email, password } = req.body
    const isUserExists = await UserModel.findOne({ email: email });

    if (!isUserExists) {
        return res.json({
            status: "NO_ACCOUNT_EXISTS",
            message: "No account exists with this email address. Please enter a valid email address or proceed to the SignUp page."
        })
    }

    try {
        const encryptedPassword = await bcryptjs.hash(password, 10);
        UserModel.updateOne({
            email: email
        },
            {
                $set: {
                    password: encryptedPassword
                }
            }
        ).then(() => {
            return res.json({
                status: "PASSWORD_CHANGED_SUCCESSFULLY",
                message: "Your password has been changed successfully , and now you can proceed to the login page."
            })
        }).catch(() => {
            return res.json({
                status: "ERROR_IN_CHANGING_PASSWORD",
                message: "There was an error in changing the password. Please try again after some time."
            })
        })
    }
    catch (error) {
        return res.json({
            status: "ERROR_OCCURED",
            message: error.message
        })
    }
}

// generates an OTP, hashes it, sends an OTP verification email, and creates a new record in the EmailVerifyModel to track the verification process.
const sendOtpVerificationEmail = async (email) => {
    try {
        const OTP = `${Math.floor(Math.random() * 900000 + 100000)}`

        const mailOptions = {
            from: process.env.AUTH_EMAIL,
            to: email,
            subject: "Please Verify Your Email Address [Team DatesInformer]",
            html: `<p>Enter <b> ${OTP} </b> on the website to complete the Sign Up Process. The above is valid for <b> 10 minutes</b>.</p>`
        }

        const encryptedOTP = await bcryptjs.hash(OTP, 10)

        const newEmailVerificationData = await EmailVerifyModel.create({
            email: email,
            otp: encryptedOTP,
            createdAt: Date.now(),
            expiresAt: Date.now() + 600000
        })

        await mailTransporter.sendMail(mailOptions)
        return {
            status: "SUCCESS",
            message: "Message Sent SuccessFully",
            data: {
                email: email
            }
        }
    }
    catch (error) {
        return {
            status: "FAILED",
            message: error.message
        }
    }
}

// function handles the email verification process using the OTP that was sent to the user's email address.
const verifyEmailController = async (req, res) => {
    try {
        const { email, otp } = req.body
        if (!email || !otp) {
            return res.json({
                status: "EMPTY_CREDENTIALS",
                message: "Please enter a valid email and non-null OTP."
            })
        }

        const emailVerifyRecord = await EmailVerifyModel.findOne({ email: email })
        if (!emailVerifyRecord) {
            return res.json({
                status: "EMAIL_ALREADY_VERIFIED",
                message: "The Email has already been verified, or no account exists with this email. Please proceed to the sign-up or login page."
            })
        }

        const expiresAt = emailVerifyRecord.expiresAt
        const encryptedOTP = emailVerifyRecord.otp

        if (expiresAt < Date.now()) {
            await emailVerifyRecord.deleteMany({
                email: email
            })
            return res.json({
                status: "OTP_EXPIRED",
                message: "The entered OTP has expired. Please request a new OTP by clicking on 'Resend OTP'."
            })
        }

        const isOtpValid = await bcryptjs.compare(otp, encryptedOTP)

        if (!isOtpValid) {
            return res.json({
                status: "INVALID_OTP",
                message: "The OTP is invalid. Please enter the correct OTP."
            })
        }

        else {
            await UserModel.updateMany({ email: email }, {
                isEmailVerified: true,
                isLoggedIn: true
            })
            await EmailVerifyModel.deleteMany({ email: email })
            const UpdatedUserDetails = await UserModel.findOne({ email: email })

            return res.json({
                status: "VERIFICATION_SUCCESSFULL",
                message: "Your Email has been verified successfully. You can now proceed to the home page.",
                data: {
                    name: UpdatedUserDetails.name,
                    email: UpdatedUserDetails.email,
                    isEmailVerified: UpdatedUserDetails.isEmailVerified,
                    isLoggedIn: UpdatedUserDetails.isLoggedIn
                }
            })
        }
    }
    catch (error) {
        return res.json({
            status: "ERROR_OCCURED",
            message: error.message
        })
    }
}

// handles resending an OTP for email verification. It checks if a valid email is provided, deletes any previous verification records, and then sends a new OTP verification email.
const resendOtpController = async (req, res) => {
    try {
        const { email } = req.body
        if (!email) {
            return res.json({
                status: "EMPTY_CREDENTIALS",
                message: "Please enter a valid email and non-null OTP."
            })
        }

        await EmailVerifyModel.deleteMany({ email: email })
        sendOtpVerificationEmail(email)

        return res.json({
            status: "RESENT_SUCCESSFULL",
            message: "A new OTP has been sent to your email successfully."
        })
    }
    catch (error) {
        return res.json({
            status: "ERROR_OCCURED",
            message: error.message
        })
    }
}

//  verifies the provided OTP for email addresses during password reset requests. It performs similar operations as the previous verifyEmailController, but here it doesn't update the user's email verification status or log-in status.
const verifyEmailResetController = async (req, res) => {
    try {
        const { email, otp } = req.body
        if (!email || !otp) {
            return res.json({
                status: "EMPTY_CREDENTIALS",
                message: "Please enter a valid email and non-null OTP."
            })
        }

        const emailVerifyRecord = await EmailVerifyModel.findOne({ email: email })
        if (!emailVerifyRecord) {
            return res.json({
                status: "EMAIL_ALREADY_VERIFIED",
                message:"The Email has already been verified, or no account exists with this email. Please proceed to the sign-up or login page."
            })
        }

        const expiresAt = emailVerifyRecord.expiresAt
        const encryptedOTP = emailVerifyRecord.otp

        if (expiresAt < Date.now()) {
            await EmailVerifyModel.deleteMany({
                email: email
            })
            return res.json({
                status: "OTP_EXPIRED",
                message: "The entered OTP has expired. Please request a new OTP by clicking on Resend OTP."
            })
        }

        const isOtpValid = await bcryptjs.compare(otp, encryptedOTP)

        if (!isOtpValid) {
            return res.json({
                status: "INVALID_OTP",
                message: "Invalid OTP. Please enter the correct OTP."
            })
        }

        else {
            await EmailVerifyModel.deleteMany({ email: email })
            const UpdatedUserDetails = await UserModel.findOne({ email: email })

            return res.json({
                status: "VERIFICATION_SUCCESSFULL",
                message:"Your email has been verified successfully. You can now proceed to reset your password.",
                data: {
                    name: UpdatedUserDetails.name,
                    email: UpdatedUserDetails.email
                }
            })
        }
    }
    catch (error) {
        return res.json({
            status: "ERROR_OCCURED",
            message: error.message
        })
    }
}

const logOutController = async(req, res) => {
    const {email} = req.body;
    
    if (!email) {
        return res.json({
          status: "EMPTY_CREDENTIALS",
          message: "Please enter a valid email.",
        });
    }

    try {
        const isUserAlreadyExists = await UserModel.findOne({ email });

        if (!isUserAlreadyExists) {
            return res.json({
                status: "NO_ACCOUNT_EXIST",
                message: 
                "Sorry! No account exists with the provided email address"
            })
        }

        UserModel.updateOne({email: email}, {
            $set: {
                isLoggedIn: false
            }
        }).then(() => {
            return res.json({
                status: "LOGOUT_SUCCESS",
                message: "user logged out successfully"
            })
        }).catch((err) => {
            return res.json({
                status: "LOGOUT_FAILURE",
                message: err.message
            })
        })
    }
    catch (error) {
        return res.json({
            status: "ERROR_OCCURED",
            message: error.message
        })
    }
}

module.exports = { loginController, registerController, getCurrentUserData, forgotPasswordController, changeResetPasswordController, verifyEmailController, resendOtpController, verifyEmailResetController, logOutController }

// for logout functionality -> firstly delete the token and redirect/navigate to /login route

// keep user logged in/ stay logged in
// using local storage isLoggedin property 
const mongoose = require('mongoose')

const EmailVerifySchema = new mongoose.Schema({
    email: {
        type: "String",
        required: true
    },
    otp: {
        type: "String",
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now()
    },
    expiresAt: {
        type: Date
    }
})

const EmailVerifyModel = mongoose.model("Email Verification" ,EmailVerifySchema)

module.exports = EmailVerifyModel;
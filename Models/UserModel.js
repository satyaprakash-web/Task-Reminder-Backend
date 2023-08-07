const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
    {
        name: {
            type: "String",
            required: true,
        },
        email: {
            type: "String",
            unique: true,
            required: true,
        },
        password: {
            type: "String",
            required: true,
        },
        isEmailVerified: {
            type: Boolean,
            default: false
        },
        isLoggedIn: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true,
    }
);

const UserModel = mongoose.model("User Details", UserSchema);
module.exports = UserModel;

const express = require('express');
const { loginController, registerController, getCurrentUserData, forgotPasswordController, resetPasswordController, changeResetPasswordController, verifyEmailController, resendOtpController, verifyEmailResetController } = require('../Controllers/UserController');
const Router = express.Router()

Router.post('/login', loginController);
Router.post('/register', registerController);
Router.get('/get-data', getCurrentUserData);
Router.post('/forgot-password', forgotPasswordController);
Router.post('/reset-password', changeResetPasswordController)
Router.post('/verifyEmail', verifyEmailController)
Router.post('/verifyEmailReset', verifyEmailResetController);

// resendOtp': This is the route path, which is a string representing the endpoint to which the POST request will be sent. In this case, it's "/resendOtp".

// resendOtpController: This is the controller function that will handle the logic for the "/resendOtp" route. When a request is made to "/resendOtp" via a POST method, this controller function will be executed to process the request and send a response.
Router.post('/resendOtp', resendOtpController)

module.exports = Router
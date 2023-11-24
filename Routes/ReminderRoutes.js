const express = require('express');
const { getAllRemindersController, deleteRemindersController, addRemindersController, deleteUserController} = require('../Controllers/ReminderController');
const Router = express.Router()

Router.post('/getAllReminders', getAllRemindersController)
Router.post('/addReminders', addRemindersController)
Router.post('/deleteReminders', deleteRemindersController)
Router.post('/deleteUser', deleteUserController)

module.exports = Router
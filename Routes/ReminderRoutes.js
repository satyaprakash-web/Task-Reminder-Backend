const express = require('express');
const { getAllRemindersController, deleteRemindersController, addRemindersController } = require('../Controllers/ReminderController');
const Router = express.Router()

Router.post('/getAllReminders', getAllRemindersController)
Router.post('/addReminders', addRemindersController)
Router.post('/deleteReminders', deleteRemindersController)

module.exports = Router
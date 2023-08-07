const mongoose = require('mongoose')

const reminderSchema = new mongoose.Schema(
    {
        email: {
            type: "String",
            required: true
        },
        reminderMessage: {
            type: "String",
            required: true
        },
        remindAt: {
            type: "String",
            required: true
        },
        isReminded: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true,
    }
)

const ReminderModel = mongoose.model("Reminders", reminderSchema)

module.exports = ReminderModel
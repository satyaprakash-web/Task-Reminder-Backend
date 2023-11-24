const ReminderModel = require('../Models/ReminderModel');
const nodemailer = require('nodemailer')
const UserModel = require('../Models/UserModel')

// The transporter will be configured to use Gmail's SMTP server for sending emails.
const mailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.AUTH_EMAIL,
        pass: process.env.AUTH_PASSWORD
    }
});


const getAllRemindersController = async (req, res) => {
    const { email } = req.body
    try {
        const reminderList = await ReminderModel.find({ email: email });

        if (!reminderList || reminderList.length === 0) {
            return res.json({
                status: "NO_REMINDERS",
                message: "No reminders found"
            });
        }

        return res.json({
            status: "SUCCESSFULLY_FETCHED",
            message: reminderList
        });

    } catch (err) {
        console.log(err);
        return res.json({
            status: "ERROR_OCCURED",
            message: err.message
        });
    }
};

const addRemindersController = async (req, res) => {
    const { reminderMsg, remindAt, email } = req.body;

    if (!req.body.reminderMsg || !req.body.remindAt || !email) {
        return res.json({
            status: "INVALID_REQUEST",
            message: "Please provide reminder message, remind at time, and email address"
        });
    }

    const newReminder = new ReminderModel({
        email: email,
        reminderMessage: reminderMsg,
        remindAt,
        isReminded: false
    });

    try {
        await newReminder.save();
        scheduleReminderEmail(email)

        const reminderList = await ReminderModel.find({email: email});

        return res.json({
            status: "SUCCESSFULLY_FETCHED",
            message: reminderList
        });
    }
    catch (error) {
        console.log(error);
        return res.json({
            status: "ERROR_SAVE",
            message: error.message
        });
    }
};


const deleteRemindersController = async (req, res) => {
    const {id, email} = req.body
    if (!id || !email) {
        return res.json({
            status: "INVALID_REQUEST",
            message: "Please provide reminder id and email"
        });
    }

    try {
        await ReminderModel.deleteOne({ _id: req.body.id });
        const reminderList = await ReminderModel.find({email: email});

        return res.json({
            status: "SUCCESSFULLY_FETCHED",
            message: reminderList
        });
    } catch (err) {
        console.log(err);
        return res.json({
            status: "ERROR_OCCURED",
            message: err.message
        });
    }
};

const deleteUserController = async (req, res) => {
    const { email } = req.body; 

    if (!email) {
        return res.json({
            status: "INVALID_REQUEST",
            message: "Please provide an email to delete the user"
        });
    }

    try {
        // Delete user from UserModel
        await UserModel.deleteOne({ email: email });
        
        // Delete user's reminders from ReminderModel
        await ReminderModel.deleteMany({ email: email });
        return res.json({
            status: "USER_DELETED_SUCCESSFULLY",
            message: "User and associated data deleted successfully"
        });
    } catch (err) {
        console.log(err);
        return res.json({
            status: "ERROR_OCCURED",
            message: err.message
        });
    }
};


const scheduleReminderEmail = (email) => {
    setInterval(async () => {
        try {
            const reminderList = await ReminderModel.find({ email: email });

            if (reminderList) {
                for (const reminder of reminderList) {
                    if (!reminder.isReminded) {
                        const now = new Date();
                        if (new Date(reminder.remindAt) - now < 0) {
                            await ReminderModel.findByIdAndUpdate(reminder._id, { isReminded: true });

                            const mailMessage = reminder.reminderMessage;
                            const mailOptions = {
                                from: process.env.AUTH_EMAIL,
                                to: email,
                                subject: "⏰⏰⏰ [Team DatesInformer] !!! You Have A Pending Task",
                                html: `<p>This Email Is Concerned To remind You about the task<b> ${mailMessage} </b> please do it carefully <br /> Thank You<p> <br/> <p>Regards [TEAM DatesInfomer] </p>`
                            };

                            await mailTransporter.sendMail(mailOptions);
                            console.log('reminder sent successfully on email for ' + mailMessage);
                        }
                    }
                }
            }
        }
        catch (err) {
            console.log(err);
        }
    }, 1000);
}
//
module.exports = { getAllRemindersController, addRemindersController, deleteRemindersController, deleteUserController};

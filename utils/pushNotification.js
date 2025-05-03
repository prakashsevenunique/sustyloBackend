const axios = require('axios');

async function sendPushNotification(expoPushToken, title, body, data = {}) {
    const message = {
        to: expoPushToken,
        sound: 'default',
        title,
        body,
        data,
    };

    try {
        const response = await axios.post('https://exp.host/--/api/v2/push/send', message, {
            headers: {
                'Content-Type': 'application/json',
            },
        });
    } catch (error) {
        console.error('Error sending push notification:');
    }
}

module.exports = { sendPushNotification };
/**
 * To create your first sender if you have a API SENDGRID_API_KEY
 * with an old account: h
 * ttps://app.sendgrid.com/settings/sender_auth/senders
 */
const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendWelcomeEmail = (email, name) => {
	sgMail.send({
		to: email,
		from: 'damien.ralentass@gmail.com',
		subject: 'Welcome to audio infinity!',
		text: `Welcome to audio infinity, ${name}. We would love to have your optinion and inpts on your experience with us. We wish you a great exprience with our products.`
	});
};

const sendCancelationEmail = (email, name) => {
	sgMail.send({
		to: email,
		from: 'damien.ralentass@gmail.com',
		subject: 'We are sorry to see you leave our group!',
		text: `We are sorry to see you leave our group, ${name}. Is there something we coulds have done to keep you with us?`
	});
};

module.exports = {
	sendWelcomeEmail,
	sendCancelationEmail
};

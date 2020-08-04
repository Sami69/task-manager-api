const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const User = require('../models/user');
const auth = require('../middleware/auth');
const { sendWelcomeEmail, sendCancelationEmail } = require('../emails/account');
const { findById, findByIdAndUpdate, update } = require('../models/user');

const router = new express.Router();

router.post('/users', async (req, res) => {
	const user = new User(req.body);

	try {
		await user.save();
		sendWelcomeEmail(user.email, user.name);
		const token = await user.generateAuthToken();

		res.status(201).send({ user, token });
	} catch (e) {
		res.status(400).send(e);
	}
});

router.post('/users/login', async (req, res) => {
	try {
		const user = await User.findByCredentials(req.body.email, req.body.password);
		const token = await user.generateAuthToken();

		res.send({ user, token });
	} catch (e) {
		res.status(400).send(e);
	}
});

/**
 * Target a specific token to logout to avoid 
 * login out all devices.
 */
router.post('/users/logout', auth, async (req, res) => {
	try {
		req.user.tokens = req.user.tokens.filter((token) => {
			return token.token !== req.token;
		});

		await req.user.save();
		res.send();
	} catch (e) {
		res.status(500).send(e);
	}
});

/**
 * Target all tokens of a user to logout all sessions.
 */
router.post('/users/logoutAll', auth, async (req, res) => {
	try {
		req.user.tokens = [];
		await req.user.save();
		res.send();
	} catch (e) {
		res.status(500).send(e);
	}
});

router.get('/users/me', auth, async (req, res) => {
	res.send(req.user);
});

router.patch('/users/me', auth, async (req, res) => {
	//Handlin accpeted updates
	const upates = Object.keys(req.body);
	const allowedUpdates = [ 'name', 'email', 'password', 'age' ];
	const isValidatOperation = upates.every((update) => allowedUpdates.includes(update));

	if (!isValidatOperation) {
		return res.status(400).send({ error: 'Invalid updates!' });
	}

	try {
		const user = req.user;

		upates.forEach((field) => (user[field] = req.body[field]));
		await user.save();

		if (!user) {
			return res.status(404).send();
		}

		res.send(user);
	} catch (e) {
		res.status(400).send(e);
	}
});

router.delete('/users/me', auth, async (req, res) => {
	try {
		await req.user.remove();
		sendCancelationEmail(req.user.email, req.user.name);
		res.send(req.user);
	} catch (e) {
		res.status(500).send();
	}
});

const upload = multer({
	limits: {
		fileSize: 1000000
	},
	fileFilter(req, file, cb) {
		//make sure the file uplaoded is an image
		if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
			return cb(new Error('Plase upload a valid image file (jpg, jpeg or png).'));
		}

		//accept the upload image
		cb(undefined, true);
	}
});

/**
 * Upload image into the database in base64 format
 */
router.post(
	'/users/me/avatar',
	auth,
	upload.single('avatar'),
	async (req, res) => {
		const buffer = await sharp(req.file.buffer).resize({ width: 250, height: 250 }).png().toBuffer();
		req.user.avatar = buffer;
		await req.user.save();
		res.send();
	},
	(error, req, res, next) => {
		res.status(400).send({ error: error.message });
	}
);

router.delete('/users/me/avatar', auth, async (req, res) => {
	req.user.avatar = undefined;
	await req.user.save();
	res.send();
});

/**
 * Example of serving an image in the browser
 * http://localhost:3000/users/5f24c35cb314d6110000011b/avatar
 */
router.get('/users/:id/avatar', async (req, res) => {
	try {
		const user = await User.findById(req.params.id);

		if (!user || !user.avatar) {
			throw new Error("You don't have access to this user.");
		}

		res.set('Content-Type', 'image/jpg');
		res.send(user.avatar);
	} catch (e) {
		res.status(404).send(e);
	}
});

module.exports = router;

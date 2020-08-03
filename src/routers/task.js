const express = require('express');
const Task = require('../models/task');
const auth = require('../middleware/auth');
const router = new express.Router();

router.post('/tasks', auth, async (req, res) => {
	//const task = new Task(req.body);
	const task = new Task({
		...req.body,
		owner: req.user._id
	});

	try {
		await task.save();
		res.status(201).send(task);
	} catch (e) {
		res.status(400).send(e);
	}
});

/**
 * Type of sorting
 * complated tasks: GET /tasks?completed=false
 * pagination: limit and skip
 * 	GET /tasks?limit=10&skip=0 first set of 10
 * 	GET /tasks?limit=10&skip=10 second set of 10
 *		GET /tasks?limit=10&skip=20 third set of 10 ... 
 * Sort: GET /tasks?sortBy=createdAt:desc
 */
router.get('/tasks', auth, async (req, res) => {
	const match = {};
	const sort = {};

	if (req.query.completed) {
		match.completed = req.query.completed === 'true';
	}

	//sortBy=CreatedAt:desc or sortBy=CreatedAt:asc
	//asc = 1 and desc = -1
	if (req.query.sortBy) {
		const parts = req.query.sortBy.split(':');
		console.log('part0 =', parts[0]);
		console.log('part1 =', parts[1]);
		sort[parts[0]] = parts[1] === 'desc' ? -1 : 1;
	}

	try {
		//Both ways work find and populate
		//const tasks = await Task.find({ owner: req.user._id });

		await req.user
			.populate({
				path: 'tasks',
				match,
				options: {
					limit: parseInt(req.query.limit),
					skip: parseInt(req.query.skip),
					sort //can take sort: createdAt or completed
				}
			})
			.execPopulate();

		res.send(req.user.tasks);
	} catch (e) {
		res.status(500).send(e);
	}
});

router.get('/tasks/:id', auth, async (req, res) => {
	const _id = req.params.id;

	try {
		const task = await Task.findOne({ _id, owner: req.user._id });

		if (!task) {
			return res.status(404).send();
		}

		res.send(task);
	} catch (e) {
		res.status(500).send(e);
	}
});

router.patch('/tasks/:id', auth, async (req, res) => {
	//Handlin accpeted updates
	const upates = Object.keys(req.body);
	const allowedUpdates = [ 'description', 'completed' ];
	const isValidatOperation = upates.every((update) => allowedUpdates.includes(update));

	if (!isValidatOperation) {
		return res.status(400).send({ error: 'Invalid updates!' });
	}

	try {
		//const task = await Task.findById(req.params.id);
		const task = await Task.findOne({ _id: req.params.id, owner: req.user._id });

		if (!task) {
			return res.status(404).send();
		}

		upates.forEach((field) => (task[field] = req.body[field]));
		await task.save();
		res.send(task);
	} catch (e) {
		res.status(400).send(e);
	}
});

router.delete('/tasks/:id', auth, async (req, res) => {
	try {
		//const task = await Task.findByIdAndRemove(req.params.id);
		const task = await Task.findOneAndDelete({ _id: req.params.id, owner: req.user._id });

		if (!task) {
			return res.status(404).send();
		}

		res.send(task);
	} catch (e) {
		res.status(500).send();
	}
});

module.exports = router;

const express = require('express')
const Task = require('../models/task')
const auth = require('../middleware/auth')
const router = new express.Router()


/**
 * Create a new task by sending JSON data to the 
 * request
 */
router.post('/tasks', auth, async (req, res) => {
    const task = new Task({
        ...req.body,
        owner: req.user._id
    })

    try {
        await task.save()
        res.status(201).send(task)
        console.log('Successfuly creating new task', task)
    } catch (err) {
        res.status(400).send(err)
        console.log('Fail to update database', err)
    }
})

/**
 * Find all tasks in the database
 * 
 * GET /tasks?completed=true
 * If completed is send as param the 
 * request will fetch true if completed if 
 * or false if it is false. If nothing is sent 
 * the request will fecth all tasks.
 * 
 * GET /tasks?limit=10&skip=0
 * That will fetch the first 10 results
 * for each 10 values added it will fecths the 
 * next 10 results for each limit=10
 * 
 * GET /tasks?sortBy=createdAt:asc
 * Sorting results by sortBy field createdBy 
 * field in sc ascending order or desc 
 * descending order 
 */
router.get('/tasks', auth, async (req, res) => {
    const match = {}
    const sort = {}

    if(req.query.completed) {
        match.completed = req.query.completed === 'true'
    }

    if (req.query.sortBy) {
        const parts = req.query.sortBy.split(':')
        sort[parts[0]] = parts[1] === 'desc' ? -1 : 1
    }

    try {
        await req.user.populate({
            path: 'tasks',
            match,
            options: {
                limit: parseInt(req.query.limit),
                skip: parseInt(req.query.skip),
                sort
            }
        }).execPopulate()
        res.send(req.user.tasks)
    } catch (err) {
        res.status(500).send(err)
        console.log('Fail to read database', err)
    }
})

/**
 * Find one specific task by id
 */
router.get('/tasks/:id', auth, async (req, res) => {
    const _id = req.params.id

    try {
        const task = await Task.findOne({_id, owner: req.user._id})

        if (!task) {
            console.log('Fail to read user id ' + _id)
            return res.status(404).send()
        }

        console.log('Successfuly reading task ' + ((task.description)? '\"' + task.description + '\"': '!'))
        res.send(task)
    } catch (err) {
        res.status(500).send(err)
        console.log('Fail to read task id', err)
    }
})

/**
 * Update a task by id
 */
router.patch('/tasks/:id', auth, async (req, res) => {
    const updates = Object.keys(req.body)
    const allowedUpdates = ['description', 'completed']
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update))

    if (!isValidOperation) {
        return res.status(400).send({ error: 'Invalid updates!' })
    }

    try {
        const task = await Task.findOne({_id: req.params.id, owner: req.user._id})

        if (!task) {
            console.log('Fail to update user!')
            return res.status(404).send()
        } 
        
        updates.forEach((update) => task[update] = req.body[update])
        await task.save()
        res.send(task)

        console.log('Successfuly update task ' + ((task.description) ? '\"' + task.description + '\"': '!'))
    } catch (err) {
        res.status(400).send(err)
        console.log('Fail to updating user', err)
    }
})

/**
 * Delete one user by Id
 */
router.delete('/tasks/:id', auth, async(req, res) => {

    try {
        const task = await Task.findOneAndDelete({_id: req.params.id, owner: req.user._id})

        if (!task) {
            console.log('Task not found!')
            res.status(404).send()
        } 

        console.log('Successfuly deleting task ' + ((task.description) ? '\"' + task.description + '\"': '!'))
        res.send(task)
    } catch (err) {
        res.status(500).send(err)
        console.log('Task not found', err)
    }

})

module.exports = router
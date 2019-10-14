const express = require('express')
const multer = require('multer')
const sharp = require('sharp')
const User = require('../models/user')
const auth = require('../middleware/auth')
const { sendWelcomeEmail, sendCancelationEmail } = require('../emails/account')
const router = new express.Router()

/**
 * Create a new user by sending JSON data to the 
 * request
 */
router.post('/users', async (req, res) => {
    const user = new User(req.body)

    try {
        await user.save()
        sendWelcomeEmail(user.email, user.name)
        const token = await user.generateAuthToken()
        res.status(201).send( { user, token } )
        console.log('Successfuly creating new user', user)
    } catch (err) {
        res.status(400).send(err)
        console.log('Fail to update database', err)
    }
})

/**
 * Login user
 */
router.post('/users/login', async (req, res) => {
    try {
        
        const user = await User.findByCredentials(req.body.email, req.body.password)
        const token = await user.generateAuthToken()
        res.send( { user, token } )
    } catch (err) {
        res.status(400).send(err)
        console.log('Fail to update database', err)
    }
})

/**
 * Logout user with valida token
 */
router.post('/users/logout', auth, async (req, res) => {
    try {
        req.user.tokens = req.user.tokens.filter((token) => {
            return token.token !== req.token
        })
        await req.user.save()

        res.send()
    } catch (err) {
        res.status(500).send(err)
        console.log('Error logout user', err)
    }
})

/**
 * Logout all users
 */
router.post('/users/logoutAll', auth, async (req, res) => {
    try {
        req.user.tokens = []
        await req.user.save()
        res.send()
    } catch (err) {
        res.status(500).send(err)
        console.log('Error logout all available sessions', err)
    }
})

/**
 * Find all users in the database
 */
router.get('/users/me', auth, async (req, res) => {
    res.send(req.user)
})

/**
 * Update a user by id
 */
router.patch('/users/me', auth, async (req, res) => {
    const updates = Object.keys(req.body)
    const allowedUpdates = ['name', 'email', 'password', 'age']
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update))

    if (!isValidOperation) {
        return res.status(400).send({ error: 'Invalid updates!' })
    }

    try {
        updates.forEach((update) => req.user[update] = req.body[update])
        await req.user.save()
        res.send(req.user)
    } catch (err) {
        res.status(400).send(err)
        console.log('Fail to update user', err)
    }
})

/**
 * Delete one user by Id
 */
router.delete('/users/me', auth, async(req, res) => {

    try {
        sendCancelationEmail(req.user.email, req.user.name)
        await req.user.remove()
        res.send(req.user)
    } catch (err) {
        res.status(500).send(err)
        console.log('User not found', err)
    }

})

const upload = multer({
    limits: {
        fileSize: 1000000
    },
    fileFilter(req, file, cb) {
        if (!file.originalname.match(/\.(gif|jpg|jpeg|png)$/)) {
            return cb(new Error('Please upload an image of type jpg, jpeg or png.'))
        }

        cb(undefined, true)
    }
})

/**
 * Updlaod profile pictures
 */
router.post('/users/me/avatar', auth, upload.single('avatar'), async (req, res) => {
    const buffer = await sharp(req.file.buffer).resize({ width: 250, height: 250 }).png().toBuffer()
    req.user.avatar = buffer
    await req.user.save()
    res.send()
}, (error, req, res, next) => {
    res.status(400).send({ error: error.message })
})

/**
 * Updlaod profile pictures
 */
router.delete('/users/me/avatar', auth, async (req, res) => {
    req.user.avatar = undefined
    await req.user.save()
    res.send()
})

/**
 * Updlaod profile pictures
 */
router.get('/users/:id/avatar', async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
        const avatar = (user) ? user.avatar : null

        if(!avatar) {
            throw new Error()
        }

        res.set('Content-Type', 'image/png')
        res.send(avatar)

    } catch (err) {
        console.log('Error fetching avatar image!')
        res.status(400).send()
    }
})

module.exports = router
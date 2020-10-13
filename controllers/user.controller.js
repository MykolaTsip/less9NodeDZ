const uuid = require('uuid').v4()
const path = require('path')
const fs = require('fs-extra').promises

const {userService, oauthService, emailService} = require('../services')
const {heshPass, comparePass, tokenazer} = require('../helper')
const {constants, emailAction} = require('../configs')


module.exports = {
    AllUser: async (req, res) => {
        const users = await userService.allUser()

        res.json(users)
    },

    CreateUser: async (req, res) => {
        try {
            const {body: user, avatar} = req

            user.password = await heshPass(req.body.password)

            const newUser = await userService.createUser(user)

            if (avatar) {
                const photoDir = `/users/${newUser.id}`
                const fileExtension = avatar.name.split('.').pop()
                const photoName = `${uuid}.${fileExtension}`

                console.log(avatar)
                await fs.mkdir(path.join(process.cwd(), 'public', photoDir), {recursive: true})
                await avatar.mv(path.join(process.cwd(), 'public', photoDir, photoName))
                await userService.updateById({id: newUser.id}, {avatar: `${photoDir}/${photoName}`})

            }

            await emailService.sendMailer(user.email, emailAction.FORGOT_PASS, {userName: user.name})

            res.json(newUser)
        } catch (e) {
            console.log(e)
        }
    },

    Login: async (req, res, next) => {
        try {
            const {password} = req.body
            const user = req.user

            await comparePass(password, user.password)

            const tokens = tokenazer()

            await oauthService.createToken({
                ...tokens,
                user_id: user.id
            })

            res.json(tokens)
        } catch (e) {
            next(e)
        }
    },

    DeleteUser: async (req, res) => {
        try {
            const user = req.user

            await oauthService.deleteByParams({user_id: user.id})
            console.log(user.id)
            await userService.deleteUser({id: user.id})

            await fs.rmdir(path.join(process.cwd(), 'public', 'users', `${user.id}`), {recursive: true})

            res.json(`user ${user.name} id delete!`)
        } catch (e) {
            console.log(e)
        }
    },

    UpdateUserPhoto: async (req, res) => {
try {
    const {user, avatar} = req

    if (avatar) {


        const photoDir = `/users/${user.id}`
        const fileExtension = avatar.name.split('.').pop()
        const photoName = `${uuid}.${fileExtension}`

        await fs.rmdir(path.join(process.cwd(), 'public', photoDir), {recursive: true})

        await fs.mkdir(path.join(process.cwd(), 'public', photoDir), {recursive: true})
        await avatar.mv(path.join(process.cwd(), 'public', photoDir, photoName))
        await userService.updateById({id: user.id}, {avatar: `${photoDir}/${photoName}`})

    }

    res.json('update photo is complete!')
}
catch (e) {
    console.log(e)
}
    },

    RefreshToken: async (req, res, next) => {
        try {
            const user = req.user
            const oldToken = req.get(constants.AUTHORIZATION)
            const newToken = tokenazer()

            await oauthService.deleteByParams({refresh_token: oldToken})
            console.log(user)
            await oauthService.createToken({
                ...newToken,
                user_id: user.id
            })

            res.json(newToken)
        } catch (e) {
            next(e)
        }
    }
}

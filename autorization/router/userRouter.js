const Router = require('express');
const router = new Router();
const userController = require('../controller/userController')


router.post('/registration', userController.registration)
router.post('/login', userController.login)
router.get('/check', userController.check)
router.get('/userRole', userController.role)
router.post('/updateProfile', userController.updateProfile)
module.exports = router;
const model = require('../model/model')
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const sql = require('mssql')
const ApiError = require('../error/error')
// const conn = require('../db/connect.js')

const USER_ROLE = {
        user:3,
        admin:1,
        operator:2
    }

    const pool1 = new sql.ConnectionPool({
        user:"sa",
        password:"Shavkodima7586151",
        server:"localhost",
        database:"av",
        options: {
            encrypt: false, // for azure
            trustServerCertificate: false // change to true for local dev / self-signed certs
          }
    })

    const pool1Connect = pool1.connect()



function User(id, lastName, surName, firstName, login, role = "user") {
    this.id = id
    this.login = login;
    this.lastName = lastName;
    this.surName = surName;
    this.firstName = firstName;
    this.role = role;
    return;
}

function generateToken(id, lastName, surName, firstName, login, role) {
    return jwt.sign({
        id, lastName, surName, firstName, login, role
    }, 'SECRET_KEY')
}

function UserController() {

    this.findUserDb = async (login) => {
        await pool1Connect; 
        const request = pool1.request();
        const {recordset} = await request.query(`SELECT [av].[dbo].[user].id, last_name, name, first_name, email, password, user_role FROM [av].[dbo].[user] LEFT JOIN role ON [av].[dbo].[user].role = role.id WHERE email ='${login}'`)
        return recordset[0]

    }

    this.login = async (req, res, next) => {
        const [{ userLogin }, { userPassword }] = req.body;


            let findUser = await this.findUserDb(userLogin)

            if (findUser) {
                const user = findUser;
                const decodePassword = await bcrypt.compare(userPassword, user.password);

               if(decodePassword){
                    let token = generateToken(user.id, user.last_name, user.name, user.first_name, user.login, user.user_role)
                    res.json({ token })
               }else{
                   let msg = ApiError.badRequest("Логин или пароль неверный")
                   res.status(msg.status).json(msg.message)
               }

            } else {
                let msg = ApiError.badRequest("Такой пользователь не существует");
                res.status(msg.status).json(msg.message)
            }
        } 



    this.registration = async (req, res, next) => {
        await pool1Connect; 
        const request = pool1.request();
        let [{userLastName, userSurName,  userFirstName, userLogin, userPassword, role}] = req.body;
        if(role == ""){
            role = USER_ROLE.user
        }


        try {
            const saltRounds = 7;
            const salt = bcrypt.genSaltSync(saltRounds);
            const hashPassword = await bcrypt.hash(userPassword, salt)


            let findUser = await this.findUserDb(userLogin)

            if (!findUser) {
                const {recordset} = await request.query(`INSERT INTO [av].[dbo].[user] (last_name, name, first_name , email, password, role) VALUES ('${userLastName}', '${userSurName}', '${userFirstName}', '${userLogin}', '${hashPassword}', ${role}); SELECT SCOPE_IDENTITY() AS id`);
                
               const insertId = recordset[0].id

                const user = new User(insertId, userLastName, userSurName, userFirstName, userLogin, 'user');
                let token = generateToken(user.id, user.lastName, user.surName, user.firstName, user.login, user.role)
                res.json({ token })

            } else {
                let msg = ApiError.badRequest("Такой пользователь уже существует")
                res.status(msg.status).json(msg.message)
            }
        } catch (error) {
            console.log(error);
            res.json(error.message)
        }
    }

    this.updateProfile = async (req, res, next) => {
        let [{userLastName, userSurName , userFirstName, userLogin, userPassword, role}] = req.body;
        console.log(req.body);
        await pool1Connect; 
        const request = pool1.request();
        try {
            let findUser = await this.findUserDb(userLogin)

            if(!userPassword){
                const {recordset} = await request.query(`UPDATE [av].[dbo].[user] SET last_name='${userLastName}', name='${userSurName}', first_name = '${userFirstName}', email='${userLogin}', role=${role} WHERE [av].[dbo].[user].id = ${findUser.id}`)
            }else{
                const saltRounds = 7;
                const salt = bcrypt.genSaltSync(saltRounds);
                const hashPassword = await bcrypt.hash(userPassword, salt)
                const {recordset} = await request.query(`UPDATE [av].[dbo].[user] SET last_name='${userLastName}', name='${userSurName}', first_name = '${userFirstName}', email='${userLogin}', password='${hashPassword}', role=${role} WHERE [av].[dbo].[user].id = ${findUser.id}`)
                // const user = new User(row.insertId, userLastName, userSurName, userFirstName, userLogin, 'user');
                // let token = generateToken(user.id, user.lastName, user.surName, user.firstName, user.login, user.role)
            }
           
            res.status(200).json({message:"Данные успешно обновлены"})

            
        } catch (error) {
            console.log(error);
            res.json(error.message)
        }
    }

    this.check = (req, res) => {
        const token = req.headers.authorization.split(" ")[1];
        if(!token){
            res.sendStatus(500)
        }else{
            jwt.verify(token, 'SECRET_KEY', ((error, decode) => {
                const { id, lastName, surName, firstName, login, role } = decode;
                const token = generateToken(id, lastName, surName, firstName, login, role);
                res.json({ token })
            }))
        }
    },

    this.role =  async(req, res)=>{
        await pool1Connect; 
        try {
            const request = pool1.request();
            const {recordset} = await request.query('SELECT * FROM role')
            res.json(recordset)
        } catch (error) {
            console.log(error);
        }
    }
}

module.exports = new UserController();
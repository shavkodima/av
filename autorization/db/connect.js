const sql = require('mssql');

const conn = sql.createPool({
    user:"root",
    password:"root",
    database:'av',
    host:'localhost'
})

export default conn;




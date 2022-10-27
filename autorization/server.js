const express = require('express');
const app = express();
const PORT = 3008;
const router = require('./router/router')
const cors = require('cors')
app.use(express.json())
app.use(cors())
app.use('/', router)

function server(){
    app.listen(PORT, (err)=>{
        if(err){
            console.log(err);
        }else{
            console.log("server started " + PORT);
        }
    })
}

server()
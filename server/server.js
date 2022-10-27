const express = require('express');
const app = express()
const port = 3005
const cors = require('cors')
const sql = require('mssql');
const ApiError = require('./error/ApiError')
app.use(express.static("public"))
app.use(express.json())
app.use(cors())




const pool1 = new sql.ConnectionPool({
    user: "sa",
    password: "Shavkodima7586151",
    server: "localhost",
    database: "av",
    options: {
        encrypt: false, // for azure
        trustServerCertificate: true // change to true for local dev / self-signed certs
    }
})

const pool1Connect = pool1.connect()

app.get('/', (req, res) => res.sendFile('index.html'))


app.get('/listPoint', async (req, res) => {
    await pool1Connect;
    try {
        const request = pool1.request();
        let { recordset } = await request.query(`SELECT id, name_point FROM op `)
        res.json(recordset)
    } catch (error) {
        console.log(error);
        res.status(500).json(error)
    }
})

app.get('/listPointOne/:namePoint', async(req, res) => {
    await pool1Connect;
    const request = pool1.request();
    const {namePoint} = req.params;
    try {
        let {recordset} = await request.query(`SELECT id, name_point FROM op WHERE name_point LIKE '${namePoint}%'`)
        res.json(recordset)
    } catch (error) {
        console.log(error);
    }

})

app.post('/updatePoint/:id/:namePoint', async(req, res) => {
    const {id, namePoint} = req.params;
    console.log(id);
    await pool1Connect;
    const request = pool1.request();
    try {
        let {recordset} = await request.query(`SELECT id, name_point FROM op WHERE name_point = '${namePoint}'`)
        if(recordset.length > 0){
            res.sendStatus(500)

        }else{
            let {recordset} = await request.query(`UPDATE op SET name_point = '${namePoint}' WHERE id = ${id}`)
            res.sendStatus(200)
        } 
    } catch (error) {
        console.log(error);
    }
})

app.post('/removePoint/:id', async(req, res) => {
    const {id} = req.params;
    await pool1Connect;
    const request = pool1.request();
    try {
    await request.query(`DELETE FROM op WHERE id = ${id} `)
    res.sendStatus(200)
    } catch (error) {
        res.status(500).json({message:error})
    }
})


app.post('/addPoint/:namePoint', async(req, res) => {
    const {namePoint} = req.params;
    await pool1Connect;
    const request = pool1.request();
    try {
            await request.query(`INSERT INTO op(name_point) VALUES ('${namePoint}')`)
            res.sendStatus(200)

    } catch (error) {
        console.log(error);
    }
})


app.post('/payTicket', async (req, res, next) => {
    const[ {counterTicket, passagerCounter}] = req.body;
    await pool1Connect;
    const request = pool1.request();

    let [{reis}] = passagerCounter;

    let dataTicket = passagerCounter.map((elem)=>{
        delete elem.id
        return {...elem}
    })

    // console.log(dataTicket);

    const {recordset} = await request.query(`SELECT pay_ticket FROM order_ticket WHERE id_reis = ${reis}`)

    const pay_ticket = recordset[0].pay_ticket;
         const result = await request.query(`SELECT counter FROM reis JOIN vehicle ON reis.id_vehicle = vehicle.id WHERE reis.id = ${reis}`);
        
        const counter = result.recordset[0].counter;
        let freeTicket  = (counter - pay_ticket);
        if(freeTicket < counterTicket ){
            let msg = ApiError.badRequest("Не хватает мест")
            res.status(msg.status).json(msg.message)
        } else{
            try {
                await request.query(`UPDATE order_ticket SET pay_ticket = pay_ticket + ${counterTicket} WHERE id_reis = ${Number(reis)}`)

            for(let i=0; i< dataTicket.length; i++){
                await request.query(`INSERT INTO ticket (id_user, id_reis, lastName, surName, firstName, id_fromPoint, id_toPoint, price, date_pay)
                 VALUES (${dataTicket[i].userId}, ${dataTicket[i].reis}, '${dataTicket[i].lastName}', '${dataTicket[i].surName}', '${dataTicket[i].firstName}', ${dataTicket[i].pointFrom}, ${dataTicket[i].pointTo}, ${dataTicket[i].price}, '${dataTicket[i].datePay}')`)
            }    

                res.status(200).json({msg:"спасибо за покупку"}) 
            } catch (error) {
            console.log(error);
            res.sendStatus(500) 
            }

        }

})



function newRaspis(objectFrom, objectTo) {
    let that = this;
    this.id = objectFrom.id_marshrut;
    this.id_reis = objectFrom.id;
    this.marsh = objectFrom.name_marsh
    this.from = { title: objectFrom.name_point, id_op: objectFrom.id_op }
    this.to = { title: objectTo.name_point, id_op: objectTo.id_op }
    this.depature = objectFrom.time;
    this.arrival = objectTo.time;
    this.vehicle = objectFrom.marka
    this.vehicleCounter = objectFrom.counter

    this.gosNumber = objectFrom.gosNumber;
    this.travelTime = (function () {
        let depatures = that.depature.split(":");
        let arrivals = that.arrival.split(":");

        //Отправление
        //Переводим часы в секунды, в одном часе 3600 секунд
        let fromCh = 3600 * Number(depatures[0]);
        //Переводим минуты в секнды, в одной митуте 60 секунд
        let fromMin = 60 * Number(depatures[1]);
        //Слаживаем секунды
        let fromSecond = fromCh + fromMin;

        //Прибытие
        //Переводим часы в секунды, в одном часе 3600 секунд
        let toCh = 3600 * Number(arrivals[0]);
        //Переводим минуты в секнды, в одной митуте 60 секунд
        let toMin = 60 * Number(arrivals[1]);
        //Слаживаем секунды
        let toSecond = toCh + toMin;

        //Отнимаем секунды = прибытие - отправление 
        let fullSecond = toSecond - fromSecond;
        //Переводим в минуты
        let min = fullSecond / 60;
        //Получаем остаток в минутах
        let remains = (min % 60);
        //От свех минут отнимаем остаток и делим на 1 час
        let ch = (min - remains) / 60;

        let travel = "";

        if (remains > 0) {
            travel = ch + ":" + remains
        } else {
            travel = ch + ":" + 00
        }
        return travel;
    })();
    this.ticketPay = (function () {
        const res = that.vehicleCounter - objectFrom.pay_ticket;
        return res;

    })();
    this.km = objectTo.counter_km - objectFrom.counter_km;

    this.priceSum = (function(){
        const sum = Number(that.km) * (objectFrom.tariff);
        return Math.round(sum);
    })();

    return this;
}

function AddReisModel(idMarsh, {point, pointTime, num, counterKm}){
    this.id = idMarsh;
    this.point = Number(point);
    this.pointTime = pointTime;
    this.num = num;
    this.counterKm = Number(counterKm);
    return this;
}

app.post('/add', async(req, res) => {
    
    const { from, to, time, name, vehicle, date, middlePoint , tariff } = req.body;
    await pool1Connect;
    const request = pool1.request();

    middlePoint.unshift(from);
    middlePoint.push(to)
    const arr = [middlePoint, vehicle, date]
    try {
        const result = await request.query(`INSERT INTO marshrut(name_marsh) VALUES ('${name}'); SELECT SCOPE_IDENTITY() AS id;`)

        let idMarsh = result.recordset[0].id
        // console.log(idMarsh);


        const {recordset} = await request.query(`INSERT INTO [av].[dbo].[reis] (id_marshrut, date, id_vehicle) VALUES (${idMarsh}, '${date}', 1); SELECT SCOPE_IDENTITY() AS id;`)
      
        let idReis = recordset[0].id

        const resTariff = await request.query(`INSERT INTO [av].[dbo].[tariff] (id_reis, tariff) VALUES (${idReis}, ${tariff}); SELECT SCOPE_IDENTITY() AS id;`)
        let idTariff = resTariff.recordset[0].id

        let array = new Array;
        console.log(middlePoint[0].counterKm);
                        for (let i = 0; i < middlePoint.length; i++) {
                            // await request.query(`INSERT INTO reis_op(id_marshrut, id_op, time, num_op_reis, counter_km) VALUES (${idMarsh}, ${Number(middlePoint[i].point)}, '${middlePoint[i].pointTime}', ${middlePoint[i].num}, '${middlePoint[i].counterKm}'` )
                            const newPoint = new AddReisModel(idMarsh, middlePoint[i])
                            await request.query(`INSERT INTO [av].[dbo].[reis_op] (id_marshrut, id_op, time, num_op_reis, counter_km) VALUES (${newPoint.id}, ${newPoint.point}, '${newPoint.pointTime}', ${newPoint.num}, ${newPoint.counterKm})` )

                        }

                        // await request.query(`INSERT INTO reis_op(id_marshrut, id_op, time, num_op_reis, counter_km) VALUES ?`, array )
                            
                        await request.query(`INSERT INTO [av].[dbo].[order_ticket] (pay_ticket, id_reis) VALUES (0, ${idReis})`)

                        res.status(200).json({message:"Маршрут успешно добавлен"})
    } catch (error) {
        console.log(error);
        const msg = ApiError.badRequest("Произошла ошибка" + error)
        res.status(msg.status).json(msg.message)
    }

})

app.post('/getRouteDesc', async (req, res) => {
    let { id } = req.body;
    await pool1Connect;

    try {
        const request = pool1.request(); 
        let {recordset} = await request.query(`SELECT * FROM marshrut 
        JOIN reis_op ON reis_op.id_marshrut = marshrut.id 
        JOIN op ON op.id = reis_op.id_op 
        WHERE marshrut.id = ${id} 
        ORDER BY reis_op.num_op_reis`)
        res.json(recordset)
    } catch (error) {
        res.status(404).json({ message: "Ошибка получения данных" })

    }
})

const {exec, spawn} = require('child_process');



app.get('/reservCopy', (req, res)=>{

    const bat = exec('reserv.bat', [], (err)=>{
        if(err){
            res.status(500).json({message:err})
        }else{
            res.status(200).json({message:"Резервная копия успешно создана"})
        }
    })

    // bat.stdout.on('data', (data)=>{
    //     console.log("error" + data);
    // })

    // bat.stderr.on('data', (data)=>{
    //     console.log("error" + data);
    // })

    // bat.on('exit', (code)=>{
    //     console.log("Копия успешно сделана");
    // })
})

const succes = ()=>{
    console.log("yes");
}


app.post('/getRaspis', async (req, res) => {
    await pool1Connect;
    try {
        const request = pool1.request();
        let { fromRoutes, toRoutes, dateRoutes } = req.body
        let { recordset } = await request.query(`
        SELECT reis_op.id_marshrut, name_marsh, name_point, id_op,time, num_op_reis, reis.id, date, marka_vehicle as marka, counter, gosNumber, order_ticket.pay_ticket, counter_km, tariff FROM reis_op
        LEFT JOIN marshrut ON reis_op.id_marshrut = marshrut.id
        LEFT JOIN op ON op.id = reis_op.id_op
        LEFT JOIN reis ON marshrut.id= reis.id_marshrut
        LEFT JOIN vehicle ON vehicle.id = reis.id_vehicle
        LEFT JOIN order_ticket ON order_ticket.id_reis = reis.id
        LEFT JOIN marka_vehicle ON marka_vehicle.id = vehicle.marka
        RIGHT JOIN tariff ON reis.id = tariff.id_reis 
        WHERE 
        reis_op.id_op IN(${fromRoutes},${toRoutes}) 
        AND reis_op.id_marshrut IN (SELECT id_marshrut FROM reis_op WHERE id_op = ${toRoutes} 
        AND num_op_reis > (SELECT num_op_reis FROM reis_op WHERE reis_op.id_op = ${fromRoutes} 
        AND id_marshrut = marshrut.id ) )
        AND reis.date = '${dateRoutes}'
        Order BY reis_op.id_marshrut 
       `)

        if (recordset.length == 0) {
            res.status(404).json({ message: "Рейсы не найдены" })
        } else {
            let arr = [];
            for (let i = 0; i < recordset.length; i++) {
                for (let j = i + 1; j < recordset.length; j++) {
                    let min = recordset[0].num_op_reis
                    if (recordset[i].id_marshrut == recordset[j].id_marshrut) {
                        let elem;
                        if (recordset[i].num_op_reis <= recordset[j].num_op_reis) {
                            elem = new newRaspis(recordset[i], recordset[j])
                        } else {
                            elem = new newRaspis(recordset[j], recordset[i])
                        }
                        arr.push(elem)
                    }
                }
            }
            res.json(arr)
        }
    } catch (error) {
        res.sendStatus(404)
    }

})


app.get('/allTicketReis/:idReis/:idUser', async (req, res)=>{
    const {idReis, idUser} = req.params;
    await pool1Connect;
    const request = pool1.request();
    try {

        const {recordset} = await request.query(`SELECT ticket.id, lastName, surName, firstName, op1.name_point AS pointFrom, op2.name_point AS pointTo, price FROM ticket JOIN reis ON reis.id = ticket.id_reis JOIN marshrut ON marshrut.id = reis.id_marshrut
        JOIN op AS op1 ON ticket.id_fromPoint = op1.id JOIN op AS op2 ON ticket.id_toPoint = op2.id WHERE id_user = ${idUser} AND id_reis =${idReis}`)
        res.json(recordset)

    } catch (error) {
        let msg = ApiError.badRequest("Нет купленных билетов")
        return res.status(msg.status).json(msg.message)
    }

})

app.get('/myTicket/:id', async (req, res, next)=>{
    const {id} =  req.params;
    await pool1Connect;
    const request = pool1.request();
    try {
        const {recordset} = await request.query(`SELECT DISTINCT id_reis, name_marsh, date_pay, date FROM ticket JOIN reis ON reis.id = ticket.id_reis JOIN marshrut ON marshrut.id = reis.id_marshrut WHERE id_user = ${id}`)


    if(recordset.length == 0){
        let msg = ApiError.badRequest("Нет купленных билетов")
        return res.status(404).json(msg.message)
    }
    return res.status(200).json(recordset) 

    } catch (error) {
        console.log(error);
    }
} )

app.get('/getSearchProfile/:user', async (req, res)=>{
    const {user} = req.params;
    await pool1Connect;
    const request = pool1.request();
     const {recordset} = await request.query(`SELECT [av].[dbo].[user].id, last_name, name, first_name, email, user_role FROM [av].[dbo].[user] JOIN role ON role.id = [av].[dbo].[user].role WHERE last_Name LIKE '${user}%'`)

     if(recordset.length == 0){
        const msg = ApiError.badRequest("Такого пользователя не существует")
        res.status(msg.status).json(msg.message)
    }else{
        res.json(recordset)
    }
})

app.get('/getOneProfile/:id', async (req, res)=>{
    const {id} = req.params;
    await pool1Connect;
    const request = pool1.request();
     const {recordset} = await request.query(`SELECT [av].[dbo].[user].id, last_name, name, first_name, email, user_role FROM [av].[dbo].[user] JOIN role ON role.id = [av].[dbo].[user].role WHERE [av].[dbo].[user].id = ${id}`)

        console.log(recordset);
     if(recordset.length == 0){
        const msg = ApiError.badRequest("Такого пользователя не существует")
        res.status(msg.status).json(msg.message)
    }else{
        res.json(recordset)
    }
})

app.post('/addVehicle', async(req, res)=>{
    const {marka, counterPassager, gosNumber} = req.body;
    await pool1Connect;
    const request = pool1.request();
    const {recordset} = await request.query(`SELECT gosNumber FROM vehicle WHERE gosNumber LIKE '${gosNumber}%'`);
    if(recordset.length != 0){
        const msg = ApiError.badRequest("Такое транспортное средство уже есть в списке")
        res.status(msg.status).json(msg.message)
    }else{
    await request.query(`INSERT INTO vehicle (marka, counter, gosNumber) VALUES (${marka}, ${counterPassager}, ${gosNumber})`)
    res.sendStatus(200)
    }
})

app.get('/getVehicle', async (req, res)=>{
    await pool1Connect;
    const request = pool1.request();
     const {recordset} = await request.query(`SELECT [av].[dbo].[vehicle].id, gosNumber, marka_vehicle, counter FROM vehicle RIGHT JOIN marka_vehicle ON vehicle.marka = marka_vehicle.id`)

     if(recordset.length == 0){
        const msg = ApiError.badRequest("Список ТС пуст")
        res.status(msg.status).json(msg.message)
    }else{
        res.json(recordset)
    }
})

app.get('/getVehicle/:number', async (req, res)=>{
    const {number} = req.params;
    await pool1Connect;
    const request = pool1.request();
    const {recordset} = await request.query(`SELECT * FROM vehicle LEFT JOIN marka_vehicle ON vehicle.marka = marka_vehicle.id WHERE gosNumber LIKE '${number}%'`)

     if(recordset.length == 0){
        const msg = ApiError.badRequest("Ничего не найдено")
        res.status(msg.status).json(msg.message)
    }else{
        res.json(recordset)
    }
})

app.get('/getVehicleModel', async (req, res)=>{
    await pool1Connect;
    const request = pool1.request();
    const {recordset} = await request.query(`SELECT * FROM marka_vehicle`)

     if(recordset.length == 0){
        const msg = ApiError.badRequest("Ничего не найдено")
        res.status(msg.status).json(msg.message)
    }else{
        res.json(recordset)
    }
})

app.post('/updateVehicle', async(req, res) => {
    const { id, gosNumber, marka_vehicle, counter} = req.body;
    await pool1Connect;
    const request = pool1.request();
    try {
            let {recordset} = await request.query(`UPDATE vehicle SET gosNumber='${gosNumber}', counter = '${counter}' WHERE id = ${id}`)
            res.sendStatus(200)
    } catch (error) {
        console.log(error);
    }
})


app.post('/forwardTicket', async (req, res)=>{
    const {idT, idR, counter} = req.body
    await pool1Connect;
    const request = pool1.request();
    const {recordset} = await request.query(`SELECT * FROM ticket WHERE ticket.id IN (${idT})`)
    if(recordset.length == 0){
        const msg = ApiError.badRequest("Такого билета уже не существует")
        res.status(msg.status).json(msg.message)
    }
    await request.query(`DELETE FROM ticket WHERE ticket.id IN (${idT})`)
    await request.query(`UPDATE order_ticket SET pay_ticket = pay_ticket - ${counter} WHERE id_reis = ${idR}`)
    res.json("Успешно удалено")
})

app.listen(port, () => console.log(`Example app listening on port port! ${port}`))
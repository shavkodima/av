const form = document.querySelector('.form-search');
let from = document.querySelectorAll('.search-input')[0];
let to = document.querySelectorAll('.search-input')[1];
let date = document.querySelectorAll('.search-input')[2];
let elemsReis;

const formGetData = async (e) => {
    let target = e.target;

    if (target.type == "submit") {
        e.preventDefault()
        let fromVal = from.value.split(":")[0];
        let toVal = to.value.split(":")[0];
        let reis = [fromVal, toVal, date.value]

        if (from[0] == to[0] && to[0] == from[0]) {
            alert()
        } else {
            let result = await fetch("/getRaspis", {
                method: "POST",
                body: JSON.stringify(reis),
                headers: {
                    "Content-type": "application/json"
                },
                contentType: "JSON"
            })

            let res = await result.json()
            console.log(res);
            showDisplay(res)
        }
    }
}

const showDisplay = (data) => {
    const searchResultDiv = document.querySelector('.search-result');
    let div = "";

    data.forEach(elem => {
        div += `
        <div class="search-list__p">
        <div>${elem.marsh} </div>
        <div>${elem.from} </div>
        <div>${elem.to} </div>
        <div>Отправление ${elem.depature}</div> 
        <div>Прибытие ${elem.arrival}</div> 
        <div>Время в пути${elem.travelTime}</div>
        <div><button class="button-info" data-id="${elem.id}" value="Инфо">Инфо</button></div>
        </div>
        `;
    })

    searchResultDiv.innerHTML = div;
    elemsReis = document.querySelectorAll('.search-list__p');
    console.log(elemsReis);
    
    elemsReis.forEach(elem=>{
        elem.addEventListener('click', function(e){
            let target =e.target;
            if(target.className == "button-info"){
                console.log(target.dataset.id);

            }
        })
    })
}

form.addEventListener('click', formGetData)


const getPoint = async () => {
    let res = await fetch('/listPoint', {
        method: "GET"
    })

    let point = await res.json();
    let s = document.querySelectorAll('.search-input');
    console.log(point);
    let opt = "";
    point.forEach(elem => {
        opt += `<option value="${elem.id + ":" + elem.name_point}" data-set="${elem.name_point}">${elem.name_point}</option>`
    })

    s[0].innerHTML = opt;
    s[1].innerHTML = opt;
    getDate()
}

getPoint()



const getDate = () => {
    let dates = new Date();
    let year = dates.getFullYear();
    let month = dates.getMonth() + 1;
    let day = dates.getDate();
    let fullDate;

    if (month < 10) {
        month = "0" + month
    }

    if (day < 10) {

        day = "0" + day;
    }

    fullDate = year + "-" + month + "-" + day;
    date.value = fullDate
}



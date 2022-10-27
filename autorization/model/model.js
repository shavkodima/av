
class Model {
    findUser(users){
        console.log();
        const user = "shavkodima10@gmail.com"
        if(users == user){
            return false;
        }else{
            return true;
        }
    }
}

module.exports = new Model();
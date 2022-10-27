class ApiError extends Error{
    constructor(status, message){
        super()
        this.status = status;
        this.message = message;
    }

    badRequest(){
        return new MiddlewareError(404, this.message)
    }
}

module.exports = ApiError;
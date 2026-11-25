/*
 * Copyright (C) 2024 - Essam Zaky, All rights reserved.
 */
let UserError = function(message: string) {
    this.isUserError = true;
    this.message = message;
 }
 UserError.prototype = new Error();
 UserError.prototype.constructor = UserError;
 
 export default UserError;
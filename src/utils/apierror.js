class Apierror extends Error {
  constructor(
    statuscode,
    errors = [],
    stack = "",
    message = "something went wrong"
  ) {
    super(message);
    this.message = message;
    this.success = false;
    ((this.statuscode = statuscode), (this.data = null));
    this.errors = errors;
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
export { Apierror };

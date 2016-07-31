/**
 * A base exception class that all exceptions within the js_model package will extend.
 */
export default class JsModelException{
    /**
     * Constructor
     *
     * @param {String} message
     */
    constructor(message) {

        /**
         * @type {String}
         */
        this._message = message;
    }

    /**
     * Gets a string representation of an object.
     *
     * @return {String}
     */
    toString() {
        return this._message;
    }
}

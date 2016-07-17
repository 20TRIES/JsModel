/**
 * Data transfer object (DTO) for a http request.
 */
export default class HttpRequest {

    /**
     * Constructor.
     */
    constructor() {
        this._headers = [];
        this._data_type = 'json';
        this._method = 'GET';
        this._url = '';
        this._success = () => {

        };
        this._error = () => {

        };
    }

    /**
     * Gets the headers for a request.
     *
     * @returns {Array}
     */
    getHeaders() {
        return this._headers;
    }

    /**
     * Sets a header which should be used for all requests through a driver.
     *
     * @param {String} name
     * @param {*} value
     */
    setHeader(name, value) {
        this._headers[this._headers.length] = [name, value];
    };

    /**
     * Gets the data type for a request.
     *
     * @returns {String}
     */
    getDataType() {
        return this._data_type;
    }

    /**
     * Sets the data type for a request.
     *
     * @param {string} data_type
     */
    setDataType(data_type) {
        this._data_type = data_type;
    };

    /**
     * Gets the method set for a request.
     *
     * @returns {string}
     */
    getMethod() {
        return this._method;
    }

    /**
     * Sets the method for a request.
     *
     * @param {String} method
     */
    setMethod(method) {
        this._method = method;
    };

    /**
     * Gets the url set for a request.
     *
     * @returns {string}
     */
    getUrl() {
        return this._url;
    }

    /**
     * Sets the url for a request.
     *
     * @param {String} url
     */
    setUrl(url) {
        this._url = url;
    };

    /**
     * Sets the callback that should be called if a request is successful.
     *
     * @param {Function} callback
     */
    onSuccess(callback) {
        this._success = callback;
    };

    /**
     * Sets the callback that should be called if a request is unsuccessful.
     *
     * @param {Function} callback
     */
    onFailure(callback) {
        this._error = callback;
    };

    /**
     * Executes the callback set to be called after a request is successful.
     *
     * @param {...*} args
     * @returns {*}
     */
    success(...args) {
        return this._success.apply(this._success, args);
    }

    /**
     * Executes the callback set to be called after a request is unsuccessful.
     *
     * @param {...*} args
     * @returns {*}
     */
    error(...args) {
        return this._error.apply(this._error(), args);
    }
}
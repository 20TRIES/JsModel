import HttpDriver from "./HttpDriver";
import HttpRequest from "../HttpRequest";
import jQuery from 'jquery';

/**
 * A Http Driver interface; should be extended by any Http Drivers.
 */
export default class JqueryHttpDriver extends HttpDriver {

    /**
     * Executes a http request using the jQuery package.
     *
     * @param {HttpRequest} request
     */
    static execute(request) {
        super.execute(request);
        jQuery.ajax({
            headers: this._parseHeaders(request.getHeaders()),
            dataType: request.getDataType(),
            data: request.getData(),
            method: request.getMethod(),
            url: request.getUrl(),
            statusCode: {
                500: (response) => request.error(response, 500),
                422: (response) => request.error(response, 422),
                403: (response) => request.error(response, 403),
                200: (response) => request.success(response, 200),
            }
        });
    }

    /**
     * Parses the headers from a HttpRequest object so that they match the format required by jQuery.
     *
     * @param {Array} headers
     * @returns {{}}
     * @private
     */
    static _parseHeaders(headers) {
        let parsed_headers = {};
        for(let i=0; i < headers.length; ++i) {
            parsed_headers[headers[i][0]] = headers[i][1];
        }
        return parsed_headers;
    }
}
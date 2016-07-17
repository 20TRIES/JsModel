import HttpRequest from "../HttpRequest";
import InvalidParameterException from "../Exceptions/InvalidParameterException";

/**
 * A Http Driver interface; should be extended by any Http Drivers.
 */
export default class HttpDriver {

    /**
     * Executes a http request.
     *
     * @param {HttpRequest} request
     */
    static execute(request) {
        if(!(request instanceof HttpRequest)) {
            throw new InvalidParameterException('Expected parameter 1 to be of type HttpRequest');
        }
        // Execute the request
    }
}
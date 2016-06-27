/**
 * A builder class for building query strings for a Filterable API.
 */
export default class Builder {
    /**
     * Constructor.
     *
     * @param model
     */
    constructor(model) {
        this.model = model;
        this.conditions = {
            "wheres": [],
        };
    }

    /**
     * Adds a where condition to a query.
     *
     * @param attribute
     * @param value
     * @returns {Builder}
     */
    where(attribute, value) {
        this.conditions.wheres.push({
            "attribute": attribute,
            "value": value
        });
        return this;
    }

    /**
     * Executes a query.
     *
     * @param {callable} success
     * @param {callable} error
     */
    get(success, error) {
        var instance = this;

        $.ajax({
            headers:  { Accept: "application/json" },
            dataType: 'json',
            method: 'GET',
            url: this.model.url + this.toQueryString(),
            statusCode: {
                500: function (response) {
                    if(typeof error == 'undefined') {
                        instance.handleError(response, 500);
                    } else {
                        error(response, 500);
                    }
                },
                422: function (response) {
                    if(typeof error == 'undefined') {
                        instance.handleError(response, 422);
                    } else {
                        error(response, 500);
                    }
                },
                200: function (payload) {
                    var data = instance.encapsulateData(payload['data']);
                    success(instance.model.newCollection(data), payload);
                }
            }
        });
    }



    /**
     * Handles errors returned when retrieving model data.
     *
     * @param {*} response
     */
    handleError(response, code) {
        if(code == 500) {
            flashError('Request failed!');
        } else if(code == 422) {
            var data = response.responseJSON;
            if(data.constructor == Array) {
                for(var i=0; i < data.length; ++i) {
                    flashError(data[i]);
                }
            }
            else {
                for (var key in data) {
                    if (data.hasOwnProperty(key)) {
                        flashError($(data).attr(key));
                    }
                }
            }
        } else if(code == 403) {
            flashError('Permission Denied!');
        }
    }

    /**
     * Generates a query string.
     *
     * @returns {string}
     */
    toQueryString() {
        var query_string = '';

        var first = true;

        for(var key in this.conditions.wheres) {
            var where = this.conditions.wheres[key];

            query_string += (first ? '?' : '&');

            query_string += 'filters[' + where.attribute + '][]=' + encodeURIComponent(where.value);

            if(first == true) {
                first = false;
            }
        }

        return query_string;
    }

    /**
     * Encapsulates a collection of data within a new instance of the model that belongs
     * to a Builder.
     *
     * @param {*} items
     * @returns {*}
     */
    encapsulateData(items) {
        for(var key in items) {
            items[key] = this.newModel(items[key]);
            items[key].exists = true;
        }
        return items;
    }

    /**
     * Creates a new model.
     *
     * @param {*} data
     * @returns {*}
     */
    newModel(data) {
        return new this.model.constructor(data);
    }

    /**
     * Executes an update.
     *
     * @param {Array|Object} attributes
     * @param {function} success
     * @param {function} error
     */
    update(attributes, success, error) {
        var instance = this;
        $.ajax({
            headers:  { Accept: "application/json" },
            dataType: 'json',
            method: 'POST',
            url: this.model.url + '/update' + this.toQueryString(),
            data: attributes,
            statusCode: {
                500: function (response) {
                    if(typeof error != 'function') {
                        instance.handleError(response, 500);
                    } else {
                        error(response, 500);
                    }
                },
                422: function (response) {
                    if(typeof error != 'function') {
                        instance.handleError(response, 422);
                    } else {
                        error(response, 422);
                    }
                },
                200: function (payload) {
                    if(typeof success == 'function') {
                        var data = instance.encapsulateData(payload['data']);
                        success(instance.model.newCollection(data), payload);
                    }
                }
            }
        });
    }

    /**
     * Executes an insert.
     *
     * @param {function} success
     * @param {function} error
     */
    insert(attributes, success, error) {
        var instance = this;
        $.ajax({
            headers:  { Accept: "application/json" },
            dataType: 'json',
            method: 'POST',
            url: this.model.url + '/store',
            data: attributes,
            statusCode: {
                500: function (response) {
                    if(typeof error != 'function') {
                        instance.handleError(response, 500);
                    } else {
                        error(response, 500);
                    }
                },
                422: function (response) {
                    if(typeof error != 'function') {
                        instance.handleError(response, 422);
                    } else {
                        error(response, 422);
                    }
                },
                200: function (data) {
                    if(typeof success == 'function') {
                        success(instance.encapsulateData([data])[0]);
                    }
                }
            }
        });
    }

    /**
     * Executes a delete.
     *
     * @param {function} success
     * @param {function} error
     */
    delete(success, error) {
        var instance = this;
        $.ajax({
            headers:  { Accept: "application/json" },
            dataType: 'json',
            method: 'POST',
            url: this.model.url + '/delete' + this.toQueryString(),
            statusCode: {
                500: function (response) {
                    if(typeof error != 'function') {
                        instance.handleError(response, 500);
                    } else {
                        error(response, 500);
                    }
                },
                422: function (response) {
                    if(typeof error != 'function') {
                        instance.handleError(response, 422);
                    } else {
                        error(response, 422);
                    }
                },
                403: function() {
                    if(typeof error != 'function') {
                        instance.handleError(null, 403);
                    } else {
                        error(null, 403);
                    }
                },
                200: function (data) {
                    if(typeof success == 'function') {
                        success(instance.model.newCollection(instance.encapsulateData(data)));
                    }
                }
            }
        });
    }
}
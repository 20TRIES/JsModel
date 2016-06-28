import Collection from 'js_collection';
import DuplicateVariableException from "../src/DuplicateVariableException";
import UnknownVariableException from "../src/UnknownVariableException";

let jQuery = require('jquery');

/**
 * A builder class for building query strings for a Filterable API.
 */
export default class Builder
{
    /**
     * Constructor.
     *
     * @param model
     */
    constructor(model)
    {
        this.model = model;
        this.conditions = {"wheres": []};
        this.appends = new Collection([
            {"name": "limit", "value": 15},
            {"name": "page", "value": 1}
        ], 'name');
    }

    /**
     * Gets the current limit that is applied to the query.
     *
     * @returns {int}
     */
    getLimit()
    {
        return this.hasVariable('limit') ? this.appends.get('limit').value : -1;
    }

    /**
     * Sets the current limit that should applied to the query.
     *
     * @param {int} value
     * @returns {Builder}
     */
    setLimit(value)
    {
        if(this.hasVariable('limit')) {
            this.updateVariable('limit', value)
        } else {
            this.append('limit', value);
        }
        return this;
    }

    /**
     * Gets the current page.
     *
     * @returns {int}
     */
    currentPage()
    {
        return this.appends.get('page').value;
    }

    /**
     * Sets the current page.
     *
     * @param {int} page
     */
    setPage(page)
    {
        this.appends.get('page').value = page;
        return this;
    }

    /**
     * Increments the current page.
     */
    incrementPage()
    {
        this.setPage(this.currentPage() + 1);
        return this;
    }

    /**
     * Decrements the current page.
     */
    decrementPage()
    {
        this.setPage(this.currentPage() - 1);
        return this;
    }

    /**
     * Appends a variable to the query url string.
     *
     * @param {String} name
     * @param {*} value
     * @returns {Builder}
     */
    append(name, value)
    {
        if(this.hasVariable(name)) {
            throw new DuplicateVariableException(`Variable "${name}" has already been appended!`);
        } else {
            this.appends.push({'name': name, 'value': value});
        }
        return this;
    }

    /**
     * Determines whether a query builder has a variable to append.
     *
     * @param {String} name
     * @returns {boolean}
     */
    hasVariable(name)
    {
        return this.appends.get(name) != null;
    }

    /**
     * Gets the value of a variable bound to the query builder.
     *
     * @param {String} name
     * @returns {*}
     */
    getVariable(name)
    {
        return this.hasVariable(name) ? this.appends.get(name).value : null;
    }

    /**
     * Updates a previously appended variable.
     *
     * @param {String} name
     * @param {*} value
     * @returns {Builder}
     */
    updateVariable(name, value)
    {
        if(this.hasVariable(name)) {
            this.appends.get(name).value = value;
        } else {
            throw new UnknownVariableException(`Cannot update unknown variable with name "${name}"!`);
        }
    }

    /**
     * Adds a where condition to a query.
     *
     * @param attribute
     * @param value
     * @returns {Builder}
     */
    where(attribute, value)
    {
        this.conditions.wheres.push({
            "attribute": attribute,
            "value": value
        });
        return this;
    }

    /**
     * Executes a query.
     *
     * @param {Function} success
     * @param {Function} error
     */
    get(success, error)
    {
        var instance = this;

        jQuery.ajax({
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
                    var models = instance.encapsulateData(payload['data']);
                    let collection = instance.model.newCollection(models);
                    success(collection, payload);
                }
            }
        });
    }



    /**
     * Handles errors returned when retrieving model data.
     *
     * @param {*} response
     */
    handleError(response, code)
    {
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
                        flashError(jQuery(data).attr(key));
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
    toQueryString()
    {
        let query_string = '';
        let first = true;

        for(let i=0; i < this.conditions.wheres.length; ++i) {
            let where = this.conditions.wheres[i];
            query_string += (first ? '?' : '&');
            query_string += `filters[${encodeURIComponent(where.attribute)}][]=${encodeURIComponent(where.value)}`;
            first = false;
        }

        this.appends.each((key, item) => {
            query_string += (first ? '?' : '&');
            query_string += `${encodeURIComponent(item.name)}=${encodeURIComponent(item.value)}`;
            first = false;
        }, query_string);

        return query_string;
    }

    /**
     * Encapsulates a collection of data within a new instance of the model that belongs
     * to a Builder.
     *
     * @param {Array} items
     * @returns {Array}
     */
    encapsulateData(items)
    {
        for(let i=0; i < items.length; ++i) {
            items[i] = this.newModel(items[i]);
            items[i].exists = true;
        }
        return items;
    }

    /**
     * Creates a new model.
     *
     * @param {*} data
     * @returns {*}
     */
    newModel(data)
    {
        return new this.model.constructor(data);
    }

    /**
     * Executes an update.
     *
     * @param {Array|Object} attributes
     * @param {function} success
     * @param {function} error
     */
    update(attributes, success, error)
    {
        var instance = this;
        jQuery.ajax({
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
                        var models = instance.encapsulateData(payload['data']);
                        let collection = instance.model.newCollection(models);
                        success(collection, payload);
                    }
                }
            }
        });
    }

    /**
     * Executes an insert.
     *
     * @param {{}} attributes
     * @param {Function} success
     * @param {Function} error
     */
    insert(attributes, success, error)
    {
        var instance = this;
        jQuery.ajax({
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
                        let models = instance.encapsulateData([data])[0];
                        success(models);
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
    deleteResults(success, error)
    {
        var instance = this;
        jQuery.ajax({
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
                        let models = instance.encapsulateData(data);
                        let collection = instance.model.newCollection(models);
                        success(collection);
                    }
                }
            }
        });
    }
}
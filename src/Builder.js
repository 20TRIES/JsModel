import ModelCollection from './ModelCollection';
import Collection from 'js_collection';
import DuplicateVariableException from "../src/DuplicateVariableException";
import UnknownVariableException from "../src/UnknownVariableException";

let jQuery = require('jquery');
let clone = require('clone');

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
        
        this._constraints = new Collection([
            // {filter: "filter_name", value: "filter_value"}
        ], 'filter');

        this.appends = new Collection([
            {"name": "limit", "value": 15},
            {"name": "page", "value": 1}
        ], 'name');

        this.default_ordering_direction = 'asc';
    }

    /**
     * Gets the value of a constraint that is being applied to a query; returns null if the constraint
     * does not exist.
     *
     * @param {String} filter
     * @returns {*}
     */
    getConstraintValue(filter) {
        let constraint = this._constraints.get(filter);
        return constraint != null
            ? (constraint.value instanceof Object ? clone(constraint.value) : constraint.value)
            : null;
    }

    /**
     * Determine whether a query has a constraint set for a certain filter.
     *
     * @param {String} filter
     * @returns {Boolean}
     */
    hasConstraint(filter) {
        return this._constraints.get(filter) != null;
    }

    /**
     * Determines the attribute that a query is being ordered by; if no ordering is being
     * applied, then null will be returned.
     *
     * @param {String} attribute
     * @param {String} [direction=this.default_ordering_direction]
     * @returns {Builder}
     */
    orderBy(attribute, direction = this.default_ordering_direction)
    {
        if(this.hasVariable('order')) {
            this.updateVariable('order', [attribute, direction]);
        } else {
            this.append('order', [attribute, direction]);
        }
        return this;
    }

    /**
     * Determines the attribute that a query is being ordered by; if no ordering is being
     * applied, then null will be returned.
     *
     * @returns {String|null}
     */
    orderingBy()
    {
        return this.hasVariable('order') ? this.appends.get('order').value[0] : null;
    }

    /**
     * Determines the direction of ordering that a query is using.
     *
     * @returns {String|null}
     */
    orderingByDirection()
    {
        if(this.hasVariable('order')) {
            let ordering = this.appends.get('order');
            return ordering.value.some((val) => val === 'asc' || val === 'desc')
                ? ordering.value[1]
                : this.default_ordering_direction;
        }
        return null;
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
     * @param filter
     * @param value
     * @returns {Builder}
     */
    where(filter, value)
    {
        let constraint = this._constraints.get(filter);
        if(constraint == null) {
            this._constraints.push({
                filter: filter,
                value: value
            })
        } else {
            constraint.value = value;
        }
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
                    if(typeof error == 'function') {
                        error(response, 500);
                    }
                },
                422: function (response) {
                    if(typeof error == 'function') {
                        error(response, 500);
                    }
                },
                200: function (payload) {
                    var models = instance.encapsulateData(payload['data']);
                    let collection = instance._collectData(models);
                    success(collection, payload);
                }
            }
        });
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

        this._constraints.each((key, constraint) => {
            query_string += (first ? '?' : '&');
            query_string += `filters[${encodeURIComponent(constraint.filter)}][]=${encodeURIComponent(constraint.value)}`;
            first = false;
        });

        this.appends.each((key, item) => {
            if(item.value instanceof Array) {
                for(let i=0; i < item.value.length; ++i) {
                    query_string += (first ? '?' : '&');
                    query_string += `${encodeURIComponent(item.name)}[]=${encodeURIComponent(item.value[i])}`;
                }
            } else if(item.value instanceof Object) {
                for(key in item.value) {
                    query_string += (first ? '?' : '&');
                    query_string += `${encodeURIComponent(item.name)}[${encodeURIComponent(key)}]=${encodeURIComponent(item.value[key])}`;
                }
            }
            else {
                query_string += (first ? '?' : '&');
                query_string += `${encodeURIComponent(item.name)}=${encodeURIComponent(item.value)}`;
            }
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
     * Wraps an array of data as a collection.
     *
     * @param {Array} models
     * @param {{}} [pagination=null]
     * @returns {ModelCollection}
     * @private
     */
    _collectData(models) {
        let collection = this.model.newCollection(models);
        collection.setQuery(this);
        return collection;
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
                    if(typeof error == 'function') {
                        error(response, 500);
                    }
                },
                422: function (response) {
                    if(typeof error == 'function') {
                        error(response, 422);
                    }
                },
                200: function (payload) {
                    if(typeof success == 'function') {
                        var models = instance.encapsulateData(payload['data']);
                        let collection = instance._collectData(models);
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
                    if(typeof error == 'function') {
                        error(response, 500);
                    }
                },
                422: function (response) {
                    if(typeof error == 'function') {
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
                    if(typeof error == 'function') {
                        error(response, 500);
                    }
                },
                422: function (response) {
                    if(typeof error == 'function') {
                        error(response, 422);
                    }
                },
                403: function() {
                    if(typeof error == 'function') {
                        error(null, 403);
                    }
                },
                200: function (data) {
                    if(typeof success == 'function') {
                        let models = instance.encapsulateData(data);
                        let collection = instance._collectData(models);
                        success(collection);
                    }
                }
            }
        });
    }
}
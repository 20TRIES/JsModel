import ModelCollection from './ModelCollection';
import Collection from 'js_collection';
import DuplicateVariableException from "../src/Exceptions/DuplicateVariableException";
import UnknownVariableException from "../src/Exceptions/UnknownVariableException";
import clone  from 'clone';
import HttpRequest from "./HttpRequest";
import JqueryHttpDriver from "./HttpDrivers/JqueryHttpDriver";
import HttpDriver from "./HttpDrivers/HttpDriver";
import Model from "./Model";

/**
 * A builder class for building query strings for a Filterable API.
 */
export default class Builder
{
    /**
     * Constructor.
     *
     * @param {Model} model
     * @param {HttpDriver} [driver=JqueryHttpDriver]
     */
    constructor(model, driver = JqueryHttpDriver)
    {
        this.model = model;
        
        this._constraints = new Collection([
            // {filter: "filter_name", value: "filter_value"}
        ], 'filter');

        this.appends = new Collection([
            {"name": "limit", "value": 15},
            {"name": "page", "value": 1}
        ], 'name');

        this._driver = driver;
    }

    /**
     * Gets the value of a constraint that is being applied to a query; returns null if the constraint
     * does not exist.
     *
     * @param {String} filter
     * @returns {*}
     */
    getConstraintValue(filter)
    {
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
    hasConstraint(filter)
    {
        return this._constraints.get(filter) != null;
    }

    /**
     * Determines the attribute that a query is being ordered by; if no ordering is being
     * applied, then null will be returned.
     *
     * @param {...*} orderings A set of orderings formatted {attribute, order_direction, ...}
     * @returns {Builder}
     */
    orderBy(...orderings)
    {
        if(this.hasVariable('order')) {
            this.updateVariable('order', orderings);
        } else {
            this.append('order', orderings);
        }
        return this;
    }

    /**
     * Determines the attribute that a query is being ordered by; if no ordering is being
     * applied, then null will be returned.
     *
     * @returns {Array}
     */
    orderingBy()
    {
        return this.hasVariable('order') ? clone(this.getVariable('order')) : null;
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
     * @param {*} default_result
     * @returns {*}
     */
    getVariable(name, default_result = null)
    {
        return this.hasVariable(name) ? this.appends.get(name).value : default_result;
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
     * Sets the limit for a query to 1 and executes the query returning the first result.
     *
     * @param {Function} success
     * @param {Function} error
     * @returns {*}
     */
    first(success = () => {}, error = () => {})
    {
        return this.setLimit(1).get((results) => {
            success(results.first())
        }, error);
    }

    /**
     * Creates a new request object.
     *
     * @returns {HttpRequest}
     * @private
     */
    static _newRequest()
    {
        let request = new HttpRequest();
        request.setHeader('Accept', 'application/json');
        request.setDataType('json');
        return request;
    }

    /**
     * Executes a query.
     *
     * @param {Function} success
     * @param {Function} error
     */
    get(success = () => {}, error = () => {})
    {
        let request = this.constructor._newRequest();
        request.setHeader('Accept', 'application/json');
        request.setDataType('json');
        request.setMethod('GET');
        request.setUrl(this.model.url + this.toQueryString());
        request.onSuccess((payload) => {
            var models = this.encapsulateData(payload['data']);
            let collection = this._collectData(models);
            success(collection, payload);
        });
        request.onFailure(error);
        this._driver.execute(request);
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
     * @returns {ModelCollection}
     * @private
     */
    _collectData(models)
    {
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
     * @param {{}} attributes
     * @param {function} [success=() => {}]
     * @param {function} [error=() => {}]
     */
    update(attributes, success = () => {}, error  = () => {})
    {
        let request = this.constructor._newRequest();
        request.setDataType('json');
        request.setMethod('POST');
        request.setUrl(`${this.model.url}/update${this.toQueryString()}`);
        request.setData(attributes);
        request.onSuccess((payload) => {
            let models = this.encapsulateData(payload['data']);
            let collection = this._collectData(models);
            success(collection, payload);
        });
        request.onFailure(error);
        this._driver.execute(request);
    }

    /**
     * Executes an insert.
     *
     * @param {{}} attributes
     * @param {function} [success=() => {}]
     * @param {function} [error=() => {}]
     */
    insert(attributes, success = () => {}, error  = () => {})
    {
        let request = this.constructor._newRequest();
        request.setDataType('json');
        request.setMethod('POST');
        request.setUrl(`${this.model.url}/store`);
        request.onSuccess((payload) => success(this.encapsulateData(payload['data'])[0]));
        request.setData(attributes);
        request.onFailure(error);
        this._driver.execute(request);
    }

    /**
     * Executes a delete.
     *
     * @param {function} [success=() => {}]
     * @param {function} [error=() => {}]
     */
    deleteResults(success = () => {}, error = () => {})
    {
        let request = this.constructor._newRequest();
        request.setDataType('json');
        request.setMethod('POST');
        request.setUrl(`${this.model.url}/delete${this.toQueryString()}`);
        request.onSuccess((payload) => {
            let models = this.encapsulateData(payload['data']);
            let collection = this._collectData(models);
            success(collection, payload);
        });
        request.onFailure(error);
        this._driver.execute(request);
    }
}
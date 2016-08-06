import Builder from "./Builder";
import ModelCollection from "./ModelCollection";
import clone  from 'clone';
import Moment from 'moment/moment';
import Str from 'string';
import InvalidAttributeException from "./Exceptions/InvalidAttributeException";

/**
 * A base Model class.
 */
export default class Model {
    /**
     * Constructor
     *
     * @param {Object} [data={}]
     */
    constructor(data = {})
    {
        this._url = '/';
        this._primary_key = 'id';
        this._primary_filter = 'id';
        this._original = {};
        this._attributes = {};
        this._syncing = false;
        this._exists = false;
        this._dates = typeof this._dates == 'undefined' ? ['created_at', 'updated_at'] : this._dates;
        this._hydrate(data);
    }

    /**
     * Creates a new query builder instance with its ordering configured.
     *
     * @param {...*} orderings A set of orderings formatted {attribute, order_direction, ...}
     * @returns {Builder}
     */
    orderBy(...orderings)
    {
        let query = this.query();
        return query.orderBy.apply(query, orderings);
    }

    /**
     * Hydrates a new model instance with a set of data.
     *
     * @param {{}} attributes
     * @private
     */
    _hydrate(attributes)
    {
        // Define any attributes which are required by accessors / mutators and which do not already
        // exist within the attributes provided.
        for(let key in this) {
            if((key.slice(0,3) === 'get' || key.slice(0,3) === 'set')
                && key.slice(-9) === 'Attribute' && this[key] instanceof Function) {
                let attribute = new Str(key.slice(3, -9)).underscore();
                if(!attribute.isEmpty() && typeof attributes[attribute] === 'undefined') {
                    attributes[attribute] = null;
                }
            }
        }

        // Initialise the attribute values.
        for(let key in attributes) {
            this._attributes[key] = attributes[key];
            if (this._exists) {
                this._original[key] = attributes[key];
            }
        }

        // Define accessors and mutators for pre-defined attributes.
        let properties = {};
        for(let key in this._attributes) {
            let accessor = this[new Str(`get_${key}_attribute`).camelize()];
            let mutator = this[new Str(`set_${key}_attribute`).camelize()];
            if(this._dates.indexOf(key) != -1) {
                properties[key] = {
                    "configurable": true,
                    "get": accessor instanceof Function ? accessor : ((attribute_name) => {
                        return new Moment(this._attributes[attribute_name]);
                    }).bind(this, [key]),
                    "set": mutator instanceof Function ? mutator : (value) => {
                        this._attributes[key] = value instanceof Moment ? value.format() : value;
                    }
                };
            } else {
                properties[key] = {
                    "configurable": true,
                    "get": accessor instanceof Function ? accessor : ((attribute_name) => {
                        return this._attributes[attribute_name];
                    }).bind(this, [key]),
                    "set": (mutator instanceof Function ? mutator : (value) => {
                        this._attributes[key] = value;
                    }),
                };
            }
        }
        Object.defineProperties(this, properties);
    }

    /**
     * Gets an object containing all attributes from a model.
     */
    getAttributes()
    {
        let attributes = {};
        // Get all pre-defined attributes.
        for(let key in this._attributes) {
            if(this._attributes.hasOwnProperty(key)) {
                attributes[key] = this[key];
            }
        }
        // Get all dynamically defined attributes.
        for(let key in this) {
            if(this.hasOwnProperty(key) && key.slice(0,1) != '_') {
                attributes[key] = this[key];
            }
        }
        return attributes;
    }

    /**
     * Gets an attribute from a model.
     *
     * @param {string} name
     * @returns {*}
     */
    getAttribute(name)
    {
        return typeof this._attributes[name] === 'undefined' ? this[name] : this._attributes[name];
    }

    /**
     * Gets the original value of a model attribute.
     *
     * @param {string} name
     * @returns {*}
     */
    getOriginal(name)
    {
        return this._original[name];
    }

    /**
     * Determines whether a model is currently synchronizing.
     *
     * @returns {boolean}
     */
    isSyncing()
    {
        return this._syncing === true;
    }

    /**
     * Gets the base url for a model.
     *
     * @returns {string}
     */
    getUrl()
    {
        return this._url;
    }

    /**
     * Determines whether a model exists.
     */
    exists()
    {
        return this._exists === true;
    }

    /**
     * Gets the name of the primary key of a model.
     *
     * @returns {string|int}
     */
    getPrimaryKey()
    {
        return this._primary_key;
    }

    /**
     * Gets a new query builder instance.
     *
     * {Builder}
     */
    query() {
        return new Builder(this);
    }

    /**
     * Creates a new query with a data attribute appended to the query.
     */
    append(name, value) {
        return this.query().append(name, value);
    }

    /**
     * Creates a builder for performing queries about a model.
     *
     * @param {*} attribute
     * @param {*} value
     * @returns {Builder}
     */
    where(attribute, value) {
        return this.query().where(attribute, value);
    }

    /**
     * Attempts to find a model with a specific id.
     *
     * @param {*} id
     * @param {Function} success
     * @param {Function} error
     * @returns {ModelCollection}
     */
    find(id, success, error) {
        return this.where(this._primary_key, id).first(success, error);
    }

    /**
     * Gets all records for a model.
     *
     * @returns {ModelCollection}
     */
    all(success, error) {
        return this.query().get(success, error);
    }

    /**
     * Creates a new collection.
     *
     * @param {Array} data
     * @returns {*}
     */
    newCollection(data) {
        return new ModelCollection(data, this);
    }

    /**
     * Gets the _attributes of a model that have been changed.
     *
     * @returns Object
     */
    dirty() {
        let dirty = {};
        for(let key in this.getAttributes()) {
            let value = this.getAttribute(key);
            if(value != this.getOriginal(key)) {
                if(value != null && typeof value === 'object') {
                    dirty[key] = this.getAttribute(key);
                } else {
                    dirty[key] = value;
                }
            }
        }
        return dirty;
    }

    /**
     * Saves a model.
     *
     * @param {callable} success
     * @param {callable} error
     */
    save(success, error) {
        var instance = this;
        instance._syncing = true;

        var attributes = this.dirty();

        // @TODO Next line can likely be removed
        attributes[this._primary_key] = this.getAttribute(this._primary_key);

        var builder = this.query();
        if(this._exists) {
            builder
                .where(this._primary_filter, this.getAttribute(this.getPrimaryKey()))
                .update(attributes, (function(instance, success) {
                    return function(results, payload) {
                        instance._syncing = false;
                        for(var key in results.items) {
                            var updated_contact = results.items[key];
                            if(updated_contact.customer_contact_id == instance.customer_contact_id) {
                                instance._hydrate(updated_contact._attributes);
                            }
                        }
                        if(typeof success == 'function') {
                            success(results, payload);
                        }
                    }
                })(this, success), (function(instance, error) {
                    return function (response, code) {
                        if (code == 422) {
                            instance._syncing = false;
                        }
                        if (typeof error == 'function') {
                            error(response, code);
                        }
                    }
                })(this, error));
        } else {
            builder.insert(attributes, function(model) {
                    instance._syncing = false;
                    // @TODO Setting primary key seperately can likely be removed
                    // instance.customer_contact_id = model.customer_contact_id;
                    instance._hydrate(model.getAttributes());
                    instance._exists = true;
                    if (typeof success == 'function') {
                        success();
                    }
                },
                function(response, code) {
                    if(code == 422) {
                        instance._syncing = false;
                    }
                    if(typeof error == 'function') {
                        error(response, code);
                    }
                });
        }
    }

    /**
     * Resets a models _attributes to their _original values.
     */
    reset()
    {
        for(var key in this._attributes)
        {
            if(this._original[key] != 'undefined') {
                this._attributes[key] = this._original[key];
            } else {
                delete this._attributes[key];
            }
        }
    }

    /**
     * Deletes a model.
     *
     * @param success
     * @param error
     */
    deleteModel(success, error)
    {
        var instance = this;

        instance._syncing = true;

        if(this.exists()) {
            this.query()
                .where(this._primary_filter, this.getAttribute(this.getPrimaryKey()))
                .delete((function(success) {
                    return function(results) {
                        instance._syncing = false;
                        instance._hydrate(results.first()._attributes);
                        if(typeof success == 'function') {
                            success();
                        }
                    }
                })(this._attributes, success), (function(error) {
                    return function (response, code) {
                        if (code == 422 || code == 403) {
                            instance._syncing = false;
                            instance.reset();
                        }
                        if (typeof error == 'function') {
                            error(response, code);
                        }
                    }
                })(error));
        }
    }

    /**
     * Creates a clone of a model instance.
     *
     * @returns {Model}
     */
    clone() {
        let cloned_model = new this.constructor(clone(this._attributes));
        cloned_model._original = clone(this._original);
        cloned_model._syncing = this._syncing;
        cloned_model._exists = this._exists;
        return cloned_model;
    }
}
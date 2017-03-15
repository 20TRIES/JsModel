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
     * @param {Object} [attributes={}]
     */
    constructor(attributes = {})
    {
        this._ = {};
        this._.url = '/';
        this._.primary_key = 'id';
        this._.primary_filter = 'id';
        this._.original = {};
        this._.attributes = {};
        this._.syncing = false;
        this._.exists = false;

        // Initialise date attributes
        this.getDates().forEach((value) => {
            Object.defineProperty(this, value, {
                "configurable": true,
                "get": this._getAccessor(value),
                "set": this._getMutator(value)
            });
        }, this);

        // Define any attributes which are required by accessors / mutators and which do not already
        // exist within the attributes provided.
        let keys = Object.getOwnPropertyNames(Object.getPrototypeOf(this));
        for(let i in keys) {
            let key = keys[i];
            if((key.slice(0,3) === 'get' || key.slice(0,3) === 'set')
                && key.slice(-9) === 'Attribute' && this[key] instanceof Function) {
                let attribute = new Str(key.slice(3, -9)).underscore();
                if(!attribute.isEmpty()) {
                    attribute = attribute.toString();
                    Object.defineProperty(this, attribute, {
                        "configurable": true,
                        "get": this._getAccessor(attribute),
                        "set": this._getMutator(attribute)
                    });
                }
            }
        }

        // Fill the model with the data provided.
        this.fill(attributes);
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
     * Sets the attributes of a model from a given set of data.
     *
     * Any attributes are not defined prior to this method being called will be dynamically added to the model.
     *
     * @param {{}} attributes
     */
    fill(attributes)
    {
        for (let key in attributes) {
            if (key === '_') {
                // Attributes must not be named underscore; this is intended to stop interference with existing private
                // model attributes.
                throw new InvalidAttributeException(`Invalid attribute name: "${key}"!`);
            }
            this[key] = attributes[key];
        }
    }

    /**
     * Hydrates a new model instance with a set of data from the server.
     *
     * @param {{}} attributes
     * @private
     */
    _hydrate(attributes)
    {
        // Initialise the attribute values.
        for(let key in attributes) {
            if(key === '_') {
                // Attributes must not be named underscore; this is intended to stop interference with existing private
                // model attributes.
                throw new InvalidAttributeException(`Invalid attribute name: "${key}"!`);
            }
            this._.attributes[key] = attributes[key];
            if (this.exists()) {
                this._.original[key] = attributes[key];
            }
        }

        // Define accessors and mutators for constructed attributes.
        for(let key in this._.attributes) {
            Object.defineProperty(this, key, {
                "configurable": true,
                "get": this._getAccessor(key),
                "set": this._getMutator(key)
            });
        }

        // Set the model as existing.
        this._.exists = true;
    }

    /**
     * Gets the accessor method for a model attribute.
     *
     * @param {String} attribute_name
     * @private
     */
    _getAccessor(attribute_name)
    {
        let method = new Str(`get_${attribute_name}_attribute`).camelize().toString();
        let accessor = this[method];
        if(!(accessor instanceof Function)) {
            accessor = this.getDates().indexOf(attribute_name) === -1
                ? (name, value) => this._.attributes[name]
                : (name, value) => this._.attributes[name] === undefined ? null : new Moment(this._.attributes[name]);
            accessor = accessor.bind(this, attribute_name);
        } else {
            accessor = accessor.bind(this);
        }
        return accessor;
    }

    /**
     * Gets the mutator method for a model attribute.
     *
     * @param {String} attribute_name
     * @private
     */
    _getMutator(attribute_name)
    {
        let method = new Str(`set_${attribute_name}_attribute`).camelize().toString();
        let mutator = this[method];
        if(!(mutator instanceof Function)) {
            mutator = this.getDates().indexOf(attribute_name) === -1
                ? (name, value) => { this._.attributes[name] = value }
                : (name, value) => { this._.attributes[name] = value instanceof Moment ? value.format() : value };
            mutator = mutator.bind(this, attribute_name);
        } else {
            mutator = mutator.bind(this);
        }
        return mutator;
    }

    /**
     * Gets an object containing all attributes from a model.
     */
    getAttributes()
    {
        let attributes = {};
        // Get all pre-defined attributes.
        for(let key in this._.attributes) {
            if(this._.attributes.hasOwnProperty(key)) {
                attributes[key] = this[key];
            }
        }
        // Get all dynamically defined attributes.
        for(let key in this) {
            if(key != '_' && this.hasOwnProperty(key)) {
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
        return typeof this._.attributes[name] === 'undefined' ? this[name] : this._.attributes[name];
    }

    /**
     * Gets the original value of a model attribute.
     *
     * @param {string} name
     * @returns {*}
     */
    getOriginal(name)
    {
        return this._.original[name];
    }

    /**
     * Determines whether an attribute originally exists on a model.
     *
     * @param {string} name
     * @returns {boolean}
     */
    hasOriginal(name)
    {
        return typeof this._.original[name] !== 'undefined';
    }

    /**
     * Gets the names of the attributes within a model that have been specified as a date attribute.
     *
     * @returns {Array}
     */
    getDates()
    {
        return ['created_at', 'updated_at'];
    }

    /**
     * Determines whether a model is currently synchronizing.
     *
     * @returns {boolean}
     */
    isSyncing()
    {
        return this._.syncing === true;
    }

    /**
     * Gets the base url for a model.
     *
     * @returns {string}
     */
    getUrl()
    {
        return this._.url;
    }

    /**
     * Determines whether a model exists.
     */
    exists()
    {
        return this._.exists === true;
    }

    /**
     * Gets the name of the primary key of a model.
     *
     * @returns {string|int}
     */
    getPrimaryKey()
    {
        return this._.primary_key;
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
        return this.where(this.getPrimaryKey(), id).first(success, error);
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
     * Gets the attributes of a model that have been changed.
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
        instance._.syncing = true;

        var attributes = this.dirty();

        // @TODO Next line can likely be removed
        attributes[this.getPrimaryKey()] = this.getAttribute(this.getPrimaryKey());

        var builder = this.query();
        if(this.exists()) {
            builder
                .where(this._.primary_filter, this.getAttribute(this.getPrimaryKey()))
                .update(attributes, (function(instance, success) {
                    return function(results, payload) {
                        instance._.syncing = false;
                        for(var key in results.items) {
                            var updated_contact = results.items[key];
                            if(updated_contact.customer_contact_id == instance.customer_contact_id) {
                                instance._hydrate(updated_contact.getAttributes());
                            }
                        }
                        if(typeof success == 'function') {
                            success(results, payload);
                        }
                    }
                })(this, success), (function(instance, error) {
                    return function (response, code) {
                        if (code == 422) {
                            instance._.syncing = false;
                        }
                        if (typeof error == 'function') {
                            error(response, code);
                        }
                    }
                })(this, error));
        } else {
            builder.insert(attributes, function(model) {
                    instance._.syncing = false;
                    // @TODO Setting primary key seperately can likely be removed
                    // instance.customer_contact_id = model.customer_contact_id;
                    instance._hydrate(model.getAttributes());
                    instance._.exists = true;
                    if (typeof success == 'function') {
                        success();
                    }
                },
                function(response, code) {
                    if(code == 422) {
                        instance._.syncing = false;
                    }
                    if(typeof error == 'function') {
                        error(response, code);
                    }
                });
        }
    }

    /**
     * Resets a model's data to it's original values.
     */
    reset()
    {
        // Reset all pre-defined attributes.
        for (let key in this._.attributes) {
            if (this._.attributes.hasOwnProperty(key)) {
                if(this.hasOriginal(key)) {
                    this._.attributes[key] = this.getOriginal(key);
                } else {
                    delete this._.attributes[key];
                }
            }
        }
        // Reset all dynamically defined attributes.
        for (let key in this) {
            if (key !== '_' && this.hasOwnProperty(key)) {
                delete this[key];
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

        instance._.syncing = true;

        if(this.exists()) {
            this.query()
                .where(this._.primary_filter, this.getAttribute(this.getPrimaryKey()))
                .delete((function(success) {
                    return function(results) {
                        instance._.syncing = false;
                        instance._hydrate(results.first().getAttributes());
                        if(typeof success == 'function') {
                            success();
                        }
                    }
                })(this.getAttributes(), success), (function(error) {
                    return function (response, code) {
                        if (code == 422 || code == 403) {
                            instance._.syncing = false;
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
        let cloned_model = new this.constructor(clone(this.getAttributes()));
        cloned_model._.original = clone(this._.original);
        cloned_model._.syncing = this.isSyncing();
        cloned_model._.exists = this.exists();
        return cloned_model;
    }
}
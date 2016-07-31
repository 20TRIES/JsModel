import Builder from "./Builder";
import ModelCollection from "./ModelCollection";
import clone  from 'clone';
import Moment from 'moment/moment';
import Str from 'string';

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
        this.url = '/';
        this.primary_key = 'id';
        this.primary_filter = 'id';
        this.original = {};
        this.attributes = {};
        this.syncing = false;
        this.exists = false;
        this.dates = typeof this.dates == 'undefined' ? ['created_at', 'updated_at'] : this.dates;
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
        // Initialise the attribute values.
        for(let key in attributes) {
            this.attributes[key] = attributes[key];
            if (this.exists) {
                this.original[key] = attributes[key];
            }
        }

        // Define accessors and mutators
        let properties = {};
        for(let key in attributes) {
            let accessor = this[new Str(`get_${key}_attribute`).camelize()];
            let mutator = this[new Str(`set_${key}_attribute`).camelize()];
            if(this.dates.indexOf(key) != -1) {
                properties[key] = {
                    "configurable": true,
                    "get": accessor instanceof Function ? accessor : ((attribute_name) => {
                        return new Moment(this.attributes[attribute_name]);
                    }).bind(this, [key]),
                    "set": mutator instanceof Function ? mutator : (value) => {
                        this.attributes[key] = value instanceof Moment ? value.format() : value;
                    }
                };
            } else {
                properties[key] = {
                    "configurable": true,
                    "get": accessor instanceof Function ? accessor : ((attribute_name) => {
                        return this.attributes[attribute_name];
                    }).bind(this, [key]),
                    "set": (mutator instanceof Function ? mutator : (value) => {
                        this.attributes[key] = value;
                    }),
                };
            }
        }
        Object.defineProperties(this, properties);
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
        return this.where(this.primary_key, id).first(success, error);
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
        var dirty = {};
        for(var key in this.attributes) {
            var value = this.attributes[key];
            if(value != this.original[key]) {
                if(value != null && typeof value === 'object') {
                    dirty[key] = jQuery.extend({}, this.attributes[key]);
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
        instance.syncing = true;

        var attributes = this.dirty();
        attributes[this.primary_key] = this.attributes[this.primary_key];

        var builder = this.query();
        if(this.exists) {
            builder
                .where(this.primary_filter, this.attributes[this.primary_key])
                .update(attributes, (function(instance, success) {
                    return function(results, payload) {
                        instance.syncing = false;
                        for(var key in results.items) {
                            var updated_contact = results.items[key];
                            if(updated_contact.customer_contact_id == instance.customer_contact_id) {
                                instance._hydrate(updated_contact.attributes);
                            }
                        }
                        if(typeof success == 'function') {
                            success(results, payload);
                        }
                    }
                })(this, success), (function(instance, error) {
                    return function (response, code) {
                        if (code == 422) {
                            instance.syncing = false;
                        }
                        if (typeof error == 'function') {
                            error(response, code);
                        }
                    }
                })(this, error));
        } else {
            builder.insert(attributes, function(model) {
                    instance.syncing = false;
                    instance.customer_contact_id = model.customer_contact_id;
                    instance._hydrate(model.attributes);
                    instance.exists = true;
                    if (typeof success == 'function') {
                        success();
                    }
                },
                function(response, code) {
                    if(code == 422) {
                        instance.syncing = false;
                    }
                    if(typeof error == 'function') {
                        error(response, code);
                    }
                });
        }
    }

    /**
     * Resets a models attributes to their original values.
     */
    reset()
    {
        for(var key in this.attributes)
        {
            if(this.original[key] != 'undefined') {
                this.attributes[key] = this.original[key];
            } else {
                delete this.attributes[key];
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

        instance.syncing = true;

        var builder = this.query();

        if(this.exists) {
            builder
                .where(this.primary_filter, this.attributes[this.primary_key])
                .delete((function(success) {
                    return function(results) {
                        instance.syncing = false;
                        instance._hydrate(results.first().attributes);
                        if(typeof success == 'function') {
                            success();
                        }
                    }
                })(this.attributes, success), (function(error) {
                    return function (response, code) {
                        if (code == 422 || code == 403) {
                            instance.syncing = false;
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
        let cloned_model = new this.constructor(clone(this.attributes));
        cloned_model.original = clone(this.original);
        cloned_model.syncing = this.syncing;
        cloned_model.exists = this.exists;
        return cloned_model;
    }
}